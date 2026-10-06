<script setup lang="ts">
import { Image as ImageIcon, Trash2, UploadCloud } from 'lucide-vue-next'

const { locale } = useI18n()
const canManageSettings = useAdminCan('settings.manage')
const toast = useAdminToast()

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
    primaryDarkColor: '#285E8E',
    primaryColor: '#2B71AE',
    accentColor: '#F5CC07',
  },
  saveEndpoint: '/api/admin/settings/general',
  successAr: 'تم حفظ الإعدادات العامة بنجاح.',
  successEn: 'General brand settings saved successfully.',
  failAr: 'حدث خطأ أثناء الحفظ.',
  failEn: 'Failed to save settings.',
})

const uploadingType = ref<string | null>(null)
const dragOver = ref<string | null>(null)

// Non-blocking hints: flag EN-filled / AR-empty pairs so missing translations are noticed before publishing.
const missingAr = computed(() => ({
  siteName: !!form.siteNameEn.trim() && !form.siteNameAr.trim(),
  tagline: !!form.taglineEn.trim() && !form.taglineAr.trim(),
}))

const missingArCount = computed(() => Object.values(missingAr.value).filter(Boolean).length)

const uploadLabels: Record<string, { en: string, ar: string }> = {
  logo: { en: 'Logo', ar: 'الشعار' },
  favicon: { en: 'Favicon', ar: 'أيقونة المتصفح' },
  hero: { en: 'Hero image', ar: 'صورة الواجهة' },
}

async function uploadFileData(type: 'logo' | 'favicon' | 'hero', file: File) {
  uploadingType.value = type
  const label = uploadLabels[type][locale.value === 'ar' ? 'ar' : 'en']
  const fd = new FormData()
  fd.append('file', file)
  try {
    await $fetch(`/api/admin/settings/${type}`, { method: 'POST', body: fd })
    await refresh()
    toast.success(
      locale.value === 'ar' ? 'تم رفع الملف بنجاح' : 'Upload Successful',
      locale.value === 'ar' ? `تم حفظ ${label} الجديد.` : `New ${label.toLowerCase()} saved.`,
    )
  }
  catch (e: any) {
    const msg = e?.data?.message || (locale.value === 'ar' ? 'فشل رفع الملف.' : 'Upload failed.')
    statusMessage.value = msg
    isError.value = true
    toast.error(
      locale.value === 'ar' ? 'فشل رفع الملف' : 'Upload Failed',
      msg,
    )
  }
  finally {
    uploadingType.value = null
  }
}

async function uploadFile(type: 'logo' | 'favicon' | 'hero', event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  ;(event.target as HTMLInputElement).value = ''
  if (!file) return
  await uploadFileData(type, file)
}

function onDrop(type: 'logo' | 'favicon' | 'hero', event: DragEvent) {
  event.preventDefault()
  dragOver.value = null
  const file = event.dataTransfer?.files?.[0]
  if (file) void uploadFileData(type, file)
}

const deletingLogo = ref(false)
async function deleteLogo() {
  if (deletingLogo.value) return
  deletingLogo.value = true
  try {
    await $fetch('/api/admin/settings/logo', { method: 'DELETE' })
    await refresh()
    toast.success(
      locale.value === 'ar' ? 'تم حذف الشعار' : 'Logo deleted',
      locale.value === 'ar' ? 'تم حذف الشعار الحالي.' : 'Current logo removed.',
    )
  }
  catch (e: any) {
    const msg = e?.data?.message || (locale.value === 'ar' ? 'فشل حذف الشعار.' : 'Failed to delete logo.')
    statusMessage.value = msg
    isError.value = true
  }
  finally {
    deletingLogo.value = false
  }
}
</script>

