<script setup lang="ts">
import {
  CreditCard,
  Globe,
  Phone,
  Sliders,
  Store,
} from 'lucide-vue-next'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

const activeTab = ref((route.query.tab as string) || 'general')

const tabs = computed(() => [
  { id: 'general', label: locale.value === 'ar' ? 'عام والهوية' : 'General & Brand', icon: Sliders },
  { id: 'contact', label: locale.value === 'ar' ? 'التواصل والموقع' : 'Contact & Social', icon: Phone },
  { id: 'seo', label: locale.value === 'ar' ? 'السيو والذكاء الاصطناعي' : 'SEO & AI Discovery', icon: Globe },
  { id: 'store', label: locale.value === 'ar' ? 'تهيئة المتجر' : 'Store Config', icon: Store },
  { id: 'payment', label: locale.value === 'ar' ? 'بوابات الدفع' : 'Payment Gateways', icon: CreditCard },
])

function switchTab(id: string) {
  activeTab.value = id
  router.replace({ query: { tab: id } })
}
</script>

<template>
  <div>
    <!-- Header -->
    <AdminPageHeader
      :title="t('admin.settings')"
      :description="locale === 'ar' ? 'تخصيص هوية المنصة، بيانات الاتصال، إعدادات محركات البحث، وطرق الدفع.' : 'Configure brand identity, contact channels, search indexing metadata, and payment gateways.'"
    />

    <!-- Tabs Navigation Bar -->
    <div class="mb-6 flex flex-wrap gap-1 border-b" :style="{ borderColor: 'var(--color-border)' }">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors"
        :class="[
          activeTab === tab.id
            ? 'border-[#2B71AE] text-[#2B71AE] dark:border-[#F5CC07] dark:text-[#F5CC07]'
            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:hover:text-slate-300'
        ]"
        @click="switchTab(tab.id)"
      >
        <component :is="tab.icon" class="h-4 w-4" aria-hidden="true" />
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <!-- Active Tab Content Area -->
    <div class="max-w-3xl">
      <div v-if="activeTab === 'general'">
        <AdminSettingsGeneral />
      </div>
      <div v-else-if="activeTab === 'contact'">
        <AdminSettingsContact />
      </div>
      <div v-else-if="activeTab === 'seo'">
        <AdminSettingsSeo />
      </div>
      <div v-else-if="activeTab === 'store'">
        <AdminSettingsStore />
      </div>
      <div v-else-if="activeTab === 'payment'">
        <AdminSettingsPayment />
      </div>
    </div>
  </div>
</template>
