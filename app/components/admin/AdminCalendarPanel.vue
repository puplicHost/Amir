<script setup lang="ts">
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Loader2, Phone, Plus, X } from 'lucide-vue-next'
import { normalizePhoneForWa } from '~~/shared/booking'
import { todayBerlinISO } from '~/utils/format'


const { t, locale } = useI18n()
const toast = useAdminToast()
const fetch = useRequestFetch()
const canAssign = useAdminCan('bookings.assign')

type View = 'day' | 'week' | 'month'
const view = ref<View>('day')
const dayStr = ref(todayBerlinISO())
const staffFilter = ref('all')

interface CalBooking {
  id: string, bookingNumber: string, serviceName: string, customerName: string,
  customerPhone: string, waLink: string, startsAt: string, durationMinSnapshot: number,
  status: string, paymentStatus: string, paymentProvider: string, source: string,
  assignedStaffId: string | null, assignedStaffName: string | null, needsRefund: boolean,
}
interface CalOff { id: string, staffId: string, staffName: string, startsAt: string, endsAt: string, reason: string | null }

function rangeFor(): { from: string, to: string } {
  if (view.value === 'day') return { from: dayStr.value, to: dayStr.value }
  const base = new Date(`${dayStr.value}T12:00:00Z`)
  if (view.value === 'week') {
    const dow = (base.getUTCDay() + 6) % 7 // Monday-first
    const mon = new Date(base.getTime() - dow * 86400000)
    const sun = new Date(mon.getTime() + 6 * 86400000)
    return { from: mon.toISOString().slice(0, 10), to: sun.toISOString().slice(0, 10) }
  }
  const y = base.getUTCFullYear()
  const m = base.getUTCMonth()
  return {
    from: new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10),
    to: new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10),
  }
}

const results = await Promise.all([
  useAsyncData('admin-calendar', () => {
    const { from, to } = rangeFor()
    const params: Record<string, string> = { from, to }
    if (staffFilter.value !== 'all') params.staffId = staffFilter.value
    return fetch<any>('/api/admin/calendar', { params })
  }),
  useAsyncData('admin-calendar-settings', () =>
    fetch<any>('/api/admin/settings/booking').catch(() => null),
  ),
  useAsyncData('admin-calendar-services', () =>
    fetch<any[]>('/api/services').catch(() => []),
  ),
  useAsyncData('admin-calendar-staff', () =>
    fetch<{ staff: { id: string, displayName: string }[] }>('/api/staff').catch(() => ({ staff: [] })),
  ),
])

const { data: feed, refresh, pending } = results[0]
const { data: bookingSettings } = results[1]
const { data: services } = results[2]
const { data: staffOpts } = results[3]
watch([view, dayStr, staffFilter], () => refresh())

let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => refresh(), 30000)
})
onUnmounted(() => clearInterval(timer))

const bookings = computed<CalBooking[]>(() => feed.value?.bookings || [])
const isStaffView = computed(() => feed.value?.isStaffView || false)

// Reassignment queue: paid but unassigned, nearest first. <24h = urgent.
const queue = computed(() => bookings.value
  .filter(b => b.status === 'UNASSIGNED' && b.paymentStatus === 'PAID')
  .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)))
function isUrgent(b: CalBooking): boolean {
  return +new Date(b.startsAt) - Date.now() < 24 * 3600000
}

// Staff columns: distinct assignees + unassigned bucket.
const columns = computed(() => {
  const map = new Map<string, { id: string | null, name: string }>()
  for (const b of bookings.value) {
    const key = b.assignedStaffId || 'unassigned'
    if (!map.has(key)) map.set(key, { id: b.assignedStaffId, name: b.assignedStaffName || t('calendar.unassigned') })
  }
  return [...map.values()]
})

function berlinDay(iso: string): string {
  const d = new Date(iso)
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' })
  return fmt.format(d)
}

// Grid columns: per staff (day view) or per Berlin day (week view).
const dayColumns = computed(() => {
  if (view.value === 'week') {
    const days: string[] = []
    const { from, to } = rangeFor()
    for (let ms = Date.parse(`${from}T00:00:00Z`); ms <= Date.parse(`${to}T00:00:00Z`); ms += 86400000) {
      days.push(new Date(ms).toISOString().slice(0, 10))
    }
    return days.map(day => ({
      key: day,
      label: day,
      bookings: bookings.value.filter(b => berlinDay(b.startsAt) === day),
    }))
  }
  return columns.value.map(c => ({
    key: c.id || 'unassigned',
    label: c.name,
    staffId: c.id,
    bookings: bookings.value.filter(b => (b.assignedStaffId || 'unassigned') === (c.id || 'unassigned')),
  }))
})

