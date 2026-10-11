<script setup lang="ts">
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Filter,
  Loader2,
  Phone,
  RotateCcw,
  Search,
  UserCheck,
  UserMinus,
  UserX,
  X,
} from 'lucide-vue-next'
import { BOOKING_STATUSES, centsToEur } from '~~/shared/booking'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const router = useRouter()
const toast = useAdminToast()
const { data: sessionData } = useAdminSession()

const currentUser = computed(() => sessionData.value?.user)
const isManager = computed(() => {
  const u = currentUser.value
  if (!u) return false
  return Boolean(u.isSuper || u.role === 'ADMIN' || u.role === 'MANAGER' || u.permissions?.includes('services.manage'))
})

const fetch = useRequestFetch()

// Filter state
const statusFilter = ref(String(route.query.status || ''))
const dateFilter = ref(String(route.query.date || ''))
const staffFilter = ref(String(route.query.staffId || ''))
const needsRefundFilter = ref(String(route.query.needsRefund || ''))
const search = ref(String(route.query.search || ''))
const page = ref(Number(route.query.page) || 1)
const limit = 20

// Multi-select for batch staff cancellation
const selectedIds = ref<string[]>([])

// Query bookings
const { data: bookingsData, refresh, pending } = await useAsyncData(
  'admin-bookings-list',
  () => fetch<any>('/api/admin/bookings', {
    params: {
      status: statusFilter.value || undefined,
      date: dateFilter.value || undefined,
      staffId: staffFilter.value || undefined,
      needsRefund: needsRefundFilter.value || undefined,
      search: search.value.trim() || undefined,
      page: page.value,
      limit,
    },
  }),
  { watch: [page] },
)

// Active staff for filter dropdown (managers only)
const { data: allUsersData } = await useAsyncData('admin-staff-options', () =>
  isManager.value ? fetch<any>('/api/admin/users') : Promise.resolve({ users: [] }),
)
const staffOptions = computed(() => (allUsersData.value?.users || []).filter((u: any) => u.role === 'STAFF' && u.isActive))

const hasFilters = computed(() => Boolean(
  statusFilter.value || dateFilter.value || staffFilter.value || needsRefundFilter.value || search.value.trim(),
))

async function applyFilters() {
  page.value = 1
  selectedIds.value = []
  await router.replace({
    query: {
      status: statusFilter.value || undefined,
      date: dateFilter.value || undefined,
      staffId: staffFilter.value || undefined,
      needsRefund: needsRefundFilter.value || undefined,
      search: search.value.trim() || undefined,
    },
  })
  await refresh()
}

async function resetFilters() {
  statusFilter.value = ''
  dateFilter.value = ''
  staffFilter.value = ''
  needsRefundFilter.value = ''
  search.value = ''
  page.value = 1
  selectedIds.value = []
  await router.replace({ query: {} })
  await refresh()
}

