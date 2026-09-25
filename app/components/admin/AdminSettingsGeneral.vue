<script setup lang="ts">
import { Image as ImageIcon, Sparkles, UploadCloud } from 'lucide-vue-next'

const { locale } = useI18n()

const {
  form, data, refresh, loading, statusMessage, isError, dirty, save, reset,
} = await useSettingsForm({
  key: 'settings-general',
  endpoint: '/api/admin/settings',
  defaults: {
    siteNameAr: '',
    siteNameEn: '',
    taglineAr: '',
    taglineEn: '',
    bannerTextAr: '',
    bannerTextEn: '',
    bannerButtonTextAr: '',
    bannerButtonTextEn: '',
    bannerButtonUrl: '',
  },
  saveEndpoint: '/api/admin/settings/general',
  successAr: 'تم حفظ الإعدادات العامة بنجاح.',
  successEn: 'General brand settings saved successfully.',
  failAr: 'حدث خطأ أثناء الحفظ.',
  failEn: 'Failed to save settings.',
})

const uploadingType = ref<string | null>(null)

// Non-blocking hints: flag EN-filled / AR-empty pairs so missing translations are noticed before publishing.
const missingAr = computed(() => ({
  siteName: !!form.siteNameEn.trim() && !form.siteNameAr.trim(),
  tagline: !!form.taglineEn.trim() && !form.taglineAr.trim(),
  bannerText: !!form.bannerTextEn.trim() && !form.bannerTextAr.trim(),
  bannerButtonText: !!form.bannerButtonTextEn.trim() && !form.bannerButtonTextAr.trim(),
}))

const missingArCount = computed(() => Object.values(missingAr.value).filter(Boolean).length)

async function uploadFile(type: 'logo' | 'favicon' | 'hero', event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingType.value = type
  const fd = new FormData()
  fd.append('file', file)
  try {
    await $fetch(`/api/admin/settings/${type}`, { method: 'POST', body: fd })
    await refresh()
  }
  catch (e: any) {
    statusMessage.value = e?.data?.message || (locale.value === 'ar' ? 'فشل رفع الملف.' : 'Upload failed.')
    isError.value = true
  }
  finally {
    uploadingType.value = null
    ;(event.target as HTMLInputElement).value = ''
  }
}
</script>