// Month cells: day + booking count.
const monthCells = computed(() => {
  const { from, to } = rangeFor()
  const counts = new Map<string, number>()
  for (const b of bookings.value) {
    const day = berlinDay(b.startsAt)
    counts.set(day, (counts.get(day) || 0) + 1)
  }
  const cells: { day: string, count: number }[] = []
  for (let ms = Date.parse(`${from}T00:00:00Z`); ms <= Date.parse(`${to}T00:00:00Z`); ms += 86400000) {
    const day = new Date(ms).toISOString().slice(0, 10)
    cells.push({ day, count: counts.get(day) || 0 })
  }
  return cells
})

// Agenda (mobile): grouped by staff on day view, by day on week/month.
const agendaGroups = computed(() => {
  if (view.value !== 'day') {
    return dayColumns.value
      .filter(g => g.bookings.length)
      .map(g => ({ key: g.key, label: g.label, bookings: g.bookings }))
  }
  return dayColumns.value
    .filter(g => g.bookings.length)
    .map(g => ({ key: g.key, label: g.label, bookings: [...g.bookings].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)) }))
})

// Day grid range from feed (fallback 08:00-20:00), Berlin wall minutes.
function berlinMin(iso: string): number {
  const d = new Date(iso)
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
  const [h, m] = parts.split(':').map(Number)
  return h * 60 + m
}
const gridStart = computed(() => {
  if (!bookings.value.length) return 480
  return Math.max(0, Math.min(...bookings.value.map(b => berlinMin(b.startsAt))) - 30)
})
const gridEnd = computed(() => {
  if (!bookings.value.length) return 1200
  return Math.min(1440, Math.max(...bookings.value.map(b => berlinMin(b.startsAt) + b.durationMinSnapshot)) + 30)
})
const hourMarks = computed(() => {
  const out: number[] = []
  for (let m = Math.ceil(gridStart.value / 60) * 60; m <= gridEnd.value; m += 60) out.push(m)
  return out
})
function pct(min: number): number {
  return ((min - gridStart.value) / Math.max(1, gridEnd.value - gridStart.value)) * 100
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' })
}
function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString(locale.value === 'ar' ? 'ar-EG' : 'de-DE', {
    timeZone: 'Europe/Berlin', weekday: 'short', day: 'numeric', month: 'numeric',
  })
}
function blockStyle(b: CalBooking): Record<string, string> {
  const top = pct(berlinMin(b.startsAt))
  const h = Math.max(4, pct(berlinMin(b.startsAt) + b.durationMinSnapshot) - top)
  return { top: `${top}%`, height: `${h}%` }
}

function shiftDay(n: number) {
  const d = new Date(`${dayStr.value}T12:00:00Z`)
  dayStr.value = new Date(d.getTime() + n * 86400000).toISOString().slice(0, 10)
}

// Berlin wall minutes → UTC instant (iterated offset resolution, DST-safe).
function berlinWallToUtc(day: string, wallMin: number): number {
  const [Y, M, D] = day.split('-').map(Number)
  const hh = Math.floor(wallMin / 60)
  const mm = wallMin % 60
  let guess = Date.UTC(Y, M - 1, D, hh, mm)
  for (let i = 0; i < 3; i++) {
    const p = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date(guess))
    const get = (k: string) => Number(p.find(x => x.type === k)?.value || 0)
    const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'))
    guess = Date.UTC(Y, M - 1, D, hh, mm) - (asUtc - guess)
  }
  return guess
}

// Empty grid click → manual booking preset. Click offset maps to Berlin wall
// minutes snapped to 15, converted to an instant, rendered as a browser-local
// datetime-local value (server parses the ISO offset).
function columnClick(ev: MouseEvent, col: { key: string, staffId?: string | null }) {
  if (view.value !== 'day') return
  const el = ev.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const frac = Math.min(0.999, Math.max(0, (ev.clientY - rect.top) / rect.height))
  const wallMin = Math.floor((gridStart.value + frac * (gridEnd.value - gridStart.value)) / 15) * 15
  const inst = new Date(berlinWallToUtc(dayStr.value, wallMin))
  const p = (n: number) => String(n).padStart(2, '0')
  manual.startsAt = `${inst.getFullYear()}-${p(inst.getMonth() + 1)}-${p(inst.getDate())}T${p(inst.getHours())}:${p(inst.getMinutes())}`
  manual.staffId = (col as any).staffId || 'any'
  manualResult.value = null
  manualError.value = ''
  manualOpen.value = true
}

