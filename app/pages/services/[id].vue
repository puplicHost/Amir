<script setup lang="ts">
import { 
  AlertCircle, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  FileText, 
  RotateCcw, 
  Send, 
  ShieldCheck, 
  Wrench 
} from 'lucide-vue-next'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const serviceId = String(route.params.id)

const { data: service, error } = await useAsyncData(`service-${serviceId}`, () =>
  $fetch<any>(`/api/services/${serviceId}`)
)

if (error.value || !service.value) {
  throw createError({ statusCode: 404, statusMessage: 'Service not found', fatal: true })
}

const serviceName = computed(() => locale.value === 'ar' ? service.value.nameAr : service.value.nameEn)
const serviceDesc = computed(() => locale.value === 'ar' ? service.value.descriptionAr : service.value.descriptionEn)

useHead(() => ({
  title: `${locale.value === 'ar' ? 'طلب خدمة' : 'Request'} ${serviceName.value} | ${t('brand.name')}`
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
  
  // Custom Egyptian phone validation
  for (const field of service.value.formFields || []) {
    if (field.fieldType === 'phone') {
      const val = formData[field.id] as string
      if (val && !/^01[0125][0-9]{8}$/.test(val.trim())) {
        formError.value = locale.value === 'ar' 
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
    await $fetch(`/api/services/${service.value.id}/requests`, {
      method: 'POST',
      body: submitData
    })
    await navigateTo(localePath('/services/success'))
  } catch (e: any) {
    formError.value = e?.data?.message || (locale.value === 'ar' ? 'حدث خطأ أثناء إرسال الطلب' : 'Error submitting request')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
    
    <!-- Breadcrumb Navigation & Back to Services Link -->
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-4">
      <nav class="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400" aria-label="Breadcrumb">
        <NuxtLink :to="localePath('/')" class="hover:text-[#2B71AE] transition-colors">{{ t('nav.home') }}</NuxtLink>
        <span class="text-slate-400">/</span>
        <NuxtLink :to="localePath('/services')" class="hover:text-[#2B71AE] transition-colors">{{ t('nav.services') }}</NuxtLink>
        <span class="text-slate-400">/</span>
        <span class="text-slate-900 dark:text-white font-semibold truncate max-w-xs">{{ serviceName }}</span>
      </nav>

      <NuxtLink 
        :to="localePath('/services')" 
        class="inline-flex items-center gap-1.5 text-xs font-bold text-[#2B71AE] hover:underline dark:text-[#F5CC07] transition-colors"
      >
        <ArrowLeft v-if="locale === 'en'" class="h-3.5 w-3.5" />
        <ArrowRight v-else class="h-3.5 w-3.5" />
        <span>{{ locale === 'ar' ? 'العودة لجميع الخدمات' : 'Back to Services' }}</span>
      </NuxtLink>
    </div>

    <!-- Active Service Context Card (Top Summary with Change Service Option) -->
    <div 
      class="mb-8 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-[#162032] transition-colors"
      :style="{ borderColor: 'var(--color-border)' }"
    >
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-start gap-4">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#2B71AE]/10 text-[#2B71AE] dark:bg-[#2B71AE]/25 dark:text-blue-300">
            <Wrench class="h-6 w-6" />
          </div>
          <div>
            <span class="text-[11px] font-mono font-bold uppercase tracking-wider text-[#2B71AE] dark:text-[#F5CC07] block mb-0.5">
              {{ locale === 'ar' ? 'الخدمة المختارة' : 'Selected Service' }}
            </span>
            <h2 class="font-heading text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight">
              {{ serviceName }}
            </h2>
            <p v-if="serviceDesc" class="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl line-clamp-2">
              {{ serviceDesc }}
            </p>
          </div>
        </div>

        <NuxtLink 
          :to="localePath('/services')" 
          class="self-start sm:self-center shrink-0 inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-xs font-bold text-slate-700 hover:border-[#2B71AE] hover:text-[#2B71AE] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-[#F5CC07] dark:hover:text-[#F5CC07] transition-all"
        >
          <RotateCcw class="h-3.5 w-3.5" />
          <span>{{ locale === 'ar' ? 'تغيير الخدمة' : 'Change Service' }}</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Main Service Request Form Container -->
    <div 
      class="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-[#162032] transition-colors"
      :style="{ borderColor: 'var(--color-border)' }"
    >
      <!-- Form Header -->
      <div class="mb-6 border-b border-slate-100 dark:border-slate-800 pb-5">
        <h1 class="font-heading text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mb-1.5">
          {{ locale === 'ar' ? `طلب ${serviceName}` : `Request ${serviceName}` }}
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {{ locale === 'ar' ? 'املأ البيانات الفنية ومعلومات التواصل وسيقوم فريقنا الهندسي بالتواصل معك لترتيب المعاينة.' : 'Fill in the technical specifications and contact info below. Our engineering department will contact you to coordinate on-site inspection.' }}
        </p>
      </div>

      <!-- Form Error Alert -->
      <div 
        v-if="formError" 
        role="alert" 
        class="mb-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
      >
        <AlertCircle class="h-4 w-4 shrink-0" />
        <span>{{ formError }}</span>
      </div>

      <!-- Form Fields -->
      <form @submit.prevent="submitRequest" class="space-y-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          <ServiceFieldInput 
            v-for="field in service.formFields" 
            :key="field.id" 
            :field="field"
            v-model="formData[field.id]" 
            :class="field.fieldType === 'textarea' || field.fieldType === 'file' ? 'sm:col-span-2' : ''"
          />
        </div>

        <!-- Trust Badges Strip -->
        <div class="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div class="flex items-center gap-1.5">
            <ShieldCheck class="h-4 w-4 text-[#F5CC07]" />
            <span>{{ locale === 'ar' ? 'فريق هندسي معتمد ومتخصص' : 'Certified Engineering Specialists' }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <CheckCircle2 class="h-4 w-4 text-[#F5CC07]" />
            <span>{{ locale === 'ar' ? 'تقرير فني ومعاينة دقيقة' : 'Technical Inspection & Formal Report' }}</span>
          </div>
        </div>

        <!-- Submit Action CTA -->
        <div class="pt-2">
          <button 
            type="submit" 
            :disabled="loading" 
            class="inline-flex h-12 w-full sm:w-auto sm:min-w-64 items-center justify-center gap-2 rounded-xl bg-[#2B71AE] px-8 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-[#285E8E] active:scale-[0.98] disabled:opacity-50 transition-all"
          >
            <Send class="h-4 w-4" />
            <span>{{ loading ? (locale === 'ar' ? 'جاري إرسال الطلب...' : 'Submitting Request...') : (locale === 'ar' ? 'إرسال طلب الخدمة' : 'Submit Service Request') }}</span>
            <ArrowRight class="h-4 w-4 rtl:rotate-180" />
          </button>
        </div>
      </form>
    </div>

  </div>
</template>