function formatDate(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString(locale.value === 'ar' ? 'ar-EG' : 'de-DE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Modals State ──

// 1. Staff Picker / Assign Modal
const assignModalOpen = ref(false)
const targetBooking = ref<any>(null)
const staffPickerLoading = ref(false)
const availableStaff = ref<any[]>([])
const selectedStaffId = ref('')
const assigningLoading = ref(false)

async function openAssignModal(b: any) {
  targetBooking.value = b
  selectedStaffId.value = b.assignedStaffId || ''
  assignModalOpen.value = true
  staffPickerLoading.value = true
  availableStaff.value = []
  try {
    const res = await $fetch<any>(`/api/admin/bookings/${b.id}/staff-picker`)
    availableStaff.value = res.staff || []
  }
  catch (e: any) {
    toast.error('Error', e?.data?.message || 'Could not load staff list')
  }
  finally {
    staffPickerLoading.value = false
  }
}

async function submitAssign() {
  if (!targetBooking.value || !selectedStaffId.value) return
  assigningLoading.value = true
  try {
    await $fetch(`/api/admin/bookings/${targetBooking.value.id}/assign`, {
      method: 'PUT',
      body: { staffId: selectedStaffId.value },
    })
    toast.success(
      locale.value === 'ar' ? 'تم التعيين' : 'Assigned',
      t('adminBookings.assignedSuccess'),
    )
    assignModalOpen.value = false
    await refresh()
  }
  catch (e: any) {
    toast.error(
      locale.value === 'ar' ? 'فشل التعيين' : 'Assignment Failed',
      e?.data?.message || 'Failed to assign staff member',
    )
  }
  finally {
    assigningLoading.value = false
  }
}

// 2. Staff Cancel Modal (Single or Batch)
const cancelModalOpen = ref(false)
const cancelBookingIds = ref<string[]>([])
const cancelReason = ref('')
const cancellingLoading = ref(false)

function openCancelSingle(b: any) {
  cancelBookingIds.value = [b.id]
  cancelReason.value = ''
  cancelModalOpen.value = true
}

function openCancelBatch() {
  if (!selectedIds.value.length) return
  cancelBookingIds.value = [...selectedIds.value]
  cancelReason.value = ''
  cancelModalOpen.value = true
}

async function submitStaffCancel() {
  if (!cancelBookingIds.value.length) return
  cancellingLoading.value = true
  try {
    await $fetch('/api/admin/bookings/staff-cancel', {
      method: 'POST',
      body: {
        bookingIds: cancelBookingIds.value,
        reason: cancelReason.value.trim() || undefined,
      },
    })
    toast.success(
      locale.value === 'ar' ? 'تم الإلغاء' : 'Cancelled',
      t('adminBookings.cancelSuccess'),
    )
    cancelModalOpen.value = false
    selectedIds.value = []
    await refresh()
  }
  catch (e: any) {
    toast.error(
      locale.value === 'ar' ? 'فشل الإلغاء' : 'Cancellation Failed',
      e?.data?.message || 'Failed to cancel booking(s)',
    )
  }
  finally {
    cancellingLoading.value = false
  }
}

// 3. Mark Refund Handled Modal
const refundModalOpen = ref(false)
const refundBooking = ref<any>(null)
const refundNote = ref('')
const refundLoading = ref(false)

function openRefundModal(b: any) {
  refundBooking.value = b
  refundNote.value = ''
  refundModalOpen.value = true
}

async function submitRefundHandled() {
  if (!refundBooking.value) return
  refundLoading.value = true
  try {
    await $fetch(`/api/admin/bookings/${refundBooking.value.id}/refund-handled`, {
      method: 'POST',
      body: { note: refundNote.value.trim() || undefined },
    })
    toast.success(
      locale.value === 'ar' ? 'تم التحديث' : 'Refund Handled',
      t('adminBookings.refundHandledSuccess'),
    )
    refundModalOpen.value = false
    await refresh()
  }
  catch (e: any) {
    toast.error(
      locale.value === 'ar' ? 'فشل الإجراء' : 'Action Failed',
      e?.data?.message || 'Failed to update refund status',
    )
  }
  finally {
    refundLoading.value = false
  }
}

function isSelected(id: string) {
  return selectedIds.value.includes(id)
}

function toggleSelect(id: string) {
  const i = selectedIds.value.indexOf(id)
  if (i >= 0) selectedIds.value.splice(i, 1)
  else selectedIds.value.push(id)
}
</script>

<template>
  <div>
    <!-- Page Header -->
    <AdminPageHeader
      :title="t('adminBookings.title')"
      :description="t('adminBookings.description')"
    >
      <template #actions>
        <button
          v-if="selectedIds.length > 0"
          type="button"
          class="inline-flex h-9 items-center gap-1.5 rounded-md border border-rose-300 bg-rose-50 px-3.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
          @click="openCancelBatch"
        >
          <UserMinus class="h-3.5 w-3.5" aria-hidden="true" />
          <span>{{ t('adminBookings.cancelSelected') }} ({{ selectedIds.length }})</span>
        </button>
      </template>
    </AdminPageHeader>

    <!-- Filter Toolbar -->
    <div
      class="mb-4 rounded-md border bg-white p-3.5 shadow-xs dark:bg-[#162032]"
      :style="{ borderColor: 'var(--color-border)' }"
    >
      <form class="flex flex-wrap items-center gap-2.5" @submit.prevent="applyFilters">
        <!-- Search Input -->
        <div class="relative min-w-48 flex-1 sm:min-w-64">
          <Search class="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            v-model="search"
            type="search"
            placeholder="Search booking #, customer, or phone..."
            class="h-9 w-full rounded-md border bg-white ps-9 pe-3 text-xs placeholder:text-slate-400 focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520]"
            :style="{ borderColor: 'var(--color-border)' }"
          />
        </div>

        <!-- Status Filter -->
        <select
          v-model="statusFilter"
          class="h-9 rounded-md border bg-white px-3 text-xs text-slate-700 focus:border-[#2B71AE] focus:outline-none dark:bg-[#0B1520] dark:text-slate-300"
          :style="{ borderColor: 'var(--color-border)' }"
          @change="applyFilters"
        >
          <option value="">{{ t('adminBookings.allStatuses') }}</option>
          <option v-for="s in BOOKING_STATUSES" :key="s" :value="s">{{ s }}</option>
        </select>

        <!-- Date Filter -->
        <input
          v-model="dateFilter"
          type="date"
          class="h-9 rounded-md border bg-white px-3 text-xs text-slate-700 focus:border-[#2B71AE] focus:outline-none dark:bg-[#0B1520] dark:text-slate-300"
          :style="{ borderColor: 'var(--color-border)' }"
          @change="applyFilters"
        />

        <!-- Staff Filter (Manager view only) -->
        <select
          v-if="isManager"
          v-model="staffFilter"
          class="h-9 rounded-md border bg-white px-3 text-xs text-slate-700 focus:border-[#2B71AE] focus:outline-none dark:bg-[#0B1520] dark:text-slate-300"
          :style="{ borderColor: 'var(--color-border)' }"
          @change="applyFilters"
        >
          <option value="">{{ t('adminBookings.allStaff') }}</option>
          <option v-for="st in staffOptions" :key="st.id" :value="st.id">{{ st.name }}</option>
        </select>

        <!-- Needs Refund Filter Toggle -->
        <label
          class="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition-colors"
          :class="needsRefundFilter === 'true' ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-[#0B1520] dark:text-slate-300'"
          :style="{ borderColor: needsRefundFilter === 'true' ? undefined : 'var(--color-border)' }"
        >
          <input
            v-model="needsRefundFilter"
            type="checkbox"
            true-value="true"
            false-value=""
            class="h-3.5 w-3.5 rounded accent-rose-600"
            @change="applyFilters"
          />
          <AlertTriangle class="h-3.5 w-3.5 text-rose-600" aria-hidden="true" />
          <span>{{ t('adminBookings.needsRefundOnly') }}</span>
        </label>

        <!-- Apply Button -->
        <button
          type="submit"
          class="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          <Filter class="h-3.5 w-3.5" aria-hidden="true" />
          <span>Filter</span>
        </button>

        <!-- Reset Button -->
        <button
          v-if="hasFilters"
          type="button"
          class="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          @click="resetFilters"
        >
          <RotateCcw class="h-3.5 w-3.5" aria-hidden="true" />
          <span>Reset</span>
        </button>
      </form>
    </div>

    <!-- Bookings Table Card -->
    <div class="overflow-hidden rounded-md border bg-white shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[980px] text-start text-xs [&_td]:align-middle [&_th]:align-middle">
          <thead class="sticky top-0 z-10">
            <tr class="border-b bg-slate-50/75 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/40 dark:text-slate-400" :style="{ borderColor: 'var(--color-border)' }">
              <th scope="col" class="w-8 px-3 py-3 text-center">#</th>
              <th scope="col" class="px-4 py-3 text-start">Booking</th>
              <th scope="col" class="px-4 py-3 text-start">Customer</th>
              <th scope="col" class="px-4 py-3 text-start">Service</th>
              <th scope="col" class="px-4 py-3 text-start">Time (Berlin)</th>
              <th scope="col" class="px-4 py-3 text-center">Payment</th>
              <th scope="col" class="px-4 py-3 text-center">Status</th>
              <th scope="col" class="px-4 py-3 text-start">Staff</th>
              <th scope="col" class="px-4 py-3 text-end">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
            <tr
              v-for="b in bookingsData?.bookings || []"
              :key="b.id"
              class="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
              :class="{ 'bg-rose-50/30 dark:bg-rose-950/20': b.needsRefund }"
            >
              <!-- Checkbox (for staff cancellation) -->
              <td class="px-3 py-3 text-center">
                <input
                  v-if="b.status === 'ASSIGNED' && (isManager || b.assignedStaffId === currentUser?.userId)"
                  type="checkbox"
                  :checked="isSelected(b.id)"
                  class="h-3.5 w-3.5 rounded accent-[#2B71AE]"
                  @change="toggleSelect(b.id)"
                />
              </td>

              <!-- Booking Number -->
              <td class="px-4 py-3">
                <span class="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">{{ b.bookingNumber }}</span>
                <span
                  v-if="b.needsRefund"
                  class="mt-1 block inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                >
                  <AlertTriangle class="h-2.5 w-2.5" />
                  Refund Needed
                </span>
              </td>

              <!-- Customer Details + wa.me link -->
              <td class="px-4 py-3">
                <p class="font-semibold text-slate-900 dark:text-slate-100">{{ b.customerName }}</p>
                <div class="mt-0.5 flex items-center gap-1.5">
                  <span class="font-mono text-[11px] text-slate-500" dir="ltr">{{ b.customerPhone }}</span>
                  <a
                    v-if="b.waLink"
                    :href="b.waLink"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open WhatsApp chat"
                    class="inline-flex text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                  >
                    <IconWhatsApp class="h-3 w-3" />
                  </a>
                </div>
                <p v-if="b.customerEmail" class="text-[10px] text-slate-400" dir="ltr">{{ b.customerEmail }}</p>
              </td>

              <!-- Service -->
              <td class="px-4 py-3">
                <p class="font-medium text-slate-800 dark:text-slate-200">{{ b.service?.name }}</p>
                <span class="text-[10px] text-slate-400">{{ b.durationMinSnapshot }} min</span>
              </td>

              <!-- Appointment Time -->
              <td class="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                {{ formatDate(b.startsAt) }}
              </td>

              <!-- Payment Status + Deposit -->
              <td class="px-4 py-3 text-center whitespace-nowrap">
                <AdminStatusBadge :status="b.paymentStatus" size="sm" />
                <p class="mt-1 font-mono text-[11px] font-bold text-slate-900 dark:text-slate-100">
                  {{ centsToEur(b.depositCents) }}
                </p>
              </td>

              <!-- Booking Status -->
              <td class="px-4 py-3 text-center whitespace-nowrap">
                <AdminStatusBadge :status="b.status" size="sm" />
              </td>

              <!-- Assigned Staff -->
              <td class="px-4 py-3">
                <span v-if="b.assignedStaff" class="inline-flex items-center gap-1 font-medium text-slate-800 dark:text-slate-200">
                  <UserCheck class="h-3 w-3 text-emerald-600" />
                  {{ b.assignedStaff.name }}
                </span>
                <span v-else class="text-[11px] text-slate-400 italic">
                  Unassigned
                </span>
              </td>

              <!-- Actions -->
              <td class="px-4 py-3 text-end whitespace-nowrap">
                <div class="flex items-center justify-end gap-1.5">
                  <!-- Refund Handled CTA -->
                  <button
                    v-if="b.needsRefund && isManager"
                    type="button"
                    class="inline-flex items-center gap-1 rounded bg-rose-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-rose-700 transition-colors"
                    title="Mark refund handled"
                    @click="openRefundModal(b)"
                  >
                    <span>Resolve Refund</span>
                  </button>

                  <!-- Assign / Reassign (Manager only) -->
                  <button
                    v-if="isManager && b.paymentStatus === 'PAID' && !b.needsRefund"
                    type="button"
                    class="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                    @click="openAssignModal(b)"
                  >
                    <UserCheck class="h-3 w-3" />
                    <span>{{ b.assignedStaffId ? 'Reassign' : 'Assign' }}</span>
                  </button>

                  <!-- Staff Cancel (Assigned staff or manager) -->
                  <button
                    v-if="b.status === 'ASSIGNED' && (isManager || b.assignedStaffId === currentUser?.userId)"
                    type="button"
                    class="inline-flex items-center gap-1 rounded border border-rose-200 px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors"
                    title="Cancel assignment and return to queue"
                    @click="openCancelSingle(b)"
                  >
                    <UserX class="h-3 w-3" />
                    <span>Cancel</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div v-if="!bookingsData?.bookings?.length && !pending" class="p-8 text-center text-xs text-slate-400">
        {{ t('adminBookings.noBookings') }}
      </div>

      <!-- Pagination -->
      <AdminPagination
        v-if="(bookingsData?.pages || 1) > 1"
        :page="page"
        :pages="bookingsData?.pages || 1"
        :total="bookingsData?.total || 0"
        item-name="bookings"
        @change="(p) => { page = p; applyFilters() }"
      />
    </div>

    <!-- ── 1. ASSIGN / REASSIGN MODAL ── -->
    <div
      v-if="assignModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      @click.self="assignModalOpen = false"
    >
      <div class="w-full max-w-md rounded-lg border bg-white p-6 shadow-xl dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
        <div class="mb-4 flex items-center justify-between border-b pb-3" :style="{ borderColor: 'var(--color-border)' }">
          <h3 class="font-heading text-sm font-bold text-slate-900 dark:text-slate-100">
            {{ targetBooking?.assignedStaffId ? t('adminBookings.reassignStaff') : t('adminBookings.assignStaff') }}
          </h3>
          <button type="button" class="text-slate-400 hover:text-slate-600" @click="assignModalOpen = false">
            <X class="h-4 w-4" />
          </button>
        </div>

        <p class="mb-3 text-xs text-slate-500">
          Booking: <span class="font-mono font-bold text-slate-700 dark:text-slate-300">{{ targetBooking?.bookingNumber }}</span> · {{ formatDate(targetBooking?.startsAt) }} ({{ targetBooking?.durationMinSnapshot }} min)
        </p>

        <div v-if="staffPickerLoading" class="flex justify-center p-6">
          <Loader2 class="h-6 w-6 animate-spin text-[#2B71AE]" />
        </div>

        <div v-else-if="!availableStaff.length" class="p-4 text-center text-xs text-slate-400">
          No active staff members found.
        </div>

        <div v-else class="space-y-2 max-h-60 overflow-y-auto p-1">
          <label
            v-for="st in availableStaff"
            :key="st.id"
            class="flex items-center justify-between rounded-lg border p-2.5 text-xs transition-colors cursor-pointer"
            :class="[
              !st.isAvailable ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
              selectedStaffId === st.id ? 'border-[#2B71AE] bg-[#2B71AE]/5' : 'border-slate-200 dark:border-slate-700'
            ]"
          >
            <div class="flex items-center gap-2.5">
              <input
                v-model="selectedStaffId"
                type="radio"
                name="staff"
                :value="st.id"
                :disabled="!st.isAvailable"
                class="accent-[#2B71AE]"
              />
              <div>
                <p class="font-semibold text-slate-800 dark:text-slate-200">{{ st.name }}</p>
                <p class="text-[10px] text-slate-400">{{ st.email }}</p>
              </div>
            </div>
            <span v-if="!st.isAvailable" class="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
              Unavailable (Overlapping)
            </span>
          </label>
        </div>

        <div class="mt-5 flex justify-end gap-2 border-t pt-3" :style="{ borderColor: 'var(--color-border)' }">
          <button type="button" class="h-8 rounded px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100" @click="assignModalOpen = false">
            Cancel
          </button>
          <button
            type="button"
            :disabled="assigningLoading || !selectedStaffId"
            class="inline-flex h-8 items-center gap-1 rounded bg-[#F5CC07] px-4 text-xs font-bold text-slate-950 hover:bg-yellow-400 disabled:opacity-50"
            @click="submitAssign"
          >
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ── 2. STAFF CANCEL MODAL ── -->
    <div
      v-if="cancelModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      @click.self="cancelModalOpen = false"
    >
      <div class="w-full max-w-md rounded-lg border bg-white p-6 shadow-xl dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
        <div class="mb-4 flex items-center justify-between border-b pb-3" :style="{ borderColor: 'var(--color-border)' }">
          <h3 class="font-heading text-sm font-bold text-slate-900 dark:text-slate-100">
            Cancel Assignment
          </h3>
          <button type="button" class="text-slate-400 hover:text-slate-600" @click="cancelModalOpen = false">
            <X class="h-4 w-4" />
          </button>
        </div>

        <p class="mb-3 text-xs text-slate-600 dark:text-slate-300">
          {{ cancelBookingIds.length }} booking(s) will be unassigned and returned to the unassigned queue. Admin will be notified.
        </p>

        <label class="block mb-4">
          <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ t('adminBookings.cancelStaffReason') }}</span>
          <textarea
            v-model="cancelReason"
            rows="2.5"
            placeholder="e.g. Schedule conflict, illness..."
            class="w-full rounded border bg-transparent p-2 text-xs focus:border-[#2B71AE] focus:outline-none"
            :style="{ borderColor: 'var(--color-border)' }"
          />
        </label>

        <div class="flex justify-end gap-2 border-t pt-3" :style="{ borderColor: 'var(--color-border)' }">
          <button type="button" class="h-8 rounded px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100" @click="cancelModalOpen = false">
            Keep Assigned
          </button>
          <button
            type="button"
            :disabled="cancellingLoading"
            class="inline-flex h-8 items-center gap-1 rounded bg-rose-600 px-4 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
            @click="submitStaffCancel"
          >
            <span>Confirm Cancel</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ── 3. MARK REFUND HANDLED MODAL ── -->
    <div
      v-if="refundModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      @click.self="refundModalOpen = false"
    >
      <div class="w-full max-w-md rounded-lg border bg-white p-6 shadow-xl dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
        <div class="mb-4 flex items-center justify-between border-b pb-3" :style="{ borderColor: 'var(--color-border)' }">
          <h3 class="font-heading text-sm font-bold text-slate-900 dark:text-slate-100">
            {{ t('adminBookings.markRefundHandled') }}
          </h3>
          <button type="button" class="text-slate-400 hover:text-slate-600" @click="refundModalOpen = false">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-yellow-900/40 dark:bg-yellow-950/20 dark:text-yellow-200">
          <p class="font-bold mb-1">Important:</p>
          <p>{{ t('adminBookings.refundNotice') }}</p>
        </div>

        <p class="mb-3 text-xs text-slate-600 dark:text-slate-300">
          Booking: <span class="font-mono font-bold">{{ refundBooking?.bookingNumber }}</span> · Deposit: <span class="font-bold">{{ centsToEur(refundBooking?.depositCents) }}</span>
        </p>

        <label class="block mb-4">
          <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Admin Note (optional, for audit trail)</span>
          <textarea
            v-model="refundNote"
            rows="2"
            placeholder="e.g. Refunded 23.00 EUR via Stripe Dashboard refund ID re_123..."
            class="w-full rounded border bg-transparent p-2 text-xs focus:border-[#2B71AE] focus:outline-none"
            :style="{ borderColor: 'var(--color-border)' }"
          />
        </label>

        <div class="flex justify-end gap-2 border-t pt-3" :style="{ borderColor: 'var(--color-border)' }">
          <button type="button" class="h-8 rounded px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100" @click="refundModalOpen = false">
            Cancel
          </button>
          <button
            type="button"
            :disabled="refundLoading"
            class="inline-flex h-8 items-center gap-1 rounded bg-rose-600 px-4 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
            @click="submitRefundHandled"
          >
            <span>Clear Refund Flag</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
