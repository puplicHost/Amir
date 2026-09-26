<script setup lang="ts">
import { FileText, ShieldCheck } from 'lucide-vue-next'

const { locale } = useI18n()
const canManageSettings = useAdminCan('settings.manage')

const {
  form, loading, statusMessage, isError, dirty, save, reset,
} = await useSettingsForm({
  key: 'settings-quotes',
  endpoint: '/api/admin/settings/quotes',
  defaults: {
    quoteTermsAr: '',
    quoteTermsEn: '',
  },
  saveEndpoint: '/api/admin/settings/quotes',
  successAr: 'تم حفظ شروط وأحكام عروض الأسعار بنجاح.',
  successEn: 'Quote Terms & Conditions saved successfully.',
  failAr: 'فشل حفظ الإعدادات.',
  failEn: 'Failed to save quote settings.',
})
</script>

<template>
  <form class="space-y-4" @submit.prevent="save">
    <!-- Terms & Conditions Card -->
    <div class="rounded-md border bg-white p-4 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <div class="mb-3 flex items-center gap-2">
        <FileText class="h-4 w-4 text-[#2B71AE]" aria-hidden="true" />
        <h2 class="font-heading text-base font-bold text-slate-900 dark:text-slate-100">
          {{ locale === 'ar' ? 'الشروط والأحكام الافتراضية لعروض الأسعار' : 'Default Quote Terms & Conditions' }}
        </h2>
      </div>
      <p class="mb-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {{ locale === 'ar' ? 'البنود المكتوبة هنا تظهر تلقائياً في أسفل ملفات PDF الرسمية لعروض الأسعار الصادرة للعملاء والشركات. اكتب كل بند في سطر مستقل.' : 'Terms listed here appear automatically in the footer of all official PDF price quotations. Enter each term on a separate line.' }}
      </p>

      <div class="grid gap-4 sm:grid-cols-2">
        <!-- English Terms -->
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Terms & Conditions (English)
          </span>
          <textarea
            v-model="form.quoteTermsEn"
            rows="6"
            :class="settingsTextareaCls"
            :style="{ borderColor: 'var(--color-border)' }"
            placeholder="• All components and modules are 100% genuine with verified datasheets.&#10;• Prices are in EGP and valid for 30 calendar days from issue date.&#10;• Nationwide delivery across Egypt with on-delivery inspection support.&#10;• Standard technical warranty and preventative maintenance terms apply."
          />
          <span class="mt-1 block text-[11px] text-slate-400">
            Leave blank to use system standard defaults.
          </span>
        </label>

        <!-- Arabic Terms -->
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            الشروط والأحكام (عربي)
          </span>
          <textarea
            v-model="form.quoteTermsAr"
            rows="6"
            dir="rtl"
            :class="settingsTextareaCls"
            :style="{ borderColor: 'var(--color-border)' }"
            placeholder="• جميع المكونات والوحدات الصناعية أصلية ١٠٠٪ ومرفق معها كتيبات المواصفات.&#10;• الأسعار الموضحة بالجنيه المصري وسارية لمدة ٣٠ يوماً تقويمياً من تاريخ الإصدار.&#10;• التوريد متاح لجميع محافظات جمهورية مصر العربية مع إمكانية الفحص عند الاستلام.&#10;• تطبق شروط الضمان الفني والصيانة الدورية المعتمدة وفقاً لمعايير الشركات المصنعة."
          />
          <span class="mt-1 block text-[11px] text-slate-400">
            اتركه فارغاً لاستخدام النصوص الافتراضية المعتمدة تلقائياً.
          </span>
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
      :save-label="locale === 'ar' ? 'حفظ شروط عروض الأسعار' : 'Save Quote Terms'"
      :saving-label="locale === 'ar' ? 'جاري الحفظ…' : 'Saving…'"
      :reset-label="locale === 'ar' ? 'تراجع' : 'Reset'"
      @reset="reset"
    />
  </form>
</template>
