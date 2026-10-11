<script setup lang="ts">
import { centsToEur } from '~~/shared/booking'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const token = String(route.query.token || '')
const { trackPurchase } = useMetaEvents()

const { data, error } = await useAsyncData(`booking-status-${token}`, () =>
  $fetch<any>(`/api/bookings/status/${encodeURIComponent(token)}`),
)

onMounted(() => {
  if (data.value && data.value.paymentStatus === 'PAID' && data.value.eventId) {
    trackPurchase(data.value.eventId, Number(data.value.depositCents || 0) / 100, data.value.currency || 'EUR')
  }
})

useHead(() => ({ title: `${t('booking.successTitle')} | ${t('brand.name')}` }))

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(locale.value === 'ar' ? 'ar-EG' : 'de-DE', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  })
}
</script>

<template>
  <div class="mx-auto max-w-xl px-4 sm:px-6 py-12 sm:py-16 text-center">
    <div v-if="error || !data" class="rounded-xl border border-border bg-surface p-8">
      <h1 class="font-heading text-xl font-extrabold text-text mb-2">{{ t('booking.failedTitle') }}</h1>
      <NuxtLink :to="localePath('/services')" class="text-xs font-bold text-primary hover:underline">
        {{ t('booking.pickNewSlot') }}
      </NuxtLink>
    </div>
    <div v-else-if="data.paymentStatus === 'PAID'" class="rounded-xl border border-emerald-200 bg-emerald-50/60 p-8 dark:border-emerald-900/50 dark:bg-emerald-950/20">
      <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white text-2xl font-black">✓</div>
      <h1 class="font-heading text-2xl font-extrabold text-text mb-2">{{ t('booking.successTitle') }}</h1>
      <p class="text-sm text-muted mb-6">{{ t('booking.successText') }}</p>
      <dl class="mx-auto max-w-sm space-y-2 text-start text-xs">
        <div class="flex justify-between gap-4">
          <dt class="text-muted">{{ t('booking.bookingNo') }}</dt>
          <dd class="font-mono font-bold text-text">{{ data.bookingNumber }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-muted">{{ t('booking.service') }}</dt>
          <dd class="font-bold text-text">{{ data.serviceName }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-muted">{{ t('booking.startsAt') }}</dt>
          <dd class="font-bold text-text">{{ fmtDate(data.startsAt) }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-muted">{{ t('booking.depositDue') }}</dt>
          <dd class="font-mono font-bold text-text">{{ centsToEur(Number(data.depositCents)) }} {{ data.currency }}</dd>
        </div>
      </dl>
    </div>
    <div v-else class="rounded-xl border border-border bg-surface p-8">
      <h1 class="font-heading text-xl font-extrabold text-text mb-2">{{ t('booking.failedTitle') }}</h1>
      <p class="text-sm text-muted mb-6">{{ t('booking.failedText') }}</p>
      <NuxtLink :to="localePath('/services')" class="inline-flex h-10 items-center rounded-xl bg-accent px-6 text-xs font-bold text-on-accent hover:bg-accent-hover transition-all">
        {{ t('booking.pickNewSlot') }}
      </NuxtLink>
    </div>
  </div>
</template>