<template>
  <form class="space-y-4" :dir="locale === 'ar' ? 'rtl' : 'ltr'" @submit.prevent="save">
    <!-- Field 1: Store Name -->
    <div class="rounded-md border bg-white p-4 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <h2 class="mb-1 font-heading text-base font-bold text-slate-900 dark:text-slate-100">
        {{ locale === 'ar' ? 'اسم المتجر' : 'Store Name' }}
      </h2>
      <p class="mb-3 text-xs text-slate-500 dark:text-slate-400">
        {{ locale === 'ar' ? 'اسم المنصة باللغتين العربية والإنجليزية كما يظهر في شريط التنقل.' : 'Platform name in Arabic and English as shown in the navbar.' }}
      </p>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {{ locale === 'ar' ? 'اسم المتجر بالعربية' : 'Store Name (AR)' }}
            </span>
            <input v-model="form.siteNameAr" type="text" placeholder="مانجو إلكترونيكس" dir="rtl" :class="settingsInputCls" :style="{ borderColor: missingAr.siteName ? '#F59E0B' : 'var(--color-border)' }" />
            <span v-if="missingAr.siteName" class="mt-1 block text-[11px] font-medium text-amber-600 dark:text-amber-400">
              {{ locale === 'ar' ? 'تنبيه: الاسم بالإنجليزية موجود لكن الترجمة العربية فارغة.' : 'Heads up: English is filled but the Arabic translation is empty.' }}
            </span>
          </label>
          <!-- Live navbar preview (AR) -->
          <div class="mt-2 flex h-14 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-[#0B1520]">
            <img v-if="data?.logoPath" :src="data.logoPath" alt="" class="h-8 w-auto max-w-[80px] rounded object-contain" loading="lazy" />
            <img v-else src="/logo.png" alt="" class="h-8 w-8 rounded object-contain" loading="lazy" />
            <div class="leading-tight">
              <span class="block text-sm font-bold text-slate-900 dark:text-white">{{ form.siteNameAr || 'مانجو إلكترونيكس' }}</span>
              <span class="block text-[10px] text-slate-400">{{ form.taglineAr || 'اعملها صح، اعملها بذكاء' }}</span>
            </div>
          </div>
        </div>

        <div>
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {{ locale === 'ar' ? 'اسم المتجر بالإنجليزية' : 'Store Name (EN)' }}
            </span>
            <input v-model="form.siteNameEn" type="text" placeholder="Mango Electronics" dir="ltr" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
          <!-- Live navbar preview (EN) -->
          <div class="mt-2 flex h-14 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-[#0B1520]" dir="ltr">
            <img v-if="data?.logoPath" :src="data.logoPath" alt="" class="h-8 w-auto max-w-[80px] rounded object-contain" loading="lazy" />
            <img v-else src="/logo.png" alt="" class="h-8 w-8 rounded object-contain" loading="lazy" />
            <div class="leading-tight">
              <span class="block text-sm font-bold text-slate-900 dark:text-white">{{ form.siteNameEn || 'Mango Electronics' }}</span>
              <span class="block text-[10px] text-slate-400">{{ form.taglineEn || 'Do It Right, Do It Smart' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Field 2: Logo -->
    <div class="rounded-md border bg-white p-4 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <h2 class="mb-1 font-heading text-base font-bold text-slate-900 dark:text-slate-100">
        {{ locale === 'ar' ? 'الشعار (Logo)' : 'Logo' }}
      </h2>
      <p class="mb-3 text-xs text-slate-500 dark:text-slate-400">
        {{ locale === 'ar' ? 'الحجم المقترح: 200×60px — PNG بخلفية شفافة' : 'Recommended size: 200×60px — transparent PNG' }}
      </p>

      <label
        class="group block cursor-pointer rounded-md border-2 border-dashed p-6 text-center transition-colors hover:border-[#2B71AE] hover:bg-[#2B71AE]/5"
        :style="{ borderColor: dragOver === 'logo' ? '#2B71AE' : 'var(--color-border)' }"
        @dragover.prevent="dragOver = 'logo'"
        @dragleave="dragOver = null"
        @drop="onDrop('logo', $event)"
      >
        <div class="flex flex-col items-center">
          <div v-if="data?.logoPath" class="mb-2 flex h-16 items-center justify-center overflow-hidden rounded-md border bg-slate-50 px-4 dark:bg-[#0B1520]">
            <img :src="data.logoPath" alt="Logo preview" class="max-h-full max-w-[200px] object-contain" loading="lazy" />
          </div>
          <UploadCloud v-else class="h-8 w-8 text-slate-400 transition-colors group-hover:text-[#2B71AE]" aria-hidden="true" />
          <span class="mt-2 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {{ uploadingType === 'logo' ? (locale === 'ar' ? 'جاري الرفع…' : 'Uploading…') : (locale === 'ar' ? 'اضغط لاختيار الشعار أو اسحبه هنا' : 'Click to browse logo or drag & drop here') }}
          </span>
          <span class="mt-1 block text-[11px] text-slate-400">PNG, SVG, or WEBP. Max 5MB.</span>
        </div>
        <input type="file" accept="image/*" class="hidden" @change="uploadFile('logo', $event)" />
      </label>

      <div v-if="data?.logoPath" class="mt-2 flex items-center justify-between">
        <span class="text-[11px] text-slate-400">{{ locale === 'ar' ? 'الشعار الحالي معروض أعلاه.' : 'Current logo previewed above.' }}</span>
        <button
          type="button"
          :disabled="deletingLogo || !canManageSettings"
          class="inline-flex h-8 items-center gap-1.5 rounded-md border border-rose-200 px-3 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/40"
          @click="deleteLogo"
        >
          <Trash2 class="h-3.5 w-3.5" aria-hidden="true" />
          <span>{{ deletingLogo ? '…' : (locale === 'ar' ? 'حذف الشعار' : 'Delete logo') }}</span>
        </button>
      </div>
    </div>

    <!-- Field 3: Tagline -->
    <div class="rounded-md border bg-white p-4 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <h2 class="mb-1 font-heading text-base font-bold text-slate-900 dark:text-slate-100">
        {{ locale === 'ar' ? 'الشعار النصي (Tagline)' : 'Tagline' }}
      </h2>
      <p class="mb-3 text-xs text-slate-500 dark:text-slate-400">
        {{ locale === 'ar' ? 'الجملة التعريفية أسفل اسم المتجر وفي الواجهة.' : 'Brand statement below the store name and in the hero.' }}
      </p>
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {{ locale === 'ar' ? 'الشعار بالعربية' : 'Tagline (AR)' }}
          </span>
          <input v-model="form.taglineAr" type="text" placeholder="اعملها صح، اعملها بذكاء" dir="rtl" :class="settingsInputCls" :style="{ borderColor: missingAr.tagline ? '#F59E0B' : 'var(--color-border)' }" />
          <span v-if="missingAr.tagline" class="mt-1 block text-[11px] font-medium text-amber-600 dark:text-amber-400">
            {{ locale === 'ar' ? 'تنبيه: النص بالإنجليزية موجود لكن الترجمة العربية فارغة.' : 'Heads up: English is filled but the Arabic translation is empty.' }}
          </span>
        </label>
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {{ locale === 'ar' ? 'الشعار بالإنجليزية' : 'Tagline (EN)' }}
          </span>
          <input v-model="form.taglineEn" type="text" placeholder="Do It Right, Do It Smart" dir="ltr" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" />
        </label>
      </div>
    </div>

    <!-- Field 4: Brand Colors -->
    <div class="rounded-md border bg-white p-4 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <h2 class="mb-1 font-heading text-base font-bold text-slate-900 dark:text-slate-100">
        {{ locale === 'ar' ? 'الألوان الرئيسية' : 'Brand Colors' }}
      </h2>
      <p class="mb-3 text-xs text-slate-500 dark:text-slate-400">
        {{ locale === 'ar' ? 'اختر ألوان الهوية وستظهر مباشرة في المعاينة.' : 'Pick brand colors with instant preview.' }}
      </p>

      <div class="grid gap-4 sm:grid-cols-3">
        <div>
          <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {{ locale === 'ar' ? 'اللون الأساسي الداكن' : 'Dark Primary' }}
          </span>
          <div class="flex items-center gap-2">
            <label class="relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-full border border-slate-300 shadow-xs" :style="{ backgroundColor: form.primaryDarkColor }" title="Pick color">
              <input v-model="form.primaryDarkColor" type="color" class="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
            </label>
            <input v-model="form.primaryDarkColor" type="text" placeholder="#285E8E" dir="ltr" :class="settingsInputCls" pattern="#[0-9a-fA-F]{6}" maxlength="7" />
          </div>
        </div>

        <div>
          <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {{ locale === 'ar' ? 'اللون الأساسي' : 'Primary' }}
          </span>
          <div class="flex items-center gap-2">
            <label class="relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-full border border-slate-300 shadow-xs" :style="{ backgroundColor: form.primaryColor }" title="Pick color">
              <input v-model="form.primaryColor" type="color" class="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
            </label>
            <input v-model="form.primaryColor" type="text" placeholder="#2B71AE" dir="ltr" :class="settingsInputCls" pattern="#[0-9a-fA-F]{6}" maxlength="7" />
          </div>
        </div>

        <div>
          <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {{ locale === 'ar' ? 'لون التمييز' : 'Accent' }}
          </span>
          <div class="flex items-center gap-2">
            <label class="relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-full border border-slate-300 shadow-xs" :style="{ backgroundColor: form.accentColor }" title="Pick color">
              <input v-model="form.accentColor" type="color" class="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
            </label>
            <input v-model="form.accentColor" type="text" placeholder="#F5CC07" dir="ltr" :class="settingsInputCls" pattern="#[0-9a-fA-F]{6}" maxlength="7" />
          </div>
        </div>
      </div>

      <!-- Live mini-navbar preview -->
      <div class="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
        <div class="flex h-14 items-center justify-between gap-3 px-4" :style="{ backgroundColor: form.primaryDarkColor }" dir="ltr">
          <div class="flex items-center gap-2">
            <span class="flex h-8 w-8 items-center justify-center rounded bg-white/15 text-sm font-black" :style="{ color: form.accentColor }">M</span>
            <div class="leading-tight">
              <span class="block text-sm font-bold text-white">{{ form.siteNameEn || 'Mango Electronics' }}</span>
              <span class="block text-[10px]" :style="{ color: form.accentColor }">{{ form.taglineEn || 'Do It Right, Do It Smart' }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="rounded-md px-3 py-1.5 text-xs font-bold text-white" :style="{ backgroundColor: form.primaryColor }">Shop</span>
            <span class="rounded-md px-3 py-1.5 text-xs font-bold text-slate-950" :style="{ backgroundColor: form.accentColor }">Cart</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Field 5: Favicon -->
    <div class="rounded-md border bg-white p-4 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <h2 class="mb-1 font-heading text-base font-bold text-slate-900 dark:text-slate-100">
        {{ locale === 'ar' ? 'الفافيكون (Favicon)' : 'Favicon' }}
      </h2>
      <p class="mb-3 text-xs text-slate-500 dark:text-slate-400">
        {{ locale === 'ar' ? 'الحجم المقترح: 32×32px أو 64×64px — ICO أو PNG' : 'Recommended size: 32×32px or 64×64px — ICO or PNG' }}
      </p>
      <div class="flex items-center gap-4">
        <label
          class="group flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border-2 border-dashed transition-colors hover:border-[#2B71AE] hover:bg-[#2B71AE]/5"
          :style="{ borderColor: dragOver === 'favicon' ? '#2B71AE' : 'var(--color-border)' }"
          @dragover.prevent="dragOver = 'favicon'"
          @dragleave="dragOver = null"
          @drop="onDrop('favicon', $event)"
        >
          <img v-if="data?.faviconPath" :src="data.faviconPath" alt="Favicon preview" class="h-16 w-16 object-contain" style="width: 64px; height: 64px;" loading="lazy" />
          <ImageIcon v-else class="h-6 w-6 text-slate-400" aria-hidden="true" />
          <input type="file" accept="image/x-icon,image/png" class="hidden" @change="uploadFile('favicon', $event)" />
        </label>
        <div class="text-xs text-slate-500 dark:text-slate-400">
          <p class="font-semibold text-slate-700 dark:text-slate-300">
            {{ uploadingType === 'favicon' ? (locale === 'ar' ? 'جاري الرفع…' : 'Uploading…') : (locale === 'ar' ? 'اضغط أو اسحب ملف الأيقونة هنا' : 'Click or drag the icon file here') }}
          </p>
          <p class="mt-1 text-[11px]">ICO, PNG. Square icon.</p>
        </div>
      </div>
    </div>

    <!-- Homepage Hero Image (existing functionality, kept compact) -->
    <div class="rounded-md border bg-white p-4 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <h2 class="mb-1 font-heading text-base font-bold text-slate-900 dark:text-slate-100">
        {{ locale === 'ar' ? 'صورة الواجهة (Hero)' : 'Homepage Hero Image' }}
      </h2>
      <p class="mb-3 text-xs text-slate-500 dark:text-slate-400">
        {{ locale === 'ar' ? 'خلفية القسم الترحيبي العريضة (1920×800).' : 'Wide hero banner background (1920×800).' }}
      </p>
      <label
        class="group flex cursor-pointer items-center gap-3 rounded-md border border-dashed p-3 transition-colors hover:border-[#2B71AE] hover:bg-slate-50 dark:hover:bg-slate-800/50"
        :style="{ borderColor: dragOver === 'hero' ? '#2B71AE' : 'var(--color-border)' }"
        @dragover.prevent="dragOver = 'hero'"
        @dragleave="dragOver = null"
        @drop="onDrop('hero', $event)"
      >
        <div class="flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded bg-slate-100 dark:bg-[#0B1520]">
          <img v-if="data?.heroImagePath" :src="data.heroImagePath" alt="" class="h-full w-full object-cover" loading="lazy" />
          <ImageIcon v-else class="h-5 w-5 text-slate-400" aria-hidden="true" />
        </div>
        <span class="text-xs font-semibold text-slate-600 dark:text-slate-300">
          {{ uploadingType === 'hero' ? (locale === 'ar' ? 'جاري الرفع…' : 'Uploading…') : (locale === 'ar' ? 'اضغط أو اسحب صورة الواجهة هنا' : 'Click or drag the hero image here') }}
        </span>
        <input type="file" accept="image/*" class="hidden" @change="uploadFile('hero', $event)" />
      </label>
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

    <!-- Full-width yellow save -->
    <button
      type="submit"
      :disabled="loading || !canManageSettings"
      class="h-12 w-full rounded-lg bg-[#F5CC07] text-sm font-bold text-slate-950 shadow-xs transition-all hover:bg-yellow-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {{ loading ? (locale === 'ar' ? 'جاري الحفظ…' : 'Saving…') : (locale === 'ar' ? 'حفظ التغييرات' : 'Save Changes') }}
    </button>
    <div class="flex items-center justify-center gap-3 text-[11px]">
      <span :class="dirty ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'">
        {{ dirty ? (locale === 'ar' ? 'توجد تغييرات غير محفوظة' : 'Unsaved changes') : (locale === 'ar' ? 'لا توجد تغييرات معلقة' : 'All changes saved') }}
      </span>
      <button
        v-if="dirty"
        type="button"
        class="font-semibold text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
        @click="reset"
      >
        {{ locale === 'ar' ? 'تراجع' : 'Reset' }}
      </button>
      <span v-if="missingArCount > 0" class="font-medium text-amber-600 dark:text-amber-400">
        {{ locale === 'ar' ? `يوجد ${missingArCount} حقول عربية فارغة رغم وجود مقابلها الإنجليزي.` : `${missingArCount} Arabic field${missingArCount > 1 ? 's' : ''} empty while English is filled.` }}
      </span>
    </div>
  </form>
</template>
