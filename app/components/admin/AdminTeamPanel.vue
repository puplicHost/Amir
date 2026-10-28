<script setup lang="ts">
import { CalendarClock, ShieldAlert, Users } from 'lucide-vue-next'


const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const canUsers = useAdminCan('users.manage')
const canStaff = useAdminCan('schedule.manage')

type TabKey = 'users' | 'staff'

const allowedTabs = computed<TabKey[]>(() => {
  const tabs: TabKey[] = []
  if (canUsers.value) tabs.push('users')
  if (canStaff.value) tabs.push('staff')
  return tabs
})

const activeTab = computed<TabKey | null>(() => {
  const q = typeof route.query.teamTab === 'string' ? route.query.teamTab : ''
  if (allowedTabs.value.includes(q as TabKey)) return q as TabKey
  return allowedTabs.value[0] ?? null
})

const tabs = computed(() => [
  { id: 'users', label: t('admin.tabUsers'), icon: Users, show: canUsers.value },
  { id: 'staff', label: t('admin.tabStaff'), icon: CalendarClock, show: canStaff.value },
].filter(tab => tab.show))

function selectTab(tab: string) {
  if (tab === activeTab.value) return
  router.replace({ path: route.path, query: { ...route.query, teamTab: tab } })
}

// Keep the URL authoritative: an unknown or unauthorized ?tab= is replaced
// with the first tab the current user may access. Runs client-side only to
// avoid mutating the URL during SSR.
watch(allowedTabs, (tabs) => {
  if (!import.meta.client || !tabs.length) return
  const q = typeof route.query.teamTab === 'string' ? route.query.teamTab : ''
  if (!tabs.includes(q as TabKey)) {
    router.replace({ path: route.path, query: { ...route.query, teamTab: tabs[0] } })
  }
}, { immediate: true })
</script>

<template>
  <div>
    
    <div v-if="!allowedTabs.length" class="rounded-xl border bg-white p-6 shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
      <AdminEmptyState :title="t('admin.teamNoAccess')" :icon="ShieldAlert" />
    </div>

    <template v-else>
      <!-- Tabs: only rendered when the user may access more than one section -->
      <AdminTabs
        v-if="allowedTabs.length > 1"
        :model-value="activeTab ?? ''"
        :tabs="tabs"
        id-prefix="team"
        :aria-label="t('admin.team')"
        @update:model-value="selectTab"
      />

      <div
        v-if="activeTab === 'users'"
        id="team-panel-users"
        role="tabpanel"
        aria-labelledby="team-tab-users"
      >
        <AdminUsersPanel />
      </div>
      <div
        v-else-if="activeTab === 'staff'"
        id="team-panel-staff"
        role="tabpanel"
        aria-labelledby="team-tab-staff"
      >
        <AdminStaffPanel />
      </div>
    </template>
  </div>
</template>