// ── Side panel ──
const panelId = ref('')
const { data: detail, refresh: refreshDetail, pending: detailPending } = await useAsyncData('admin-calendar-detail', () =>
  panelId.value ? fetch<any>(`/api/admin/bookings/${panelId.value}`) : Promise.resolve(null),
  { watch: [panelId] },
)
const detailBooking = computed(() => detail.value?.booking || null)
function openPanel(id: string) {
  panelId.value = id
  refreshDetail()
}

// Customer WhatsApp notice for unassigned bookings (Roadmap Phase 6).
// Template editable in Studio settings; placeholders {name} {service}
// {date} {bookingNumber}. Falls back to built-in bilingual defaults.
// bookingSettings loaded in parallel above (results[1])
const waReassignUrl = computed(() => {
  const b = detailBooking.value
  if (!b || b.status !== 'UNASSIGNED') return ''
  // FE-01: German local numbers (0171…) must be rewritten to 49171… for wa.me.
  const digits = normalizePhoneForWa(b.customerPhone || '')
  if (!digits) return ''
  const date = new Date(b.startsAt).toLocaleString(locale.value === 'de' ? 'de-DE' : 'en-US', {
    timeZone: 'Europe/Berlin', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  })
  const vars: Record<string, string> = {
    name: b.customerName || '', service: b.service?.name || '',
    date, bookingNumber: b.bookingNumber || '',
  }
  const fill = (tpl: string) => tpl.replace(/\{(name|service|date|bookingNumber)\}/g, (_, k) => vars[k] || '')
  const tpl = locale.value === 'de'
    ? (bookingSettings.value?.salon?.reassignmentWaDe || 'Hallo {name}! Leider ist Ihr Stylist für "{service}" am {date} verhindert. Wir melden uns mit einem Vorschlag. Ihr AMIR-Team (Buchung {bookingNumber})')
    : (bookingSettings.value?.salon?.reassignmentWaEn || 'Hello {name}! Unfortunately your stylist for "{service}" on {date} is unavailable. We will contact you with a proposal. Your AMIR team (booking {bookingNumber})')
  return `https://wa.me/${digits}?text=${encodeURIComponent(fill(tpl))}`
})
const picker = ref<any[]>([])
async function loadPicker() {
  if (!panelId.value || !canAssign.value) return
  try {
    picker.value = (await $fetch<any>(`/api/admin/bookings/${panelId.value}/staff-picker`)).staff || []
  }
  catch { picker.value = [] }
}
watch(panelId, loadPicker)
const assigning = ref(false)
async function assignTo(staffId: string) {
  assigning.value = true
  try {
    await $fetch(`/api/admin/bookings/${panelId.value}/assign`, { method: 'PUT', body: { staffId } })
    toast.success(locale.value === 'ar' ? 'تم التعيين' : 'Assigned', t('adminBookings.assignedSuccess'))
    await Promise.all([refresh(), refreshDetail()])
  }
  catch (e: any) { toast.error('Error', e?.data?.message || 'Assign failed') }
  finally { assigning.value = false }
}
const completing = ref(false)
async function completeCurrent() {
  completing.value = true
  try {
    await $fetch(`/api/admin/bookings/${panelId.value}/complete`, { method: 'POST' })
    await Promise.all([refresh(), refreshDetail()])
  }
  catch (e: any) { toast.error('Error', e?.data?.message || 'Complete failed') }
  finally { completing.value = false }
}
const resched = reactive({ at: '', staffId: '' })
const rescheduling = ref(false)
async function rescheduleCurrent() {
  if (!resched.at) return
  rescheduling.value = true
  try {
    await $fetch(`/api/admin/bookings/${panelId.value}/reschedule`, {
      method: 'PUT',
      body: { startsAt: new Date(resched.at).toISOString(), staffId: resched.staffId || undefined },
    })
    resched.at = ''; resched.staffId = ''
    await Promise.all([refresh(), refreshDetail()])
    toast.success(locale.value === 'ar' ? 'تم النقل' : 'Moved', t('calendar.moved'))
  }
  catch (e: any) { toast.error('Error', e?.data?.message || 'Move failed') }
  finally { rescheduling.value = false }
}

