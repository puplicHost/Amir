<script setup lang="ts">
import { CreditCard, KeyRound, Power, Wallet } from 'lucide-vue-next'

const { t, locale } = useI18n()
const canManageSettings = useAdminCan('settings.manage')

const {
  form, data, loading, statusMessage, isError, dirty, save, reset,
} = await useSettingsForm({
  key: 'settings-payment',
  endpoint: '/api/admin/settings/payment',
  defaults: {
    stripeEnabled: false,
    stripePublishableKey: '',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    paypalEnabled: false,
    paypalClientId: '',
    paypalSecret: '',
    paypalWebhookId: '',
    paypalMode: 'sandbox',
  },
  mapData: response => ({
    stripeEnabled: response.payment?.stripeEnabled ?? false,
    stripePublishableKey: response.payment?.stripePublishableKey ?? '',
    paypalEnabled: response.payment?.paypalEnabled ?? false,
    paypalClientId: response.payment?.paypalClientId ?? '',
    paypalMode: response.payment?.paypalMode ?? 'sandbox',
  }),
  buildBody: f => ({
    stripeEnabled: f.stripeEnabled,
    stripePublishableKey: f.stripePublishableKey,
    ...(f.stripeSecretKey ? { stripeSecretKey: f.stripeSecretKey } : {}),
    ...(f.stripeWebhookSecret ? { stripeWebhookSecret: f.stripeWebhookSecret } : {}),
    paypalEnabled: f.paypalEnabled,
    paypalClientId: f.paypalClientId,
    ...(f.paypalSecret ? { paypalSecret: f.paypalSecret } : {}),
    ...(f.paypalWebhookId ? { paypalWebhookId: f.paypalWebhookId } : {}),
    paypalMode: f.paypalMode,
  }),
  saveEndpoint: '/api/admin/settings/payment',
  successAr: 'تم حفظ إعدادات الدفع بنجاح.',
  successEn: 'Payment settings saved successfully.',
  failAr: 'حدث خطأ أثناء الحفظ.',
  failEn: 'Failed to save payment settings.',
})

const hasStripeSecret = computed(() => !!data.value?.payment?.hasStripeSecret)
const hasStripeWebhookSecret = computed(() => !!data.value?.payment?.hasStripeWebhookSecret)
const hasPaypalSecret = computed(() => !!data.value?.payment?.hasPaypalSecret)
const hasPaypalWebhookId = computed(() => !!data.value?.payment?.hasPaypalWebhookId)
</script>

<template>
  <form class="space-y-4" @submit.prevent="save">
    <div
      v-if="!form.stripeEnabled && !form.paypalEnabled"
      role="alert"
      class="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-900 dark:border-yellow-900/40 dark:bg-yellow-950/20 dark:text-yellow-200"
    >
      {{ t('payment.bothOff') }}
    </div>

    <!-- Stripe -->
    <div class="rounded-md border bg-white p-4 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <CreditCard class="h-4 w-4 text-[#2B71AE]" aria-hidden="true" />
          <h2 class="font-heading text-base font-bold text-slate-900 dark:text-slate-100">
            {{ t('payment.stripe') }}
          </h2>
        </div>
        <label class="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <input v-model="form.stripeEnabled" type="checkbox" class="h-4 w-4 rounded accent-[#2B71AE]" />
          <span class="inline-flex items-center gap-1"><Power class="h-3.5 w-3.5" aria-hidden="true" />{{ t('payment.enabled') }}</span>
        </label>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ t('payment.publishableKey') }}</span>
          <input v-model="form.stripePublishableKey" type="text" placeholder="pk_test_..." :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" autocomplete="off" dir="ltr" />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ t('payment.secretKey') }}</span>
          <input v-model="form.stripeSecretKey" type="password" placeholder="••••••••••••••••" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" autocomplete="off" dir="ltr" />
          <span class="mt-1 block text-[11px] text-slate-400">
            {{ hasStripeSecret ? t('payment.stored') : t('payment.notStored') }}
          </span>
        </label>
      </div>

      <label class="mt-4 block max-w-md">
        <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ t('payment.webhookSecret') }}</span>
        <input v-model="form.stripeWebhookSecret" type="password" placeholder="whsec_..." :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" autocomplete="off" dir="ltr" />
        <span class="mt-1 block text-[11px] text-slate-400">
          {{ hasStripeWebhookSecret ? t('payment.stored') : t('payment.notStored') }}
        </span>
      </label>
    </div>

    <!-- PayPal -->
    <div class="rounded-md border bg-white p-4 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <Wallet class="h-4 w-4 text-[#2B71AE]" aria-hidden="true" />
          <h2 class="font-heading text-base font-bold text-slate-900 dark:text-slate-100">
            {{ t('payment.paypal') }}
          </h2>
        </div>
        <label class="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <input v-model="form.paypalEnabled" type="checkbox" class="h-4 w-4 rounded accent-[#2B71AE]" />
          <span class="inline-flex items-center gap-1"><Power class="h-3.5 w-3.5" aria-hidden="true" />{{ t('payment.enabled') }}</span>
        </label>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ t('payment.clientId') }}</span>
          <input v-model="form.paypalClientId" type="text" placeholder="AY..." :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" autocomplete="off" dir="ltr" />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ t('payment.secretKey') }}</span>
          <input v-model="form.paypalSecret" type="password" placeholder="••••••••••••••••" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" autocomplete="off" dir="ltr" />
          <span class="mt-1 block text-[11px] text-slate-400">
            {{ hasPaypalSecret ? t('payment.stored') : t('payment.notStored') }}
          </span>
        </label>
      </div>

      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ t('payment.webhookId') }}</span>
          <input v-model="form.paypalWebhookId" type="password" placeholder="..." :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" autocomplete="off" dir="ltr" />
          <span class="mt-1 block text-[11px] text-slate-400">
            {{ hasPaypalWebhookId ? t('payment.stored') : t('payment.notStored') }}
          </span>
        </label>
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ t('payment.mode') }}</span>
          <select v-model="form.paypalMode" class="h-10 w-full rounded-md border bg-white px-3 text-xs focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }">
            <option value="sandbox">{{ t('payment.modeSandbox') }}</option>
            <option value="live">{{ t('payment.modeLive') }}</option>
          </select>
        </label>
      </div>

      <p class="mt-3 flex items-start gap-1.5 text-[11px] text-slate-400">
        <KeyRound class="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{{ locale === 'ar' ? 'تُشفّر الأسرار عند الحفظ ولا تظهر مجدداً.' : 'Secrets are encrypted on save and never shown again.' }}</span>
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

    <!-- Sticky Save Bar -->
    <AdminSettingsSaveBar
      :loading="loading"
      :dirty="dirty"
      :disabled="!canManageSettings"
      :save-label="locale === 'ar' ? 'حفظ إعدادات الدفع' : 'Save Payment Settings'"
      :saving-label="locale === 'ar' ? 'جاري الحفظ…' : 'Saving…'"
      :reset-label="locale === 'ar' ? 'تراجع' : 'Reset'"
      @reset="reset"
    />
  </form>
</template>
