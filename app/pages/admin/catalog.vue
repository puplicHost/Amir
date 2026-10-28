<script setup lang="ts">
import { FolderTree, Package, ShieldAlert } from 'lucide-vue-next'

definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
  requiredPermission: ['products.view', 'categories.manage'],
})

const { t } = useI18n()
const canProducts = useAdminCan('products.view')
const canCategories = useAdminCan('categories.manage')

type TabKey = 'products' | 'categories'

const tabs = computed(() => [
  { id: 'products', label: t('admin.products'), icon: Package, show: canProducts.value },
  { id: 'categories', label: t('admin.categories'), icon: FolderTree, show: canCategories.value },
].filter(tab => tab.show))

const allowedTabs = computed(() => tabs.value.map(tab => tab.id as TabKey))
const { activeTab, selectTab } = useAdminTabQuery<TabKey>(allowedTabs)
</script>

<template>
  <div>
    <AdminPageHeader :title="t('admin.catalog')" :description="t('admin.catalogDescription')" />

    <div v-if="!allowedTabs.length" class="rounded-xl border bg-white p-6 shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
      <AdminEmptyState :title="t('admin.noAccess')" :icon="ShieldAlert" />
    </div>

    <template v-else>
      <AdminTabs
        :model-value="activeTab ?? ''"
        :tabs="tabs"
        id-prefix="catalog"
        :aria-label="t('admin.catalog')"
        @update:model-value="selectTab"
      />

      <div v-if="activeTab === 'products'" id="catalog-panel-products" role="tabpanel" aria-labelledby="catalog-tab-products">
        <AdminProductsPanel />
      </div>
      <div v-else-if="activeTab === 'categories'" id="catalog-panel-categories" role="tabpanel" aria-labelledby="catalog-tab-categories">
        <AdminCategoriesPanel />
      </div>
    </template>
  </div>
</template>
