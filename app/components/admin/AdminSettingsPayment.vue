<script setup lang="ts">
const { data, refresh } = await useAsyncData('admin-payment-settings', () =>
  $fetch<{ payment: { codEnabled: boolean, onlineEnabled: boolean, gatewayName: string, gatewayMode: string, hasCredentials: boolean } }>('/api/admin/settings/payment'),
)

const saving = ref(false)
const message = ref('')
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
    message.value = 'Settings saved successfully'
    form.apiKey = ''
    form.secretKey = ''
    await refresh()
  }
  catch (e) {
    message.value = (e as any)?.data?.message || 'Failed to save settings'
  }
  finally {
    saving.value = false
    setTimeout(() => { if (message.value === 'Settings saved successfully') message.value = '' }, 3000)
  }
}

const inputCls = 'h-10 w-full rounded border bg-transparent px-3 text-sm'
const border = { borderColor: 'var(--color-border)' }
</script>

<template>
  <form @submit.prevent="save" class="space-y-6">
    <div class="rounded-md border p-6" :style="border">
      <h2 class="font-heading text-lg font-bold">Checkout Methods</h2>
      <p class="mb-4 text-sm text-slate-500">Enable or disable payment methods available to customers at checkout.</p>
      
      <div class="space-y-4">
        <label class="flex items-center gap-3">
          <input v-model="form.codEnabled" type="checkbox" class="h-4 w-4" />
          <span class="font-medium">Cash on Delivery (COD)</span>
        </label>
        
        <label class="flex items-center gap-3">
          <input v-model="form.onlineEnabled" type="checkbox" class="h-4 w-4" />
          <span class="font-medium">Online Payment</span>
        </label>
      </div>
    </div>

    <div v-if="form.onlineEnabled" class="rounded-md border p-6" :style="border">
      <h2 class="font-heading text-lg font-bold">Online Gateway Configuration</h2>
      <p class="mb-4 text-sm text-slate-500">Configure your payment provider (e.g., Paymob, Fawry). Credentials are encrypted at rest.</p>
      
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block">
          <span class="mb-1 block text-sm font-medium">Gateway Name</span>
          <input v-model="form.gatewayName" type="text" :class="inputCls" :style="border" placeholder="e.g. Paymob" />
        </label>
        <label class="block">
          <span class="mb-1 block text-sm font-medium">Mode</span>
          <select v-model="form.gatewayMode" :class="inputCls" :style="border">
            <option value="sandbox">Sandbox / Testing</option>
            <option value="production">Production / Live</option>
          </select>
        </label>
        
        <div class="sm:col-span-2 mt-2">
          <div v-if="data?.payment?.hasCredentials" class="mb-4 rounded bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            Credentials are currently stored securely. Leave blank to keep existing credentials.
          </div>
          
          <label class="block mb-4">
            <span class="mb-1 block text-sm font-medium">API Key</span>
            <input v-model="form.apiKey" type="password" :class="inputCls" :style="border" placeholder="••••••••••••••••" />
          </label>
          <label class="block">
            <span class="mb-1 block text-sm font-medium">Secret Key</span>
            <input v-model="form.secretKey" type="password" :class="inputCls" :style="border" placeholder="••••••••••••••••" />
          </label>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-4">
      <button type="submit" :disabled="saving" class="h-10 rounded bg-[#2B71AE] px-8 font-semibold text-white hover:bg-[#285E8E] disabled:opacity-50">
        {{ saving ? 'Saving...' : 'Save Settings' }}
      </button>
      <span v-if="message" class="text-sm font-medium" :class="message.includes('success') ? 'text-green-600' : 'text-red-600'">{{ message }}</span>
    </div>
  </form>
</template>
