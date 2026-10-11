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

const retrying = ref<'stripe' | 'paypal' | null>(null)
const retryError = ref('')

// Retry mints a NEW payment attempt on the SAME booking via POST …/pay.
// A PAID booking is rejected server-side (409) and never mutated.
async function retry(provider: 'stripe' | 'paypal') {
  if (!token) return
  retryError.value = ''
  retrying.value = provider
  try {
    const res = await $fetch<{ redirectUrl: string }>(`/api/bookings/${token}/pay`, {
      method: 'POST',
      body: { provider },
    })
    if (!res.redirectUrl) throw new Error('no redirect')
    await navigateTo(res.redirectUrl, { external: true })
  }
  catch (e: any) {
    retryError.value = e?.data?.message || e?.data?.statusMessage || t('booking.payFailed')
  }
  finally {
    retrying.value = null
  }
}
</script>

<template>
  <div class="mx-auto max-w-xl px-4 sm:px-6 py-12 sm:py-16 text-center">
    <div class="rounded-xl border border-border bg-surface p-8">
      <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600 text-2xl font-black dark:bg-rose-950/40">!</div>
      <h1 class="font-heading text-2xl font-extrabold text-text mb-2">{{ t('booking.failedTitle') }}</h1>
      <p class="text-sm text-muted mb-2">{{ t('booking.failedText') }}</p>
      <p v-if="data" class="font-mono text-xs text-muted mb-6">
        {{ t('booking.bookingNo') }} {{ data.bookingNumber }} · {{ centsToEur(Number(data.depositCents)) }} {{ data.currency }}
      </p>
      <p v-if="retryError" role="alert" class="mb-4 text-xs font-medium text-rose-600">{{ retryError }}</p>
      <div v-if="data && data.paymentStatus !== 'PAID'" class="flex flex-wrap items-center justify-center gap-3 mb-3">
        <button
          type="button"
          :disabled="!!retrying"
          class="inline-flex h-10 items-center rounded-xl bg-accent px-6 text-xs font-bold text-on-accent hover:bg-accent-hover active:scale-95 transition-all disabled:opacity-50"
          @click="retry('stripe')"
        >
          {{ t('booking.stripe') }}
        </button>
        <button
          type="button"
          :disabled="!!retrying"
          class="inline-flex h-10 items-center rounded-xl border border-border bg-white px-6 text-xs font-bold text-text hover:bg-border/40 active:scale-95 transition-all disabled:opacity-50 dark:bg-[#0B1520]"
          @click="retry('paypal')"
        >
          {{ t('booking.paypal') }}
        </button>
      </div>
      <NuxtLink :to="localePath('/services')" class="inline-flex h-10 items-center rounded-xl border border-border px-6 text-xs font-bold text-text hover:bg-border/40 transition-all">
        {{ t('booking.pickNewSlot') }}
      </NuxtLink>
    </div>
  </div>
</template>
