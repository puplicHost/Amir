<script setup lang="ts">
import { KeyRound, Megaphone, Power } from 'lucide-vue-next'

const { locale } = useI18n()
const canManageSettings = useAdminCan('settings.meta')

const {
  form, data, loading, statusMessage, isError, dirty, save, reset,
} = await useSettingsForm({
  key: 'settings-meta',
  endpoint: '/api/admin/settings/meta',
  defaults: {
    pixelId: '',
    testEventCode: '',
    enabled: false,
    accessToken: '',
  },
  mapData: response => ({
    pixelId: response.meta?.pixelId ?? '',
    testEventCode: response.meta?.testEventCode ?? '',
    enabled: response.meta?.enabled ?? false,
  }),
  buildBody: f => ({
    pixelId: f.pixelId,
    testEventCode: f.testEventCode,
    enabled: f.enabled,
    ...(f.accessToken ? { accessToken: f.accessToken } : {}),
  }),
  saveEndpoint: '/api/admin/settings/meta',
  successAr: 'تم حفظ تكامل ميتا بنجاح.',
  successEn: 'Meta integration saved successfully.',
  failAr: 'حدث خطأ أثناء الحفظ.',
  failEn: 'Failed to save Meta integration.',
})

const hasToken = computed(() => !!data.value?.meta?.hasAccessToken)
const siteUrl = computed(() => data.value?.meta?.siteUrl || '')
const configured = computed(() => !!form.pixelId.trim() && hasToken.value)
</script>

<template>
  <form class="space-y-4" @submit.prevent="save">
    <!-- Status + master switch -->
    <div class="rounded-md border bg-white p-4 shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <span
            class="h-2.5 w-2.5 rounded-full"
            :class="configured && form.enabled ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'"
            aria-hidden="true"
          />
          <div>
            <p class="text-xs font-bold text-neutral-900 dark:text-neutral-100">
              {{ configured && form.enabled
                ? (locale === 'ar' ? 'التكامل مفعّل ويعمل' : 'Integration active')
                : (locale === 'ar' ? 'التكامل غير مفعّل' : 'Not configured') }}
            </p>
            <p class="text-[11px] text-neutral-400">
              {{ locale === 'ar' ? 'يتطلب معرف بكسل ورمز وصول محفوظين.' : 'Requires a saved Pixel ID + access token.' }}
            </p>
          </div>
        </div>
        <label class="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          <input v-model="form.enabled" type="checkbox" class="h-4 w-4 rounded accent-primary" />
          <span class="inline-flex items-center gap-1"><Power class="h-3.5 w-3.5" aria-hidden="true" />{{ locale === 'ar' ? 'تفعيل التتبع' : 'Enable tracking' }}</span>
        </label>
      </div>
    </div>

    <!-- Credentials -->
    <div class="rounded-md border bg-white p-4 shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
      <div class="mb-3 flex items-center gap-2">
        <KeyRound class="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 class="font-heading text-base font-bold text-neutral-900 dark:text-neutral-100">
          {{ locale === 'ar' ? 'بكسل ميتا وواجهة التحويلات' : 'Meta Pixel & Conversions API' }}
        </h2>
      </div>
      <p class="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
        {{ locale === 'ar' ? 'أنشئ البكسل من مدير الأحداث (Events Manager) والصق المعرف هنا. ولّد رمز الوصول من قسم Conversions API — يُشفّر عند الحفظ ولا يظهر مجدداً.' : 'Create the Pixel in Events Manager and paste its ID. Generate the token under Conversions API — it is encrypted on save and never shown again.' }}
      </p>

      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">Meta Pixel ID *</span>
          <input v-model="form.pixelId" type="text" inputmode="numeric" placeholder="123456789012345" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" dir="ltr" />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ locale === 'ar' ? 'رمز الوصول (CAPI)' : 'Access Token (CAPI)' }}</span>
          <input v-model="form.accessToken" type="password" placeholder="••••••••••••••••" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" autocomplete="off" dir="ltr" />
          <span class="mt-1 block text-[11px] text-neutral-400">
            {{ hasToken
              ? (locale === 'ar' ? 'يوجد رمز محفوظ ومشفّر. اتركه فارغاً للإبقاء عليه.' : 'Encrypted token stored. Leave blank to keep it.')
              : (locale === 'ar' ? 'لم يُحفظ أي رمز بعد.' : 'No token saved yet.') }}
          </span>
        </label>
      </div>

      <label class="mt-4 block max-w-md">
        <span class="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ locale === 'ar' ? 'رمز اختبار الأحداث (اختياري)' : 'Test Event Code (optional)' }}</span>
        <input v-model="form.testEventCode" type="text" placeholder="TEST12345" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" dir="ltr" />
        <span class="mt-1 block text-[11px] text-neutral-400">
          {{ locale === 'ar' ? 'من نافذة Test Events — يُستخدم أثناء الإعداد فقط.' : 'From the Test Events tab — setup/debugging only.' }}
        </span>
      </label>
    </div>

    <!-- Domain verification -->
    <div class="rounded-md border bg-white p-4 shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
      <div class="mb-2 flex items-center gap-2">
        <Megaphone class="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 class="font-heading text-base font-bold text-neutral-900 dark:text-neutral-100">
          {{ locale === 'ar' ? 'التحقق من النطاق' : 'Domain Verification' }}
        </h2>
      </div>
      <div v-if="siteUrl" class="space-y-2 text-xs text-neutral-600 dark:text-neutral-300">
        <p>
          {{ locale === 'ar' ? 'النطاق المعتمد:' : 'Verified domain:' }}
          <span class="font-mono font-bold" dir="ltr">{{ siteUrl }}</span>
        </p>
        <p class="leading-relaxed">
          {{ locale === 'ar'
            ? 'أكمل التحقق من مدير الأعمال (إعدادات النشاط التجاري ← النطاقات) بإحدى الطرق: سجل DNS من نوع TXT (موصى به)، أو رفع ملف HTML للجذر، أو وسم meta — علماً أن وسم التحقق مرتبط بمدير الأعمال وليس بالبكسل.'
            : 'Complete verification in Business Settings → Domains via DNS TXT record (recommended), HTML file upload, or meta tag — note the verification meta tag is tied to your Business Manager, not the Pixel.' }}
        </p>
        <p class="leading-relaxed text-neutral-500 dark:text-neutral-400">
          {{ locale === 'ar'
            ? 'لا حاجة لمعرف مدير الأعمال أو App ID/Secret هنا — فهي مطلوبة فقط لإدارة الحملات برمجياً (Marketing API)، وليس لتتبع التحويلات.'
            : 'No Business Manager ID or App ID/Secret needed here — those are only for programmatic campaign management (Marketing API), not conversion tracking.' }}
        </p>
      </div>
      <p v-else class="text-xs text-amber-600 dark:text-amber-400">
        {{ locale === 'ar'
          ? 'النطاق غير مضبوط — أضف NUXT_PUBLIC_SITE_URL في ملف .env (مثال: https://example.com) ثم أعد تشغيل الخادم.'
          : 'Domain not configured — set NUXT_PUBLIC_SITE_URL in .env (e.g. https://example.com), then restart the server.' }}
      </p>
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
      :save-label="locale === 'ar' ? 'حفظ تكامل ميتا' : 'Save Meta Integration'"
      :saving-label="locale === 'ar' ? 'جاري الحفظ…' : 'Saving…'"
      :reset-label="locale === 'ar' ? 'تراجع' : 'Reset'"
      @reset="reset"
    />
  </form>
</template>
