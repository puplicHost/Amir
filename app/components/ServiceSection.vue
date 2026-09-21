<script setup lang="ts">
defineProps<{
  service: any
}>()
const { locale } = useI18n()
</script>

<template>
  <div :id="`service-${service.id}`" class="scroll-mt-24 rounded-lg border bg-white p-6 shadow-sm dark:bg-slate-900 border-slate-200 dark:border-slate-800">
    <div class="mb-6 flex items-start gap-4">
      <div v-if="service.iconPath" class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#2B71AE]/10 text-[#2B71AE]">
        <!-- Render icon if needed, or an image -->
        <img :src="service.iconPath" alt="" class="h-8 w-8" />
      </div>
      <div>
        <h2 class="font-heading text-2xl font-bold">{{ locale === 'ar' ? service.nameAr : service.nameEn }}</h2>
        <p v-if="service.descriptionEn || service.descriptionAr" class="mt-2 text-slate-500 whitespace-pre-wrap">
          {{ locale === 'ar' ? service.descriptionAr : service.descriptionEn }}
        </p>
      </div>
    </div>
    <div class="mt-8 border-t border-slate-100 pt-8 dark:border-slate-800">
      <h3 class="font-bold text-lg mb-4">{{ locale === 'ar' ? 'طلب الخدمة' : 'Request this Service' }}</h3>
      <ServiceForm :service="service" />
    </div>
  </div>
</template>
