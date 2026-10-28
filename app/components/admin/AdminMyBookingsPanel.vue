<script setup lang="ts">
import {
  CalendarCheck,
  CalendarX,
  CheckCircle2,
  Clock,
  Loader2,
  Phone,
  UserMinus,
  X,
} from 'lucide-vue-next'
import { centsToEur } from '~~/shared/booking'


const { t, locale } = useI18n()
const toast = useAdminToast()
const fetch = useRequestFetch()
const route = useRoute()
const router = useRouter()

type TabKey = 'upcoming' | 'past'
const TABS: TabKey[] = ['upcoming', 'past']
const requestedTab = computed(() => (typeof route.query.view === 'string' ? route.query.view : ''))
const activeTab = computed<TabKey>(() => (
  TABS.includes(requestedTab.value as TabKey) ? requestedTab.value as TabKey : 'upcoming'
))
function selectTab(tab: string) {
  if (tab === activeTab.value) return
  router.replace({ path: route.path, query: { ...route.query, view: tab } })
}
watch(requestedTab, (tab) => {
  if (!import.meta.client) return
  if (!TABS.includes(tab as TabKey)) {
    router.replace({ path: route.path, query: { ...route.query, view: 'upcoming' } })
  }
}, { immediate: true })

const { data, refresh, pending } = await useAsyncData('staff-my-bookings', () =>
  fetch<any>('/api/admin/bookings', { params: { limit: 100 } }),
)

const nowMs = ref(Date.now())
let clockTimer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  clockTimer = setInterval(() => { nowMs.value = Date.now() }, 30000)
})
onUnmounted(() => clearInterval(clockTimer))

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

const tabs = computed(() => [
  { id: 'upcoming', label: t('staffBookings.upcoming'), icon: Clock, badge: upcomingBookings.value.length },
  { id: 'past', label: t('staffBookings.past'), icon: CalendarCheck, badge: pastBookings.value.length },
])

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

// ── "I'm unavailable" (Roadmap Phase 6) ──
const offOpen = ref(false)
const offFrom = ref('')
const offTo = ref('')
const offReason = ref('')
const offSaving = ref(false)

async function submitUnavailable() {
  if (!offFrom.value || !offTo.value) return
  offSaving.value = true
  try {
    const res = await $fetch<{ unassignedCount: number }>('/api/admin/staff/unavailable', {
      method: 'POST',
      body: {
        from: new Date(offFrom.value).toISOString(),
        to: new Date(offTo.value).toISOString(),
        reason: offReason.value.trim() || undefined,
      },
    })
    toast.success(
      locale.value === 'ar' ? 'تم التسجيل' : 'Recorded',
      `${t('staffBookings.unavailableDone')} (${res.unassignedCount})`,
    )
    offOpen.value = false
    offFrom.value = ''; offTo.value = ''; offReason.value = ''
    selectedIds.value = []
    await refresh()
  }
  catch (e: any) {
    toast.error('Error', e?.data?.message || e?.data?.statusMessage || 'Failed to record absence')
  }
  finally {
    offSaving.value = false
  }
}
</script>

<template>
  <div>
    <!-- Header -->
