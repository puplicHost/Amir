<script setup lang="ts">
import { Loader2, Plus, Trash2, Upload, Users } from 'lucide-vue-next'

const { t, locale } = useI18n()
const toast = useAdminToast()
const { confirm: confirmDialog } = useAdminConfirm()
const fetch = useRequestFetch()

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

interface StaffRow {
  id: string
  name: string
  email: string
  isActive: boolean
  profile: { displayName: string, imagePath: string | null, isBookable: boolean, sortOrder: number } | null
  serviceIds: string[]
}
interface ServiceRow { id: string, slug: string, name: string, section: string, isActive: boolean }

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
function toHhmm(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}
function errMsg(e: any): string {
  return e?.data?.message || e?.data?.statusMessage || t('staffAdmin.saveFailed')
}

const { data: staffData, refresh: refreshStaff } = useAsyncData('admin-staff', () =>
  fetch<{ staff: StaffRow[], services: ServiceRow[] }>('/api/admin/staff'),
)
const { data: hoursData } = useAsyncData('admin-staff-hours', () =>
  fetch<{ days: { weekday: number, openMin: number, closeMin: number, isClosed: boolean }[] }>('/api/admin/working-hours'),
)
const { data: closuresData, refresh: refreshClosures } = useAsyncData('admin-closures', () =>
  fetch<{ closures: { day: string, reason: string | null }[] }>('/api/admin/closures'),
)

const staffList = computed(() => staffData.value?.staff || [])
const serviceList = computed(() => staffData.value?.services || [])
const salonHours = computed(() => {
  const map = new Map((hoursData.value?.days || []).map(d => [d.weekday, d]))
  return DAY_KEYS.map((_, weekday) => map.get(weekday) || { weekday, openMin: 540, closeMin: 1080, isClosed: weekday === 0 })
})

const selectedId = ref('')
watch(staffList, (list) => {
  if (!list.length) { selectedId.value = ''; return }
  if (!list.some(s => s.id === selectedId.value)) selectedId.value = list[0].id
}, { immediate: true })
const selected = computed(() => staffList.value.find(s => s.id === selectedId.value) || null)

// ── Profile ──
const profileForm = reactive({ displayName: '', isBookable: true, sortOrder: 0 })
const profileMsg = ref('')
const savingProfile = ref(false)
watch(selected, (s) => {
  profileForm.displayName = s?.profile?.displayName || s?.name || ''
  profileForm.isBookable = s?.profile?.isBookable ?? true
  profileForm.sortOrder = s?.profile?.sortOrder ?? 0
  profileMsg.value = ''
  void loadSchedule()
  void loadTimeOff()
}, { immediate: true })

async function saveProfile() {
  if (!selected.value) return
  profileMsg.value = ''
  savingProfile.value = true
  try {
    await $fetch(`/api/admin/staff/${selected.value.id}/profile`, {
      method: 'PUT',
      body: {
        displayName: profileForm.displayName.trim(),
        isBookable: profileForm.isBookable,
        sortOrder: Number(profileForm.sortOrder) || 0,
      },
    })
    await refreshStaff()
    toast.success(locale.value === 'ar' ? 'تم الحفظ' : 'Saved', t('staffAdmin.profileSaved'))
  }
  catch (e: any) { profileMsg.value = errMsg(e) }
  finally { savingProfile.value = false }
}

const uploadingPhoto = ref(false)
async function uploadPhoto(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !selected.value) return
  uploadingPhoto.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    await $fetch(`/api/admin/staff/${selected.value.id}/photo`, { method: 'POST', body: fd })
    await refreshStaff()
    toast.success(locale.value === 'ar' ? 'تم الحفظ' : 'Saved', t('staffAdmin.profileSaved'))
  }
  catch (e: any) { profileMsg.value = errMsg(e) }
  finally { uploadingPhoto.value = false }
}

