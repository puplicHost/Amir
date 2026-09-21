<script setup lang="ts">
const { data } = await useAsyncData('settings-contact', () => $fetch('/api/admin/settings'))

const form = reactive({
  contactPhone1: '',
  contactPhone2: '',
  contactWhatsapp: '',
  contactEmail: '',
  contactAddressAr: '',
  contactAddressEn: '',
  socialFacebook: '',
  socialInstagram: '',
  googleMapsEmbedUrl: '',
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
    await $fetch('/api/admin/settings/contact', { method: 'PUT', body: form })
    alert('Contact settings saved')
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
        <span class="mb-1 block text-sm font-medium">Primary Phone</span>
        <input v-model="form.contactPhone1" type="text" class="w-full rounded border p-2 bg-transparent" />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">Secondary Phone</span>
        <input v-model="form.contactPhone2" type="text" class="w-full rounded border p-2 bg-transparent" />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">WhatsApp</span>
        <input v-model="form.contactWhatsapp" type="text" class="w-full rounded border p-2 bg-transparent" />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">Email</span>
        <input v-model="form.contactEmail" type="email" class="w-full rounded border p-2 bg-transparent" />
      </label>
    </div>
    
    <label class="block">
      <span class="mb-1 block text-sm font-medium">Address (EN)</span>
      <textarea v-model="form.contactAddressEn" rows="2" class="w-full rounded border p-2 bg-transparent"></textarea>
    </label>
    <label class="block">
      <span class="mb-1 block text-sm font-medium">Address (AR)</span>
      <textarea v-model="form.contactAddressAr" rows="2" class="w-full rounded border p-2 bg-transparent"></textarea>
    </label>

    <div class="grid grid-cols-2 gap-4">
      <label class="block">
        <span class="mb-1 block text-sm font-medium">Facebook URL</span>
        <input v-model="form.socialFacebook" type="url" class="w-full rounded border p-2 bg-transparent" />
      </label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">Instagram URL</span>
        <input v-model="form.socialInstagram" type="url" class="w-full rounded border p-2 bg-transparent" />
      </label>
    </div>

    <label class="block">
      <span class="mb-1 block text-sm font-medium">Google Maps Embed URL</span>
      <textarea v-model="form.googleMapsEmbedUrl" rows="3" class="w-full rounded border p-2 bg-transparent" placeholder="<iframe src='...'></iframe>"></textarea>
    </label>

    <button type="submit" :disabled="loading" class="rounded bg-[#2B71AE] px-4 py-2 font-bold text-white hover:bg-[#285E8E] disabled:opacity-50">Save Contact Settings</button>
  </form>
</template>
