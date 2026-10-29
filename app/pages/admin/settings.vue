<script setup lang="ts">
import {
  Building2,
  CreditCard,
  Globe,
  Mail,
  Megaphone,
  Newspaper,
  Phone,
  ShieldCheck,
  Sliders,
  Store,
} from 'lucide-vue-next'
import type { Component } from 'vue'

// Every admin can reach Account & Security. Other sections are filtered by
// their own permission below; each API enforces authorization server-side.
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const settingsDirty = useSettingsDirtyFlag()

const canBusiness = useAdminCan('settings.business')
const canPayment = useAdminCan('settings.payment')
const canMeta = useAdminCan('settings.meta')
const canBanners = useAdminCan('banners.manage')

type TabKey = 'general' | 'contact' | 'seo' | 'store' | 'payment' | 'booking' | 'mail' | 'meta' | 'website' | 'account'

type SettingsPermission = 'settings.business' | 'settings.payment' | 'settings.meta' | 'banners.manage'

interface SettingsTab {
  id: TabKey
  label: string
  icon: Component
  permissions?: SettingsPermission[]
  separatorBefore?: boolean
}

const permissionGranted = computed<Record<SettingsPermission, boolean>>(() => ({
  'settings.business': canBusiness.value,
  'settings.payment': canPayment.value,
  'settings.meta': canMeta.value,
  'banners.manage': canBanners.value,
}))

const ALL_TABS = computed<SettingsTab[]>(() => [
  { id: 'general', label: locale.value === 'ar' ? 'عام والهوية' : 'General & Brand', icon: Sliders, permissions: ['settings.business'] },
  { id: 'contact', label: locale.value === 'ar' ? 'التواصل والموقع' : 'Contact & Social', icon: Phone, permissions: ['settings.business'] },
  { id: 'seo', label: locale.value === 'ar' ? 'السيو والذكاء الاصطناعي' : 'SEO & AI Discovery', icon: Globe, permissions: ['settings.business'] },
  { id: 'store', label: locale.value === 'ar' ? 'تهيئة المتجر' : 'Store Config', icon: Store, permissions: ['settings.business'] },
  { id: 'payment', label: t('payment.title'), icon: CreditCard, permissions: ['settings.payment'] },
  { id: 'booking', label: t('salon.title'), icon: Building2, permissions: ['settings.business'] },
  { id: 'mail', label: t('mail.title'), icon: Mail, permissions: ['settings.business'] },
  { id: 'meta', label: locale.value === 'ar' ? 'تكامل ميتا' : 'Meta Integration', icon: Megaphone, permissions: ['settings.meta'] },
  { id: 'website', label: t('admin.websiteSettings'), icon: Newspaper, permissions: ['banners.manage', 'settings.business'] },
  { id: 'account', label: t('admin.account'), icon: ShieldCheck, separatorBefore: true },
].filter(tab => !tab.permissions || tab.permissions.some(p => permissionGranted.value[p])))

const allowedTabs = computed(() => ALL_TABS.value.map(tab => tab.id))

const requestedTab = computed(() => (typeof route.query.tab === 'string' ? route.query.tab : ''))

const activeTab = computed<TabKey | ''>(() => {
  const requested = requestedTab.value as TabKey
  if (allowedTabs.value.includes(requested)) return requested
  return allowedTabs.value[0] ?? ''
})

const { confirm: confirmDialog } = useAdminConfirm()

// Keep the URL authoritative: unknown/legacy tabs are replaced with the first
// allowed section. The old "announcements" tab now lives in Website & Banners.
watch([requestedTab, allowedTabs], () => {
  if (!import.meta.client) return
  if (requestedTab.value === 'announcements') {
    if (allowedTabs.value.includes('website')) {
      router.replace({ path: route.path, query: { ...route.query, tab: 'website' } })
    }
    else if (allowedTabs.value.length) {
      router.replace({ path: route.path, query: { ...route.query, tab: allowedTabs.value[0] } })
    }
    return
  }
  if (allowedTabs.value.length && !allowedTabs.value.includes(requestedTab.value as TabKey)) {
    router.replace({ path: route.path, query: { ...route.query, tab: allowedTabs.value[0] } })
  }
}, { immediate: true })

async function switchTab(id: string) {
  if (id === activeTab.value) return
  if (settingsDirty.value) {
    const confirmed = await confirmDialog({
      title: locale.value === 'ar' ? 'تجاهل التغييرات غير المحفوظة؟' : 'Discard unsaved changes?',
      message: locale.value === 'ar'
        ? 'لديك تغييرات غير محفوظة في هذا القسم. هل تريد المتابعة بدون حفظ؟'
        : 'You have unsaved changes in this section. Switch tabs without saving?',
      confirmLabel: locale.value === 'ar' ? 'تجاهل والمتابعة' : 'Discard & Switch',
      danger: false,
    })
    if (!confirmed) return
  }
  router.replace({ path: route.path, query: { ...route.query, tab: id } })
}
</script>

<template>
  <div>
    <AdminPageHeader
      :title="t('admin.settings')"
      :description="t('admin.settingsDescription')"
    />

    <div class="sticky top-16 z-20 -mx-1 mb-2 bg-bg/95 px-1 pt-2 backdrop-blur supports-[backdrop-filter]:bg-bg/80">
      <AdminTabs
        :model-value="activeTab"
        :tabs="ALL_TABS"
        id-prefix="settings"
        :aria-label="locale === 'ar' ? 'أقسام الإعدادات' : 'Settings sections'"
        @update:model-value="switchTab"
      />
    </div>

    <div class="max-w-5xl">
      <div v-if="activeTab === 'general'" id="settings-panel-general" role="tabpanel" aria-labelledby="settings-tab-general">
        <AdminSettingsGeneral />
      </div>
      <div v-else-if="activeTab === 'contact'" id="settings-panel-contact" role="tabpanel" aria-labelledby="settings-tab-contact">
        <AdminSettingsContact />
      </div>
      <div v-else-if="activeTab === 'seo'" id="settings-panel-seo" role="tabpanel" aria-labelledby="settings-tab-seo">
        <AdminSettingsSeo />
      </div>
      <div v-else-if="activeTab === 'store'" id="settings-panel-store" role="tabpanel" aria-labelledby="settings-tab-store">
        <AdminSettingsStore />
      </div>
      <div v-else-if="activeTab === 'payment'" id="settings-panel-payment" role="tabpanel" aria-labelledby="settings-tab-payment">
        <AdminSettingsPayment />
      </div>
      <div v-else-if="activeTab === 'booking'" id="settings-panel-booking" role="tabpanel" aria-labelledby="settings-tab-booking">
        <AdminSettingsBooking />
      </div>
      <div v-else-if="activeTab === 'mail'" id="settings-panel-mail" role="tabpanel" aria-labelledby="settings-tab-mail">
        <AdminSettingsMail />
      </div>
      <div v-else-if="activeTab === 'meta'" id="settings-panel-meta" role="tabpanel" aria-labelledby="settings-tab-meta">
        <AdminSettingsMeta />
      </div>
      <div v-else-if="activeTab === 'website'" id="settings-panel-website" role="tabpanel" aria-labelledby="settings-tab-website">
        <AdminSettingsWebsite />
      </div>
      <div v-else-if="activeTab === 'account'" id="settings-panel-account" role="tabpanel" aria-labelledby="settings-tab-account">
        <AdminSettingsAccount />
      </div>
    </div>
  </div>
</template>
