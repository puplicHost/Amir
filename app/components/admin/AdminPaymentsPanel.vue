<script setup lang="ts">
import { ArrowUpRight, CreditCard, Loader2, RefreshCw, ShieldAlert } from 'lucide-vue-next'
import { centsToEur } from '~~/shared/booking'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const fetch = useRequestFetch()

interface RefundRow {
  id: string
  bookingNumber: string
  customerName: string
  customerPhone: string
  startsAt: string
  priceSnapshotCents: number
  depositCents: number
  paymentProvider: string
  paymentStatus: string
  status: string
  needsRefund: boolean
}

interface PaymentRow extends RefundRow {
  providerRef: string | null
  providerPaymentId: string | null
  updatedAt: string
}

const { data: stats, pending: statsPending } = await useAsyncData('finance-payment-stats', () =>
  fetch<any>('/api/admin/dashboard/stats'),
)

const { data, pending, error, refresh } = await useAsyncData('finance-refunds', () =>
  fetch<{ bookings: RefundRow[], total: number }>('/api/admin/bookings', {
    params: { needsRefund: 'true', limit: 50 },
  }),
)

// Confirmed transactions are the PAID bookings (no separate transactions
// table). Idempotent by booking: repeated returns/webhooks cannot add rows.
const { data: paidData, pending: paidPending, error: paidError } = await useAsyncData('finance-paid-payments', () =>
  fetch<{ bookings: PaymentRow[], total: number }>('/api/admin/bookings', {
    params: { paymentStatus: 'PAID', limit: 50 },
  }),
)

const rows = computed(() => data.value?.bookings || [])
const paidRows = computed(() => paidData.value?.bookings || [])
const metrics = computed(() => stats.value?.bookings || null)

function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function providerLabel(provider: string): string {
  const p = (provider || '').toLowerCase()
  if (p === 'stripe') return 'Stripe'
  if (p === 'paypal') return 'PayPal'
  if (p === 'manual') return 'Manual'
  return provider || '—'
}
</script>

