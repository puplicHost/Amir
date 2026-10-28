<script setup lang="ts">
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  UserCheck,
  X,
} from 'lucide-vue-next'
import { centsToEur } from '~~/shared/booking'

definePageMeta({ layout: 'admin', middleware: 'admin-auth', requiredPermission: ['bookings.view_all', 'bookings.view_own'] })

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const toast = useAdminToast()
const { data: sessionData } = useAdminSession()

const id = String(route.params.id || '')
const fetch = useRequestFetch()

const currentUser = computed(() => sessionData.value?.user)

const canAssign = useAdminCan('bookings.assign')
const canComplete = useAdminCan('bookings.complete')
const canRefundIssue = useAdminCan('bookings.refund_issue')
const canRefundHandle = useAdminCan('bookings.refund_handle')

const { data: pageData, error, refresh, pending } = await useAsyncData(
  `admin-booking-${id}`,
  () => fetch<any>(`/api/admin/bookings/${id}`),
)

const booking = computed(() => pageData.value?.booking)
const mailLog = computed<any[]>(() => pageData.value?.mailLog || [])
const mailLogOpen = ref(false)

const notFound = computed(() => Boolean(error.value))
const canManageAll = computed(() => Boolean(currentUser.value?.isSuper || currentUser.value?.permissions?.includes('bookings.view_all')))
const isOwnBooking = computed(() => booking.value?.assignedStaffId === currentUser.value?.userId)