// ── Manual booking modal ──
// services + staffOpts loaded in parallel above (results[2], results[3])
const manualOpen = ref(false)
const manual = reactive({
  serviceId: '', staffId: 'any', startsAt: '', name: '', phone: '', email: '', note: '',
  source: 'WALK_IN', paymentMode: 'paid_in_salon', paymentMethod: 'cash',
})
const manualResult = ref<{ payUrl: string, bookingNumber: string } | null>(null)
const manualError = ref('')
const savingManual = ref(false)
function openManual(presetStart?: string, presetStaff?: string | null) {
  manualResult.value = null
  manualError.value = ''
  if (presetStart) {
    const d = new Date(presetStart)
    const p = (n: number) => String(n).padStart(2, '0')
    manual.startsAt = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
  }
  if (presetStaff) manual.staffId = presetStaff
  manualOpen.value = true
}
async function saveManual() {
  manualError.value = ''
  savingManual.value = true
  try {
    const res = await $fetch<any>('/api/admin/bookings/manual', {
      method: 'POST',
      body: {
        serviceId: manual.serviceId,
        staffId: manual.staffId === 'any' ? undefined : manual.staffId,
        startsAt: new Date(manual.startsAt).toISOString(),
        customerName: manual.name.trim(),
        customerPhone: manual.phone.trim(),
        customerEmail: manual.email.trim() || undefined,
        note: manual.note.trim() || undefined,
        source: manual.source,
        paymentMode: manual.paymentMode,
        paymentMethod: manual.paymentMethod,
      },
    })
    manualResult.value = { payUrl: res.payUrl, bookingNumber: res.booking.bookingNumber }
    await refresh()
  }
  catch (e: any) { manualError.value = e?.data?.message || e?.data?.statusMessage || 'Create failed' }
  finally { savingManual.value = false }
}
function payLinkWa(): string {
  if (!manualResult.value?.payUrl || !manual.phone) return ''
  const url = `${location.origin}${manualResult.value.payUrl}`
  const msg = locale.value === 'de'
    ? `Hallo! Hier ist Ihr Zahlungslink für die Anzahlung (${manualResult.value.bookingNumber}): ${url}`
    : `Hello! Here is your deposit payment link (${manualResult.value.bookingNumber}): ${url}`
  return `https://wa.me/${normalizePhoneForWa(manual.phone)}?text=${encodeURIComponent(msg)}`
}
</script>

<template>
  <div>
