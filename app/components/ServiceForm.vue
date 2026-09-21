<script setup lang="ts">
const props = defineProps<{
  service: any
}>()

const { locale } = useI18n()
const localePath = useLocalePath()

const formData = reactive<Record<string, string | File[]>>({})
const error = ref('')
const loading = ref(false)

// Initialize formData
onMounted(() => {
  if (props.service.formFields) {
    props.service.formFields.forEach((field: any) => {
      formData[field.id] = field.fieldType === 'file' ? [] : ''
    })
  }
})

async function submitRequest() {
  error.value = ''
  
  // Custom frontend validation for phone
  for (const field of props.service.formFields) {
    if (field.fieldType === 'phone') {
      const val = formData[field.id] as string
      if (val && !/^01[0125][0-9]{8}$/.test(val)) {
        error.value = `Invalid Egyptian mobile number for ${locale.value === 'ar' ? field.labelAr : field.labelEn}`
        return
      }
    }
  }

  loading.value = true
  const submitData = new FormData()
  
  for (const key in formData) {
    const val = formData[key]
    if (Array.isArray(val)) {
      val.forEach(file => {
        submitData.append(key, file)
      })
    } else if (val !== '') {
      submitData.append(key, val)
    }
  }

  try {
    await $fetch(`/api/services/${props.service.id}/requests`, {
      method: 'POST',
      body: submitData
    })
    await navigateTo(localePath('/services/success'))
  } catch (e: any) {
    error.value = e.data?.message || 'Error submitting request'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form @submit.prevent="submitRequest" class="space-y-4">
    <div v-if="error" role="alert" class="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
      {{ error }}
    </div>

    <ServiceFieldInput 
      v-for="field in service.formFields" 
      :key="field.id" 
      :field="field"
      v-model="formData[field.id]" 
    />

    <button 
      type="submit" 
      :disabled="loading" 
      class="h-12 w-full rounded bg-[#2B71AE] font-bold text-white hover:bg-[#285E8E] disabled:opacity-50"
    >
      {{ loading ? (locale === 'ar' ? 'جاري الإرسال...' : 'Submitting...') : (locale === 'ar' ? 'إرسال الطلب' : 'Submit Request') }}
    </button>
  </form>
</template>
