<script setup lang="ts">
const { t, locale } = useI18n()
useHead(() => ({ title: `Services — ${t('brand.name')}` }))

const { data: services } = await useAsyncData('services-list', () =>
  $fetch<any[]>('/api/services')
)

function scrollToService(id: string) {
  const el = document.getElementById(`service-${id}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8 md:py-12">
    <div class="mb-12 text-center">
      <h1 class="font-heading text-4xl font-bold mb-4">{{ locale === 'ar' ? 'خدماتنا الهندسية' : 'Our Engineering Services' }}</h1>
      <p class="text-lg text-slate-500 max-w-2xl mx-auto">
        {{ locale === 'ar' 
          ? 'نقدم مجموعة متكاملة من الخدمات الهندسية وحلول التحكم الذكي بأعلى معايير الجودة.' 
          : 'We offer a comprehensive range of engineering services and smart control solutions with the highest quality standards.' }}
      </p>
    </div>

    <!-- Quick Nav -->
    <div v-if="services && services.length > 0" class="mb-12 flex flex-wrap justify-center gap-2">
      <button 
        v-for="service in services" 
        :key="'nav-'+service.id" 
        @click="scrollToService(service.id)"
        class="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
      >
        {{ locale === 'ar' ? service.nameAr : service.nameEn }}
      </button>
    </div>

    <div class="space-y-12">
      <ServiceSection 
        v-for="service in services" 
        :key="service.id" 
        :service="service" 
      />
    </div>

    <div v-if="!services?.length" class="text-center py-20 text-slate-500">
      {{ locale === 'ar' ? 'لا توجد خدمات متاحة حالياً.' : 'No services available at the moment.' }}
    </div>
  </div>
</template>
