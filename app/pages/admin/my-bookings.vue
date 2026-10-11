<script setup lang="ts">
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  Loader2,
  Phone,
  UserMinus,
  X,
} from 'lucide-vue-next'
import { centsToEur } from '~~/shared/booking'

definePageMeta({ layout: 'admin', middleware: 'admin-auth', requiredPermission: 'bookings.view_own' })

const { t, locale } = useI18n()
const toast = useAdminToast()
const fetch = useRequestFetch()

const activeTab = ref<'upcoming' | 'past'>('upcoming')

const { data, refresh, pending } = await useAsyncData('staff-my-bookings', () =>
  fetch<any>('/api/admin/bookings', { params: { limit: 100 } }),
)

const nowMs = ref(Date.now())
onMounted(() => {
  const timer = setInterval(() => { nowMs.value = Date.now() }, 30000)
  onUnmounted(() => clearInterval(timer))
})

const allBookings = computed(() => data.value?.bookings || [])

const upcomingBookings = computed(() =>
  allBookings.value
    .filter((b: any) => b.status === 'ASSIGNED')
    .sort((a: any, b: any) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
)

const pastBookings = computed(() =>
  allBookings.value
    .filter((b: any) => b.status !== 'ASSIGNED')
    .sort((a: any, b: any) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime()),
)

function formatDate(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString(locale.value === 'ar' ? 'ar-EG' : 'de-DE', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function canComplete(b: any): boolean {
  return b.status === 'ASSIGNED' && new Date(b.startsAt).getTime() <= nowMs.value
}

// ── Complete Action ──
const completingId = ref<string | null>(null)
async function completeBooking(b: any) {
  if (!canComplete(b)) return
  completingId.value = b.id
  try {
    await $fetch(`/api/admin/bookings/${b.id}/complete`, { method: 'POST' })
    toast.success(
      locale.value === 'ar' ? 'تم الإكمال' : 'Completed',
      t('staffBookings.completedSuccess'),
    )
    await refresh()
  }
  catch (e: any) {
    toast.error('Error', e?.data?.message || 'Failed to complete booking')
  }
  finally {
    completingId.value = null
  }
}

// ── Cancel Modal State ──
const cancelModalOpen = ref(false)
const cancelBookingIds = ref<string[]>([])
const cancelReason = ref('')
const cancellingLoading = ref(false)
const selectedIds = ref<string[]>([])

function isSelected(id: string) {
  return selectedIds.value.includes(id)
}

function toggleSelect(id: string) {
  const i = selectedIds.value.indexOf(id)
  if (i >= 0) selectedIds.value.splice(i, 1)
  else selectedIds.value.push(id)
}

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
      t('staffBookings.cancelSuccess'),
    )
    cancelModalOpen.value = false
    selectedIds.value = []
    await refresh()
  }
  catch (e: any) {
    toast.error('Error', e?.data?.message || 'Failed to cancel booking')
  }
  finally {
    cancellingLoading.value = false
  }
}
</script>