function fmtDate(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(locale.value === 'ar' ? 'ar-EG' : 'de-DE', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const depositLabel = computed(() => centsToEur(Number(booking.value?.depositCents || 0)))
const priceLabel = computed(() => centsToEur(Number(booking.value?.priceSnapshotCents || 0)))
const staffChoiceLabel = computed(() => {
  const c = booking.value?.staffChoice
  return c === 'SPECIFIC' ? t('adminBookings.staffChoice') : t('adminBookings.anyStylist')
})

// ── Assign / Reassign ──
const assignModalOpen = ref(false)
const staffPickerLoading = ref(false)
const availableStaff = ref<any[]>([])
const selectedStaffId = ref('')
const assigningLoading = ref(false)

async function openAssignModal() {
  selectedStaffId.value = booking.value?.assignedStaffId || ''
  assignModalOpen.value = true
  staffPickerLoading.value = true
  availableStaff.value = []
  try {
    const res = await $fetch<any>(`/api/admin/bookings/${id}/staff-picker`)
    availableStaff.value = res.staff || []
  }
  catch (e: any) {
    toast.error(locale.value === 'ar' ? 'خطأ' : 'Error', e?.data?.message || 'Could not load staff list')
  }
  finally {
    staffPickerLoading.value = false
  }
}

async function submitAssign() {
  if (!selectedStaffId.value) return
  assigningLoading.value = true
  try {
    await $fetch(`/api/admin/bookings/${id}/assign`, {
      method: 'PUT',
      body: { staffId: selectedStaffId.value },
    })
    toast.success(locale.value === 'ar' ? 'تم التعيين' : 'Assigned', t('adminBookings.assignedSuccess'))
    assignModalOpen.value = false
    await refresh()
  }
  catch (e: any) {
    toast.error(locale.value === 'ar' ? 'فشل التعيين' : 'Assignment Failed', e?.data?.message || t('adminBookings.assignFailed'))
  }
  finally {
    assigningLoading.value = false
  }
}

// ── Mark completed ──
const completingLoading = ref(false)
async function markCompleted() {
  completingLoading.value = true
  try {
    await $fetch(`/api/admin/bookings/${id}/complete`, { method: 'POST' })
    toast.success(locale.value === 'ar' ? 'تم' : 'Done', t('adminBookings.completedSuccess'))
    await refresh()
  }
  catch (e: any) {
    toast.error(locale.value === 'ar' ? 'فشل الإجراء' : 'Action Failed', e?.data?.message || 'Failed to complete booking')
  }
  finally {
    completingLoading.value = false
  }
}

// ── Cancel + refund ──
const cancelRefundOpen = ref(false)
const cancelRefundMode = ref('refund_full')
const cancelRefundAmount = ref('')
const cancelRefundReason = ref('')
const cancelRefundLoading = ref(false)

function openCancelRefund() {
  cancelRefundMode.value = 'refund_full'
  cancelRefundAmount.value = ''
  cancelRefundReason.value = ''
  cancelRefundOpen.value = true
}

async function submitCancelRefund() {
  cancelRefundLoading.value = true
  try {
    await $fetch(`/api/admin/bookings/${id}/cancel`, {
      method: 'POST',
      body: {
        mode: cancelRefundMode.value,
        amountCents: cancelRefundMode.value === 'custom' ? Math.round(Number(cancelRefundAmount.value) * 100) : undefined,
        reason: cancelRefundReason.value.trim() || undefined,
      },
    })
    toast.success(locale.value === 'ar' ? 'تم الإلغاء' : 'Cancelled', t('adminBookings.cancelRefundDone'))
    cancelRefundOpen.value = false
    await refresh()
  }
  catch (e: any) {
    toast.error(locale.value === 'ar' ? 'فشل الإلغاء' : 'Cancellation Failed', e?.data?.message || e?.data?.statusMessage || 'Failed to cancel booking')
  }
  finally {
    cancelRefundLoading.value = false
  }
}

// ── Mark refund handled ──
const refundModalOpen = ref(false)
const refundNote = ref('')
const refundLoading = ref(false)

function openRefundModal() {
  refundNote.value = ''
  refundModalOpen.value = true
}

async function submitRefundHandled() {
  refundLoading.value = true
  try {
    await $fetch(`/api/admin/bookings/${id}/refund-handled`, {
      method: 'POST',
      body: { note: refundNote.value.trim() || undefined },
    })
    toast.success(locale.value === 'ar' ? 'تم التحديث' : 'Refund Handled', t('adminBookings.refundHandledSuccess'))
    refundModalOpen.value = false
    await refresh()
  }
  catch (e: any) {
    toast.error(locale.value === 'ar' ? 'فشل الإجراء' : 'Action Failed', e?.data?.message || 'Failed to update refund status')
  }
  finally {
    refundLoading.value = false
  }
}

useHead(() => ({ title: `${t('adminBookings.detailTitle')} | ${t('brand.name')}` }))
</script>

<template>
  <div>
    <NuxtLink
      :to="{ path: localePath('/admin/appointments'), query: { tab: 'bookings' } }"
      class="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
    >
      <ArrowLeft class="h-3.5 w-3.5" aria-hidden="true" />
      <span>{{ t('adminBookings.backToList') }}</span>
    </NuxtLink>

    <div v-if="pending" role="status" class="flex justify-center rounded-md border bg-white p-12 dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
      <Loader2 class="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
    </div>

    <div v-else-if="notFound || !booking" class="rounded-md border bg-white p-8 text-center text-sm text-neutral-500 dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
      {{ t('adminBookings.notFound') }}
    </div>

    <template v-else>
      <AdminPageHeader :title="`${t('adminBookings.detailTitle')} · ${booking.bookingNumber}`" :description="booking.service?.name || ''">
        <template #actions>
          <div class="flex flex-wrap items-center gap-2">
            <button
              v-if="booking.needsRefund && canRefundHandle"
              type="button"
              class="inline-flex h-11 items-center gap-1.5 rounded bg-rose-600 px-3.5 text-xs font-bold text-white hover:bg-rose-700"
              @click="openRefundModal"
            >
              <AlertTriangle class="h-3.5 w-3.5" aria-hidden="true" />
              <span>{{ t('adminBookings.markRefundHandled') }}</span>
            </button>

            <button
              v-if="canAssign && booking.paymentStatus === 'PAID' && !booking.needsRefund && (booking.status === 'UNASSIGNED' || booking.status === 'ASSIGNED')"
              type="button"
              class="inline-flex h-11 items-center gap-1.5 rounded border border-neutral-300 px-3.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              @click="openAssignModal"
            >
              <UserCheck class="h-3.5 w-3.5" aria-hidden="true" />
              <span>{{ booking.assignedStaffId ? t('adminBookings.reassignStaff') : t('adminBookings.assignStaff') }}</span>
            </button>

            <button
              v-if="canComplete && booking.status === 'ASSIGNED' && (canManageAll || isOwnBooking)"
              type="button"
              :disabled="completingLoading"
              class="inline-flex h-11 items-center gap-1.5 rounded bg-emerald-600 px-3.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              @click="markCompleted"
            >
              <CheckCircle2 class="h-3.5 w-3.5" aria-hidden="true" />
              <span>{{ t('adminBookings.markCompleted') }}</span>
            </button>

            <button
              v-if="canRefundIssue && booking.paymentStatus === 'PAID' && (booking.status === 'UNASSIGNED' || booking.status === 'ASSIGNED')"
              type="button"
              class="inline-flex h-11 items-center gap-1.5 rounded border border-rose-300 bg-rose-50 px-3.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
              @click="openCancelRefund"
            >
              <X class="h-3.5 w-3.5" aria-hidden="true" />
              <span>{{ t('adminBookings.cancelRefund') }}</span>
            </button>
          </div>
        </template>
      </AdminPageHeader>

      <div v-if="booking.needsRefund" class="mb-4 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
        <AlertTriangle class="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{{ t('adminBookings.needsRefundOnly') }}</span>
      </div>

      <div class="grid gap-4 lg:grid-cols-3">
        <!-- Customer -->
        <section class="rounded-md border bg-white p-4 shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
          <h2 class="mb-3 font-heading text-sm font-bold text-neutral-900 dark:text-neutral-100">{{ t('adminBookings.customer') }}</h2>
          <p class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{{ booking.customerName }}</p>
          <div class="mt-1 flex items-center gap-2">
            <Phone class="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
            <span class="font-mono text-xs text-neutral-600 dark:text-neutral-300" dir="ltr">{{ booking.customerPhone }}</span>
            <a
              v-if="booking.waLink"
              :href="booking.waLink"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
              :aria-label="t('booking.bookViaWhatsapp')"
            >
              <IconWhatsApp class="h-3.5 w-3.5" />
            </a>
          </div>
          <div v-if="booking.customerEmail" class="mt-1 flex items-center gap-2">
            <Mail class="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
            <span class="text-xs text-neutral-600 dark:text-neutral-300" dir="ltr">{{ booking.customerEmail }}</span>
          </div>
          <p v-if="booking.notes" class="mt-3 whitespace-pre-line border-t pt-3 text-xs text-neutral-600 dark:text-neutral-300" :style="{ borderColor: 'var(--color-border)' }">
            <span class="font-semibold">{{ t('adminBookings.notes') }}:</span> {{ booking.notes }}
          </p>
        </section>

        <!-- Schedule -->
        <section class="rounded-md border bg-white p-4 shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
          <h2 class="mb-3 font-heading text-sm font-bold text-neutral-900 dark:text-neutral-100">{{ t('adminBookings.schedule') }}</h2>
          <dl class="space-y-2 text-xs">
            <div class="flex justify-between gap-3">
              <dt class="text-neutral-500">{{ t('booking.startsAt') }}</dt>
              <dd class="text-end font-semibold text-neutral-800 dark:text-neutral-200">{{ fmtDate(booking.startsAt) }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-neutral-500">{{ t('adminBookings.durationLabel') }}</dt>
              <dd class="font-semibold text-neutral-800 dark:text-neutral-200">{{ booking.durationMinSnapshot }} min</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-neutral-500">{{ t('adminBookings.staffChoice') }}</dt>
              <dd class="font-semibold text-neutral-800 dark:text-neutral-200">{{ staffChoiceLabel }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-neutral-500">{{ t('adminBookings.staffLabel') }}</dt>
              <dd class="text-end font-semibold text-neutral-800 dark:text-neutral-200">
                {{ booking.assignedStaff?.name || t('adminBookings.unassigned') }}
              </dd>
            </div>
          </dl>
        </section>

        <!-- Payment -->
        <section class="rounded-md border bg-white p-4 shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
          <h2 class="mb-3 font-heading text-sm font-bold text-neutral-900 dark:text-neutral-100">{{ t('adminBookings.paymentLabel') }}</h2>
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <AdminStatusBadge :status="booking.paymentStatus" size="sm" />
            <AdminStatusBadge :status="booking.status" size="sm" />
          </div>
          <dl class="space-y-2 text-xs">
            <div class="flex justify-between gap-3">
              <dt class="text-neutral-500">{{ t('adminBookings.depositLabel') }}</dt>
              <dd class="font-mono font-bold text-neutral-900 dark:text-neutral-100">{{ depositLabel }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-neutral-500">{{ t('adminBookings.priceSnapshot') }}</dt>
              <dd class="font-mono text-neutral-700 dark:text-neutral-300">{{ priceLabel }}</dd>
            </div>
            <div v-if="booking.paymentProvider" class="flex justify-between gap-3">
              <dt class="text-neutral-500">Provider</dt>
              <dd class="font-semibold uppercase text-neutral-800 dark:text-neutral-200">{{ booking.paymentProvider }}</dd>
            </div>
            <div v-if="booking.providerRef" class="flex justify-between gap-3">
              <dt class="text-neutral-500">{{ t('adminBookings.providerRef') }}</dt>
              <dd class="max-w-[60%] break-all text-end font-mono text-neutral-600 dark:text-neutral-300" dir="ltr">{{ booking.providerRef }}</dd>
            </div>
          </dl>
        </section>
      </div>

      <!-- Email log -->
      <section class="mt-4 rounded-md border bg-white shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
        <button
          type="button"
          class="flex w-full items-center justify-between p-4 text-start"
          @click="mailLogOpen = !mailLogOpen"
        >
          <h2 class="font-heading text-sm font-bold text-neutral-900 dark:text-neutral-100">
            {{ t('adminBookings.mailLog') }} ({{ mailLog.length }})
          </h2>
          <span class="text-xs text-neutral-400">{{ mailLogOpen ? '—' : '+' }}</span>
        </button>
        <div v-show="mailLogOpen" class="border-t p-4" :style="{ borderColor: 'var(--color-border)' }">
          <p v-if="!mailLog.length" class="text-xs text-neutral-400">{{ t('adminBookings.noMailLog') }}</p>
          <ul v-else class="space-y-2">
            <li v-for="m in mailLog" :key="m.id" class="rounded border p-2.5 text-xs dark:border-neutral-700" :style="{ borderColor: 'var(--color-border)' }">
              <div class="flex flex-wrap items-center gap-2">
                <AdminStatusBadge :status="m.status" size="sm" />
                <span class="font-semibold text-neutral-800 dark:text-neutral-200">{{ m.type }}</span>
                <span class="text-neutral-400" dir="ltr">{{ m.sendTo }}</span>
              </div>
              <p v-if="m.subject" class="mt-1 text-neutral-600 dark:text-neutral-300">{{ m.subject }}</p>
              <p class="mt-1 text-[10px] text-neutral-400">
                {{ fmtDate(m.createdAt) }}<span v-if="m.sentAt"> · {{ fmtDate(m.sentAt) }}</span>
                <span v-if="m.attempts"> · {{ m.attempts }}×</span>
              </p>
              <p v-if="m.lastError" class="mt-1 text-[10px] text-rose-600 dark:text-rose-400">{{ m.lastError }}</p>
            </li>
          </ul>
        </div>
      </section>
    </template>

    <!-- Assign modal -->
    <div
      v-if="assignModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      @click.self="assignModalOpen = false"
      @keydown.escape="assignModalOpen = false"
    >
      <div class="w-full max-w-md rounded-lg border bg-white p-6 shadow-xl dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
        <div class="mb-4 flex items-center justify-between border-b pb-3" :style="{ borderColor: 'var(--color-border)' }">
          <h3 class="font-heading text-sm font-bold text-neutral-900 dark:text-neutral-100">
            {{ booking?.assignedStaffId ? t('adminBookings.reassignStaff') : t('adminBookings.assignStaff') }}
          </h3>
          <button type="button" class="text-neutral-400 hover:text-neutral-600" @click="assignModalOpen = false" :aria-label="t('common.close')">
            <X class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div v-if="staffPickerLoading" class="flex justify-center p-6">
          <Loader2 class="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        </div>

        <div v-else-if="!availableStaff.length" class="p-4 text-center text-xs text-neutral-400">
          No active staff members found.
        </div>

        <div v-else class="max-h-60 space-y-2 overflow-y-auto p-1">
          <label
            v-for="st in availableStaff"
            :key="st.id"
            class="flex cursor-pointer items-center justify-between rounded-lg border p-2.5 text-xs transition-colors"
            :class="[
              !st.isAvailable ? 'cursor-not-allowed bg-neutral-50 opacity-50 dark:bg-neutral-800/40' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50',
              selectedStaffId === st.id ? 'border-primary bg-primary/5' : 'border-neutral-200 dark:border-neutral-700',
            ]"
          >
            <div class="flex items-center gap-2.5">
              <input v-model="selectedStaffId" type="radio" name="staff" :value="st.id" :disabled="!st.isAvailable" class="accent-primary" />
              <div>
                <p class="font-semibold text-neutral-800 dark:text-neutral-200">{{ st.name }}</p>
                <p class="text-[10px] text-neutral-400">{{ st.email }}</p>
              </div>
            </div>
            <span v-if="!st.isAvailable" class="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
              Unavailable
            </span>
          </label>
        </div>

        <div class="mt-5 flex justify-end gap-2 border-t pt-3" :style="{ borderColor: 'var(--color-border)' }">
          <button type="button" class="h-11 rounded px-3 text-xs font-semibold text-neutral-600 hover:bg-neutral-100" @click="assignModalOpen = false">
            {{ t('common.close') }}
          </button>
          <button
            type="button"
            :disabled="assigningLoading || !selectedStaffId"
            class="inline-flex h-11 items-center gap-1 rounded bg-primary px-4 text-xs font-bold text-on-primary hover:bg-primary/90 disabled:opacity-50"
            @click="submitAssign"
          >
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Cancel + refund modal -->
    <div
      v-if="cancelRefundOpen"
      class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      @click.self="cancelRefundOpen = false"
      @keydown.escape="cancelRefundOpen = false"
    >
      <div class="w-full max-w-md rounded-lg border bg-white p-6 shadow-xl dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
        <div class="mb-4 flex items-center justify-between border-b pb-3" :style="{ borderColor: 'var(--color-border)' }">
          <h3 class="font-heading text-sm font-bold text-neutral-900 dark:text-neutral-100">{{ t('adminBookings.cancelRefund') }}</h3>
          <button type="button" class="text-neutral-400 hover:text-neutral-600" @click="cancelRefundOpen = false" :aria-label="t('common.close')">
            <X class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p class="mb-3 text-xs text-neutral-600 dark:text-neutral-300">
          <span class="font-mono font-bold">{{ booking?.bookingNumber }}</span> · {{ t('adminBookings.depositLabel') }}: <span class="font-bold">{{ depositLabel }}</span>
        </p>

        <label class="mb-3 block">
          <span class="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('adminBookings.refundMode') }}</span>
          <select v-model="cancelRefundMode" class="h-11 w-full rounded-md border bg-transparent px-2 text-xs" :style="{ borderColor: 'var(--color-border)' }">
            <option value="refund_full">{{ t('adminBookings.modeFull') }}</option>
            <option value="no_refund">{{ t('adminBookings.modeNone') }}</option>
            <option value="custom">{{ t('adminBookings.modeCustom') }}</option>
            <option value="outside">{{ t('adminBookings.modeOutside') }}</option>
          </select>
        </label>

        <label v-if="cancelRefundMode === 'custom'" class="mb-3 block">
          <span class="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('adminBookings.customAmount') }} (EUR)</span>
          <input v-model="cancelRefundAmount" type="number" min="0.01" step="0.01" dir="ltr" class="h-11 w-full rounded-md border bg-transparent px-2 text-xs" :style="{ borderColor: 'var(--color-border)' }" />
        </label>

        <label class="mb-4 block">
          <span class="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('adminBookings.cancelStaffReason') }}</span>
          <textarea v-model="cancelRefundReason" rows="2" class="w-full rounded border bg-transparent p-2 text-xs" :style="{ borderColor: 'var(--color-border)' }" />
        </label>

        <div class="flex justify-end gap-2 border-t pt-3" :style="{ borderColor: 'var(--color-border)' }">
          <button type="button" class="h-11 rounded-md px-4 text-xs font-semibold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800" @click="cancelRefundOpen = false">{{ t('common.close') }}</button>
          <button
            type="button"
            :disabled="cancelRefundLoading"
            class="h-11 rounded-md bg-rose-600 px-5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
            @click="submitCancelRefund"
          >
            {{ t('adminBookings.confirmCancelRefund') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Refund handled modal -->
    <div
      v-if="refundModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      @click.self="refundModalOpen = false"
      @keydown.escape="refundModalOpen = false"
    >
      <div class="w-full max-w-md rounded-lg border bg-white p-6 shadow-xl dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
        <div class="mb-4 flex items-center justify-between border-b pb-3" :style="{ borderColor: 'var(--color-border)' }">
          <h3 class="font-heading text-sm font-bold text-neutral-900 dark:text-neutral-100">{{ t('adminBookings.markRefundHandled') }}</h3>
          <button type="button" class="text-neutral-400 hover:text-neutral-600" @click="refundModalOpen = false" :aria-label="t('common.close')">
            <X class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div class="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
          {{ t('adminBookings.refundNotice') }}
        </div>

        <label class="mb-4 block">
          <span class="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('adminBookings.notes') }}</span>
          <textarea v-model="refundNote" rows="2" class="w-full rounded border bg-transparent p-2 text-xs" :style="{ borderColor: 'var(--color-border)' }" />
        </label>

        <div class="flex justify-end gap-2 border-t pt-3" :style="{ borderColor: 'var(--color-border)' }">
          <button type="button" class="h-11 rounded px-3 text-xs font-semibold text-neutral-600 hover:bg-neutral-100" @click="refundModalOpen = false">{{ t('common.close') }}</button>
          <button
            type="button"
            :disabled="refundLoading"
            class="inline-flex h-11 items-center gap-1 rounded bg-rose-600 px-4 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
            @click="submitRefundHandled"
          >
            <span>OK</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
