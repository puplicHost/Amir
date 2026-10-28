<script setup lang="ts">
import { BellRing, CalendarCheck, CalendarDays, CalendarRange, ShieldAlert } from 'lucide-vue-next'

definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
  requiredPermission: ['bookings.view_all', 'bookings.view_own'],
})

const { t } = useI18n()
const canViewAll = useAdminCan('bookings.view_all')
const canViewOwn = useAdminCan('bookings.view_own')

type TabKey = 'calendar' | 'reminders' | 'my-bookings' | 'bookings'

const tabs = computed(() => [
  { id: 'calendar', label: t('admin.calendar'), icon: CalendarRange, show: canViewAll.value || canViewOwn.value },
  { id: 'reminders', label: t('admin.reminders'), icon: BellRing, show: canViewAll.value || canViewOwn.value },
  { id: 'my-bookings', label: t('admin.myBookings'), icon: CalendarCheck, show: canViewOwn.value },
  { id: 'bookings', label: t('admin.allBookings'), icon: CalendarDays, show: canViewAll.value },
].filter(tab => tab.show))

const allowedTabs = computed(() => tabs.value.map(tab => tab.id as TabKey))
const { activeTab, selectTab } = useAdminTabQuery<TabKey>(
  allowedTabs,
  'tab',
  () => (canViewAll.value ? 'calendar' : 'my-bookings'),
)
</script>

<template>
  <div>
    <AdminPageHeader :title="t('admin.appointments')" :description="t('admin.appointmentsDescription')" />

    <div v-if="!allowedTabs.length" class="rounded-xl border bg-white p-6 shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
      <AdminEmptyState :title="t('admin.noAccess')" :icon="ShieldAlert" />
    </div>

    <template v-else>
      <AdminTabs
        :model-value="activeTab ?? ''"
        :tabs="tabs"
        id-prefix="appointments"
        :aria-label="t('admin.appointments')"
        @update:model-value="selectTab"
      />

      <div v-if="activeTab === 'calendar'" id="appointments-panel-calendar" role="tabpanel" aria-labelledby="appointments-tab-calendar">
        <AdminCalendarPanel />
      </div>
      <div v-else-if="activeTab === 'reminders'" id="appointments-panel-reminders" role="tabpanel" aria-labelledby="appointments-tab-reminders">
        <AdminRemindersPanel />
      </div>
      <div v-else-if="activeTab === 'my-bookings'" id="appointments-panel-my-bookings" role="tabpanel" aria-labelledby="appointments-tab-my-bookings">
        <AdminMyBookingsPanel />
      </div>
      <div v-else-if="activeTab === 'bookings'" id="appointments-panel-bookings" role="tabpanel" aria-labelledby="appointments-tab-bookings">
        <AdminBookingsPanel />
      </div>
    </template>
  </div>
</template>
