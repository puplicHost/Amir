<script setup lang="ts">
import { Building2 } from 'lucide-vue-next'

const { t, locale } = useI18n()
const canManageSettings = useAdminCan('settings.business')

const {
  form, loading, statusMessage, isError, dirty, save, reset,
} = await useSettingsForm({
  key: 'settings-booking',
  endpoint: '/api/admin/settings/booking',
  defaults: {
    whatsappNumber: '',
    businessName: '',
    businessAddress: '',
    slotStepMin: 15,
    holdTtlMin: 20,
    depositPercent: 50,
    timezone: 'Europe/Berlin',
    bookingMinLeadMin: 120,
    manualHoldTtlMin: 1440,
    reassignmentWaDe: '',
    reassignmentWaEn: '',
    cancellationWindowHours: 24,
    reminderLeadMin: 60,
    reminderEmailEnabled: true,
  },
  mapData: response => ({
    whatsappNumber: response.salon?.whatsappNumber ?? '',
    businessName: response.salon?.businessName ?? '',
    businessAddress: response.salon?.businessAddress ?? '',
    slotStepMin: response.salon?.slotStepMin ?? 15,
    holdTtlMin: response.salon?.holdTtlMin ?? 20,
    depositPercent: response.salon?.depositPercent ?? 50,
    timezone: response.salon?.timezone ?? 'Europe/Berlin',
    bookingMinLeadMin: response.salon?.bookingMinLeadMin ?? 120,
    manualHoldTtlMin: response.salon?.manualHoldTtlMin ?? 1440,
    reassignmentWaDe: response.salon?.reassignmentWaDe ?? '',
    reassignmentWaEn: response.salon?.reassignmentWaEn ?? '',
    cancellationWindowHours: response.salon?.cancellationWindowHours ?? 24,
    reminderLeadMin: response.salon?.reminderLeadMin ?? 60,
    reminderEmailEnabled: response.salon?.reminderEmailEnabled ?? true,
  }),
  saveEndpoint: '/api/admin/settings/booking',
  successAr: 'تم حفظ إعدادات الصالون بنجاح.',
  successEn: 'Salon settings saved successfully.',
  failAr: 'حدث خطأ أثناء الحفظ.',
  failEn: 'Failed to save salon settings.',
})
</script>

<template>
  <form class="space-y-4" @submit.prevent="save">
    <!-- Business Profile Card -->
    <div class="rounded-md border bg-white p-4 shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
      <div class="mb-3 flex items-center gap-2">
        <Building2 class="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 class="font-heading text-base font-bold text-neutral-900 dark:text-neutral-100">
          {{ t('salon.title') }}
        </h2>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('salon.businessName') }}</span>
          <input v-model="form.businessName" type="text" placeholder="AMIR Frisur & Kosmetik Studio" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" dir="ltr" />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('salon.whatsapp') }}</span>
          <input v-model="form.whatsappNumber" type="tel" placeholder="+49..." :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" dir="ltr" />
        </label>
      </div>

      <label class="mt-4 block">
        <span class="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('salon.businessAddress') }}</span>
        <textarea v-model="form.businessAddress" rows="2" :class="settingsTextareaCls" :style="{ borderColor: 'var(--color-border)' }" dir="ltr" />
      </label>
    </div>

    <!-- Booking Rules Card -->
    <div class="rounded-md border bg-white p-4 shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
      <div class="grid max-w-xl gap-4 sm:grid-cols-2">
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('salon.slotStep') }}</span>
          <input v-model.number="form.slotStepMin" type="number" min="5" max="120" step="5" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('salon.holdTtl') }}</span>
          <input v-model.number="form.holdTtlMin" type="number" min="5" max="120" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('salon.deposit') }}</span>
          <input v-model.number="form.depositPercent" type="number" min="1" max="100" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('salon.timezone') }}</span>
          <input v-model="form.timezone" type="text" placeholder="Europe/Berlin" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" dir="ltr" />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('salon.minLead') }}</span>
          <input v-model.number="form.bookingMinLeadMin" type="number" min="0" max="1440" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('salon.manualHold') }}</span>
          <input v-model.number="form.manualHoldTtlMin" type="number" min="30" max="10080" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('salon.cancelWindow') }}</span>
          <input v-model.number="form.cancellationWindowHours" type="number" min="0" max="720" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('salon.reminderLead') }}</span>
          <input v-model.number="form.reminderLeadMin" type="number" min="15" max="1440" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" />
        </label>
        <label class="flex items-end gap-2 pb-1">
          <input v-model="form.reminderEmailEnabled" type="checkbox" class="h-4 w-4 rounded accent-primary" />
          <span class="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('salon.reminderEmail') }}</span>
        </label>
      </div>
      <p class="mt-3 text-[11px] text-neutral-400">
        {{ locale === 'ar' ? 'تُحسب جميع المواعيد بتوقيت برلين وتُخزّن بتوقيت UTC.' : 'All slots are calculated in Berlin time and stored as UTC.' }}
      </p>
      <div class="mt-4 grid gap-4">
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('salon.reassignWaDe') }}</span>
          <textarea v-model="form.reassignmentWaDe" rows="2" placeholder="{service} · {date}" :class="settingsTextareaCls" :style="{ borderColor: 'var(--color-border)' }" dir="ltr" />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('salon.reassignWaEn') }}</span>
          <textarea v-model="form.reassignmentWaEn" rows="2" placeholder="{service} · {date}" :class="settingsTextareaCls" :style="{ borderColor: 'var(--color-border)' }" dir="ltr" />
        </label>
        <p class="text-[11px] text-neutral-400">{{ t('salon.reassignWaHint') }}</p>
      </div>
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
      :save-label="locale === 'ar' ? 'حفظ إعدادات الصالون' : 'Save Salon Settings'"
      :saving-label="locale === 'ar' ? 'جاري الحفظ…' : 'Saving…'"
      :reset-label="locale === 'ar' ? 'تراجع' : 'Reset'"
      @reset="reset"
    />
  </form>
</template>