<div class="mb-4 flex flex-wrap items-center justify-end gap-2">
      <button
          v-if="canAssign"
          type="button"
          class="inline-flex h-11 items-center gap-1.5 rounded-md bg-primary px-3.5 text-xs font-bold text-on-primary hover:bg-primary/90"
          @click="openManual()"
        >
          <Plus class="h-3.5 w-3.5" aria-hidden="true" />
          <span>{{ t('calendar.manual') }}</span>
        </button>
    </div>

    <!-- Reassignment strip -->
    <div v-if="queue.length && !isStaffView" class="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
      <p class="mb-2 text-xs font-bold text-amber-900 dark:text-amber-200">
        {{ t('calendar.needsReassign') }} ({{ queue.length }})
      </p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="b in queue.slice(0, 8)"
          :key="b.id"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white px-3 py-1.5 text-[11px] font-semibold text-neutral-700 hover:border-primary dark:bg-neutral-900 dark:text-neutral-200"
          @click="openPanel(b.id)"
        >
          <AlertTriangle v-if="isUrgent(b)" class="h-3 w-3 text-rose-500" aria-hidden="true" />
          <span class="font-mono">{{ b.bookingNumber }}</span>
          <span>{{ b.serviceName }}</span>
          <span dir="ltr">{{ fmtTime(b.startsAt) }}</span>
        </button>
      </div>
    </div>

    <!-- Controls -->
    <div class="mb-4 flex flex-wrap items-center gap-2">
      <div class="flex overflow-hidden rounded-md border" :style="{ borderColor: 'var(--color-border)' }">
        <button
          v-for="v in (['day', 'week', 'month'] as View[])"
          :key="v"
          type="button"
          class="px-3.5 py-2 text-xs font-bold transition-colors"
          :class="view === v ? 'bg-primary text-on-primary' : 'bg-white text-neutral-600 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-300'"
          @click="view = v"
        >
          {{ t(`calendar.${v}`) }}
        </button>
      </div>
      <div class="flex items-center gap-1">
        <button type="button" class="h-11 w-9 rounded-md border hover:bg-neutral-50 dark:hover:bg-neutral-800" :style="{ borderColor: 'var(--color-border)' }" :aria-label="t('calendar.prev')" @click="shiftDay(view === 'day' ? -1 : view === 'week' ? -7 : -30)">
          <ChevronLeft class="mx-auto h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        </button>
        <input v-model="dayStr" type="date" :aria-label="t('calendar.date')" class="h-11 rounded-md border bg-transparent px-2 text-xs" :style="{ borderColor: 'var(--color-border)' }" />
        <button type="button" class="h-11 w-9 rounded-md border hover:bg-neutral-50 dark:hover:bg-neutral-800" :style="{ borderColor: 'var(--color-border)' }" :aria-label="t('calendar.next')" @click="shiftDay(view === 'day' ? 1 : view === 'week' ? 7 : 30)">
          <ChevronRight class="mx-auto h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        </button>
      </div>
      <select
        v-if="!isStaffView"
        v-model="staffFilter"
        class="h-11 rounded-md border bg-transparent px-2 text-xs"
        :style="{ borderColor: 'var(--color-border)' }"
        :aria-label="t('calendar.staff')"
      >
        <option value="all">{{ t('adminBookings.allStaff') }}</option>
        <option v-for="c in columns.filter(c => c.id)" :key="c.id!" :value="c.id!">{{ c.name }}</option>
      </select>
      <span v-if="pending" class="inline-flex items-center gap-1 text-[11px] text-neutral-400">
        <Loader2 class="h-3 w-3 animate-spin" aria-hidden="true" />…
      </span>
    </div>

    <div v-if="feed?.closures?.length" class="mb-3 flex flex-wrap gap-2">
      <span v-for="c in feed.closures" :key="c.day" class="rounded-full bg-neutral-200 px-3 py-1 text-[11px] font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300" dir="ltr">
        {{ c.day }} · {{ t('calendar.closedDay') }}
      </span>
    </div>

    <!-- Month -->
    <div v-if="view === 'month'" class="grid grid-cols-7 gap-1">
      <div
        v-for="cell in monthCells"
        :key="cell.day"
        class="min-h-20 cursor-pointer rounded-lg border p-1.5 text-start hover:border-primary"
        :class="cell.day === dayStr ? 'border-primary' : ''"
        :style="{ borderColor: cell.day === dayStr ? undefined : 'var(--color-border)' }"
        @click="dayStr = cell.day; view = 'day'"
      >
        <p class="text-[11px] font-bold text-neutral-500" dir="ltr">{{ cell.day.slice(8) }}</p>
        <p v-if="cell.count" class="mt-1 inline-block rounded-full bg-primary px-2 py-px text-[10px] font-bold text-on-primary">{{ cell.count }}</p>
      </div>
    </div>

    <!-- Day / Week grid (desktop) -->
    <div v-else class="hidden overflow-x-auto rounded-xl border bg-white dark:bg-neutral-900 lg:block" :style="{ borderColor: 'var(--color-border)' }">
      <div class="flex min-w-[640px]">
        <div class="w-12 shrink-0 pt-10 text-end">
          <div
            v-for="h in hourMarks"
            :key="h"
            class="text-[10px] font-semibold text-neutral-400"
            :style="{ height: `${(60 / Math.max(1, gridEnd - gridStart)) * 100}%`, minHeight: '44px' }"
            dir="ltr"
          >
            {{ String(Math.floor(h / 60)).padStart(2, '0') }}:00
          </div>
        </div>
        <div class="grid flex-1" :style="{ gridTemplateColumns: `repeat(${Math.max(1, dayColumns.length)}, minmax(150px, 1fr))` }">
          <div
            v-for="col in dayColumns"
            :key="col.key"
            class="border-s px-1 py-10"
            :style="{ borderColor: 'var(--color-border)' }"
          >
            <p class="mb-1 truncate px-1 text-[11px] font-bold text-neutral-700 dark:text-neutral-200">{{ col.label }}</p>
            <div
              class="relative cursor-cell"
              :style="{ height: '640px' }"
              @click="columnClick($event, col)"
            >
              <div
                v-for="h in hourMarks"
                :key="h"
                class="absolute w-full border-t border-dashed border-neutral-100 dark:border-neutral-800"
                :style="{ top: `${pct(h)}%` }"
              />
              <button
                v-for="b in col.bookings"
                :key="b.id"
                type="button"
                class="absolute inset-x-1 overflow-hidden rounded-md border p-1 text-start shadow-xs hover:ring-2 hover:ring-primary"
                :class="b.status === 'ASSIGNED' ? 'border-primary/40 bg-neutral-50 dark:bg-neutral-950/30' : 'border-amber-300 bg-amber-50 dark:bg-amber-950/20'"
                :style="blockStyle(b)"
                :title="`${b.serviceName} · ${b.customerName} · ${fmtTime(b.startsAt)}`"
                @click.stop="openPanel(b.id)" :aria-label="`${b.serviceName} · ${b.customerName} · ${fmtTime(b.startsAt)}`">
                <p class="truncate text-[11px] font-bold text-neutral-800 dark:text-neutral-100">{{ fmtTime(b.startsAt) }} {{ b.serviceName }}</p>
                <p class="truncate text-[10px] text-neutral-500">{{ b.customerName }}</p>
                <p class="truncate text-[10px] font-semibold text-neutral-500">
                  {{ b.status }} · {{ b.paymentStatus }}<span v-if="b.needsRefund"> · ⚠</span>
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Agenda (mobile + fallback list) -->
    <div class="space-y-2 lg:hidden">
      <div v-if="!agendaGroups.length" class="rounded-lg border bg-white p-4 dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
        <AdminEmptyState
          :title="t('adminBookings.noBookings')"
          :description="t('adminBookings.noBookingsHint')"
          :icon="CalendarDays"
        />
      </div>
      <div v-for="g in agendaGroups" :key="g.key">
        <p class="mb-1 mt-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400">{{ g.label }}</p>
        <button
          v-for="b in g.bookings"
          :key="b.id"
          type="button"
          class="mb-1.5 flex w-full items-center justify-between gap-2 rounded-lg border bg-white p-3 text-start dark:bg-neutral-900"
          :style="{ borderColor: 'var(--color-border)' }"
          @click="openPanel(b.id)"
        >
          <span>
            <span class="block text-xs font-bold text-neutral-800 dark:text-neutral-100" dir="ltr">{{ fmtTime(b.startsAt) }} · {{ b.serviceName }}</span>
            <span class="block text-[11px] text-neutral-500">{{ b.customerName }} · {{ b.status }} · {{ b.paymentStatus }}</span>
          </span>
          <AlertTriangle v-if="b.needsRefund" class="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
        </button>
      </div>
    </div>

    <!-- Side panel -->
    <div
      v-if="panelId"
      class="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      @click.self="panelId = ''"
