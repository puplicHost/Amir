<script setup lang="ts">
const { data, refresh } = await useAsyncData('settings-general', () => $fetch('/api/admin/settings'))

const form = reactive({
  siteNameAr: '',
  siteNameEn: '',
  taglineAr: '',
  taglineEn: '',
  bannerTextAr: '',
  bannerTextEn: '',
  bannerButtonTextAr: '',
  bannerButtonTextEn: '',
  bannerButtonUrl: '',
})

const loading = ref(false)

onMounted(() => {
  if (data.value) Object.assign(form, data.value)
})

async function save() {
  loading.value = true
  try {
    await $fetch('/api/admin/settings/general', { method: 'PUT', body: form })
    alert('Settings saved')
  } catch (e: any) {
    alert('Failed to save')
  }
  loading.value = false
}

async function uploadFile(type: 'logo'|'favicon'|'hero', event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const fd = new FormData()
  fd.append('file', file)
  try {
    await $fetch(`/api/admin/settings/${type}`, { method: 'POST', body: fd })
    await refresh()
    alert('Uploaded successfully')
  } catch (e: any) {
    alert('Upload failed')
  }
}
</script>

<template>
  <form @submit.prevent="save" class="space-y-6">
    <div class="grid grid-cols-2 gap-4">
      <label class="block">
        <span class="mb-1 block text-sm font-medium">Site Name (EN)</span>
        <input v-model="form.siteNameEn" type="text" class="w-full rounded border p-2 bg-transparent" />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">Site Name (AR)</span>
        <input v-model="form.siteNameAr" type="text" class="w-full rounded border p-2 bg-transparent" />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">Tagline (EN)</span>
        <input v-model="form.taglineEn" type="text" class="w-full rounded border p-2 bg-transparent" />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">Tagline (AR)</span>
        <input v-model="form.taglineAr" type="text" class="w-full rounded border p-2 bg-transparent" />
      </label>
    </div>
    
    <div class="space-y-4">
      <h3 class="font-bold text-lg">Assets</h3>
      <div class="flex gap-4 items-center">
        <div v-if="data?.logoPath" class="w-16 h-16 bg-slate-100 rounded flex items-center justify-center">
          <img :src="data.logoPath" class="max-w-full max-h-full object-contain" />
        </div>
        <label class="block flex-1">
          <span class="mb-1 block text-sm font-medium">Logo</span>
          <input type="file" @change="uploadFile('logo', $event)" class="text-sm" accept="image/*" />
        </label>
      </div>
      <div class="flex gap-4 items-center">
        <div v-if="data?.faviconPath" class="w-16 h-16 bg-slate-100 rounded flex items-center justify-center">
          <img :src="data.faviconPath" class="max-w-full max-h-full object-contain" />
        </div>
        <label class="block flex-1">
          <span class="mb-1 block text-sm font-medium">Favicon</span>
          <input type="file" @change="uploadFile('favicon', $event)" class="text-sm" accept="image/*" />
        </label>
      </div>
      <div class="flex gap-4 items-center">
        <div v-if="data?.heroImagePath" class="w-16 h-16 bg-slate-100 rounded flex items-center justify-center">
          <img :src="data.heroImagePath" class="max-w-full max-h-full object-cover" />
        </div>
        <label class="block flex-1">
          <span class="mb-1 block text-sm font-medium">Hero Image</span>
          <input type="file" @change="uploadFile('hero', $event)" class="text-sm" accept="image/*" />
        </label>
      </div>
    </div>

    <div class="space-y-4">
      <h3 class="font-bold text-lg">Banner</h3>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">Banner Text (EN)</span>
        <textarea v-model="form.bannerTextEn" rows="2" class="w-full rounded border p-2 bg-transparent"></textarea>
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">Banner Text (AR)</span>
        <textarea v-model="form.bannerTextAr" rows="2" class="w-full rounded border p-2 bg-transparent"></textarea>
      </label>
      <div class="grid grid-cols-2 gap-4">
        <label class="block">
          <span class="mb-1 block text-sm font-medium">Button Text (EN)</span>
          <input v-model="form.bannerButtonTextEn" type="text" class="w-full rounded border p-2 bg-transparent" />
        </label>
        <label class="block">
          <span class="mb-1 block text-sm font-medium">Button Text (AR)</span>
          <input v-model="form.bannerButtonTextAr" type="text" class="w-full rounded border p-2 bg-transparent" />
        </label>
      </div>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">Button URL</span>
        <input v-model="form.bannerButtonUrl" type="text" class="w-full rounded border p-2 bg-transparent" />
      </label>
    </div>

    <button type="submit" :disabled="loading" class="rounded bg-[#2B71AE] px-4 py-2 font-bold text-white hover:bg-[#285E8E] disabled:opacity-50">Save General Settings</button>
  </form>
</template>
