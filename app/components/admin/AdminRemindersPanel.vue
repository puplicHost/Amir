<script setup lang="ts">
import { BellRing, Loader2, MailCheck } from 'lucide-vue-next'
import { normalizePhoneForWa } from '~~/shared/booking'

// Due reminders (Roadmap Phase 9): email reminders send automatically;
// WhatsApp reminders are sent manually from here via wa.me links.

const { t, locale } = useI18n()
const fetch = useRequestFetch()
const hours = ref(3)

const { data, refresh, pending } = await useAsyncData('admin-reminders', () =>
  fetch<any>('/api/admin/reminders', { params: { hours: hours.value } }),
)
watch(hours, () => refresh())

let timer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  timer = setInterval(() => refresh(), 60000)
})
onUnmounted(() => clearInterval(timer))

const rows = computed(() => data.value?.reminders || [])

function fmtDt(iso: string): string {
  return new Date(iso).toLocaleString(locale.value === 'ar' ? 'ar-EG' : 'de-DE', {
    weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function waReminderUrl(r: any): string {
  // FE-01: normalize German local numbers (0171… → 49171…) for wa.me.
  const digits = normalizePhoneForWa(r.customerPhone || '')
  if (!digits) return ''
  const msg = locale.value === 'de'
    ? `Hallo ${r.customerName}! Zur Erinnerung: Ihr Termin "${r.serviceName}" findet am ${fmtDt(r.startsAt)} statt. Ihr AMIR-Team`
    : `Hello ${r.customerName}! Reminder: your appointment "${r.serviceName}" is on ${fmtDt(r.startsAt)}. Your AMIR team`
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`
}
</script>

<template>
  <div>
    
    <div class="mb-4 flex items-center gap-2">
      <BellRing class="h-4 w-4 text-neutral-400" aria-hidden="true" />
      <label class="flex items-center gap-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
        {{ t('reminders.nextHours') }}
        <select v-model.number="hours" class="h-11 rounded-md border bg-transparent px-2" :style="{ borderColor: 'var(--color-border)' }">
          <option :value="1">1</option>
          <option :value="3">3</option>
          <option :value="6">6</option>
          <option :value="24">24</option>
        </select>
      </label>
      <span v-if="pending" class="inline-flex items-center gap-1 text-[11px] text-neutral-400">
        <Loader2 class="h-3 w-3 animate-spin" aria-hidden="true" />…
      </span>
    </div>

    <div v-if="!rows.length && !pending" class="rounded-xl border bg-white p-4 dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
      <AdminEmptyState
        :title="t('reminders.none')"
        :description="t('reminders.noneHint')"
        :icon="BellRing"
      />
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="r in rows"
        :key="r.id"
        class="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4 shadow-xs dark:bg-neutral-900"
        :style="{ borderColor: 'var(--color-border)' }"
      >
        <div class="min-w-0">
          <p class="text-xs font-bold text-neutral-900 dark:text-neutral-100" dir="ltr">{{ fmtDt(r.startsAt) }} · {{ r.serviceName }}</p>
          <p class="mt-0.5 text-xs text-neutral-600 dark:text-neutral-300">
            {{ r.customerName }} · <span class="font-mono" dir="ltr">{{ r.customerPhone }}</span>
            <span v-if="r.staffName" class="text-neutral-400"> · {{ r.staffName }}</span>
          </p>
          <p class="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-neutral-400">
            <span class="inline-flex items-center gap-1">
              <MailCheck class="h-3 w-3" aria-hidden="true" />
              {{ r.emailReminder === 'SENT' ? t('reminders.emailSent') : r.emailReminder === 'FAILED' ? t('reminders.emailFailed') : t('reminders.emailQueued') }}
            </span>
            <span v-if="r.whatsappOptIn" class="rounded-full bg-emerald-100 px-2 py-px font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">WhatsApp ✓</span>
          </p>
        </div>
        <a
          v-if="waReminderUrl(r)"
          :href="waReminderUrl(r)"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex h-11 items-center rounded-md bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700"
        >
          {{ t('reminders.sendWa') }}
        </a>
      </div>
    </div>
  </div>
</template>
