<script setup lang="ts">
import { Clock } from 'lucide-vue-next'

definePageMeta({ layout: 'admin', middleware: 'admin-auth', requiredPermission: 'services.manage' })

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

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function toHhmm(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const { data, refresh, pending } = await useAsyncData('admin-working-hours', () =>
  fetch<{ days: { weekday: number, openMin: number, closeMin: number, isClosed: boolean }[] }>('/api/admin/working-hours'),
)

const rows = ref<DayRow[]>(DAY_KEYS.map((_, weekday) => ({
  weekday,
  open: '09:00',
  close: '18:00',
  isClosed: weekday === 0,
})))

watch(data, (val) => {
  if (!val) return
  const byDay = new Map(val.days.map(d => [d.weekday, d]))
  rows.value = DAY_KEYS.map((_, weekday) => {
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
}, { immediate: true })

const saving = ref(false)
const formError = ref('')

async function save() {
  formError.value = ''
  const days = rows.value.map(r => ({
    weekday: r.weekday,
    openMin: toMinutes(r.open),
    closeMin: toMinutes(r.close),
    isClosed: r.isClosed,
  }))
  for (const d of days) {
    if (!d.isClosed && d.closeMin <= d.openMin) {
      formError.value = locale.value === 'ar' ? 'وقت الإغلاق يجب أن يكون بعد وقت الفتح.' : 'Closing time must be after opening time.'
      return
    }
  }
  saving.value = true
  try {
    await $fetch('/api/admin/working-hours', { method: 'PUT', body: { days } })
    await refresh()
    toast.success(
      locale.value === 'ar' ? 'تم حفظ ساعات العمل' : 'Schedule Saved',
      t('schedule.saved'),
    )
  }
  catch (e: any) {
    formError.value = e?.data?.message || 'Save failed'
    toast.error(
      locale.value === 'ar' ? 'فشل حفظ ساعات العمل' : 'Save Failed',
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
    <AdminPageHeader
      :title="t('schedule.title')"
      :description="t('schedule.description')"
    >
      <template #actions>
        <button
          type="button"
          :disabled="saving || pending"
          class="inline-flex h-10 items-center gap-1.5 rounded-md bg-[#F5CC07] px-4 text-xs font-semibold text-slate-950 shadow-xs transition-colors hover:bg-yellow-400 disabled:opacity-50"
          @click="save"
        >
          <Clock class="h-4 w-4" aria-hidden="true" />
          <span>{{ saving ? (locale === 'ar' ? 'جاري الحفظ…' : 'Saving…') : (locale === 'ar' ? 'حفظ ساعات العمل' : 'Save Schedule') }}</span>
        </button>
      </template>
    </AdminPageHeader>

    <div
      v-if="formError"
      role="alert"
      class="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
    >
      {{ formError }}
    </div>

    <div class="overflow-hidden rounded-md border bg-white shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[560px] text-start text-sm">
          <thead class="sticky top-0 z-10">
            <tr class="border-b bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/40 dark:text-slate-400" :style="{ borderColor: 'var(--color-border)' }">
              <th scope="col" class="px-4 py-3 text-start">{{ t('schedule.day') }}</th>
              <th scope="col" class="px-4 py-3 text-center">{{ t('schedule.open') }}</th>
              <th scope="col" class="px-4 py-3 text-center">{{ t('schedule.close') }}</th>
              <th scope="col" class="px-4 py-3 text-center">{{ t('schedule.closed') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
            <tr
              v-for="(row, i) in rows"
              :key="row.weekday"
              class="transition-colors even:bg-slate-50/50 even:dark:bg-slate-800/30 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
              :class="{ 'opacity-60': row.isClosed }"
            >
              <td class="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                {{ t(`schedule.${DAY_KEYS[i]}`) }}
              </td>
              <td class="px-4 py-3 text-center">
                <input
                  v-model="row.open"
                  type="time"
                  :disabled="row.isClosed"
                  class="h-9 rounded-md border bg-white px-2 text-xs text-slate-700 focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 disabled:opacity-50 dark:bg-[#0B1520] dark:text-slate-300"
                  :style="{ borderColor: 'var(--color-border)' }"
                />
              </td>
              <td class="px-4 py-3 text-center">
                <input
                  v-model="row.close"
                  type="time"
                  :disabled="row.isClosed"
                  class="h-9 rounded-md border bg-white px-2 text-xs text-slate-700 focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 disabled:opacity-50 dark:bg-[#0B1520] dark:text-slate-300"
                  :style="{ borderColor: 'var(--color-border)' }"
                />
              </td>
              <td class="px-4 py-3 text-center">
                <input
                  v-model="row.isClosed"
                  type="checkbox"
                  class="h-4 w-4 rounded accent-[#2B71AE]"
                  :aria-label="t('schedule.closed')"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
