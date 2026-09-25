<script setup lang="ts">
import { Boxes, CheckCircle2, ShieldCheck, Zap } from 'lucide-vue-next'

const { t, locale } = useI18n()
const localePath = useLocalePath()

useHead(() => ({ title: `${t('products.title')} | ${t('brand.name')}` }))
</script>

<template>
  <div class="space-y-0">
    <!-- Header Banner with Breadcrumb & Technical Styling -->
    <div class="relative overflow-hidden bg-[#0B1520] text-white border-b border-slate-800">
      <!-- Ambient Lighting -->
      <div class="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#2B71AE]/20 blur-3xl"></div>
      <div 
        class="pointer-events-none absolute inset-0 opacity-[0.06]" 
        style="background-image: radial-gradient(#2B71AE 1px, transparent 1px); background-size: 24px 24px;"
      ></div>

      <div class="relative z-10 mx-auto w-full max-w-[1536px] px-4 sm:px-6 lg:px-8 xl:px-10 py-10 sm:py-12">
        <!-- Breadcrumb -->
        <nav class="mb-4 flex items-center gap-1.5 text-xs font-medium text-slate-400" aria-label="Breadcrumb">
          <NuxtLink :to="localePath('/')" class="hover:text-white transition-colors">{{ t('nav.home') }}</NuxtLink>
          <span class="text-slate-600">/</span>
          <span class="text-[#F5CC07] font-semibold">{{ t('products.title') }}</span>
        </nav>

        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div class="inline-flex items-center gap-1.5 rounded-full bg-[#2B71AE]/20 border border-[#2B71AE]/40 px-3 py-1 text-[11px] font-bold text-blue-300 uppercase tracking-wider mb-3">
              <Boxes class="h-3.5 w-3.5 text-[#F5CC07]" />
              <span>{{ locale === 'ar' ? 'الكتالوج المعتمد' : 'Certified Catalog' }}</span>
            </div>
            <h1 class="font-heading text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
              {{ t('products.title') }}
            </h1>
            <p class="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
              {{ t('products.subtitle') }}
            </p>
          </div>

          <!-- Trust Badges Strip -->
          <div class="flex flex-wrap items-center gap-4 text-xs text-slate-300 border-t border-slate-800/80 pt-4 md:border-t-0 md:pt-0">
            <div class="flex items-center gap-1.5">
              <ShieldCheck class="h-4 w-4 text-[#F5CC07]" />
              <span>{{ locale === 'ar' ? 'قطع أصلية 100%' : '100% Genuine' }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <CheckCircle2 class="h-4 w-4 text-[#F5CC07]" />
              <span>{{ locale === 'ar' ? 'شحن لجميع المحافظات' : 'Nationwide Delivery' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Product Grid Component -->
    <AppProductGrid />
  </div>
</template>