<template>
  <div>
    <!-- Header -->
    <AdminPageHeader
      :title="t('staffBookings.title')"
      :description="t('staffBookings.description')"
    >
      <template #actions>
        <button
          v-if="selectedIds.length > 0"
          type="button"
          class="inline-flex h-9 items-center gap-1.5 rounded-md border border-rose-300 bg-rose-50 px-3.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
          @click="openCancelBatch"
        >
          <UserMinus class="h-3.5 w-3.5" aria-hidden="true" />
          <span>{{ t('staffBookings.cancelSelected') }} ({{ selectedIds.length }})</span>
        </button>
      </template>
    </AdminPageHeader>

    <!-- Tabs: Upcoming vs Past -->
    <div class="mb-6 flex border-b" :style="{ borderColor: 'var(--color-border)' }">
      <button
        type="button"
        class="inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors"
        :class="activeTab === 'upcoming'
          ? 'border-[#2B71AE] text-[#2B71AE] dark:border-[#F5CC07] dark:text-[#F5CC07]'
          : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
        @click="activeTab = 'upcoming'"
      >
        <Clock class="h-4 w-4" />
        <span>{{ t('staffBookings.upcoming') }}</span>
        <span class="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
          {{ upcomingBookings.length }}
        </span>
      </button>

      <button
        type="button"
        class="inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors"
        :class="activeTab === 'past'
          ? 'border-[#2B71AE] text-[#2B71AE] dark:border-[#F5CC07] dark:text-[#F5CC07]'
          : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
        @click="activeTab = 'past'"
      >
        <CalendarCheck class="h-4 w-4" />
        <span>{{ t('staffBookings.past') }}</span>
        <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {{ pastBookings.length }}
        </span>
      </button>
    </div>

    <!-- Active List -->
    <div v-if="activeTab === 'upcoming'" class="space-y-4">
      <div v-if="!upcomingBookings.length && !pending" class="rounded-lg border bg-white p-8 text-center text-xs text-slate-400 dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
        {{ t('staffBookings.noUpcoming') }}
      </div>

      <div
        v-for="b in upcomingBookings"
        :key="b.id"
        class="rounded-xl border bg-white p-5 shadow-xs transition-colors dark:bg-[#162032]"
        :style="{ borderColor: 'var(--color-border)' }"
      >
        <div class="flex flex-wrap items-start justify-between gap-3 border-b pb-3 mb-3" :style="{ borderColor: 'var(--color-border)' }">
          <div class="flex items-center gap-3">
            <input
              type="checkbox"
              :checked="isSelected(b.id)"
              class="h-4 w-4 rounded accent-[#2B71AE]"
              @change="toggleSelect(b.id)"
            />
            <div>
              <div class="flex items-center gap-2">
                <span class="font-heading text-base font-bold text-slate-900 dark:text-slate-100">{{ b.service?.name }}</span>
                <span class="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-300">{{ b.durationMinSnapshot }} min</span>
              </div>
              <p class="font-mono text-xs text-slate-500 mt-0.5">{{ b.bookingNumber }}</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <AdminStatusBadge :status="b.status" size="sm" />
            <span class="font-mono text-xs font-bold text-[#2B71AE] dark:text-[#F5CC07]">
              {{ centsToEur(b.depositCents) }}
            </span>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-2 text-xs">
          <div>
            <p class="text-slate-500 text-[11px] uppercase tracking-wider mb-0.5">Appointment Time</p>
            <p class="font-bold text-slate-800 dark:text-slate-200">{{ formatDate(b.startsAt) }}</p>
          </div>

          <div>
            <p class="text-slate-500 text-[11px] uppercase tracking-wider mb-0.5">Customer</p>
            <p class="font-bold text-slate-800 dark:text-slate-200">{{ b.customerName }}</p>
            <div class="mt-0.5 flex items-center gap-2">
              <span class="font-mono text-[11px] text-slate-600 dark:text-slate-400" dir="ltr">{{ b.customerPhone }}</span>
              <a
                v-if="b.waLink"
                :href="b.waLink"
                target="_blank"
                rel="noopener noreferrer"
                title="WhatsApp customer"
                class="inline-flex text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
              >
                <IconWhatsApp class="h-3.5 w-3.5" />
              </a>
            </div>
            <p v-if="b.customerEmail" class="text-[11px] text-slate-400" dir="ltr">{{ b.customerEmail }}</p>
          </div>
        </div>

        <div v-if="b.notes" class="mt-3 rounded bg-slate-50 p-2 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
          <span class="font-semibold text-slate-700 dark:text-slate-200">Customer note:</span> {{ b.notes }}
        </div>

        <!-- Actions -->
        <div class="mt-4 flex flex-wrap items-center justify-end gap-2 border-t pt-3" :style="{ borderColor: 'var(--color-border)' }">
          <button
            type="button"
            class="inline-flex h-8 items-center gap-1 rounded border border-rose-200 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/40"
            @click="openCancelSingle(b)"
          >
            <span>Cancel Appointment</span>
          </button>

          <button
            type="button"
            :disabled="!canComplete(b) || completingId === b.id"
            class="inline-flex h-8 items-center gap-1.5 rounded bg-emerald-600 px-3.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            :title="!canComplete(b) ? 'Can only be completed after appointment start time' : 'Mark booking completed'"
            @click="completeBooking(b)"
          >
            <Loader2 v-if="completingId === b.id" class="h-3 w-3 animate-spin" />
            <CheckCircle2 v-else class="h-3.5 w-3.5" />
            <span>{{ t('staffBookings.markCompleted') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Past List -->
    <div v-else class="space-y-4">
      <div v-if="!pastBookings.length && !pending" class="rounded-lg border bg-white p-8 text-center text-xs text-slate-400 dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
        {{ t('staffBookings.noPast') }}
      </div>

      <div
        v-for="b in pastBookings"
        :key="b.id"
        class="rounded-xl border bg-white p-4 shadow-xs opacity-80 dark:bg-[#162032]"
        :style="{ borderColor: 'var(--color-border)' }"
      >
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="font-bold text-slate-800 dark:text-slate-200">{{ b.service?.name }} · {{ formatDate(b.startsAt) }}</p>
            <p class="text-xs text-slate-500">{{ b.customerName }} · <span class="font-mono">{{ b.bookingNumber }}</span></p>
          </div>
          <AdminStatusBadge :status="b.status" size="sm" />
        </div>
      </div>
    </div>

    <!-- Staff Cancel Modal -->
    <div
      v-if="cancelModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      @click.self="cancelModalOpen = false"
    >
      <div class="w-full max-w-md rounded-lg border bg-white p-6 shadow-xl dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
        <div class="mb-4 flex items-center justify-between border-b pb-3" :style="{ borderColor: 'var(--color-border)' }">
          <h3 class="font-heading text-sm font-bold text-slate-900 dark:text-slate-100">Cancel Appointment</h3>
          <button type="button" class="text-slate-400 hover:text-slate-600" @click="cancelModalOpen = false">
            <X class="h-4 w-4" />
          </button>
        </div>

        <p class="mb-3 text-xs text-slate-600 dark:text-slate-300">
          {{ cancelBookingIds.length }} appointment(s) will be unassigned and returned to the admin queue.
        </p>

        <label class="block mb-4">
          <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Cancellation reason (optional)</span>
          <textarea
            v-model="cancelReason"
            rows="2.5"
            placeholder="e.g. Illness, emergency..."
            class="w-full rounded border bg-transparent p-2 text-xs focus:border-[#2B71AE] focus:outline-none"
            :style="{ borderColor: 'var(--color-border)' }"
          />
        </label>

        <div class="flex justify-end gap-2 border-t pt-3" :style="{ borderColor: 'var(--color-border)' }">
          <button type="button" class="h-8 rounded px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100" @click="cancelModalOpen = false">Keep</button>
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
  </div>
</template>
