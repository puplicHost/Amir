<script setup lang="ts">
import { AlertTriangle, Clock, RefreshCw } from 'lucide-vue-next'

const { t, locale } = useI18n()
const toast = useAdminToast()
const fetch = useRequestFetch()

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

interface DayRow {
  weekday: number
  open: string
  close: string
  isClosed: boolean
}

interface ApiDay {
  weekday: number
  openMin: number
  closeMin: number
  isClosed: boolean
  updatedAt?: string
}

interface WorkingHoursResponse {
  days: ApiDay[]
  revision: string | null
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function toHhmm(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function defaultRows(): DayRow[] {
  return DAY_KEYS.map((_, weekday) => ({
    weekday,
    open: '09:00',
    close: '18:00',
    isClosed: weekday === 0,
  }))
}

function mapApiDays(days: ApiDay[]): DayRow[] {
  const byDay = new Map(days.map(d => [d.weekday, d]))
  return DAY_KEYS.map((_, weekday) => {
    const saved = byDay.get(weekday)
    if (!saved) {
      return { weekday, open: '09:00', close: '18:00', isClosed: weekday === 0 }
    }
    return {
      weekday,
      open: toHhmm(saved.openMin),
      close: toHhmm(saved.closeMin),
      isClosed: saved.isClosed,
    }
  })
}

const rows = ref<DayRow[]>(defaultRows())
const savedRows = ref<DayRow[]>(defaultRows())
const revision = ref<string | null>(null)
const loaded = ref(false)
const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const formError = ref('')
const showDiff = ref(false)

function applyResponse(res: WorkingHoursResponse) {
  const mapped = mapApiDays(Array.isArray(res.days) ? res.days : [])
  rows.value = mapped
  savedRows.value = mapped.map(r => ({ ...r }))
  revision.value = res.revision ?? null
  loaded.value = true
  loadError.value = ''
}

async function load() {
  loading.value = true
  loaded.value = false
  loadError.value = ''
  formError.value = ''
  showDiff.value = false
  try {
    const res = await fetch<WorkingHoursResponse>('/api/admin/working-hours')
    applyResponse(res)
  }
  catch (e: any) {
    // AUDIT P1-03: never leave editable defaults on screen after a failed load.
    loadError.value = e?.data?.message
      || e?.data?.statusMessage
      || (locale.value === 'de' ? 'Sollzeiten konnten nicht geladen werden.' : 'Could not load the schedule.')
  }
  finally {
    loading.value = false
  }
}

await load()

const dirty = computed(() => loaded.value
  && JSON.stringify(rows.value) !== JSON.stringify(savedRows.value))

const changes = computed(() => {
  const before = new Map(savedRows.value.map(r => [r.weekday, r]))
  return rows.value
    .map((row) => {
      const old = before.get(row.weekday)
      if (!old) return null
      const changed = old.open !== row.open || old.close !== row.close || old.isClosed !== row.isClosed
      if (!changed) return null
      return {
        weekday: row.weekday,
        day: t(`schedule.${DAY_KEYS[row.weekday]}`),
        from: old.isClosed ? (locale.value === 'de' ? 'geschlossen' : 'closed') : `${old.open}–${old.close}`,
        to: row.isClosed ? (locale.value === 'de' ? 'geschlossen' : 'closed') : `${row.open}–${row.close}`,
      }
    })
    .filter(Boolean) as Array<{ weekday: number, day: string, from: string, to: string }>
})

function validate(): boolean {
  formError.value = ''
  for (const row of rows.value) {
    if (!row.isClosed && toMinutes(row.close) <= toMinutes(row.open)) {
      formError.value = locale.value === 'ar'
        ? 'وقت الإغلاق يجب أن يكون بعد وقت الفتح.'
        : (locale.value === 'de'
            ? 'Die Schließzeit muss nach der Öffnungszeit liegen.'
            : 'Closing time must be after opening time.')
      return false
    }
  }
  return true
}

function requestSave() {
  if (!loaded.value || !dirty.value) return
  if (!validate()) return
  showDiff.value = true
}

async function save() {
  if (!loaded.value) return
  if (!validate()) return
  const days = rows.value.map(r => ({
    weekday: r.weekday,
    openMin: toMinutes(r.open),
    closeMin: toMinutes(r.close),
    isClosed: r.isClosed,
  }))
  saving.value = true
  formError.value = ''
  try {
    const res = await fetch<WorkingHoursResponse>('/api/admin/working-hours', {
      method: 'PUT',
      body: { days, expectedRevision: revision.value },
    })
    applyResponse(res)
    showDiff.value = false
    toast.success(
      locale.value === 'ar' ? 'تم حفظ ساعات العمل' : (locale.value === 'de' ? 'Öffnungszeiten gespeichert' : 'Schedule Saved'),
      t('schedule.saved'),
    )
  }
  catch (e: any) {
    const status = e?.statusCode ?? e?.data?.statusCode
    formError.value = status === 409
      ? (locale.value === 'de'
          ? 'Die Öffnungszeiten wurden zwischenzeitlich geändert. Bitte neu laden.'
          : 'The schedule changed in the meantime. Reload before saving.')
      : (e?.data?.message || e?.data?.statusMessage || 'Save failed')
    showDiff.value = false
    toast.error(
      locale.value === 'ar' ? 'فشل حفظ ساعات العمل' : (locale.value === 'de' ? 'Speichern fehlgeschlagen' : 'Save Failed'),
      formError.value,
    )
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <div class="mb-4 flex flex-wrap items-center justify-end gap-2">
      <span v-if="dirty" class="me-auto text-xs font-medium text-amber-700 dark:text-amber-300">
        {{ locale === 'de' ? 'Ungespeicherte Änderungen' : (locale === 'ar' ? 'تغييرات غير محفوظة' : 'Unsaved changes') }}
      </span>
      <button
        type="button"
        :disabled="saving || loading || !loaded || !dirty"
        class="inline-flex h-11 items-center gap-1.5 rounded-md bg-primary px-4 text-xs font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        @click="requestSave"
      >
        <Clock class="h-4 w-4" aria-hidden="true" />
        <span>{{ saving ? (locale === 'ar' ? 'جاري الحفظ…' : (locale === 'de' ? 'Speichern…' : 'Saving…')) : (locale === 'ar' ? 'حفظ ساعات العمل' : (locale === 'de' ? 'Öffnungszeiten speichern' : 'Save Schedule')) }}</span>
      </button>
    </div>

    <!-- Blocking load failure: no editable rows, no Save. -->
    <div
      v-if="loadError"
      role="alert"
      class="mb-4 rounded-md border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
    >
      <div class="flex items-start gap-2">
        <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div class="min-w-0 flex-1">
          <p class="font-bold">{{ locale === 'de' ? 'Öffnungszeiten konnten nicht geladen werden' : 'Schedule could not be loaded' }}</p>
          <p class="mt-1 text-xs">{{ loadError }}</p>
          <p class="mt-1 text-xs font-medium">
            {{ locale === 'de'
              ? 'Speichern ist deaktiviert, damit keine Standardwerte echte Zeiten überschreiben.'
              : 'Saving is disabled so defaults cannot overwrite real hours.' }}
          </p>
          <button
            type="button"
            class="mt-3 inline-flex h-9 items-center gap-1.5 rounded-md border border-current px-3 text-xs font-semibold hover:bg-white/40 dark:hover:bg-black/20"
            @click="load"
          >
            <RefreshCw class="h-3.5 w-3.5" aria-hidden="true" />
            {{ locale === 'de' ? 'Erneut laden' : 'Retry' }}
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="loading" role="status" class="rounded-md border border-border bg-surface p-6 text-sm text-muted">
      {{ locale === 'de' ? 'Öffnungszeiten werden geladen…' : 'Loading schedule…' }}
    </div>

    <template v-else>
      <div
        v-if="formError"
        role="alert"
        class="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
      >
        {{ formError }}
      </div>

      <!-- AUDIT P1-03: explicit diff confirmation before persisting. -->
      <div
        v-if="showDiff && changes.length"
        class="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
      >
        <p class="font-bold">{{ locale === 'de' ? 'Änderungen bestätigen' : 'Confirm changes' }}</p>
        <ul class="mt-2 space-y-1">
          <li v-for="change in changes" :key="change.weekday">
            <span class="font-semibold">{{ change.day }}:</span>
            {{ change.from }} → {{ change.to }}
          </li>
        </ul>
        <div class="mt-3 flex gap-2">
          <button type="button" class="rounded-md bg-primary px-3 py-1.5 font-semibold text-on-primary disabled:opacity-50" :disabled="saving" @click="save">
            {{ saving ? (locale === 'de' ? 'Speichern…' : 'Saving…') : (locale === 'de' ? 'Jetzt speichern' : 'Save now') }}
          </button>
          <button type="button" class="rounded-md border border-current px-3 py-1.5 font-semibold" :disabled="saving" @click="showDiff = false">
            {{ locale === 'de' ? 'Abbrechen' : 'Cancel' }}
          </button>
        </div>
      </div>

      <div class="overflow-hidden rounded-md border bg-white shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[560px] text-start text-sm">
            <thead class="sticky top-0 z-10">
              <tr class="border-b bg-neutral-50/75 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:bg-neutral-800/40 dark:text-neutral-400" :style="{ borderColor: 'var(--color-border)' }">
                <th scope="col" class="px-4 py-3 text-start">{{ t('schedule.day') }}</th>
                <th scope="col" class="px-4 py-3 text-center">{{ t('schedule.open') }}</th>
                <th scope="col" class="px-4 py-3 text-center">{{ t('schedule.close') }}</th>
                <th scope="col" class="px-4 py-3 text-center">{{ t('schedule.closed') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              <tr
                v-for="(row, i) in rows"
                :key="row.weekday"
                class="transition-colors even:bg-neutral-50/50 even:dark:bg-neutral-800/30 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40"
                :class="{ 'opacity-60': row.isClosed }"
              >
                <td class="px-4 py-3 font-semibold text-neutral-900 dark:text-neutral-100">
                  {{ t(`schedule.${DAY_KEYS[i]}`) }}
                </td>
                <td class="px-4 py-3 text-center">
                  <input
                    v-model="row.open"
                    type="time"
                    :disabled="row.isClosed"
                    :aria-label="`${t(`schedule.${DAY_KEYS[i]}`)} ${t('schedule.open')}`"
                    class="h-11 rounded-md border bg-white px-2 text-xs text-neutral-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 dark:bg-bg dark:text-neutral-300"
                    :style="{ borderColor: 'var(--color-border)' }"
                  />
                </td>
                <td class="px-4 py-3 text-center">
                  <input
                    v-model="row.close"
                    type="time"
                    :disabled="row.isClosed"
                    :aria-label="`${t(`schedule.${DAY_KEYS[i]}`)} ${t('schedule.close')}`"
                    class="h-11 rounded-md border bg-white px-2 text-xs text-neutral-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 dark:bg-bg dark:text-neutral-300"
                    :style="{ borderColor: 'var(--color-border)' }"
                  />
                </td>
                <td class="px-4 py-3 text-center">
                  <input
                    v-model="row.isClosed"
                    type="checkbox"
                    class="h-4 w-4 rounded accent-primary"
                    :aria-label="t('schedule.closed')"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
