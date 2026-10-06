<script setup lang="ts">
import { FileText } from 'lucide-vue-next'
import AdminRichEditor from './AdminRichEditor.vue'

const { locale } = useI18n()
const canManageSettings = useAdminCan('settings.manage')

const {
  form, data, loading, statusMessage, isError, dirty, save, reset,
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

function formatTermsDate(d: string | null | undefined): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString(locale.value === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="save">
    <!-- Default Terms & Conditions Card (Rich Text) -->
    <div class="rounded-md border bg-white p-4 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <div class="mb-3 flex items-center gap-2">
        <FileText class="h-4 w-4 text-[#2B71AE]" aria-hidden="true" />
        <h2 class="font-heading text-base font-bold text-slate-900 dark:text-slate-100">
          {{ locale === 'ar' ? 'الشروط والأحكام الافتراضية لعروض الأسعار' : 'Default Quote Terms & Conditions' }}
        </h2>
      </div>
      <p class="mb-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {{ locale === 'ar' ? 'البنود المكتوبة هنا تُطبق تلقائياً على كل عرض سعر جديد وتظهر في أسفل ملفات PDF الرسمية. اترك الحقل فارغاً لاستخدام النصوص الافتراضية المعتمدة.' : 'Terms written here apply automatically to every new quotation and appear in official PDF footers. Leave blank to use system defaults.' }}
      </p>

      <div class="space-y-4">
        <div>
          <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Terms & Conditions (English)
          </span>
          <AdminRichEditor v-model="form.quoteTermsEn" dir="ltr" placeholder="Write each term on a separate line..." />
        </div>
        <div>
          <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            الشروط والأحكام (عربي)
          </span>
          <AdminRichEditor v-model="form.quoteTermsAr" dir="rtl" placeholder="اكتب كل بند في سطر مستقل..." />
        </div>
      </div>

      <p v-if="(data as any)?.quoteTermsUpdatedAt" class="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
        {{ locale === 'ar'
          ? `آخر تعديل للشروط: ${formatTermsDate((data as any).quoteTermsUpdatedAt)}${(data as any)?.quoteTermsUpdatedBy ? ` — بواسطة ${(data as any).quoteTermsUpdatedBy}` : ''}`
          : `Terms last updated: ${formatTermsDate((data as any).quoteTermsUpdatedAt)}${(data as any)?.quoteTermsUpdatedBy ? ` — by ${(data as any).quoteTermsUpdatedBy}` : ''}` }}
      </p>
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

    <!-- Yellow Save Button -->
    <button
      type="submit"
      :disabled="loading || !canManageSettings"
      class="h-11 w-full rounded-md bg-[#F5CC07] text-xs font-bold text-slate-950 shadow-xs transition-colors hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {{ loading ? (locale === 'ar' ? 'جاري الحفظ…' : 'Saving…') : (locale === 'ar' ? 'حفظ الشروط الافتراضية' : 'Save Default Terms') }}
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
    </div>
  </form>
</template>
