<script setup lang="ts">
import { CreditCard, Receipt, ShieldAlert } from 'lucide-vue-next'

definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
  requiredPermission: ['expenses.view', 'bookings.refund_handle', 'bookings.refund_issue'],
})

const { t } = useI18n()
const canExpenses = useAdminCan('expenses.view')
const canViewAll = useAdminCan('bookings.view_all')
const canViewOwn = useAdminCan('bookings.view_own')
const canRefunds = useAdminCan(['bookings.refund_handle', 'bookings.refund_issue'])
const canPayments = computed(() => canRefunds.value && (canViewAll.value || canViewOwn.value))

type TabKey = 'expenses' | 'payments'

const tabs = computed(() => [
  { id: 'expenses', label: t('admin.expenses'), icon: Receipt, show: canExpenses.value },
  { id: 'payments', label: t('admin.paymentsRefunds'), icon: CreditCard, show: canPayments.value },
].filter(tab => tab.show))

const allowedTabs = computed(() => tabs.value.map(tab => tab.id as TabKey))
const { activeTab, selectTab } = useAdminTabQuery<TabKey>(allowedTabs)
</script>

<template>
  <div>
    <AdminPageHeader :title="t('admin.finance')" :description="t('admin.financeDescription')" />

    <div v-if="!allowedTabs.length" class="rounded-xl border bg-white p-6 shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
      <AdminEmptyState :title="t('admin.noAccess')" :icon="ShieldAlert" />
    </div>

    <template v-else>
      <AdminTabs
        :model-value="activeTab ?? ''"
        :tabs="tabs"
        id-prefix="finance"
        :aria-label="t('admin.finance')"
        @update:model-value="selectTab"
      />

      <div v-if="activeTab === 'expenses'" id="finance-panel-expenses" role="tabpanel" aria-labelledby="finance-tab-expenses">
        <AdminExpensesPanel />
      </div>
      <div v-else-if="activeTab === 'payments'" id="finance-panel-payments" role="tabpanel" aria-labelledby="finance-tab-payments">
        <AdminPaymentsPanel />
      </div>
    </template>
  </div>
</template>
