<script setup lang="ts">
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Wrench } from 'lucide-vue-next'

const { t, locale } = useI18n()
const localePath = useLocalePath()

useHead(() => ({ 
  title: `${locale === 'ar' ? 'الخدمات الهندسية' : 'Engineering Services'} | ${t('brand.name')}` 
}))

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
  <div class="space-y-0">
    
    <!-- Hero Header Banner with Technical Styling -->
    <div class="relative overflow-hidden bg-[#0B1520] text-white border-b border-slate-800">
      <!-- Ambient Lighting -->
      <div class="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#2B71AE]/20 blur-3xl"></div>
      <div 
        class="pointer-events-none absolute inset-0 opacity-[0.06]" 
        style="background-image: radial-gradient(#2B71AE 1px, transparent 1px); background-size: 24px 24px;"
      ></div>

      <div class="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <!-- Breadcrumb Navigation -->
        <nav class="mb-4 flex items-center gap-1.5 text-xs font-medium text-slate-400" aria-label="Breadcrumb">
          <NuxtLink :to="localePath('/')" class="hover:text-white transition-colors">{{ t('nav.home') }}</NuxtLink>
          <span class="text-slate-600">/</span>
          <span class="text-[#F5CC07] font-semibold">{{ locale === 'ar' ? 'الخدمات الهندسية' : 'Engineering Services' }}</span>
        </nav>

        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div class="max-w-3xl">
            <div class="inline-flex items-center gap-1.5 rounded-full bg-[#2B71AE]/20 border border-[#2B71AE]/40 px-3 py-1 text-[11px] font-bold text-blue-300 uppercase tracking-wider mb-3">
              <Wrench class="h-3.5 w-3.5 text-[#F5CC07]" />
              <span>{{ locale === 'ar' ? 'حلول صناعية متكاملة' : 'Industrial Solutions' }}</span>
            </div>

            <h1 class="font-heading text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-3">
              {{ locale === 'ar' ? 'خدماتنا الهندسية والصناعية' : 'Engineering Services & Systems' }}
            </h1>

            <p class="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
              {{ locale === 'ar' 
                ? 'نقدم مجموعة متكاملة من الحلول الهندسية، وبرمجة PLC، وصيانة المعدات، وأنظمة الأتمتة للمصانع والمنشآت بأيدي مهندسين معتمدين.' 
                : 'Comprehensive automation, certified PLC programming, industrial machinery overhaul, and smart IoT control systems tailored for Egyptian facilities.' }}
            </p>
          </div>

          <!-- Trust Badges Strip -->
          <div class="flex flex-wrap items-center gap-4 text-xs text-slate-300 border-t border-slate-800/80 pt-4 md:border-t-0 md:pt-0">
            <div class="flex items-center gap-1.5">
              <ShieldCheck class="h-4 w-4 text-[#F5CC07]" />
              <span>{{ locale === 'ar' ? 'فريق هندسي معتمد' : 'Certified Engineers' }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <CheckCircle2 class="h-4 w-4 text-[#F5CC07]" />
              <span>{{ locale === 'ar' ? 'معاينة وتشخيص ميداني' : 'On-site Inspection' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Container -->
    <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      
      <!-- Quick Anchor Pills -->
      <div v-if="services && services.length > 0" class="mb-12">
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 text-center">
          {{ locale === 'ar' ? 'الانتقال السريع للخدمة' : 'Jump to Service' }}
        </h2>
        <div class="flex flex-wrap justify-center gap-2">
          <button 
            v-for="service in services" 
            :key="'nav-'+service.id" 
            @click="scrollToService(service.id)"
            class="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:border-[#2B71AE] hover:text-[#2B71AE] dark:border-slate-800 dark:bg-[#162032] dark:text-slate-200 dark:hover:border-[#F5CC07] dark:hover:text-[#F5CC07] transition-all"
          >
            {{ locale === 'ar' ? service.nameAr : service.nameEn }}
          </button>
        </div>
      </div>

      <!-- Services List with Forms -->
      <div class="space-y-10 sm:space-y-14">
        <ServiceSection 
          v-for="service in services" 
          :key="service.id" 
          :service="service" 
        />
      </div>

      <div v-if="!services?.length" class="text-center py-20 text-slate-500 dark:text-slate-400">
        {{ locale === 'ar' ? 'لا توجد خدمات متاحة حالياً.' : 'No services available at the moment.' }}
      </div>
    </div>

  </div>
</template>
