<script setup lang="ts">
import { Mail, Megaphone, ShieldAlert } from 'lucide-vue-next'

definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
  requiredPermission: ['inbox.manage', 'banners.manage'],
})

const { t } = useI18n()
const canInbox = useAdminCan('inbox.manage')
const canBanners = useAdminCan('banners.manage')

type TabKey = 'inbox' | 'banners'

const tabs = computed(() => [
  { id: 'inbox', label: t('admin.inbox'), icon: Mail, show: canInbox.value },
  { id: 'banners', label: t('admin.banners'), icon: Megaphone, show: canBanners.value },
].filter(tab => tab.show))

const allowedTabs = computed(() => tabs.value.map(tab => tab.id as TabKey))
const { activeTab, selectTab } = useAdminTabQuery<TabKey>(allowedTabs)
</script>

<template>
  <div>
    <AdminPageHeader :title="t('admin.website')" :description="t('admin.websiteDescription')" />

    <div v-if="!allowedTabs.length" class="rounded-xl border bg-white p-6 shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
      <AdminEmptyState :title="t('admin.noAccess')" :icon="ShieldAlert" />
    </div>

    <template v-else>
      <AdminTabs
        :model-value="activeTab ?? ''"
        :tabs="tabs"
        id-prefix="website"
        :aria-label="t('admin.website')"
        @update:model-value="selectTab"
      />

      <div v-if="activeTab === 'inbox'" id="website-panel-inbox" role="tabpanel" aria-labelledby="website-tab-inbox">
        <AdminInboxPanel />
      </div>
      <div v-else-if="activeTab === 'banners'" id="website-panel-banners" role="tabpanel" aria-labelledby="website-tab-banners">
        <AdminBannersPanel />
      </div>
    </template>
  </div>
</template>