@keydown.escape="panelId = ''"
    >
      <div class="h-full w-full max-w-md overflow-y-auto border-s bg-white p-5 shadow-xl dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="font-heading text-sm font-bold">{{ t('calendar.details') }}</h3>
          <button type="button" class="text-neutral-400 hover:text-neutral-600" :aria-label="t('calendar.close')" @click="panelId = ''">
            <X class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p v-if="detailPending" class="text-xs text-neutral-400">…</p>
        <div v-else-if="detailBooking" class="space-y-3 text-xs">
          <div class="rounded-lg border p-3" :style="{ borderColor: 'var(--color-border)' }">
            <p class="font-heading text-sm font-bold">{{ detailBooking.service?.name }}</p>
            <p class="font-mono text-[11px] text-neutral-500">{{ detailBooking.bookingNumber }}</p>
            <p class="mt-1 font-bold" dir="ltr">{{ fmtDay(detailBooking.startsAt) }} · {{ fmtTime(detailBooking.startsAt) }} ({{ detailBooking.durationMinSnapshot }} min)</p>
            <p class="mt-1">{{ detailBooking.customerName }} · <span class="font-mono" dir="ltr">{{ detailBooking.customerPhone }}</span></p>
            <p v-if="detailBooking.customerEmail" class="text-neutral-500" dir="ltr">{{ detailBooking.customerEmail }}</p>
            <p class="mt-1 text-neutral-500">{{ detailBooking.status }} · {{ detailBooking.paymentStatus }} · {{ detailBooking.paymentProvider || '—' }} · {{ detailBooking.source || 'ONLINE' }}</p>
            <div class="mt-2 flex flex-wrap gap-2">
              <a v-if="detailBooking.waLink" :href="detailBooking.waLink" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 font-bold text-emerald-600 hover:text-emerald-700">
                <Phone class="h-3.5 w-3.5" aria-hidden="true" /> WhatsApp
              </a>
              <a v-if="waReassignUrl" :href="waReassignUrl" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-700">
                <Phone class="h-3.5 w-3.5" aria-hidden="true" /> {{ t('calendar.notifyCustomer') }}
              </a>
            </div>
          </div>
          <div v-if="canAssign" class="rounded-lg border p-3" :style="{ borderColor: 'var(--color-border)' }">
            <p class="mb-2 font-bold">{{ t('adminBookings.assignStaff') }}</p>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="s in picker"
                :key="s.id"
                type="button"
                :disabled="assigning || !s.isAvailable"
                class="rounded-full border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-40"
                :style="{ borderColor: 'var(--color-border)' }"
                :title="s.reason || s.name"
                @click="assignTo(s.id)" :aria-label="s.reason || s.name">
                {{ s.name }}{{ s.isAvailable ? '' : ' ✕' }}
              </button>
            </div>
          </div>
          <div v-if="canAssign" class="rounded-lg border p-3" :style="{ borderColor: 'var(--color-border)' }">
            <p class="mb-2 font-bold">{{ t('calendar.move') }}</p>
            <div class="flex flex-wrap items-end gap-2">
              <label class="block">
                <span class="mb-1 block text-[11px] text-neutral-500">{{ t('calendar.newSlot') }}</span>
                <input v-model="resched.at" type="datetime-local" :aria-label="t('calendar.newSlot')" class="h-11 rounded-md border bg-transparent px-2 text-xs" :style="{ borderColor: 'var(--color-border)' }" />
              </label>
              <select v-model="resched.staffId" :aria-label="t('adminBookings.assignStaff')" class="h-11 rounded-md border bg-transparent px-2 text-xs" :style="{ borderColor: 'var(--color-border)' }">
                <option value="">{{ t('calendar.keepStaff') }}</option>
                <option v-for="s in picker" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
              <button type="button" :disabled="rescheduling || !resched.at" class="h-11 rounded-md bg-primary px-4 text-xs font-bold text-on-primary disabled:opacity-50" @click="rescheduleCurrent">
                {{ t('calendar.moveBtn') }}
              </button>
            </div>
          </div>
          <button
            v-if="canAssign && detailBooking.status === 'ASSIGNED'"
            type="button"
            :disabled="completing"
            class="h-11 rounded-md bg-emerald-600 px-4 text-xs font-bold text-white disabled:opacity-50"
            @click="completeCurrent"
          >
            {{ t('staffBookings.markCompleted') }}
          </button>
          <p class="text-[11px] text-neutral-400">{{ t('calendar.cancelNote') }}</p>
        </div>
      </div>
    </div>

    <!-- Manual modal -->
    <div
      v-if="manualOpen"
      class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      @click.self="manualOpen = false"
