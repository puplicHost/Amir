<script setup lang="ts">
import { Mail } from 'lucide-vue-next'

const { t, locale } = useI18n()
const canManageSettings = useAdminCan('settings.business')

const {
  form, loading, statusMessage, isError, dirty, save, reset,
} = await useSettingsForm({
  key: 'settings-mail',
  endpoint: '/api/admin/settings/mail',
  defaults: {
    provider: 'log',
    from: '',
    fromName: '',
    httpEndpoint: '',
    httpKey: '',
  },
  mapData: response => ({
    provider: response.mail?.provider || 'log',
    from: response.mail?.from ?? '',
    fromName: response.mail?.fromName ?? '',
    httpEndpoint: response.mail?.httpEndpoint ?? '',
    httpKey: '',
  }),
  saveEndpoint: '/api/admin/settings/mail',
  successAr: 'تم حفظ إعدادات البريد بنجاح.',
  successEn: 'Mail settings saved successfully.',
  failAr: 'حدث خطأ أثناء الحفظ.',
  failEn: 'Failed to save mail settings.',
})

const hasHttpKey = ref(false)
const { data: mailState } = await useAsyncData('settings-mail-state', () =>
  $fetch<any>('/api/admin/settings/mail').catch(() => null),
)
watch(mailState, v => { hasHttpKey.value = Boolean(v?.mail?.hasHttpKey) }, { immediate: true })

const testTo = ref('')
const testSending = ref(false)
const testMsg = ref('')

async function sendTest() {
  testMsg.value = ''
  if (!testTo.value.trim()) return
  testSending.value = true
  try {
    const res = await $fetch<{ success: boolean, simulated: boolean, message?: string }>('/api/admin/settings/mail-test', { method: 'POST', body: { to: testTo.value.trim() } })
    testMsg.value = res.simulated
      ? (res.message || 'Simulated only: configure a real mail provider.')
      : t('mail.testOk')
  }
  catch (e: any) {
    testMsg.value = e?.data?.message || e?.data?.statusMessage || t('mail.testFail')
  }
  finally {
    testSending.value = false
  }
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="save">
    <div class="rounded-md border bg-white p-4 shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
      <div class="mb-3 flex items-center gap-2">
        <Mail class="h-4 w-4 text-primary" aria-hidden="true" />
        <h2 class="font-heading text-base font-bold text-neutral-900 dark:text-neutral-100">
          {{ t('mail.title') }}
        </h2>
      </div>
      <p class="mb-4 text-[11px] text-neutral-500">{{ t('mail.description') }}</p>

      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('mail.provider') }}</span>
          <select v-model="form.provider" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }">
            <option value="log">{{ t('mail.providerLog') }}</option>
            <option value="http">{{ t('mail.providerHttp') }}</option>
          </select>
        </label>
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('mail.from') }}</span>
          <input v-model="form.from" type="email" placeholder="studio@example.com" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" dir="ltr" />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('mail.fromName') }}</span>
          <input v-model="form.fromName" type="text" placeholder="AMIR Studio" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" dir="ltr" />
        </label>
        <template v-if="form.provider === 'http'">
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('mail.httpEndpoint') }}</span>
            <input v-model="form.httpEndpoint" type="url" placeholder="https://…" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" dir="ltr" />
          </label>
          <label class="block sm:col-span-2">
            <span class="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              {{ t('mail.httpKey') }} {{ hasHttpKey ? `(${t('payment.stored')})` : `(${t('payment.notStored')})` }}
            </span>
            <input v-model="form.httpKey" type="password" autocomplete="new-password" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" dir="ltr" />
          </label>
        </template>
      </div>

      <div class="mt-4 flex flex-wrap items-end gap-2 border-t pt-4" :style="{ borderColor: 'var(--color-border)' }">
        <label class="block min-w-52 flex-1">
          <span class="mb-1.5 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('mail.testTo') }}</span>
          <input v-model="testTo" type="email" :class="settingsInputCls" :style="{ borderColor: 'var(--color-border)' }" dir="ltr" />
        </label>
        <button
          type="button"
          :disabled="testSending || !testTo.trim()"
          class="inline-flex h-11 items-center rounded-md border px-4 text-xs font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:text-neutral-200 dark:hover:bg-neutral-800"
          :style="{ borderColor: 'var(--color-border)' }"
          @click="sendTest"
        >
          {{ t('mail.sendTest') }}
        </button>
      </div>
      <p v-if="testMsg" class="mt-2 text-xs text-neutral-500">{{ testMsg }}</p>
    </div>

    <div
      v-if="statusMessage"
      role="alert"
      aria-live="polite"
      class="rounded-md border p-3 text-xs font-medium transition"
      :class="isError ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'"
    >
      {{ statusMessage }}
    </div>

    <AdminSettingsSaveBar
      :loading="loading"
      :dirty="dirty"
      :disabled="!canManageSettings"
      :save-label="locale === 'ar' ? 'حفظ إعدادات البريد' : 'Save Mail Settings'"
      :saving-label="locale === 'ar' ? 'جاري الحفظ…' : 'Saving…'"
      :reset-label="locale === 'ar' ? 'تراجع' : 'Reset'"
      @reset="reset"
    />
  </form>
</template>
