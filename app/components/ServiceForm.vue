<script setup lang="ts">
import { AlertCircle, ArrowRight, Check, Send } from 'lucide-vue-next'

const props = defineProps<{
  service: any
}>()

const { locale } = useI18n()
const localePath = useLocalePath()

const formData = reactive<Record<string, string | File[]>>({})
const error = ref('')
const loading = ref(false)

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
        error.value = locale.value === 'ar' 
          ? `يرجى إدخال رقم هاتف مصري صحيح لحقل (${field.labelAr || field.labelEn})` 
          : `Invalid Egyptian mobile number for ${field.labelEn || field.labelAr}`
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
    error.value = e.data?.message || (locale.value === 'ar' ? 'حدث خطأ أثناء إرسال الطلب' : 'Error submitting request')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form @submit.prevent="submitRequest" class="space-y-4">
    <!-- Validation Alert -->
    <div 
      v-if="error" 
      role="alert" 
      class="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
    >
      <AlertCircle class="h-4 w-4 shrink-0" />
      <span>{{ error }}</span>
    </div>

    <!-- Dynamic Form Fields -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <ServiceFieldInput 
        v-for="field in service.formFields" 
        :key="field.id" 
        :field="field"
        v-model="formData[field.id]" 
        :class="field.fieldType === 'textarea' || field.fieldType === 'file' ? 'sm:col-span-2' : ''"
      />
    </div>

    <!-- Submit Action Button -->
    <div class="pt-2">
      <button 
        type="submit" 
        :disabled="loading" 
        class="inline-flex h-12 w-full sm:w-auto sm:min-w-56 items-center justify-center gap-2 rounded-xl bg-[#2B71AE] px-8 text-sm font-bold text-white shadow-lg shadow-blue-500/15 hover:bg-[#285E8E] active:scale-[0.98] disabled:opacity-50 transition-all"
      >
        <Send class="h-4 w-4" />
        <span>{{ loading ? (locale === 'ar' ? 'جاري إرسال الطلب...' : 'Submitting Request...') : (locale === 'ar' ? 'إرسال طلب الخدمة' : 'Submit Service Request') }}</span>
        <ArrowRight class="h-4 w-4 rtl:rotate-180" />
      </button>
    </div>
  </form>
</template>