@keydown.escape="manualOpen = false"
    >
      <div class="w-full max-w-lg rounded-xl border bg-white p-5 shadow-xl dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="font-heading text-sm font-bold">{{ t('calendar.manual') }}</h3>
          <button type="button" class="text-neutral-400 hover:text-neutral-600" :aria-label="t('calendar.close')" @click="manualOpen = false">
            <X class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div v-if="manualResult" class="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs dark:border-emerald-900/50 dark:bg-emerald-950/40">
          <p class="font-bold text-emerald-700 dark:text-emerald-300">{{ manualResult.bookingNumber }}</p>
          <div v-if="manualResult.payUrl" class="mt-2 flex flex-wrap items-center gap-2">
            <code class="rounded bg-white px-2 py-1 font-mono text-[11px] dark:bg-black/30" dir="ltr">{{ manualResult.payUrl }}</code>
            <button type="button" class="rounded-md bg-primary px-3 py-1.5 text-[11px] font-bold text-on-primary" @click="navigator.clipboard?.writeText(`${location.origin}${manualResult!.payUrl}`)">
              {{ t('calendar.copy') }}
            </button>
            <a v-if="payLinkWa()" :href="payLinkWa()" target="_blank" rel="noopener noreferrer" class="rounded-md bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white">WhatsApp</a>
          </div>
        </div>
        <div v-else class="grid gap-3 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1 block text-xs font-semibold">{{ t('booking.service') }} *</span>
            <select v-model="manual.serviceId" class="h-11 w-full rounded-md border bg-transparent px-2 text-sm" :style="{ borderColor: 'var(--color-border)' }">
              <option value="">—</option>
              <option v-for="s in (services || [])" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </label>
          <label class="block">
            <span class="mb-1 block text-xs font-semibold">{{ t('calendar.staff') }} *</span>
            <select v-model="manual.staffId" class="h-11 w-full rounded-md border bg-transparent px-2 text-sm" :style="{ borderColor: 'var(--color-border)' }">
              <option value="any">{{ t('booking.anyStaff') }}</option>
              <option v-for="s in (staffOpts?.staff || [])" :key="s.id" :value="s.id">{{ s.displayName }}</option>
            </select>
          </label>
          <label class="block sm:col-span-2">
            <span class="mb-1 block text-xs font-semibold">{{ t('booking.startsAt') }} *</span>
            <input v-model="manual.startsAt" type="datetime-local" class="h-11 w-full rounded-md border bg-transparent px-2 text-sm" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
          <label class="block">
            <span class="mb-1 block text-xs font-semibold">{{ t('booking.name') }} *</span>
            <input v-model="manual.name" type="text" class="h-11 w-full rounded-md border bg-transparent px-2 text-sm" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
          <label class="block">
            <span class="mb-1 block text-xs font-semibold">{{ t('booking.phone') }} *</span>
            <input v-model="manual.phone" type="tel" dir="ltr" class="h-11 w-full rounded-md border bg-transparent px-2 text-sm" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
          <label class="block">
            <span class="mb-1 block text-xs font-semibold">{{ t('booking.email') }}</span>
            <input v-model="manual.email" type="email" dir="ltr" class="h-11 w-full rounded-md border bg-transparent px-2 text-sm" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
          <label class="block">
            <span class="mb-1 block text-xs font-semibold">{{ t('booking.note') }}</span>
            <input v-model="manual.note" type="text" class="h-11 w-full rounded-md border bg-transparent px-2 text-sm" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
          <label class="block">
            <span class="mb-1 block text-xs font-semibold">{{ t('calendar.source') }}</span>
            <select v-model="manual.source" class="h-11 w-full rounded-md border bg-transparent px-2 text-sm" :style="{ borderColor: 'var(--color-border)' }">
              <option value="WALK_IN">{{ t('calendar.srcWalkIn') }}</option>
              <option value="WHATSAPP">{{ t('calendar.srcWhatsapp') }}</option>
              <option value="PHONE">{{ t('calendar.srcPhone') }}</option>
            </select>
          </label>
          <label class="block">
            <span class="mb-1 block text-xs font-semibold">{{ t('calendar.payment') }}</span>
            <select v-model="manual.paymentMode" class="h-11 w-full rounded-md border bg-transparent px-2 text-sm" :style="{ borderColor: 'var(--color-border)' }">
              <option value="paid_in_salon">{{ t('calendar.paySalon') }}</option>
              <option value="pending">{{ t('calendar.payPending') }}</option>
              <option value="pay_link">{{ t('calendar.payLink') }}</option>
            </select>
          </label>
          <label v-if="manual.paymentMode === 'paid_in_salon'" class="block">
            <span class="mb-1 block text-xs font-semibold">{{ t('calendar.payMethod') }}</span>
            <select v-model="manual.paymentMethod" class="h-11 w-full rounded-md border bg-transparent px-2 text-sm" :style="{ borderColor: 'var(--color-border)' }">
              <option value="cash">{{ t('calendar.payCash') }}</option>
              <option value="card">{{ t('calendar.payCard') }}</option>
            </select>
          </label>
        </div>
        <p v-if="manualError" role="alert" class="mt-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">{{ manualError }}</p>
        <div class="mt-4 flex justify-end gap-2">
          <button type="button" class="h-11 rounded-md px-4 text-xs font-semibold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800" @click="manualOpen = false">{{ t('calendar.close') }}</button>
          <button
            v-if="!manualResult"
            type="button"
            :disabled="savingManual || !manual.serviceId || !manual.startsAt || !manual.name.trim() || !manual.phone.trim()"
            class="h-11 rounded-md bg-primary px-5 text-xs font-bold text-on-primary disabled:opacity-50"
            @click="saveManual"
          >
            {{ savingManual ? '…' : t('calendar.createBooking') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
