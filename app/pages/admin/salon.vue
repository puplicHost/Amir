<script setup lang="ts">
import { CalendarClock, ShieldAlert, Users, Wrench } from 'lucide-vue-next'

definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
  requiredPermission: ['services.manage', 'users.manage', 'schedule.manage'],
})

const { t } = useI18n()
const canServices = useAdminCan('services.manage')
const canTeam = useAdminCan(['users.manage', 'schedule.manage'])
const canHours = useAdminCan('schedule.manage')

type TabKey = 'services' | 'team' | 'hours'

const tabs = computed(() => [
  { id: 'services', label: t('admin.services'), icon: Wrench, show: canServices.value },
  { id: 'team', label: t('admin.teamUsers'), icon: Users, show: canTeam.value },
  { id: 'hours', label: t('admin.workingHours'), icon: CalendarClock, show: canHours.value },
].filter(tab => tab.show))

const allowedTabs = computed(() => tabs.value.map(tab => tab.id as TabKey))
const { activeTab, selectTab } = useAdminTabQuery<TabKey>(allowedTabs)
</script>

<template>
  <div>
    <AdminPageHeader :title="t('admin.salonManagement')" :description="t('admin.salonDescription')" />

    <div v-if="!allowedTabs.length" class="rounded-xl border bg-white p-6 shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
      <AdminEmptyState :title="t('admin.noAccess')" :icon="ShieldAlert" />
    </div>

    <template v-else>
      <AdminTabs
        :model-value="activeTab ?? ''"
        :tabs="tabs"
        id-prefix="salon"
        :aria-label="t('admin.salonManagement')"
        @update:model-value="selectTab"
      />

      <div v-if="activeTab === 'services'" id="salon-panel-services" role="tabpanel" aria-labelledby="salon-tab-services">
        <AdminServicesPanel />
      </div>
      <div v-else-if="activeTab === 'team'" id="salon-panel-team" role="tabpanel" aria-labelledby="salon-tab-team">
        <AdminTeamPanel />
      </div>
      <div v-else-if="activeTab === 'hours'" id="salon-panel-hours" role="tabpanel" aria-labelledby="salon-tab-hours">
        <AdminSchedulePanel />
      </div>
    </template>
  </div>
</template>