// ── Services ──
const serviceIds = ref<string[]>([])
watch(selected, (s) => { serviceIds.value = [...(s?.serviceIds || [])] })
const savingServices = ref(false)
async function saveServices() {
  if (!selected.value) return
  savingServices.value = true
  try {
    await $fetch(`/api/admin/staff/${selected.value.id}/services`, {
      method: 'PUT',
      body: { serviceIds: serviceIds.value },
    })
    await refreshStaff()
    toast.success(locale.value === 'ar' ? 'تم الحفظ' : 'Saved', t('staffAdmin.servicesSaved'))
  }
  catch (e: any) { toast.error('Error', errMsg(e)) }
  finally { savingServices.value = false }
}

// ── Schedule (only custom days are stored; the rest inherit studio hours) ──
interface SchedRow { weekday: number, custom: boolean, open: string, close: string, isClosed: boolean }
const schedRows = ref<SchedRow[]>([])
const savingSchedule = ref(false)
async function loadSchedule() {
  if (!selected.value) { schedRows.value = []; return }
  try {
    const res = await $fetch<{ schedule: { weekday: number, openMin: number, closeMin: number, isClosed: boolean }[] }>(
      `/api/admin/staff/${selected.value.id}/schedule`,
    )
    const overrides = new Map(res.schedule.map(d => [d.weekday, d]))
    schedRows.value = DAY_KEYS.map((_, weekday) => {
      const o = overrides.get(weekday)
      return o
        ? { weekday, custom: true, open: toHhmm(o.openMin), close: toHhmm(o.closeMin), isClosed: o.isClosed }
        : { weekday, custom: false, open: '09:00', close: '18:00', isClosed: false }
    })
  }
  catch { schedRows.value = [] }
}
async function saveSchedule() {
  if (!selected.value) return
  const days = schedRows.value
    .filter(r => r.custom)
    .map(r => ({ weekday: r.weekday, openMin: toMinutes(r.open), closeMin: toMinutes(r.close), isClosed: r.isClosed }))
  for (const d of days) {
    if (!d.isClosed && d.closeMin <= d.openMin) {
      toast.error('Error', locale.value === 'ar' ? 'وقت الإغلاق يجب أن يكون بعد وقت الفتح.' : 'Closing time must be after opening time.')
      return
    }
  }
  savingSchedule.value = true
  try {
    await $fetch(`/api/admin/staff/${selected.value.id}/schedule`, { method: 'PUT', body: { days } })
    toast.success(locale.value === 'ar' ? 'تم الحفظ' : 'Saved', t('staffAdmin.scheduleSaved'))
  }
  catch (e: any) { toast.error('Error', errMsg(e)) }
  finally { savingSchedule.value = false }
}

