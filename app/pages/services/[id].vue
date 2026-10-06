<script setup lang="ts">
import { AlertCircle, Send } from 'lucide-vue-next'

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const serviceIdentifier = String(route.params.id)

const { data: service, error } = await useAsyncData(`service-landing-${serviceIdentifier}`, () =>
  $fetch<any>(`/api/services/${serviceIdentifier}`)
)

if (error.value || !service.value) {
  throw createError({ statusCode: 404, statusMessage: 'Service not found', fatal: true })
}

useHead(() => ({
  title: `${service.value.nameAr} - ${service.value.nameEn} | ${t('brand.name')}`,
}))

const formData = reactive<Record<string, string | File[]>>({})
const formError = ref('')
const loading = ref(false)

onMounted(() => {
  if (service.value?.formFields) {
    service.value.formFields.forEach((field: any) => {
      formData[field.id] = field.fieldType === 'file' ? [] : ''
    })
  }
})

async function submitRequest() {
  formError.value = ''

  for (const field of service.value.formFields || []) {
    if (field.fieldType === 'phone') {
      const val = formData[field.id] as string
      if (val && !/^01[0125][0-9]{8}$/.test(val.trim())) {
        formError.value = `يرجى إدخال رقم هاتف مصري صحيح لحقل (${field.labelAr || field.labelEn}) / Invalid Egyptian phone number`
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
    await $fetch(`/api/services/${service.value.id}/requests`, {
      method: 'POST',
      body: submitData,
    })
    await navigateTo(localePath('/services/success'))
  } catch (e: any) {
    formError.value = e?.data?.message || 'حدث خطأ أثناء إرسال الطلب / Error submitting request'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="py-12 sm:py-16 px-4 sm:px-6">
    <div class="mx-auto w-full max-w-[600px]">
      
      <!-- Bilingual Page Title Directly Above Card -->
      <div class="mb-6 text-center">
        <h1 class="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
          {{ service.nameAr }}
        </h1>
        <p class="font-mono text-sm sm:text-base font-semibold text-[#2B71AE] dark:text-[#F5CC07] mt-1" dir="ltr">
          {{ service.nameEn }}
        </p>
      </div>

      <!-- Centered Card with Form (max-width 600px) -->
      <div 
        class="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-[#162032] transition-colors"
        :style="{ borderColor: 'var(--color-border)' }"
        dir="rtl"
      >
        <!-- Error Alert -->
        <div 
          v-if="formError" 
          role="alert" 
          class="mb-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
        >
          <AlertCircle class="h-4 w-4 shrink-0" />
          <span>{{ formError }}</span>
        </div>

        <form @submit.prevent="submitRequest" class="space-y-4">
          <!-- Dynamic Service Fields with Arabic Labels & English Placeholders -->
          <ServiceFieldInput 
            v-for="field in service.formFields" 
            :key="field.id" 
            :field="field"
            v-model="formData[field.id]" 
            :bilingual="true"
          />

          <!-- Bilingual Submit Button: "إرسال الطلب / Submit Request" -->
          <div class="pt-4">
            <button 
              type="submit" 
              :disabled="loading" 
              class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#F5CC07] px-6 text-sm font-bold text-slate-950 shadow-md shadow-yellow-500/20 hover:bg-yellow-400 active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
            >
              <Send class="h-4 w-4" />
              <span>{{ loading ? 'جاري الإرسال… / Submitting…' : 'إرسال الطلب / Submit Request' }}</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  </div>
</template>
