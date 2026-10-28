<script setup lang="ts">
import { centsToEur } from '~~/shared/booking'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const token = String(route.query.token || '')
const { trackPurchase } = useMetaEvents()

interface BookingStatus {
  bookingNumber: string
  paymentStatus: string
  status: string
  serviceName: string
  serviceSlug: string
  durationMin: number
  startsAt: string
  depositCents: number
  currency: string
  gateways: { stripe: boolean, paypal: boolean }
  eventId?: string
}

const data = ref<BookingStatus | null>(null)
const loadError = ref(false)
const pending = ref(true)
// UX-02: while the gateway webhook is still in flight we show a "confirming"
// state and poll instead of rendering a false "payment failed".
const confirming = ref(false)

const POLL_MS = 3000
const MAX_POLLS = 20 // ~60s
let pollTimer: ReturnType<typeof setTimeout> | null = null
let pollCount = 0
let purchaseTracked = false

const manageUrl = computed(() => localePath(`/booking/manage/${token}`))
const statusPending = computed(() => data.value?.paymentStatus === 'PENDING')

function maybeTrack() {
  if (!purchaseTracked && data.value?.paymentStatus === 'PAID' && data.value.eventId) {
    trackPurchase(data.value.eventId, Number(data.value.depositCents || 0) / 100, data.value.currency || 'EUR')
    purchaseTracked = true
  }
}

async function fetchStatus(): Promise<boolean> {
  try {
    data.value = await $fetch<BookingStatus>(`/api/bookings/status/${encodeURIComponent(token)}`)
    loadError.value = false
    return data.value?.paymentStatus === 'PAID'
  }
  catch {
    loadError.value = true
    return false
  }
}

function schedulePoll() {
  pollTimer = setTimeout(async () => {
    pollCount++
    const paid = await fetchStatus()
    if (paid) {
      confirming.value = false
      maybeTrack()
      return
    }
    if (loadError.value || pollCount >= MAX_POLLS) {
      confirming.value = false
      return
    }
    schedulePoll()
  }, POLL_MS)
}

onMounted(async () => {
  const paid = await fetchStatus()
  pending.value = false
  maybeTrack()
  if (!paid && !loadError.value && data.value?.paymentStatus === 'PENDING') {
    confirming.value = true
    schedulePoll()
  }
})

onBeforeUnmount(() => {
  if (pollTimer) clearTimeout(pollTimer)
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
    <div v-if="pending" role="status" class="rounded-xl border border-border bg-surface p-8">
      <div class="mx-auto mb-4 h-10 w-10 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true" />
      <p class="text-sm text-muted">{{ t('booking.loading') }}</p>
    </div>
    <div v-else-if="loadError || !data" class="rounded-xl border border-border bg-surface p-8">
      <h1 class="font-heading text-xl font-extrabold text-text mb-2">{{ t('booking.failedTitle') }}</h1>
      <NuxtLink :to="localePath('/services')" class="inline-flex h-11 items-center rounded-xl px-6 text-xs font-bold text-primary hover:underline">
        {{ t('booking.pickNewSlot') }}
      </NuxtLink>
    </div>
    <div v-else-if="data.paymentStatus === 'PAID'" role="status" class="rounded-xl border border-emerald-200 bg-emerald-50/60 p-8 dark:border-emerald-900/50 dark:bg-emerald-950/20">
      <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white text-2xl font-black" aria-hidden="true">✓</div>
      <h1 class="font-heading text-2xl font-extrabold text-text mb-2">{{ t('booking.successTitle') }}</h1>
      <p class="text-sm text-muted mb-6">{{ t('booking.successText') }}</p>
      <dl class="mx-auto max-w-sm space-y-2 text-start text-xs">
        <div class="flex justify-between gap-4">
          <dt class="text-muted">{{ t('booking.bookingNo') }}</dt>
          <dd class="font-mono font-bold text-text break-all">{{ data.bookingNumber }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-muted">{{ t('booking.service') }}</dt>
          <dd class="font-bold text-text">{{ data.serviceName }}</dd>
        </div>
        <div class="flex justify-between gap-4">
          <dt class="text-muted">{{ t('services.duration') }}</dt>
          <dd class="font-bold text-text">{{ data.durationMin }} {{ t('services.minutes') }}</dd>
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
      <!-- UX-05: surface the customer manage/cancel link (previously email-only). -->
      <NuxtLink :to="manageUrl" class="mt-6 inline-flex h-11 items-center rounded-xl border border-border bg-white px-6 text-xs font-bold text-text hover:bg-border/40 transition dark:bg-[#0B1520]">
        {{ t('booking.manageLink') }}
      </NuxtLink>
    </div>
    <div v-else-if="confirming" role="status" aria-live="polite" class="rounded-xl border border-border bg-surface p-8">
      <div class="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-accent dark:border-slate-800" aria-hidden="true" />
      <h1 class="font-heading text-xl font-extrabold text-text mb-2">{{ t('booking.confirmingTitle') }}</h1>
      <p class="text-sm text-muted">{{ t('booking.confirmingText') }}</p>
    </div>
    <div v-else-if="statusPending" class="rounded-xl border border-amber-200 bg-amber-50 p-8 dark:border-yellow-900/40 dark:bg-yellow-950/20">
      <h1 class="font-heading text-xl font-extrabold text-text mb-2">{{ t('booking.stillPendingTitle') }}</h1>
      <p class="text-sm text-muted mb-6">{{ t('booking.stillPendingText') }}</p>
      <NuxtLink :to="manageUrl" class="inline-flex h-11 items-center rounded-xl border border-border bg-white px-6 text-xs font-bold text-text hover:bg-border/40 transition dark:bg-[#0B1520]">
        {{ t('booking.manageLink') }}
      </NuxtLink>
    </div>
    <div v-else class="rounded-xl border border-border bg-surface p-8">
      <h1 class="font-heading text-xl font-extrabold text-text mb-2">{{ t('booking.failedTitle') }}</h1>
      <p class="text-sm text-muted mb-6">{{ t('booking.failedText') }}</p>
      <NuxtLink :to="localePath('/services')" class="inline-flex h-11 items-center rounded-xl bg-accent px-6 text-xs font-bold text-on-accent hover:bg-accent-hover transition-colors">
        {{ t('booking.pickNewSlot') }}
      </NuxtLink>
    </div>
  </div>
</template>
