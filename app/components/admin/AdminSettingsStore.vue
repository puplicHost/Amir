<script setup lang="ts">
const { data } = await useAsyncData('settings-store', () => $fetch('/api/admin/settings'))

const form = reactive({
  defaultCurrency: 'EGP',
  productsPerPage: 16,
})

const loading = ref(false)

onMounted(() => {
  if (data.value) {
    form.defaultCurrency = data.value.defaultCurrency || 'EGP'
    form.productsPerPage = data.value.productsPerPage || 16
  }
})

async function save() {
  loading.value = true
  try {
    await $fetch('/api/admin/settings/store', { method: 'PUT', body: form })
    alert('Store settings saved')
  } catch (e: any) {
    alert('Failed to save')
  }
  loading.value = false
}
</script>

<template>
  <form @submit.prevent="save" class="space-y-4">
    <div class="grid grid-cols-2 gap-4">
      <label class="block">
        <span class="mb-1 block text-sm font-medium">Default Currency</span>
        <input v-model="form.defaultCurrency" type="text" class="w-full rounded border p-2 bg-transparent" />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">Products Per Page</span>
        <input v-model.number="form.productsPerPage" type="number" class="w-full rounded border p-2 bg-transparent" />
      </label>
    </div>

    <button type="submit" :disabled="loading" class="rounded bg-[#2B71AE] px-4 py-2 font-bold text-white hover:bg-[#285E8E] disabled:opacity-50">Save Store Settings</button>
  </form>
</template>
