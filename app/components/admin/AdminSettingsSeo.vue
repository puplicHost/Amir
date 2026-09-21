<script setup lang="ts">
const { data } = await useAsyncData('settings-seo', () => $fetch('/api/admin/settings'))

const form = reactive({
  seoMetaTitleTemplateAr: '',
  seoMetaTitleTemplateEn: '',
  seoMetaDescriptionAr: '',
  seoMetaDescriptionEn: '',
  seoKeywords: '',
  geoDescription: '',
})

const loading = ref(false)

onMounted(() => {
  if (data.value) {
    Object.keys(form).forEach(k => {
      form[k as keyof typeof form] = data.value[k] || ''
    })
  }
})

async function save() {
  loading.value = true
  try {
    await $fetch('/api/admin/settings/seo', { method: 'PUT', body: form })
    alert('SEO settings saved')
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
        <span class="mb-1 block text-sm font-medium">Meta Title Template (EN)</span>
        <input v-model="form.seoMetaTitleTemplateEn" type="text" placeholder="{page} | Mango Electronics" class="w-full rounded border p-2 bg-transparent" />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">Meta Title Template (AR)</span>
        <input v-model="form.seoMetaTitleTemplateAr" type="text" placeholder="{page} | مانجو إلكترونيكس" class="w-full rounded border p-2 bg-transparent" />
      </label>
    </div>
    
    <label class="block">
      <span class="mb-1 block text-sm font-medium">Meta Description (EN)</span>
      <textarea v-model="form.seoMetaDescriptionEn" rows="2" class="w-full rounded border p-2 bg-transparent"></textarea>
    </label>
    <label class="block">
      <span class="mb-1 block text-sm font-medium">Meta Description (AR)</span>
      <textarea v-model="form.seoMetaDescriptionAr" rows="2" class="w-full rounded border p-2 bg-transparent"></textarea>
    </label>

    <label class="block">
      <span class="mb-1 block text-sm font-medium">Keywords (comma separated)</span>
      <input v-model="form.seoKeywords" type="text" class="w-full rounded border p-2 bg-transparent" />
    </label>

    <label class="block">
      <span class="mb-1 block text-sm font-medium">GEO Description (For AI/Search Engines)</span>
      <textarea v-model="form.geoDescription" rows="4" class="w-full rounded border p-2 bg-transparent"></textarea>
      <p class="text-xs text-slate-500 mt-1">Structured description about the business locations, areas served, etc.</p>
    </label>

    <button type="submit" :disabled="loading" class="rounded bg-[#2B71AE] px-4 py-2 font-bold text-white hover:bg-[#285E8E] disabled:opacity-50">Save SEO Settings</button>
  </form>
</template>
