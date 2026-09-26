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
const settingsDirty = useSettingsDirtyFlag()

const VALID_TABS = ['general', 'contact', 'seo', 'store', 'payment'] as const

const activeTab = ref(
  VALID_TABS.includes(route.query.tab as any) ? String(route.query.tab) : 'general',
)

// Keep tab in sync with the URL (back/forward navigation, deep links).
watch(() => route.query.tab, (tab) => {
  if (typeof tab === 'string' && VALID_TABS.includes(tab as any) && tab !== activeTab.value) {
    activeTab.value = tab
  }
})

const tabs = computed(() => [
  { id: 'general', label: locale.value === 'ar' ? 'عام والهوية' : 'General & Brand', icon: Sliders },
  { id: 'contact', label: locale.value === 'ar' ? 'التواصل والموقع' : 'Contact & Social', icon: Phone },
  { id: 'seo', label: locale.value === 'ar' ? 'السيو والذكاء الاصطناعي' : 'SEO & AI Discovery', icon: Globe },
  { id: 'store', label: locale.value === 'ar' ? 'تهيئة المتجر' : 'Store Config', icon: Store },
  { id: 'payment', label: locale.value === 'ar' ? 'بوابات الدفع' : 'Payment Gateways', icon: CreditCard },
])

function switchTab(id: string) {
  if (id === activeTab.value) return
  if (settingsDirty.value) {
    const confirmed = confirm(
      locale.value === 'ar'
        ? 'لديك تغييرات غير محفوظة في هذا القسم. هل تريد المتابعة بدون حفظ؟'
        : 'You have unsaved changes in this section. Switch tabs without saving?',
    )
    if (!confirmed) return
  }
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
    <div
      class="mb-6 flex gap-1 overflow-x-auto border-b"
      :style="{ borderColor: 'var(--color-border)' }"
      role="tablist"
      :aria-label="locale === 'ar' ? 'أقسام الإعدادات' : 'Settings sections'"
    >
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.id"
        class="inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors"
        :class="[
          activeTab === tab.id
            ? 'border-[#2B71AE] text-[#2B71AE] dark:border-[#F5CC07] dark:text-[#F5CC07]'
            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:hover:text-slate-300'
        ]"
        @click="switchTab(tab.id)"
      >
        <component :is="tab.icon" class="h-4 w-4" aria-hidden="true" />
        <span>{{ tab.label }}</span>
        <span
          v-if="activeTab === tab.id"
          class="h-1.5 w-1.5 rounded-full bg-[#2B71AE] dark:bg-[#F5CC07]"
          aria-hidden="true"
        />
      </button>
    </div>

    <!-- Active Tab Content Area (wide enough for 2-3 column grids) -->
    <div class="max-w-5xl">
      <div v-if="activeTab === 'general'" role="tabpanel">
        <AdminSettingsGeneral />
      </div>
      <div v-else-if="activeTab === 'contact'" role="tabpanel">
        <AdminSettingsContact />
      </div>
      <div v-else-if="activeTab === 'seo'" role="tabpanel">
        <AdminSettingsSeo />
      </div>
      <div v-else-if="activeTab === 'store'" role="tabpanel">
        <AdminSettingsStore />
      </div>
      <div v-else-if="activeTab === 'payment'" role="tabpanel">
        <AdminSettingsPayment />
      </div>
    </div>
  </div>
</template>
