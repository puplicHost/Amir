<script setup lang="ts">
import { ShieldCheck, Sparkles, Tag, Truck } from 'lucide-vue-next'

const { t, locale } = useI18n()
const localePath = useLocalePath()

const { data: heroGeneral } = await useAsyncData('hero-general', () => $fetch<any>('/api/settings/general'))

useHead(() => ({
  title: `${locale.value === 'ar' ? 'عروض وخصومات المتجر' : 'Store Offers & Deals'} | ${t('brand.name')}`,
}))
</script>

<template>
  <div class="space-y-0 selection:bg-accent selection:text-on-accent">
    <!-- Offers Hero (matches homepage hero style) -->
    <div
      class="relative overflow-hidden bg-navy bg-cover bg-center text-white"
      :style="heroGeneral?.heroImagePath ? `background-image: url('${heroGeneral.heroImagePath}')` : ''"
    >
      <div class="absolute inset-0" style="background: linear-gradient(to bottom, rgba(13,27,46,0.85), rgba(13,27,46,0.95))"></div>

      <svg class="absolute bottom-0 left-0 h-[72px] w-full sm:h-[110px]" viewBox="0 0 1440 110" preserveAspectRatio="none" aria-hidden="true" style="filter: drop-shadow(0 -10px 24px rgba(13,27,46,0.35))">
        <path class="fill-bg" d="M0,110 L0,60 C360,5 1080,5 1440,60 L1440,110 Z" />
      </svg>

      <div class="relative z-10 mx-auto w-full max-w-[1536px] px-4 sm:px-6 lg:px-8 xl:px-10 pt-10 sm:pt-14 pb-24 sm:pb-28">
        <!-- Breadcrumb Navigation -->
        <nav class="mb-5 flex items-center gap-1.5 text-xs font-semibold text-white/60" aria-label="Breadcrumb">
          <NuxtLink :to="localePath('/')" class="hover:text-white transition-colors">{{ t('nav.home') }}</NuxtLink>
          <span class="text-white/40" aria-hidden="true">/</span>
          <NuxtLink :to="localePath('/products')" class="hover:text-white transition-colors">{{ t('products.title') }}</NuxtLink>
          <span class="text-white/40" aria-hidden="true">/</span>
          <span class="text-white font-black" aria-current="page">{{ locale === 'ar' ? 'عروض وخصومات' : 'Deals & Offers' }}</span>
        </nav>

        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div class="max-w-2xl">
            <!-- Badge -->
            <div class="inline-flex items-center gap-1.5 rounded-full bg-navy px-3.5 py-1 text-xs font-bold text-cream shadow-sm mb-3">
              <Tag class="h-3.5 w-3.5" />
              <span>{{ locale === 'ar' ? 'تخفيضات موسمية حصرية' : 'Exclusive Limited Offers' }}</span>
            </div>

            <!-- Heading -->
            <h1 class="font-heading text-4xl font-black tracking-tight text-white mb-2 leading-tight">
              {{ locale === 'ar' ? 'عروض وخصومات المتجر' : 'Store Offers & Deals' }}
            </h1>

            <!-- Subheading -->
            <p class="text-sm sm:text-base font-medium text-white/80 leading-relaxed max-w-xl">
              {{ locale === 'ar' 
                ? 'أفضل الأسعار على المنتجات المختارة — عروض محدودة وتوريد مباشر للمهندسين والمصانع.' 
                : 'Best prices on selected genuine components — limited-time offers with instant dispatch.' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Product Grid scoped to Discounted Products -->
    <AppProductGrid :offers-only="true" />
  </div>
</template>
