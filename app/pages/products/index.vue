<script setup lang="ts">
import { Boxes, ShieldCheck, Truck } from 'lucide-vue-next'

const { t, locale } = useI18n()
const localePath = useLocalePath()

useHead(() => ({ title: `${t('products.title')} | ${t('brand.name')}` }))

const { data: heroGeneral } = await useAsyncData('hero-general', () => $fetch<any>('/api/settings/general'))
</script>

<template>
  <div class="space-y-0">
    <!-- Header Banner with Breadcrumb & Technical Styling -->
    <div
      class="relative overflow-hidden bg-navy bg-cover bg-center text-white"
      :style="heroGeneral?.heroImagePath ? `background-image: url('${heroGeneral.heroImagePath}')` : ''"
    >
      <div class="absolute inset-0" style="background: linear-gradient(to bottom, rgba(13,27,46,0.85), rgba(13,27,46,0.95))"></div>

      <svg class="absolute bottom-0 left-0 h-[72px] w-full sm:h-[110px]" viewBox="0 0 1440 110" preserveAspectRatio="none" aria-hidden="true" style="filter: drop-shadow(0 -10px 24px rgba(13,27,46,0.35))">
        <path class="fill-bg" d="M0,110 L0,60 C360,5 1080,5 1440,60 L1440,110 Z" />
      </svg>

      <div class="relative z-10 mx-auto w-full max-w-[1536px] px-4 sm:px-6 lg:px-8 xl:px-10 pt-10 sm:pt-12 pb-24 sm:pb-28">
        <!-- Breadcrumb -->
        <nav class="mb-5 flex items-center gap-1.5 text-xs font-medium text-white/60" aria-label="Breadcrumb">
          <NuxtLink :to="localePath('/')" class="hover:text-white transition-colors">{{ t('nav.home') }}</NuxtLink>
          <span class="text-white/40" aria-hidden="true">/</span>
          <span class="text-white font-semibold" aria-current="page">{{ t('products.title') }}</span>
        </nav>

        <div class="max-w-3xl">
          <div class="inline-flex items-center gap-1.5 rounded-full border border-cream/30 bg-cream/10 px-4 py-1.5 text-xs sm:text-sm font-semibold text-cream shadow-sm backdrop-blur-md mb-4">
            <Boxes class="h-3.5 w-3.5" aria-hidden="true" />
            <span>{{ locale === 'ar' ? 'الكتالوج المعتمد' : 'Certified Catalog' }}</span>
          </div>
          <h1 class="font-heading text-4xl font-extrabold tracking-tight text-white mb-3 leading-tight">
            {{ t('products.title') }}
          </h1>
          <p class="text-sm sm:text-base text-white/80 max-w-2xl leading-relaxed">
            {{ t('products.subtitle') }}
          </p>

          <!-- Trust Indicators Row -->
          <div class="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div class="flex items-center gap-2.5">
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cream/25 bg-cream/10 text-cream">
                <ShieldCheck class="h-4 w-4" aria-hidden="true" />
              </span>
              <span class="text-xs sm:text-sm font-semibold text-slate-200">{{ locale === 'ar' ? 'قطع أصلية 100%' : '100% Genuine' }}</span>
            </div>
            <div class="flex items-center gap-2.5">
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cream/25 bg-cream/10 text-cream">
                <Truck class="h-4 w-4" aria-hidden="true" />
              </span>
              <span class="text-xs sm:text-sm font-semibold text-slate-200">{{ locale === 'ar' ? 'شحن لجميع المحافظات' : 'Nationwide Delivery' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Product Grid Component -->
    <AppProductGrid />
  </div>
</template>
