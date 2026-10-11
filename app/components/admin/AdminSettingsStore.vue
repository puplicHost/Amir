<script setup lang="ts">
import { Store } from 'lucide-vue-next'

const { locale } = useI18n()
const canManageSettings = useAdminCan('settings.manage')

const {
  form, loading, statusMessage, isError, dirty, save, reset,
} = await useSettingsForm({
  key: 'settings-store',
  endpoint: '/api/admin/settings',
  defaults: {
    defaultCurrency: 'EUR',
    productsPerPage: 16,
  },
  saveEndpoint: '/api/admin/settings/store',
  successAr: 'تم حفظ تهيئة المتجر بنجاح.',
  successEn: 'Store configuration saved successfully.',
  failAr: 'حدث خطأ أثناء الحفظ.',
  failEn: 'Failed to save store configuration.',
})
</script>

<template>
  <form class="space-y-4" @submit.prevent="save">
    <!-- Store Configuration Card -->
    <div class="rounded-md border bg-white p-4 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <div class="mb-3 flex items-center gap-2">
        <Store class="h-4 w-4 text-[#2B71AE]" aria-hidden="true" />
        <h2 class="font-heading text-base font-bold text-slate-900 dark:text-slate-100">
          {{ locale === 'ar' ? 'العملة والتصفح في المتجر' : 'Catalog & Currency Settings' }}
        </h2>
      </div>

      <div class="grid max-w-xl gap-4 sm:grid-cols-2">
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Default Currency Code</span>
          <input v-model="form.defaultCurrency" type="text" placeholder="EUR" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" />
          <span class="mt-1 block text-[11px] text-slate-400">Default currency displayed across product pricing.</span>
        </label>

        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Products Per Page</span>
          <input v-model.number="form.productsPerPage" type="number" min="4" max="100" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" />
          <span class="mt-1 block text-[11px] text-slate-400">Default number of items displayed per catalog pagination page.</span>
        </label>
      </div>
    </div>

    <!-- Inline Feedback Banner -->
    <div
      v-if="statusMessage"
      role="alert"
      aria-live="polite"
      class="rounded-md border p-3 text-xs font-medium transition-all"
      :class="isError ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'"
    >
      {{ statusMessage }}
    </div>

    <!-- Sticky Save Bar -->
    <AdminSettingsSaveBar
      :loading="loading"
      :dirty="dirty"
      :disabled="!canManageSettings"
      :save-label="locale === 'ar' ? 'حفظ إعدادات المتجر' : 'Save Store Config'"
      :saving-label="locale === 'ar' ? 'جاري الحفظ…' : 'Saving…'"
      :reset-label="locale === 'ar' ? 'تراجع' : 'Reset'"
      @reset="reset"
    />
  </form>
</template>
