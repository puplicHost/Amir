<script setup lang="ts">
import { centsToEur } from '~~/shared/booking'

// Customer self-service (Roadmap Phase 8): view + cancel a booking via the
// unguessable manage link from the confirmation mail. Free cancellation with
// automatic deposit refund only before the cancellation window.
const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const token = String(route.params.token)

const { data: booking, error, refresh } = await useAsyncData(`booking-manage-${token}`, () =>
  $fetch<any>(`/api/bookings/manage/${token}`),
)

if (error.value || !booking.value) {
  throw createError({ statusCode: 404, statusMessage: 'Booking not found', fatal: true })
}

useHead(() => ({ title: `${t('manage.title')} | ${t('brand.name')}` }))

const confirmOpen = ref(false)
const reason = ref('')
const cancelling = ref(false)
const formError = ref('')
const done = ref<{ refundStatus: string } | null>(null)
const cancelDialogRef = ref<HTMLElement | null>(null)

// P2-12: trap focus in the cancel confirmation and restore it on close.
useFocusTrap(cancelDialogRef, confirmOpen, {
  onEscape: () => {
    if (!cancelling.value) confirmOpen.value = false
  },
})

function fmtDate(iso: string): string {
  return formatDateTime(iso, intlLocale(locale.value), booking.value?.timezone || DEFAULT_SALON_TIMEZONE)
}

async function cancel() {
  cancelling.value = true
  formError.value = ''
  try {
    const res = await $fetch<any>(`/api/bookings/manage/${token}/cancel`, {
      method: 'POST',
      body: { reason: reason.value.trim() || undefined },
    })
    done.value = { refundStatus: res.refundStatus }
    confirmOpen.value = false
    await refresh()
  }
  catch (e: any) {
    formError.value = e?.data?.message || e?.data?.statusMessage || t('manage.cancelFailed')
  }
  finally {
    cancelling.value = false
  }
}

const cancelled = computed(() => booking.value?.status === 'CANCELLED' || done.value)
</script>

<template>
  <div class="mx-auto max-w-xl px-4 sm:px-6 py-8 sm:py-12">
    <nav class="mb-6 flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted" aria-label="Breadcrumb">
      <NuxtLink :to="localePath('/')" class="hover:text-primary transition-colors">{{ t('nav.home') }}</NuxtLink>
      <span class="text-slate-400" aria-hidden="true">/</span>
      <span class="text-text font-semibold">{{ t('manage.title') }}</span>
    </nav>

    <div class="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <h1 class="font-heading text-xl font-extrabold tracking-tight text-text mb-1">{{ locale === 'en' ? (booking.serviceNameEn || booking.serviceName) : booking.serviceName }}</h1>
      <p class="text-sm text-muted mb-1">{{ fmtDate(booking.startsAt) }} · {{ booking.durationMinSnapshot }} {{ t('services.minutes') }}</p>
      <p v-if="booking.staffName" class="text-sm text-muted mb-1">{{ booking.staffName }}</p>
      <p class="text-xs text-muted mb-4">{{ t('booking.bookingNo') }}: <span class="font-mono break-all">{{ booking.bookingNumber }}</span></p>

      <div v-if="cancelled" role="status" class="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
        <p class="font-bold">{{ t('manage.cancelledTitle') }}</p>
        <p class="mt-1">{{ t(`manage.refund_${(done?.refundStatus || booking.refundStatus || 'NONE').toLowerCase()}`) }}</p>
      </div>
      <template v-else-if="booking.canCancel">
        <p class="mb-4 text-xs text-muted">{{ t('manage.policy', { hours: booking.cancelWindowHours }) }}</p>
        <button
          type="button"
          class="inline-flex h-11 items-center rounded-xl bg-rose-600 px-6 text-sm font-bold text-white hover:bg-rose-700 active:scale-95 transition"
          @click="confirmOpen = true"
        >
          {{ t('manage.cancelBtn') }}
        </button>
      </template>
      <p v-else role="status" class="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-900 dark:border-yellow-900/40 dark:bg-yellow-950/20 dark:text-yellow-200">
        {{ t('manage.lateText') }}
      </p>
    </div>

    <div
      v-if="confirmOpen"
      ref="cancelDialogRef"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      @click.self="confirmOpen = false"
@keydown.escape="confirmOpen = false"
    >
      <div class="w-full max-w-md rounded-xl border bg-white p-5 shadow-xl dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
        <h3 class="font-heading text-sm font-bold mb-2">{{ t('manage.confirmTitle') }}</h3>
        <p class="mb-3 text-xs text-muted">{{ t('manage.confirmText', { amount: centsToEur(booking.depositCents) }) }}</p>
        <label class="block mb-4">
          <span class="mb-1 block text-xs font-semibold">{{ t('manage.reasonOpt') }}</span>
          <input v-model="reason" type="text" name="cancel-reason" autocomplete="off" class="h-11 w-full rounded-md border bg-transparent px-3 text-sm focus-visible:ring-2 focus-visible:ring-[#2B71AE] focus-visible:outline-none" :style="{ borderColor: 'var(--color-border)' }" />
        </label>
        <div
          v-if="formError"
          role="alert"
          class="mb-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
        >
          {{ formError }}
        </div>
        <div class="flex justify-end gap-2">
          <button type="button" class="h-11 rounded-md px-4 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" @click="confirmOpen = false">
            {{ t('manage.keep') }}
          </button>
          <button
            type="button"
            :disabled="cancelling"
            class="inline-flex h-11 items-center gap-2 rounded-md bg-rose-600 px-5 text-xs font-bold text-white disabled:opacity-50"
            @click="cancel"
          >
            <span v-if="cancelling" class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
            {{ t('manage.confirmBtn') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
