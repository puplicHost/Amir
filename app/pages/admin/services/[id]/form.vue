<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const serviceId = route.params.id as string

useHead(() => ({ title: `Form Builder — Admin — ${t('brand.name')}` }))

const { data: fields, refresh } = await useAsyncData(`service-form-${serviceId}`, () =>
  $fetch<any[]>(`/api/admin/services/${serviceId}/form`)
)

const isCreating = ref(false)
const newField = reactive({
  labelAr: '',
  labelEn: '',
  fieldType: 'text',
  isRequired: false,
})
const saving = ref(false)

async function addField() {
  if (!newField.labelAr || !newField.labelEn) return alert('Labels are required')
  saving.value = true
  try {
    await $fetch(`/api/admin/services/${serviceId}/form/fields`, {
      method: 'POST',
      body: { ...newField, sortOrder: fields.value ? fields.value.length + 1 : 1 }
    })
    isCreating.value = false
    newField.labelAr = ''
    newField.labelEn = ''
    newField.fieldType = 'text'
    newField.isRequired = false
    await refresh()
  } catch (e) {
    alert('Error adding field')
  }
  saving.value = false
}

async function removeField(id: string) {
  if (!confirm('Remove this field?')) return
  try {
    await $fetch(`/api/admin/services/${serviceId}/form/fields/${id}`, { method: 'DELETE' })
    await refresh()
  } catch (e) {
    alert('Error removing field')
  }
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">Form Builder</h1>
      <NuxtLink :to="localePath('/admin/services')" class="text-sm text-[#2B71AE] hover:underline">
        &larr; Back to Services
      </NuxtLink>
    </div>

    <div class="mb-6 space-y-4">
      <div v-for="field in fields" :key="field.id" class="rounded border p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <div class="flex justify-between items-start">
          <div>
            <div class="font-medium">{{ field.labelEn }} / {{ field.labelAr }}</div>
            <div class="text-sm text-slate-500 mt-1">
              Type: {{ field.fieldType }} | Required: {{ field.isRequired ? 'Yes' : 'No' }}
            </div>
            <div v-if="field.options" class="text-xs text-slate-400 mt-1">
              Has Options configuration.
            </div>
          </div>
          <button @click="removeField(field.id)" class="text-red-500 hover:underline text-sm">Remove</button>
        </div>
      </div>
    </div>

    <div v-if="isCreating" class="rounded border p-4 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800">
      <h3 class="font-bold mb-4">Add New Field</h3>
      <div class="grid grid-cols-2 gap-4 mb-4">
        <label class="block">
          <span class="text-sm block mb-1">Label (EN)</span>
          <input v-model="newField.labelEn" type="text" class="w-full border rounded p-2 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
        </label>
        <label class="block">
          <span class="text-sm block mb-1">Label (AR)</span>
          <input v-model="newField.labelAr" type="text" class="w-full border rounded p-2 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
        </label>
        <label class="block">
          <span class="text-sm block mb-1">Field Type</span>
          <select v-model="newField.fieldType" class="w-full border rounded p-2 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
            <option value="text">Text</option>
            <option value="textarea">Textarea</option>
            <option value="phone">Phone</option>
            <option value="select">Select (Options)</option>
            <option value="file">File Upload</option>
          </select>
        </label>
        <label class="block flex items-center mt-6">
          <input v-model="newField.isRequired" type="checkbox" class="mr-2 h-4 w-4">
          <span class="text-sm">Is Required?</span>
        </label>
      </div>
      <div class="flex gap-2">
        <button @click="addField" :disabled="saving" class="bg-[#2B71AE] text-white px-4 py-2 rounded hover:bg-[#285E8E] disabled:opacity-50">Save Field</button>
        <button @click="isCreating = false" class="border px-4 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-300 dark:border-slate-700">Cancel</button>
      </div>
    </div>
    
    <button v-else @click="isCreating = true" class="bg-[#2B71AE] text-white px-4 py-2 rounded hover:bg-[#285E8E]">
      + Add Field
    </button>

  </div>
</template>
