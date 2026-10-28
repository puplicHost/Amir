<script setup lang="ts">
import { Globe, Search, Sparkles } from 'lucide-vue-next'

const { locale } = useI18n()
const canManageSettings = useAdminCan('settings.business')

const {
  form, loading, statusMessage, isError, dirty, save, reset,
} = await useSettingsForm({
  key: 'settings-seo',
  endpoint: '/api/admin/settings',
  defaults: {
    seoMetaTitleTemplateAr: '',
    seoMetaTitleTemplateEn: '',
    seoMetaDescriptionAr: '',
    seoMetaDescriptionEn: '',
    seoKeywords: '',
    geoDescription: '',
  },
  saveEndpoint: '/api/admin/settings/seo',
  successAr: 'تم حفظ إعدادات محركات البحث والذكاء الاصطناعي بنجاح.',
  successEn: 'SEO & AI Search Discovery settings saved successfully.',
  failAr: 'حدث خطأ أثناء الحفظ.',
  failEn: 'Failed to save SEO settings.',
})
</script>

<template>
  <form class="space-y-4" @submit.prevent="save">
    <!-- Title & Description Templates -->
    <div class="rounded-md border bg-white p-4 shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
      <div class="mb-3 flex items-center gap-2">
        <Search class="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 class="font-heading text-base font-bold text-neutral-900 dark:text-neutral-100">
          {{ locale === 'ar' ? 'قوالب العناوين والوصف في محركات البحث' : 'Search Metadata Templates' }}
        </h2>
      </div>

      <div class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">Meta Title Template (EN)</span>
            <input v-model="form.seoMetaTitleTemplateEn" type="text" placeholder="{page} | Amir" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">Meta Title Template (AR)</span>
            <input v-model="form.seoMetaTitleTemplateAr" type="text" placeholder="{page} | أمير" dir="rtl" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">Default Meta Description (EN)</span>
            <textarea v-model="form.seoMetaDescriptionEn" rows="2.5" placeholder="AMIR Frisur & Kosmetik Studio in Meitingen..." class="w-full rounded-md border bg-white p-2.5 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-bg" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">Default Meta Description (DE)</span>
            <textarea v-model="form.seoMetaDescriptionAr" rows="2.5" placeholder="AMIR Frisur & Kosmetik Studio in Meitingen..." class="w-full rounded-md border bg-white p-2.5 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-bg" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
        </div>

        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">Default Keywords</span>
          <input v-model="form.seoKeywords" type="text" placeholder="friseur, kosmetik, meitingen, amir, haarschnitt, balayage" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" />
          <span class="mt-1 block text-[11px] text-neutral-400">Comma-separated keywords for meta tags.</span>
        </label>
      </div>
    </div>

    <!-- GEO & AI Search Context -->
    <div class="rounded-md border bg-white p-4 shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
      <div class="mb-2 flex items-center gap-2">
        <Sparkles class="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 class="font-heading text-base font-bold text-neutral-900 dark:text-neutral-100">
          {{ locale === 'de' ? 'GEO & KI-Suchmaschinen-Kontext' : 'GEO & AI Search Knowledge' }}
        </h2>
      </div>
      <p class="mb-4 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
        {{ locale === 'de' ? 'Strukturierte Beschreibung des Salons in Meitingen für Suchmaschinen und KI-Modelle.' : 'Structured natural-language summary describing the salon in Meitingen for search engines and AI models.' }}
      </p>

      <textarea
        v-model="form.geoDescription"
        rows="4"
        placeholder="AMIR Frisur & Kosmetik Studio, Schloßstr. 2c, 86405 Meitingen..."
        class="w-full rounded-md border bg-white p-3 text-xs leading-relaxed focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:bg-bg"
        :style="{ borderColor: 'var(--color-border)' }"
      />
    </div>

    <!-- Inline Feedback Banner -->
    <div
      v-if="statusMessage"
      role="alert"
      aria-live="polite"
      class="rounded-md border p-3 text-xs font-medium transition"
      :class="isError ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'"
    >
      {{ statusMessage }}
    </div>

    <!-- Sticky Save Bar -->
    <AdminSettingsSaveBar
      :loading="loading"
      :dirty="dirty"
      :disabled="!canManageSettings"
      :save-label="locale === 'ar' ? 'حفظ إعدادات السيو' : 'Save SEO Settings'"
      :saving-label="locale === 'ar' ? 'جاري الحفظ…' : 'Saving…'"
      :reset-label="locale === 'ar' ? 'تراجع' : 'Reset'"
      @reset="reset"
    />
  </form>
</template>