<template>
  <form class="space-y-6" @submit.prevent="save">
    <!-- Section 1: Brand & Identity -->
    <div class="rounded-md border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <h2 class="mb-1 font-heading text-base font-bold text-slate-900 dark:text-slate-100">
        {{ locale === 'ar' ? 'هوية العلامة التجارية' : 'Brand Identity' }}
      </h2>
      <p class="mb-4 text-xs text-slate-500 dark:text-slate-400">
        {{ locale === 'ar' ? 'اسم المنصة والشعار اللفظي باللغتين العربية والإنجليزية.' : 'Platform name and corporate tagline displayed across storefront and notifications.' }}
      </p>

      <div class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Site Name (EN)</span>
            <input v-model="form.siteNameEn" type="text" placeholder="Mango Electronics" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Site Name (AR)</span>
            <input v-model="form.siteNameAr" type="text" placeholder="مانجو إلكترونيكس" dir="rtl" :class="settingsInputCls" :style="{ borderColor: missingAr.siteName ? '#F59E0B' : 'var(--color-border)' }" />
            <span v-if="missingAr.siteName" class="mt-1 block text-[11px] font-medium text-amber-600 dark:text-amber-400">
              {{ locale === 'ar' ? 'تنبيه: الاسم بالإنجليزية موجود لكن الترجمة العربية فارغة.' : 'Heads up: English is filled but the Arabic translation is empty.' }}
            </span>
          </label>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Tagline (EN)</span>
            <input v-model="form.taglineEn" type="text" placeholder="Do It Right, Do It Smart" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Tagline (AR)</span>
            <input v-model="form.taglineAr" type="text" placeholder="اعملها صح، اعملها بذكاء" dir="rtl" :class="settingsInputCls" :style="{ borderColor: missingAr.tagline ? '#F59E0B' : 'var(--color-border)' }" />
            <span v-if="missingAr.tagline" class="mt-1 block text-[11px] font-medium text-amber-600 dark:text-amber-400">
              {{ locale === 'ar' ? 'تنبيه: النص بالإنجليزية موجود لكن الترجمة العربية فارغة.' : 'Heads up: English is filled but the Arabic translation is empty.' }}
            </span>
          </label>
        </div>
      </div>
    </div>

    <!-- Section 2: Visual Brand Assets -->
    <div class="rounded-md border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <h2 class="mb-1 font-heading text-base font-bold text-slate-900 dark:text-slate-100">
        {{ locale === 'ar' ? 'الأصول والوسائط البصرية' : 'Visual Assets' }}
      </h2>
      <p class="mb-4 text-xs text-slate-500 dark:text-slate-400">
        {{ locale === 'ar' ? 'الشعار الرسمي، أيقونة المتصفح، وخلفية القسم الترحيبي (Hero).' : 'Official logo, favicon, and hero section background imagery.' }}
      </p>

      <div class="space-y-4">
        <!-- Logo Upload -->
        <div class="flex flex-col gap-3 rounded-md border p-3.5 sm:flex-row sm:items-center sm:justify-between" :style="{ borderColor: 'var(--color-border)' }">
          <div class="flex items-center gap-3">
            <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border bg-slate-50 p-1.5 dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }">
              <img v-if="data?.logoPath" :src="data.logoPath" alt="Logo preview" class="max-h-full max-w-full object-contain" />
              <ImageIcon v-else class="h-6 w-6 text-slate-400" aria-hidden="true" />
            </div>
            <div>
              <p class="text-xs font-bold text-slate-900 dark:text-slate-100">Storefront Logo</p>
              <p class="text-[11px] text-slate-400">PNG or SVG with transparent background recommended.</p>
            </div>
          </div>
          <div>
            <label class="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[#2B71AE] px-3.5 py-1.5 text-xs font-semibold text-[#2B71AE] transition-colors hover:bg-[#2B71AE]/10 dark:text-blue-400">
              <UploadCloud class="h-3.5 w-3.5" aria-hidden="true" />
              <span>{{ uploadingType === 'logo' ? 'Uploading…' : 'Upload Logo' }}</span>
              <input type="file" accept="image/*" class="hidden" @change="uploadFile('logo', $event)" />
            </label>
          </div>
        </div>

        <!-- Favicon Upload -->
        <div class="flex flex-col gap-3 rounded-md border p-3.5 sm:flex-row sm:items-center sm:justify-between" :style="{ borderColor: 'var(--color-border)' }">
          <div class="flex items-center gap-3">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border bg-slate-50 p-1.5 dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }">
              <img v-if="data?.faviconPath" :src="data.faviconPath" alt="Favicon preview" class="h-6 w-6 object-contain" />
              <ImageIcon v-else class="h-5 w-5 text-slate-400" aria-hidden="true" />
            </div>
            <div>
              <p class="text-xs font-bold text-slate-900 dark:text-slate-100">Favicon</p>
              <p class="text-[11px] text-slate-400">Square 32x32px or 64x64px browser icon.</p>
            </div>
          </div>
          <div>
            <label class="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              <UploadCloud class="h-3.5 w-3.5" aria-hidden="true" />
              <span>{{ uploadingType === 'favicon' ? 'Uploading…' : 'Upload Favicon' }}</span>
              <input type="file" accept="image/x-icon,image/png" class="hidden" @change="uploadFile('favicon', $event)" />
            </label>
          </div>
        </div>

        <!-- Hero Background Upload -->
        <div class="flex flex-col gap-3 rounded-md border p-3.5 sm:flex-row sm:items-center sm:justify-between" :style="{ borderColor: 'var(--color-border)' }">
          <div class="flex items-center gap-3">
            <div class="flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-slate-50 dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }">
              <img v-if="data?.heroImagePath" :src="data.heroImagePath" alt="Hero background" class="h-full w-full object-cover" />
              <ImageIcon v-else class="h-6 w-6 text-slate-400" aria-hidden="true" />
            </div>
            <div>
              <p class="text-xs font-bold text-slate-900 dark:text-slate-100">Homepage Hero Image</p>
              <p class="text-[11px] text-slate-400">High-resolution banner background (1920x800 recommended).</p>
            </div>
          </div>
          <div>
            <label class="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              <UploadCloud class="h-3.5 w-3.5" aria-hidden="true" />
              <span>{{ uploadingType === 'hero' ? 'Uploading…' : 'Upload Hero Image' }}</span>
              <input type="file" accept="image/*" class="hidden" @change="uploadFile('hero', $event)" />
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 3: Promotional Banner -->
    <div class="rounded-md border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <div class="mb-3.5 flex items-center gap-2">
        <Sparkles class="h-4 w-4 text-[#F5CC07]" aria-hidden="true" />
        <h2 class="font-heading text-base font-bold text-slate-900 dark:text-slate-100">
          {{ locale === 'ar' ? 'البانر الترويجي العام' : 'Store Promotional Banner' }}
        </h2>
      </div>

      <div class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Banner Text (EN)</span>
            <textarea v-model="form.bannerTextEn" rows="2" placeholder="e.g. 20% off all maintenance services" class="w-full rounded-md border bg-white p-2.5 text-xs focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Banner Text (AR)</span>
            <textarea v-model="form.bannerTextAr" rows="2" dir="rtl" placeholder="مثال: خصم 20% على جميع خدمات الصيانة" class="w-full rounded-md border bg-white p-2.5 text-xs focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520]" :style="{ borderColor: missingAr.bannerText ? '#F59E0B' : 'var(--color-border)' }" />
            <span v-if="missingAr.bannerText" class="mt-1 block text-[11px] font-medium text-amber-600 dark:text-amber-400">
              {{ locale === 'ar' ? 'تنبيه: النص بالإنجليزية موجود لكن الترجمة العربية فارغة.' : 'Heads up: English is filled but the Arabic translation is empty.' }}
            </span>
          </label>
        </div>

        <div class="grid gap-4 sm:grid-cols-3">
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Button Text (EN)</span>
            <input v-model="form.bannerButtonTextEn" type="text" placeholder="Book Now" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Button Text (AR)</span>
            <input v-model="form.bannerButtonTextAr" type="text" placeholder="احجز الآن" dir="rtl" :class="settingsInputCls" :style="{ borderColor: missingAr.bannerButtonText ? '#F59E0B' : 'var(--color-border)' }" />
            <span v-if="missingAr.bannerButtonText" class="mt-1 block text-[11px] font-medium text-amber-600 dark:text-amber-400">
              {{ locale === 'ar' ? 'تنبيه: النص بالإنجليزية موجود لكن الترجمة العربية فارغة.' : 'Heads up: English is filled but the Arabic translation is empty.' }}
            </span>
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Button Target URL</span>
            <input v-model="form.bannerButtonUrl" type="text" placeholder="/services" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
        </div>
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
      :save-label="locale === 'ar' ? 'حفظ الإعدادات العامة' : 'Save General Settings'"
      :saving-label="locale === 'ar' ? 'جاري الحفظ…' : 'Saving…'"
      :reset-label="locale === 'ar' ? 'تراجع' : 'Reset'"
      @reset="reset"
    >
      <template #hint>
        <span v-if="missingArCount > 0" class="text-[11px] font-medium text-amber-600 dark:text-amber-400">
          {{ locale === 'ar' ? `يوجد ${missingArCount} حقول عربية فارغة رغم وجود مقابلها الإنجليزي.` : `${missingArCount} Arabic field${missingArCount > 1 ? 's' : ''} empty while English is filled.` }}
        </span>
      </template>
    </AdminSettingsSaveBar>
  </form>
</template>