// ── Absences ──
interface TimeOffRow { id: string, startsAt: string, endsAt: string, reason: string | null }
const timeOffRows = ref<TimeOffRow[]>([])
const offForm = reactive({ from: '', to: '', reason: '' })
const savingOff = ref(false)
async function loadTimeOff() {
  if (!selected.value) { timeOffRows.value = []; return }
  try {
    const res = await $fetch<{ timeOff: TimeOffRow[] }>(`/api/admin/staff/${selected.value.id}/timeoff`)
    timeOffRows.value = res.timeOff
  }
  catch { timeOffRows.value = [] }
}
function fmtDt(iso: string): string {
  return new Date(iso).toLocaleString(locale.value === 'ar' ? 'ar-EG' : 'de-DE', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}
async function addTimeOff() {
  if (!selected.value || !offForm.from || !offForm.to) return
  savingOff.value = true
  try {
    await $fetch(`/api/admin/staff/${selected.value.id}/timeoff`, {
      method: 'POST',
      body: {
        startsAt: new Date(offForm.from).toISOString(),
        endsAt: new Date(offForm.to).toISOString(),
        reason: offForm.reason.trim() || undefined,
      },
    })
    offForm.from = ''; offForm.to = ''; offForm.reason = ''
    await loadTimeOff()
    toast.success(locale.value === 'ar' ? 'تم الحفظ' : 'Saved', t('staffAdmin.absenceAdded'))
  }
  catch (e: any) { toast.error('Error', errMsg(e)) }
  finally { savingOff.value = false }
}
async function removeTimeOff(row: TimeOffRow) {
  if (!selected.value) return
  const ok = await confirmDialog({
    title: locale.value === 'ar' ? 'حذف الغياب؟' : 'Remove absence?',
    message: locale.value === 'ar' ? 'سيتم حذف هذا الغياب نهائياً.' : 'This absence will be permanently removed.',
    confirmLabel: t('staffAdmin.remove'),
  })
  if (!ok) return
  try {
    await $fetch(`/api/admin/staff/${selected.value.id}/timeoff/${row.id}`, { method: 'DELETE' })
    await loadTimeOff()
    toast.success(locale.value === 'ar' ? 'تم الحذف' : 'Removed', t('staffAdmin.absenceRemoved'))
  }
  catch (e: any) { toast.error('Error', errMsg(e)) }
}

// ── Studio closures ──
const closureForm = reactive({ day: '', reason: '' })
const savingClosure = ref(false)
async function addClosure() {
  if (!closureForm.day) return
  savingClosure.value = true
  try {
    await $fetch('/api/admin/closures', {
      method: 'POST',
      body: { day: closureForm.day, reason: closureForm.reason.trim() || undefined },
    })
    closureForm.day = ''; closureForm.reason = ''
    await refreshClosures()
    toast.success(locale.value === 'ar' ? 'تم الحفظ' : 'Saved', t('staffAdmin.closureAdded'))
  }
  catch (e: any) { toast.error('Error', errMsg(e)) }
  finally { savingClosure.value = false }
}
async function removeClosure(day: string) {
  const ok = await confirmDialog({
    title: locale.value === 'ar' ? 'حذف يوم الإغلاق؟' : 'Remove closure day?',
    message: locale.value === 'ar' ? 'سيتم إعادة فتح الحجوزات في هذا اليوم.' : 'Online bookings will be re-enabled for this day.',
    confirmLabel: t('staffAdmin.remove'),
  })
  if (!ok) return
  try {
    await $fetch(`/api/admin/closures/${day}`, { method: 'DELETE' })
    await refreshClosures()
    toast.success(locale.value === 'ar' ? 'تم الحذف' : 'Removed', t('staffAdmin.closureRemoved'))
  }
  catch (e: any) { toast.error('Error', errMsg(e)) }
}
</script>

<template>
  <div>
    <AdminEmptyState
      v-if="!staffList.length"
      :title="t('staffAdmin.noStaffUsers')"
      :description="locale === 'ar' ? 'أضف أعضاء الفريق من تبويب المستخدمين والصلاحيات ثم اضبط ملفاتهم المهنية هنا.' : 'Add team members from the Users & Permissions tab, then configure their profiles here.'"
      :icon="Users"
    />

    <div v-else class="grid gap-6 lg:grid-cols-[240px_1fr]">
      <!-- Roster -->
      <div class="space-y-2" role="listbox" :aria-label="t('staffAdmin.selectStaff')">
        <button
          v-for="s in staffList"
          :key="s.id"
          type="button"
          role="option"
          :aria-selected="selectedId === s.id"
          class="flex w-full items-center gap-3 rounded-xl border p-3 text-start transition"
          :class="selectedId === s.id
            ? 'border-primary bg-neutral-50/60 dark:bg-neutral-950/20'
            : 'border-border bg-white hover:border-primary dark:bg-neutral-900'"
          :style="selectedId === s.id ? {} : { borderColor: 'var(--color-border)' }"
          @click="selectedId = s.id"
        >
          <img
            v-if="s.profile?.imagePath"
            :src="s.profile.imagePath"
            width="80" height="80"
            :alt="s.profile.displayName"
            class="h-11 w-10 shrink-0 rounded-full border object-cover"
            :style="{ borderColor: 'var(--color-border)' }"
          />
          <span v-else class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-300" aria-hidden="true">
            {{ (s.profile?.displayName || s.name).slice(0, 1).toUpperCase() }}
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-xs font-bold text-neutral-900 dark:text-neutral-100">{{ s.profile?.displayName || s.name }}</span>
            <span class="block truncate text-[11px] text-neutral-500">{{ s.name }}</span>
            <span v-if="!s.isActive" class="mt-0.5 inline-block rounded bg-rose-100 px-1.5 py-px text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">{{ t('staffAdmin.inactive') }}</span>
            <span v-else-if="s.profile && !s.profile.isBookable" class="mt-0.5 inline-block rounded bg-neutral-100 px-1.5 py-px text-[10px] font-bold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">{{ t('staffAdmin.bookable') }}: ✕</span>
          </span>
        </button>
      </div>

      <!-- Editor -->
      <div v-if="selected" class="space-y-6">
        <div
          v-if="profileMsg"
          role="alert"
          class="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
        >
          {{ profileMsg }}
        </div>

        <!-- Profile -->
        <section class="rounded-xl border bg-white p-4 shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
          <h2 class="font-heading text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-4">{{ t('staffAdmin.profile') }}</h2>
          <div class="flex flex-wrap items-center gap-4 mb-4">
            <img
              v-if="selected.profile?.imagePath"
              :src="selected.profile.imagePath"
              width="128" height="128"
              :alt="profileForm.displayName"
              class="h-16 w-16 rounded-full border object-cover"
              :style="{ borderColor: 'var(--color-border)' }"
            />
            <label class="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-md border px-3.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800" :style="{ borderColor: 'var(--color-border)' }">
              <Upload class="h-3.5 w-3.5" aria-hidden="true" />
              <span>{{ uploadingPhoto ? '…' : t('staffAdmin.uploadPhoto') }}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" @change="uploadPhoto" />
            </label>
          </div>
          <div class="grid gap-4 sm:grid-cols-3">
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('staffAdmin.displayName') }} *</span>
              <input v-model="profileForm.displayName" type="text" class="h-11 w-full rounded-md border bg-transparent px-3 text-sm focus:border-primary focus:outline-none" :style="{ borderColor: 'var(--color-border)' }" />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('staffAdmin.sortOrder') }}</span>
              <input v-model.number="profileForm.sortOrder" type="number" min="0" max="100000" class="h-11 w-full rounded-md border bg-transparent px-3 text-sm focus:border-primary focus:outline-none" :style="{ borderColor: 'var(--color-border)' }" />
            </label>
            <label class="flex items-end gap-2 pb-2">
              <input v-model="profileForm.isBookable" type="checkbox" class="h-4 w-4 rounded accent-primary" />
              <span class="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('staffAdmin.bookable') }}</span>
            </label>
          </div>
          <button
            type="button"
            :disabled="savingProfile"
            class="mt-4 inline-flex h-11 items-center rounded-md bg-primary px-4 text-xs font-bold text-on-primary hover:bg-primary/90 disabled:opacity-50"
            @click="saveProfile"
          >
            <Loader2 v-if="savingProfile" class="me-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            {{ t('staffAdmin.saveProfile') }}
          </button>
        </section>

        <!-- Services -->
        <section class="rounded-xl border bg-white p-4 shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
          <h2 class="font-heading text-sm font-bold text-neutral-900 dark:text-neutral-100">{{ t('staffAdmin.services') }}</h2>
          <p class="mt-1 mb-3 text-[11px] text-neutral-500">{{ t('staffAdmin.servicesHint') }}</p>
          <div class="flex flex-wrap gap-2">
            <label
              v-for="svc in serviceList"
              :key="svc.id"
              class="inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
              :class="serviceIds.includes(svc.id)
                ? 'border-primary bg-neutral-50 text-primary dark:bg-neutral-950/40 dark:text-neutral-300'
                : 'text-neutral-500 hover:border-neutral-400 dark:text-neutral-400'"
              :style="serviceIds.includes(svc.id) ? {} : { borderColor: 'var(--color-border)' }"
            >
              <input v-model="serviceIds" type="checkbox" :value="svc.id" class="sr-only" />
              <span>{{ svc.name }}</span>
            </label>
          </div>
          <button
            type="button"
            :disabled="savingServices"
            class="mt-4 inline-flex h-11 items-center rounded-md bg-primary px-4 text-xs font-bold text-on-primary hover:bg-primary/90 disabled:opacity-50"
            @click="saveServices"
          >
            <Loader2 v-if="savingServices" class="me-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            {{ t('staffAdmin.saveServices') }}
          </button>
        </section>

        <!-- Schedule -->
        <section class="rounded-xl border bg-white p-4 shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
          <h2 class="font-heading text-sm font-bold text-neutral-900 dark:text-neutral-100">{{ t('staffAdmin.schedule') }}</h2>
          <p class="mt-1 mb-3 text-[11px] text-neutral-500">{{ t('staffAdmin.scheduleHint') }}</p>
          <div class="space-y-2">
            <div
              v-for="(row, i) in schedRows"
              :key="row.weekday"
              class="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
              :style="{ borderColor: 'var(--color-border)' }"
            >
              <span class="w-24 text-xs font-bold text-neutral-800 dark:text-neutral-200">{{ t(`schedule.${DAY_KEYS[i]}`) }}</span>
              <label class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500">
                <input v-model="row.custom" type="checkbox" class="h-3.5 w-3.5 rounded accent-primary" />
                {{ t('staffAdmin.useStudioHours') }}
              </label>
              <template v-if="row.custom">
                <input
                  v-model="row.open"
                  type="time"
                  :disabled="row.isClosed"
                  class="h-11 rounded-md border bg-transparent px-2 text-xs disabled:opacity-50"
                  :style="{ borderColor: 'var(--color-border)' }"
                />
                <input
                  v-model="row.close"
                  type="time"
                  :disabled="row.isClosed"
                  class="h-11 rounded-md border bg-transparent px-2 text-xs disabled:opacity-50"
                  :style="{ borderColor: 'var(--color-border)' }"
                />
                <label class="inline-flex items-center gap-1.5 text-[11px] text-neutral-500">
                  <input v-model="row.isClosed" type="checkbox" class="h-3.5 w-3.5 rounded accent-primary" />
                  {{ t('schedule.closed') }}
                </label>
              </template>
              <span v-else class="text-[11px] text-neutral-400">
                {{ salonHours[row.weekday]?.isClosed ? t('schedule.closed') : `${toHhmm(salonHours[row.weekday].openMin)} – ${toHhmm(salonHours[row.weekday].closeMin)}` }}
              </span>
            </div>
          </div>
          <button
            type="button"
            :disabled="savingSchedule"
            class="mt-4 inline-flex h-11 items-center rounded-md bg-primary px-4 text-xs font-bold text-on-primary hover:bg-primary/90 disabled:opacity-50"
            @click="saveSchedule"
          >
            <Loader2 v-if="savingSchedule" class="me-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            {{ t('staffAdmin.saveSchedule') }}
          </button>
        </section>

        <!-- Absences -->
        <section class="rounded-xl border bg-white p-4 shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
          <h2 class="font-heading text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-3">{{ t('staffAdmin.absences') }}</h2>
          <div class="mb-3 flex flex-wrap items-end gap-2">
            <label class="block">
              <span class="mb-1 block text-[11px] font-semibold text-neutral-500">{{ t('staffAdmin.from') }}</span>
              <input v-model="offForm.from" type="datetime-local" class="h-11 rounded-md border bg-transparent px-2 text-xs" :style="{ borderColor: 'var(--color-border)' }" />
            </label>
            <label class="block">
              <span class="mb-1 block text-[11px] font-semibold text-neutral-500">{{ t('staffAdmin.to') }}</span>
              <input v-model="offForm.to" type="datetime-local" class="h-11 rounded-md border bg-transparent px-2 text-xs" :style="{ borderColor: 'var(--color-border)' }" />
            </label>
            <label class="block min-w-40 flex-1">
              <span class="mb-1 block text-[11px] font-semibold text-neutral-500">{{ t('staffAdmin.reason') }}</span>
              <input v-model="offForm.reason" type="text" class="h-11 w-full rounded-md border bg-transparent px-2 text-xs" :style="{ borderColor: 'var(--color-border)' }" />
            </label>
            <button
              type="button"
              :disabled="savingOff || !offForm.from || !offForm.to"
              class="inline-flex h-11 items-center gap-1.5 rounded-md bg-primary px-4 text-xs font-bold text-on-primary hover:bg-primary/90 disabled:opacity-50"
              @click="addTimeOff"
            >
              <Plus class="h-3.5 w-3.5" aria-hidden="true" />
              {{ t('staffAdmin.addAbsence') }}
            </button>
          </div>
          <p v-if="!timeOffRows.length" class="text-xs text-neutral-400">{{ t('staffAdmin.noAbsences') }}</p>
          <ul v-else class="space-y-1.5">
            <li
              v-for="row in timeOffRows"
              :key="row.id"
              class="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs"
              :style="{ borderColor: 'var(--color-border)' }"
            >
              <span class="text-neutral-700 dark:text-neutral-300">
                <span class="font-bold" dir="ltr">{{ fmtDt(row.startsAt) }} → {{ fmtDt(row.endsAt) }}</span>
                <span v-if="row.reason" class="ms-2 text-neutral-500">· {{ row.reason }}</span>
              </span>
              <button
                type="button"
                class="inline-flex h-11 items-center gap-1 rounded px-2 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                @click="removeTimeOff(row)"
              >
                <Trash2 class="h-3 w-3" aria-hidden="true" />
                {{ t('staffAdmin.remove') }}
              </button>
            </li>
          </ul>
        </section>

        <!-- Studio closures -->
        <section class="rounded-xl border bg-white p-4 shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
          <h2 class="font-heading text-sm font-bold text-neutral-900 dark:text-neutral-100">{{ t('staffAdmin.closures') }}</h2>
          <p class="mt-1 mb-3 text-[11px] text-neutral-500">{{ t('staffAdmin.closuresHint') }}</p>
          <div class="mb-3 flex flex-wrap items-end gap-2">
            <label class="block">
              <span class="mb-1 block text-[11px] font-semibold text-neutral-500">{{ t('staffAdmin.day') }}</span>
              <input v-model="closureForm.day" type="date" class="h-11 rounded-md border bg-transparent px-2 text-xs" :style="{ borderColor: 'var(--color-border)' }" />
            </label>
            <label class="block min-w-40 flex-1">
              <span class="mb-1 block text-[11px] font-semibold text-neutral-500">{{ t('staffAdmin.reason') }}</span>
              <input v-model="closureForm.reason" type="text" class="h-11 w-full rounded-md border bg-transparent px-2 text-xs" :style="{ borderColor: 'var(--color-border)' }" />
            </label>
            <button
              type="button"
              :disabled="savingClosure || !closureForm.day"
              class="inline-flex h-11 items-center gap-1.5 rounded-md bg-primary px-4 text-xs font-bold text-on-primary hover:bg-primary/90 disabled:opacity-50"
              @click="addClosure"
            >
              <Plus class="h-3.5 w-3.5" aria-hidden="true" />
              {{ t('staffAdmin.addClosure') }}
            </button>
          </div>
          <p v-if="!closuresData?.closures?.length" class="text-xs text-neutral-400">{{ t('staffAdmin.noClosures') }}</p>
          <ul v-else class="flex flex-wrap gap-2">
            <li
              v-for="c in closuresData.closures"
              :key="c.day"
              class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs"
              :style="{ borderColor: 'var(--color-border)' }"
            >
              <span class="font-bold" dir="ltr">{{ c.day }}</span>
              <span v-if="c.reason" class="text-neutral-500">{{ c.reason }}</span>
              <button
                type="button"
                class="text-rose-500 hover:text-rose-700"
                :aria-label="`${t('staffAdmin.remove')} ${c.day}`"
                @click="removeClosure(c.day)"
              >
                <Trash2 class="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>
