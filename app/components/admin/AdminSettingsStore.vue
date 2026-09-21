<script setup lang="ts">
import { Store } from 'lucide-vue-next'

const { locale } = useI18n()
const { data } = await useAsyncData('settings-store', () => $fetch<any>('/api/admin/settings'))

const form = reactive({
  defaultCurrency: 'EGP',
  productsPerPage: 16,
})

const loading = ref(false)
const statusMessage = ref('')
const isError = ref(false)

onMounted(() => {
  if (data.value) {
    form.defaultCurrency = data.value.defaultCurrency || 'EGP'
    form.productsPerPage = data.value.productsPerPage || 16
  }
})

async function save() {
  loading.value = true
  statusMessage.value = ''
  isError.value = false
  try {
    await $fetch('/api/admin/settings/store', { method: 'PUT', body: form })
    statusMessage.value = locale.value === 'ar' ? 'تم حفظ تهيئة المتجر بنجاح.' : 'Store configuration saved successfully.'
  }
  catch (e: any) {
    isError.value = true
    statusMessage.value = e?.data?.message || (locale.value === 'ar' ? 'حدث خطأ أثناء الحفظ.' : 'Failed to save store configuration.')
  }
  finally {
    loading.value = false
    setTimeout(() => { if (!isError.value) statusMessage.value = '' }, 4000)
  }
}

const inputCls = 'h-10 w-full rounded-md border bg-white px-3 text-xs transition-colors focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520]'
</script>

<template>
  <form class="space-y-6" @submit.prevent="save">
    <!-- Inline Feedback Banner -->
    <div
      v-if="statusMessage"
      role="alert"
      class="rounded-md border p-3 text-xs font-medium transition-all"
      :class="isError ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'"
    >
      {{ statusMessage }}
    </div>

    <!-- Store Configuration Card -->
    <div class="rounded-md border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <div class="mb-4 flex items-center gap-2">
        <Store class="h-4 w-4 text-[#2B71AE]" aria-hidden="true" />
        <h2 class="font-heading text-base font-bold text-slate-900 dark:text-slate-100">
          {{ locale === 'ar' ? 'العملة والتصفح في المتجر' : 'Catalog & Currency Settings' }}
        </h2>
      </div>

      <div class="grid max-w-xl gap-4 sm:grid-cols-2">
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Default Currency Code</span>
          <input v-model="form.defaultCurrency" type="text" placeholder="EGP" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
          <span class="mt-1 block text-[11px] text-slate-400">Default currency displayed across product pricing and checkout.</span>
        </label>

        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Products Per Page</span>
          <input v-model.number="form.productsPerPage" type="number" min="4" max="100" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
          <span class="mt-1 block text-[11px] text-slate-400">Default number of items displayed per catalog pagination page.</span>
        </label>
      </div>
    </div>

    <!-- Submit Button -->
    <div class="flex items-center justify-end gap-3 pt-2">
      <button
        type="submit"
        :disabled="loading"
        class="inline-flex h-10 items-center gap-2 rounded-md bg-[#2B71AE] px-6 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#285E8E] disabled:opacity-50"
      >
        <span>{{ loading ? (locale === 'ar' ? 'جاري الحفظ…' : 'Saving…') : (locale === 'ar' ? 'حفظ إعدادات المتجر' : 'Save Store Config') }}</span>
      </button>
    </div>
  </form>
</template>
