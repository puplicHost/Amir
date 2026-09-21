<script setup lang="ts">
import { CreditCard, Lock } from 'lucide-vue-next'

const { locale } = useI18n()
const { data, refresh } = await useAsyncData('admin-payment-settings', () =>
  $fetch<{ payment: { codEnabled: boolean, onlineEnabled: boolean, gatewayName: string, gatewayMode: string, hasCredentials: boolean } }>('/api/admin/settings/payment'),
)

const saving = ref(false)
const message = ref('')
const isError = ref(false)

const form = reactive({
  codEnabled: data.value?.payment.codEnabled ?? true,
  onlineEnabled: data.value?.payment.onlineEnabled ?? false,
  gatewayName: data.value?.payment.gatewayName ?? '',
  gatewayMode: data.value?.payment.gatewayMode ?? 'sandbox',
  apiKey: '',
  secretKey: '',
})

async function save() {
  saving.value = true
  message.value = ''
  isError.value = false
  try {
    await $fetch('/api/admin/settings/payment', {
      method: 'PUT',
      body: {
        codEnabled: form.codEnabled,
        onlineEnabled: form.onlineEnabled,
        gatewayName: form.gatewayName,
        gatewayMode: form.gatewayMode,
        ...(form.apiKey || form.secretKey ? { credentials: { apiKey: form.apiKey, secretKey: form.secretKey } } : {}),
      },
    })
    message.value = locale.value === 'ar' ? 'تم حفظ إعدادات الدفع بنجاح.' : 'Payment settings saved successfully.'
    form.apiKey = ''
    form.secretKey = ''
    await refresh()
  }
  catch (e) {
    isError.value = true
    message.value = (e as any)?.data?.message || (locale.value === 'ar' ? 'فشل حفظ الإعدادات.' : 'Failed to save settings.')
  }
  finally {
    saving.value = false
    setTimeout(() => { if (!isError.value) message.value = '' }, 4000)
  }
}

const inputCls = 'h-10 w-full rounded-md border bg-white px-3 text-xs transition-colors focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520]'
</script>

<template>
  <form class="space-y-6" @submit.prevent="save">
    <!-- Inline Feedback Banner -->
    <div
      v-if="message"
      role="alert"
      class="rounded-md border p-3 text-xs font-medium transition-all"
      :class="isError ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'"
    >
      {{ message }}
    </div>

    <!-- Active Checkout Methods Card -->
    <div class="rounded-md border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <div class="mb-3 flex items-center gap-2">
        <CreditCard class="h-4 w-4 text-[#2B71AE]" aria-hidden="true" />
        <h2 class="font-heading text-base font-bold text-slate-900 dark:text-slate-100">
          {{ locale === 'ar' ? 'طرق الدفع عند الشراء' : 'Checkout Payment Methods' }}
        </h2>
      </div>
      <p class="mb-4 text-xs text-slate-500 dark:text-slate-400">
        {{ locale === 'ar' ? 'تحديد الخيارات المتاحة للعملاء لإتمام الطلب في صفحة الدفع.' : 'Enable or disable payment options presented to customers during checkout.' }}
      </p>

      <div class="space-y-3">
        <label class="flex cursor-pointer items-center gap-3 rounded-md border p-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40" :style="{ borderColor: 'var(--color-border)' }">
          <input v-model="form.codEnabled" type="checkbox" class="h-4 w-4 rounded accent-[#2B71AE]" />
          <div>
            <span class="block text-xs font-bold text-slate-900 dark:text-slate-100">Cash on Delivery (COD)</span>
            <span class="text-[11px] text-slate-400">Customers pay in cash upon receiving the order shipment.</span>
          </div>
        </label>

        <label class="flex cursor-pointer items-center gap-3 rounded-md border p-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40" :style="{ borderColor: 'var(--color-border)' }">
          <input v-model="form.onlineEnabled" type="checkbox" class="h-4 w-4 rounded accent-[#2B71AE]" />
          <div>
            <span class="block text-xs font-bold text-slate-900 dark:text-slate-100">Online Card / Wallet Payment</span>
            <span class="text-[11px] text-slate-400">Accept credit/debit cards and electronic wallets via payment gateway.</span>
          </div>
        </label>
      </div>
    </div>

    <!-- Online Gateway Configuration Card -->
    <div v-if="form.onlineEnabled" class="rounded-md border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <div class="mb-2 flex items-center gap-2">
        <Lock class="h-4 w-4 text-[#2B71AE]" aria-hidden="true" />
        <h2 class="font-heading text-base font-bold text-slate-900 dark:text-slate-100">
          {{ locale === 'ar' ? 'تهيئة بوابة الدفع الإلكتروني' : 'Gateway Credentials & Mode' }}
        </h2>
      </div>
      <p class="mb-4 text-xs text-slate-500 dark:text-slate-400">
        {{ locale === 'ar' ? 'يتم تشفير وتخزين مفاتيح API بتشفير AES-256 محمي في قاعدة البيانات.' : 'API keys and secrets are encrypted at rest with AES-256.' }}
      </p>

      <div class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Gateway Provider Name</span>
            <input v-model="form.gatewayName" type="text" placeholder="e.g. Paymob, Fawry" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Environment Mode</span>
            <select v-model="form.gatewayMode" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }">
              <option value="sandbox">Sandbox (بيئة الاختبار)</option>
              <option value="production">Production (بيئة العمل المباشرة)</option>
            </select>
          </label>
        </div>

        <div v-if="data?.payment?.hasCredentials" class="rounded-md bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
          ✓ Active credentials are encrypted and stored safely. Leave fields blank to keep existing secrets.
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">API Key</span>
            <input v-model="form.apiKey" type="password" placeholder="••••••••••••••••" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Secret Key</span>
            <input v-model="form.secretKey" type="password" placeholder="••••••••••••••••" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
        </div>
      </div>
    </div>

    <!-- Submit Button -->
    <div class="flex items-center justify-end gap-3 pt-2">
      <button
        type="submit"
        :disabled="saving"
        class="inline-flex h-10 items-center gap-2 rounded-md bg-[#2B71AE] px-6 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#285E8E] disabled:opacity-50"
      >
        <span>{{ saving ? (locale === 'ar' ? 'جاري الحفظ…' : 'Saving…') : (locale === 'ar' ? 'حفظ إعدادات الدفع' : 'Save Payment Settings') }}</span>
      </button>
    </div>
  </form>
</template>