<template>
  <div class="space-y-5">
    <div class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-md border bg-white p-4 shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{{ t('admin.paidBookings') }}</p>
        <p class="mt-1 font-heading text-xl font-bold text-neutral-900 dark:text-neutral-100">
          <Loader2 v-if="statsPending" class="h-5 w-5 animate-spin text-neutral-400" aria-hidden="true" />
          <template v-else>{{ metrics?.paidBookings ?? '—' }}</template>
        </p>
      </div>
      <div class="rounded-md border bg-white p-4 shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{{ t('admin.pendingRefunds') }}</p>
        <p class="mt-1 font-heading text-xl font-bold text-neutral-900 dark:text-neutral-100">
          <Loader2 v-if="statsPending" class="h-5 w-5 animate-spin text-neutral-400" aria-hidden="true" />
          <template v-else>{{ metrics?.pendingRefunds ?? '—' }}</template>
        </p>
      </div>
      <div class="rounded-md border bg-white p-4 shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{{ t('admin.revenuePaid') }}</p>
        <p class="mt-1 font-heading text-xl font-bold text-neutral-900 dark:text-neutral-100">
          <Loader2 v-if="statsPending" class="h-5 w-5 animate-spin text-neutral-400" aria-hidden="true" />
          <template v-else>{{ metrics ? centsToEur(metrics.revenueCents) : '—' }}</template>
        </p>
      </div>
    </div>

    <p class="rounded-md border bg-neutral-50 px-3 py-2 text-xs text-neutral-600 dark:bg-neutral-900/60 dark:text-neutral-300" :style="{ borderColor: 'var(--color-border)' }">
      {{ t('admin.paymentsDescription') }}
    </p>

    <!-- Confirmed payments: PAID bookings are the transaction record. -->
    <div class="flex items-center justify-between gap-2">
      <div>
        <h2 class="font-heading text-sm font-bold text-neutral-900 dark:text-neutral-100">{{ t('adminPayments.recentPayments') }}</h2>
        <p class="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{{ t('adminPayments.recentPaymentsDescription') }}</p>
      </div>
    </div>

    <div v-if="paidError" role="alert" class="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
      {{ t('adminPayments.loadError') }}
    </div>

    <div v-else-if="paidPending && !paidRows.length" class="flex items-center gap-2 p-4 text-xs text-neutral-500">
      <Loader2 class="h-4 w-4 animate-spin" aria-hidden="true" />
      <span>{{ t('adminPayments.loading') }}</span>
    </div>

    <div v-else-if="!paidRows.length" class="rounded-md border bg-white p-4 shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
      <AdminEmptyState :title="t('adminPayments.noPaymentsTitle')" :description="t('adminPayments.noPaymentsDescription')" :icon="CreditCard" />
    </div>

    <div v-else class="overflow-hidden rounded-md border bg-white shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[860px] text-start text-sm">
          <thead>
            <tr class="border-b bg-neutral-50/75 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:bg-neutral-800/40 dark:text-neutral-400" :style="{ borderColor: 'var(--color-border)' }">
              <th scope="col" class="px-4 py-3 text-start">{{ t('adminPayments.booking') }}</th>
              <th scope="col" class="px-4 py-3 text-start">{{ t('adminPayments.date') }}</th>
              <th scope="col" class="px-4 py-3 text-end">{{ t('adminPayments.amount') }}</th>
              <th scope="col" class="px-4 py-3 text-start">{{ t('adminPayments.payment') }}</th>
              <th scope="col" class="px-4 py-3 text-start">{{ t('adminPayments.reference') }}</th>
              <th scope="col" class="px-4 py-3 text-end">{{ t('adminPayments.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800/60">
            <tr v-for="row in paidRows" :key="row.id" class="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
              <td class="px-4 py-3 font-mono text-xs text-neutral-700 dark:text-neutral-300">{{ row.bookingNumber }}</td>
              <td class="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-300">{{ formatDate(row.updatedAt) }}</td>
              <td class="px-4 py-3 text-end text-xs font-semibold text-neutral-900 dark:text-neutral-100">{{ centsToEur(row.depositCents) }}</td>
              <td class="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-300">
                <span class="font-semibold">{{ providerLabel(row.paymentProvider) }}</span>
                <span class="ms-1 text-neutral-400">·</span>
                <span>{{ row.paymentStatus }}</span>
              </td>
              <td class="px-4 py-3 text-[11px] text-neutral-500 dark:text-neutral-400">
                <p v-if="row.providerRef" class="break-all font-mono">
                  <span class="text-neutral-400">{{ t('adminPayments.orderId') }}:</span> {{ row.providerRef }}
                </p>
                <p v-if="row.providerPaymentId" class="break-all font-mono">
                  <span class="text-neutral-400">{{ t('adminPayments.captureId') }}:</span> {{ row.providerPaymentId }}
                </p>
                <span v-if="!row.providerRef && !row.providerPaymentId">—</span>
              </td>
              <td class="px-4 py-3 text-end">
                <NuxtLink
                  :to="localePath(`/admin/bookings/${row.id}`)"
                  class="inline-flex h-11 items-center gap-1 rounded-md px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                  <span>{{ t('adminPayments.openBooking') }}</span>
                  <ArrowUpRight class="h-3.5 w-3.5" aria-hidden="true" />
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="flex items-center justify-between gap-2">
      <h2 class="font-heading text-sm font-bold text-neutral-900 dark:text-neutral-100">{{ t('admin.pendingRefunds') }}</h2>
      <button
        type="button"
        class="inline-flex h-11 items-center gap-1.5 rounded-md border px-3.5 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-800"
        :style="{ borderColor: 'var(--color-border)' }"
        :disabled="pending"
        @click="refresh()"
      >
        <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': pending }" aria-hidden="true" />
        <span>{{ t('adminPayments.refresh') }}</span>
      </button>
    </div>

    <div v-if="error" role="alert" class="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
      {{ t('adminPayments.loadError') }}
    </div>

    <div v-else-if="pending && !rows.length" class="flex items-center gap-2 p-4 text-xs text-neutral-500">
      <Loader2 class="h-4 w-4 animate-spin" aria-hidden="true" />
      <span>{{ t('adminPayments.loading') }}</span>
    </div>

    <div v-else-if="!rows.length" class="rounded-md border bg-white p-4 shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
      <AdminEmptyState :title="t('adminPayments.emptyTitle')" :description="t('adminPayments.emptyDescription')" :icon="CreditCard" />
    </div>

    <div v-else class="overflow-hidden rounded-md border bg-white shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-start text-sm">
          <thead>
            <tr class="border-b bg-neutral-50/75 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:bg-neutral-800/40 dark:text-neutral-400" :style="{ borderColor: 'var(--color-border)' }">
              <th scope="col" class="px-4 py-3 text-start">{{ t('adminPayments.booking') }}</th>
              <th scope="col" class="px-4 py-3 text-start">{{ t('adminPayments.customer') }}</th>
              <th scope="col" class="px-4 py-3 text-start">{{ t('adminPayments.appointment') }}</th>
              <th scope="col" class="px-4 py-3 text-end">{{ t('adminPayments.amount') }}</th>
              <th scope="col" class="px-4 py-3 text-start">{{ t('adminPayments.payment') }}</th>
              <th scope="col" class="px-4 py-3 text-end">{{ t('adminPayments.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800/60">
            <tr v-for="row in rows" :key="row.id" class="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
              <td class="px-4 py-3 font-mono text-xs text-neutral-700 dark:text-neutral-300">{{ row.bookingNumber }}</td>
              <td class="px-4 py-3">
                <p class="font-semibold text-neutral-900 dark:text-neutral-100">{{ row.customerName }}</p>
                <p class="text-[11px] text-neutral-500" dir="ltr">{{ row.customerPhone }}</p>
              </td>
              <td class="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-300">{{ formatDate(row.startsAt) }}</td>
              <td class="px-4 py-3 text-end text-xs font-semibold text-neutral-900 dark:text-neutral-100">{{ centsToEur(row.depositCents) }}</td>
              <td class="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-300">
                <span class="font-semibold">{{ providerLabel(row.paymentProvider) }}</span>
                <span class="ms-1 text-neutral-400">·</span>
                <span>{{ row.paymentStatus }}</span>
              </td>
              <td class="px-4 py-3 text-end">
                <NuxtLink
                  :to="localePath(`/admin/bookings/${row.id}`)"
                  class="inline-flex h-11 items-center gap-1 rounded-md px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                  <span>{{ t('adminPayments.openBooking') }}</span>
                  <ArrowUpRight class="h-3.5 w-3.5" aria-hidden="true" />
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
