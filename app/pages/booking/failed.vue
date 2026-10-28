<script setup lang="ts">
import { centsToEur } from '~~/shared/booking'

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const token = String(route.query.token || '')

const { data } = await useAsyncData(`booking-failed-${token}`, () =>
  token ? $fetch<any>(`/api/bookings/status/${encodeURIComponent(token)}`) : Promise.resolve(null),
)

useHead(() => ({ title: `${t('booking.failedTitle')} | ${t('brand.name')}` }))

const retrying = ref(false)
const retryError = ref('')

// Retry mints a NEW PayPal order on the SAME booking via POST …/pay.
// A PAID booking is rejected server-side (409) and never mutated.
async function retry() {
  if (!token) return
  retryError.value = ''
  retrying.value = true
  try {
    const res = await $fetch<{ redirectUrl: string }>(`/api/bookings/${token}/pay`, {
      method: 'POST',
      body: { provider: 'paypal' },
    })
    if (!res.redirectUrl) throw new Error('no redirect')
    await navigateTo(res.redirectUrl, { external: true })
  }
  catch (e: any) {
    retryError.value = e?.data?.message || e?.data?.statusMessage || t('booking.payFailed')
  }
  finally {
    retrying.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-xl px-4 sm:px-6 py-12 sm:py-16 text-center">
    <div class="rounded-xl border border-border bg-surface p-8">
      <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 text-2xl font-black dark:bg-rose-950/40" aria-hidden="true">!</div>
      <h1 class="font-heading text-2xl font-extrabold text-text mb-2">{{ t('booking.failedTitle') }}</h1>
      <p class="text-sm text-muted mb-2">{{ t('booking.failedText') }}</p>
      <p v-if="data" class="font-mono text-xs text-muted mb-6 break-words">
        {{ t('booking.bookingNo') }} {{ data.bookingNumber }} · {{ centsToEur(Number(data.depositCents)) }}
      </p>
      <p v-if="retryError" role="alert" class="mb-4 text-xs font-medium text-rose-600">{{ retryError }}</p>
      <div v-if="data && data.paymentStatus !== 'PAID'" class="flex flex-wrap items-center justify-center gap-3 mb-3">
        <button
          type="button"
          :disabled="retrying"
          :aria-busy="retrying"
          class="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-white px-6 text-xs font-bold text-text hover:bg-border/40 active:scale-95 transition-colors disabled:opacity-50 dark:bg-[#0B1520]"
          @click="retry"
        >
          <span v-if="retrying" class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current opacity-50 border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
          {{ t('booking.paypal') }}
        </button>
      </div>
      <NuxtLink :to="localePath('/services')" class="inline-flex h-11 items-center rounded-xl border border-border px-6 text-xs font-bold text-text hover:bg-border/40 transition">
        {{ t('booking.pickNewSlot') }}
      </NuxtLink>
    </div>
  </div>
</template>
