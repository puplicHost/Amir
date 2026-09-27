<script setup lang="ts">
import { Boxes, ShieldCheck, Truck } from 'lucide-vue-next'

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
      <div class="pointer-events-none absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-[#285E8E]/25 blur-[130px]"></div>
      <div
        class="pointer-events-none absolute inset-0 opacity-[0.06]"
        style="background-image: radial-gradient(#2B71AE 1px, transparent 1px); background-size: 24px 24px;"
      ></div>

      <div class="relative z-10 mx-auto w-full max-w-[1536px] px-4 sm:px-6 lg:px-8 xl:px-10 py-10 sm:py-12">
        <!-- Breadcrumb -->
        <nav class="mb-5 flex items-center gap-1.5 text-xs font-medium text-slate-400" aria-label="Breadcrumb">
          <NuxtLink :to="localePath('/')" class="hover:text-white transition-colors">{{ t('nav.home') }}</NuxtLink>
          <span class="text-slate-600" aria-hidden="true">/</span>
          <span class="text-[#F5CC07] font-semibold" aria-current="page">{{ t('products.title') }}</span>
        </nav>

        <div class="max-w-3xl">
          <div class="inline-flex items-center gap-1.5 rounded-full border border-[#F5CC07]/30 bg-[#F5CC07]/10 px-4 py-1.5 text-xs sm:text-sm font-semibold text-[#F5CC07] shadow-sm backdrop-blur-md mb-4">
            <Boxes class="h-3.5 w-3.5" aria-hidden="true" />
            <span>{{ locale === 'ar' ? 'الكتالوج المعتمد' : 'Certified Catalog' }}</span>
          </div>
          <h1 class="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-3 leading-tight">
            {{ t('products.title') }}
          </h1>
          <p class="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
            {{ t('products.subtitle') }}
          </p>

          <!-- Trust Indicators Row -->
          <div class="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div class="flex items-center gap-2.5">
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#F5CC07]/25 bg-[#F5CC07]/10 text-[#F5CC07]">
                <ShieldCheck class="h-4 w-4" aria-hidden="true" />
              </span>
              <span class="text-xs sm:text-sm font-semibold text-slate-200">{{ locale === 'ar' ? 'قطع أصلية 100%' : '100% Genuine' }}</span>
            </div>
            <div class="flex items-center gap-2.5">
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#F5CC07]/25 bg-[#F5CC07]/10 text-[#F5CC07]">
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