<div class="mb-4 flex flex-wrap items-center justify-end gap-2">
      <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="inline-flex h-11 items-center gap-1.5 rounded-md border px-3.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
            :style="{ borderColor: 'var(--color-border)' }"
            @click="offOpen = true"
          >
            <CalendarX class="h-3.5 w-3.5" aria-hidden="true" />
            <span>{{ t('staffBookings.unavailable') }}</span>
          </button>
          <button
            v-if="selectedIds.length > 0"
            type="button"
            class="inline-flex h-11 items-center gap-1.5 rounded-md border border-rose-300 bg-rose-50 px-3.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
            @click="openCancelBatch"
          >
            <UserMinus class="h-3.5 w-3.5" aria-hidden="true" />
            <span>{{ t('staffBookings.cancelSelected') }} ({{ selectedIds.length }})</span>
          </button>
        </div>
    </div>

    <!-- Tabs: Upcoming vs Past -->
    <AdminTabs
      :model-value="activeTab"
      :tabs="tabs"
      id-prefix="my-bookings"
      :aria-label="t('staffBookings.title')"
      @update:model-value="selectTab"
    />

    <!-- Active List -->
    <div v-if="activeTab === 'upcoming'" id="my-bookings-panel-upcoming" role="tabpanel" aria-labelledby="my-bookings-tab-upcoming" class="space-y-4">
      <div v-if="!upcomingBookings.length && !pending" class="rounded-lg border bg-white p-4 dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
        <AdminEmptyState
          :title="t('staffBookings.noUpcoming')"
          :description="t('staffBookings.noUpcomingHint')"
          :icon="Clock"
        />
      </div>

      <div
        v-for="b in upcomingBookings"
        :key="b.id"
        class="rounded-xl border bg-white p-5 shadow-xs transition-colors dark:bg-neutral-900"
        :style="{ borderColor: 'var(--color-border)' }"
      >
        <div class="flex flex-wrap items-start justify-between gap-3 border-b pb-3 mb-3" :style="{ borderColor: 'var(--color-border)' }">
          <div class="flex items-center gap-3">
            <input
              type="checkbox"
              :checked="isSelected(b.id)"
              class="h-4 w-4 rounded accent-primary"
              @change="toggleSelect(b.id)"
            />
            <div>
              <div class="flex items-center gap-2">
                <span class="font-heading text-base font-bold text-neutral-900 dark:text-neutral-100">{{ b.service?.name }}</span>
                <span class="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-mono text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{{ b.durationMinSnapshot }} min</span>
              </div>
              <p class="font-mono text-xs text-neutral-500 mt-0.5">{{ b.bookingNumber }}</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <AdminStatusBadge :status="b.status" size="sm" />
            <span class="font-mono text-xs font-bold text-primary dark:text-primary">
              {{ centsToEur(b.depositCents) }}
            </span>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-2 text-xs">
          <div>
            <p class="text-neutral-500 text-[11px] uppercase tracking-wider mb-0.5">Appointment Time</p>
            <p class="font-bold tabular-nums text-neutral-800 dark:text-neutral-200" dir="ltr">{{ formatDate(b.startsAt) }}</p>
          </div>

          <div>
            <p class="text-neutral-500 text-[11px] uppercase tracking-wider mb-0.5">Customer</p>
            <p class="font-bold text-neutral-800 dark:text-neutral-200">{{ b.customerName }}</p>
            <div class="mt-0.5 flex items-center gap-2">
              <span class="font-mono text-[11px] text-neutral-600 dark:text-neutral-400" dir="ltr">{{ b.customerPhone }}</span>
              <a
                v-if="b.waLink"
                :href="b.waLink"
                target="_blank"
                rel="noopener noreferrer"
                title="WhatsApp customer"
                class="inline-flex text-emerald-600 hover:text-emerald-700 dark:text-emerald-400" aria-label="WhatsApp customer">
                <IconWhatsApp class="h-3.5 w-3.5" />
              </a>
            </div>
            <p v-if="b.customerEmail" class="text-[11px] text-neutral-400" dir="ltr">{{ b.customerEmail }}</p>
          </div>
        </div>

        <div v-if="b.notes" class="mt-3 rounded bg-neutral-50 p-2 text-xs text-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-300">
          <span class="font-semibold text-neutral-700 dark:text-neutral-200">Customer note:</span> {{ b.notes }}
        </div>

        <!-- Actions -->
        <div class="mt-4 flex flex-wrap items-center justify-end gap-2 border-t pt-3" :style="{ borderColor: 'var(--color-border)' }">
          <button
            type="button"
            class="inline-flex h-11 items-center gap-1 rounded border border-rose-200 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/40"
            @click="openCancelSingle(b)"
          >
            <span>Cancel Appointment</span>
          </button>

          <button
            type="button"
            :disabled="!canComplete(b) || completingId === b.id"
            class="inline-flex h-11 items-center gap-1.5 rounded bg-emerald-600 px-3.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            :title="!canComplete(b) ? 'Can only be completed after appointment start time' : 'Mark booking completed'"
            @click="completeBooking(b)" :aria-label="!canComplete(b) ? 'Can only be completed after appointment start time' : 'Mark booking completed'">
            <Loader2 v-if="completingId === b.id" class="h-3 w-3 animate-spin" aria-hidden="true" />
            <CheckCircle2 v-else class="h-3.5 w-3.5" aria-hidden="true" />
            <span>{{ t('staffBookings.markCompleted') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Past List -->
    <div v-else id="my-bookings-panel-past" role="tabpanel" aria-labelledby="my-bookings-tab-past" class="space-y-4">
      <div v-if="!pastBookings.length && !pending" class="rounded-lg border bg-white p-4 dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
        <AdminEmptyState
          :title="t('staffBookings.noPast')"
          :description="t('staffBookings.noPastHint')"
          :icon="CalendarCheck"
        />
      </div>

      <div
        v-for="b in pastBookings"
        :key="b.id"
        class="rounded-xl border bg-white p-4 shadow-xs opacity-80 dark:bg-neutral-900"
        :style="{ borderColor: 'var(--color-border)' }"
      >
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="font-bold text-neutral-800 dark:text-neutral-200">{{ b.service?.name }} · {{ formatDate(b.startsAt) }}</p>
            <p class="text-xs text-neutral-500">{{ b.customerName }} · <span class="font-mono">{{ b.bookingNumber }}</span></p>
          </div>
          <AdminStatusBadge :status="b.status" size="sm" />
        </div>
      </div>
    </div>

    <!-- Unavailable Modal -->
    <div
      v-if="offOpen"
      class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      @click.self="offOpen = false"
@keydown.escape="offOpen = false"
    >
      <div class="w-full max-w-md rounded-lg border bg-white p-6 shadow-xl dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
        <div class="mb-4 flex items-center justify-between border-b pb-3" :style="{ borderColor: 'var(--color-border)' }">
          <h3 class="font-heading text-sm font-bold text-neutral-900 dark:text-neutral-100">{{ t('staffBookings.unavailableTitle') }}</h3>
          <button type="button" class="text-neutral-400 hover:text-neutral-600" @click="offOpen = false" :aria-label="t('common.close')">
            <X class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p class="mb-3 text-xs text-neutral-600 dark:text-neutral-300">{{ t('staffBookings.unavailableHint') }}</p>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('staffBookings.from') }}</span>
            <input v-model="offFrom" type="datetime-local" class="h-11 w-full rounded-md border bg-transparent px-2 text-xs" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
          <label class="block">
            <span class="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('staffBookings.to') }}</span>
            <input v-model="offTo" type="datetime-local" class="h-11 w-full rounded-md border bg-transparent px-2 text-xs" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
        </div>
        <label class="mt-3 block">
          <span class="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('staffBookings.reasonOpt') }}</span>
          <textarea v-model="offReason" rows="2" class="w-full rounded-md border bg-transparent p-2 text-xs" :style="{ borderColor: 'var(--color-border)' }" />
        </label>
        <div class="mt-4 flex justify-end gap-2 border-t pt-3" :style="{ borderColor: 'var(--color-border)' }">
          <button type="button" class="h-11 rounded-md px-4 text-xs font-semibold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800" @click="offOpen = false">{{ t('calendar.close') }}</button>
          <button
            type="button"
            :disabled="offSaving || !offFrom || !offTo"
            class="h-11 rounded-md bg-primary px-5 text-xs font-bold text-on-primary disabled:opacity-50"
            @click="submitUnavailable"
          >
            {{ t('staffBookings.submitAbsence') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Staff Cancel Modal -->
    <div
      v-if="cancelModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      @click.self="cancelModalOpen = false"
@keydown.escape="cancelModalOpen = false"
    >
      <div class="w-full max-w-md rounded-lg border bg-white p-6 shadow-xl dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
        <div class="mb-4 flex items-center justify-between border-b pb-3" :style="{ borderColor: 'var(--color-border)' }">
          <h3 class="font-heading text-sm font-bold text-neutral-900 dark:text-neutral-100">Cancel Appointment</h3>
          <button type="button" class="text-neutral-400 hover:text-neutral-600" @click="cancelModalOpen = false" :aria-label="t('common.close')">
            <X class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p class="mb-3 text-xs text-neutral-600 dark:text-neutral-300">
          {{ cancelBookingIds.length }} appointment(s) will be unassigned and returned to the admin queue.
        </p>

        <label class="block mb-4">
          <span class="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">Cancellation reason (optional)</span>
          <textarea
            v-model="cancelReason"
            rows="2.5"
            placeholder="e.g. Illness, emergency..."
            class="w-full rounded border bg-transparent p-2 text-xs focus:border-primary focus:outline-none"
            :style="{ borderColor: 'var(--color-border)' }"
          />
        </label>

        <div class="flex justify-end gap-2 border-t pt-3" :style="{ borderColor: 'var(--color-border)' }">
          <button type="button" class="h-11 rounded px-3 text-xs font-semibold text-neutral-600 hover:bg-neutral-100" @click="cancelModalOpen = false">Keep</button>
          <button
            type="button"
            :disabled="cancellingLoading"
            class="inline-flex h-11 items-center gap-1 rounded bg-rose-600 px-4 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
            @click="submitStaffCancel"
          >
            <span>Confirm Cancel</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
