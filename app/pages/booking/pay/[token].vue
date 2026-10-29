<script setup lang="ts">
import { centsToEur } from '~~/shared/booking'

// Public pay-link page (Roadmap Phase 5): opened from /booking/pay/<token>
// links the studio shares manually (e.g. via WhatsApp). Same deposit
// checkout as the regular booking flow.
const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const token = String(route.params.token)

const { data: booking, error, pending } = await useAsyncData(`booking-pay-${token}`, () =>
  $fetch<any>(`/api/bookings/status/${token}`),
)
const gateways = computed(() => booking.value?.gateways || { stripe: false, paypal: false })

if (error.value || !booking.value) {
  throw createError({ statusCode: 404, statusMessage: 'Booking not found', fatal: true })
}

useHead(() => ({ title: `${t('booking.payWith')} | ${t('brand.name')}` }))

const paying = ref(false)
const formError = ref('')

function fmtDate(iso: string): string {
  return formatDateTime(iso, intlLocale(locale.value), booking.value?.timezone || DEFAULT_SALON_TIMEZONE)
}

async function payFor(provider: 'stripe' | 'paypal') {
  paying.value = true
  formError.value = ''
  try {
    const res = await $fetch<{ redirectUrl: string }>(`/api/bookings/${token}/pay`, {
      method: 'POST',
      body: { provider },
    })
    if (!res.redirectUrl) throw new Error('no redirect')
    await navigateTo(res.redirectUrl, { external: true })
  }
  catch (e: any) {
    formError.value = e?.data?.message || e?.data?.statusMessage || t('booking.payFailed')
  }
  finally {
    paying.value = false
  }
}

const alreadyPaid = computed(() => booking.value?.paymentStatus === 'PAID')
</script>

<template>
  <div class="mx-auto max-w-xl px-4 sm:px-6 py-8 sm:py-12">
    <nav class="mb-6 flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted" aria-label="Breadcrumb">
      <NuxtLink :to="localePath('/')" class="hover:text-primary transition-colors">{{ t('nav.home') }}</NuxtLink>
      <span class="text-slate-400" aria-hidden="true">/</span>
      <span class="text-text font-semibold">{{ t('booking.payWith') }}</span>
    </nav>

    <div v-if="pending" role="status" class="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <p class="text-sm text-muted">{{ t('booking.loading') }}</p>
    </div>
    <div v-else class="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <h1 class="font-heading text-xl font-extrabold tracking-tight text-text mb-1">{{ t('booking.payWith') }}</h1>
      <p class="text-sm text-muted mb-1">{{ locale === 'en' ? (booking.serviceNameEn || booking.serviceName) : booking.serviceName }} · {{ booking.durationMin }} {{ t('services.minutes') }}</p>
      <p class="text-xs text-muted mb-1">{{ fmtDate(booking.startsAt) }}</p>
      <p class="text-xs text-muted mb-4">{{ t('booking.bookingNo') }}: <span class="font-mono break-all">{{ booking.bookingNumber }}</span></p>

      <div
        v-if="formError"
        role="alert"
        class="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
      >
        {{ formError }}
      </div>

      <p v-if="alreadyPaid" class="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
        {{ t('booking.successTitle') }}
      </p>
      <template v-else>
        <p class="text-xs text-muted mb-4">{{ t('booking.depositDue') }}: {{ centsToEur(booking.depositCents) }}</p>
        <div v-if="gateways?.stripe || gateways?.paypal" class="flex flex-wrap gap-3">
          <button
            v-if="gateways?.stripe"
            type="button"
            :disabled="paying"
            :aria-busy="paying"
            class="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-6 text-sm font-bold text-on-accent hover:bg-accent-hover active:scale-95 transition-colors disabled:opacity-50"
            @click="payFor('stripe')"
          >
            <span v-if="paying" class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current opacity-50 border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
            {{ t('booking.stripe') }}
          </button>
          <button
            v-if="gateways?.paypal"
            type="button"
            :disabled="paying"
            :aria-busy="paying"
            class="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-white px-6 text-sm font-bold text-text hover:bg-border/40 active:scale-95 transition-colors disabled:opacity-50 dark:bg-[#0B1520]"
            @click="payFor('paypal')"
          >
            <span v-if="paying" class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current opacity-50 border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
            {{ t('booking.paypal') }}
          </button>
        </div>
        <p v-else class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-900 dark:border-yellow-900/40 dark:bg-yellow-950/20 dark:text-yellow-200">
          {{ t('booking.blocked') }}
        </p>
      </template>
    </div>
  </div>
</template>
