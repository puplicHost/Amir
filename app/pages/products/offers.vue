<script setup lang="ts">
import { ShieldCheck, Sparkles, Tag, Truck } from 'lucide-vue-next'

const { t, locale } = useI18n()
const localePath = useLocalePath()

useHead(() => ({
  title: `${locale.value === 'ar' ? 'عروض وخصومات المتجر' : 'Store Offers & Deals'} | ${t('brand.name')}`,
}))
</script>

<template>
  <div class="space-y-0 selection:bg-accent selection:text-on-accent">
    <!-- Offers Hero with Vibrant Yellow Gradient Background -->
    <div class="relative overflow-hidden bg-gradient-to-r from-accent via-accent-hover to-accent text-on-accent py-10 sm:py-14 border-b border-primary/40 shadow-sm">
      <!-- Circuit Watermark & Texture -->
      <div
        class="pointer-events-none absolute inset-0 opacity-[0.08]"
        style="background-image: radial-gradient(rgb(var(--on-accent) / 0.25) 1px, transparent 1px); background-size: 20px 20px;"
      />
      
      <div class="relative z-10 mx-auto w-full max-w-[1536px] px-4 sm:px-6 lg:px-8 xl:px-10">
        <!-- Breadcrumb Navigation -->
        <nav class="mb-5 flex items-center gap-1.5 text-xs font-semibold text-on-accent/80" aria-label="Breadcrumb">
          <NuxtLink :to="localePath('/')" class="hover:text-on-accent transition-colors">{{ t('nav.home') }}</NuxtLink>
          <span class="text-on-accent/60" aria-hidden="true">/</span>
          <NuxtLink :to="localePath('/products')" class="hover:text-on-accent transition-colors">{{ t('products.title') }}</NuxtLink>
          <span class="text-on-accent/60" aria-hidden="true">/</span>
          <span class="text-on-accent font-black" aria-current="page">{{ locale === 'ar' ? 'عروض وخصومات' : 'Deals & Offers' }}</span>
        </nav>

        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div class="max-w-2xl">
            <!-- Badge -->
            <div class="inline-flex items-center gap-1.5 rounded-full bg-navy px-3.5 py-1 text-xs font-bold text-cream shadow-sm mb-3">
              <Tag class="h-3.5 w-3.5" />
              <span>{{ locale === 'ar' ? 'تخفيضات موسمية حصرية' : 'Exclusive Limited Offers' }}</span>
            </div>

            <!-- Heading (dark text) -->
            <h1 class="font-heading text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-on-accent mb-2 leading-tight">
              {{ locale === 'ar' ? 'عروض وخصومات المتجر' : 'Store Offers & Deals' }}
            </h1>

            <!-- Subheading -->
            <p class="text-sm sm:text-base font-medium text-on-accent/90 leading-relaxed max-w-xl">
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
