<script setup lang="ts">
import { FileText, Wrench } from 'lucide-vue-next'

defineProps<{
  service: any
}>()
const { locale } = useI18n()
</script>

<template>
  <div 
    :id="`service-${service.id}`" 
    class="scroll-mt-24 rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-[#162032] transition-colors"
  >
    <!-- Header Block -->
    <div class="mb-6 flex flex-col sm:flex-row sm:items-start gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
      <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#2B71AE]/10 text-[#2B71AE] dark:bg-[#2B71AE]/25 dark:text-blue-300">
        <img v-if="service.iconPath" :src="service.iconPath" alt="" class="h-8 w-8 object-contain" />
        <Wrench v-else class="h-7 w-7" />
      </div>

      <div class="flex-1">
        <h2 class="font-heading text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-tight mb-2">
          {{ locale === 'ar' ? service.nameAr : service.nameEn }}
        </h2>
        <p v-if="service.descriptionEn || service.descriptionAr" class="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
          {{ locale === 'ar' ? service.descriptionAr : service.descriptionEn }}
        </p>
      </div>
    </div>

    <!-- Request Form Container -->
    <div class="rounded-xl border border-slate-200/60 bg-slate-50/50 p-5 sm:p-6 dark:border-slate-800/80 dark:bg-slate-800/20">
      <div class="flex items-center gap-2 mb-5">
        <FileText class="h-4 w-4 text-[#2B71AE] dark:text-[#F5CC07]" />
        <h3 class="font-heading text-base font-bold text-slate-900 dark:text-white">
          {{ locale === 'ar' ? 'نموذج طلب الخدمة والمعاينة الفنية' : 'Service Request & Technical Consultation Form' }}
        </h3>
      </div>
      <ServiceForm :service="service" />
    </div>
  </div>
</template>
