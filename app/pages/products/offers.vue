<script setup lang="ts">
import { Clock, ShieldCheck, Sparkles, Tag, Truck } from 'lucide-vue-next'

const { t, locale } = useI18n()
const localePath = useLocalePath()

const { data: general } = await useAsyncData('offers-general-settings', () =>
  $fetch<any>('/api/settings/general'),
)

useHead(() => ({
  title: `${locale.value === 'ar' ? 'عروض وخصومات المتجر' : 'Store Offers & Deals'} | ${t('brand.name')}`,
}))

// Countdown timer logic
const timeLeft = ref({ days: 2, hours: 14, minutes: 35, seconds: 22 })
let timerInterval: ReturnType<typeof setInterval> | null = null

function updateCountdown() {
  if (general.value?.offerEndDate) {
    const end = new Date(general.value.offerEndDate).getTime()
    const now = Date.now()
    const diff = Math.max(0, end - now)
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    timeLeft.value = { days, hours, minutes, seconds }
  }
  else {
    // Dynamic cyclic fallback countdown
    const s = timeLeft.value.seconds - 1
    if (s >= 0) {
      timeLeft.value.seconds = s
    }
    else {
      timeLeft.value.seconds = 59
      timeLeft.value.minutes = Math.max(0, timeLeft.value.minutes - 1)
    }
  }
}

onMounted(() => {
  updateCountdown()
  timerInterval = setInterval(updateCountdown, 1000)
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})

const pad = (n: number) => String(n).padStart(2, '0')
</script>

<template>
  <div class="space-y-0 selection:bg-slate-900 selection:text-[#F5CC07]">
    <!-- Offers Hero with Vibrant Yellow Gradient Background -->
    <div class="relative overflow-hidden bg-gradient-to-r from-[#F5CC07] via-[#f5cc07] to-[#f0b800] text-slate-950 py-10 sm:py-14 border-b border-yellow-500/40 shadow-sm">
      <!-- Circuit Watermark & Texture -->
      <div
        class="pointer-events-none absolute inset-0 opacity-[0.08]"
        style="background-image: radial-gradient(#000 1px, transparent 1px); background-size: 20px 20px;"
      />
      
      <div class="relative z-10 mx-auto w-full max-w-[1536px] px-4 sm:px-6 lg:px-8 xl:px-10">
        <!-- Breadcrumb Navigation -->
        <nav class="mb-5 flex items-center gap-1.5 text-xs font-semibold text-slate-800/80" aria-label="Breadcrumb">
          <NuxtLink :to="localePath('/')" class="hover:text-black transition-colors">{{ t('nav.home') }}</NuxtLink>
          <span class="text-slate-600" aria-hidden="true">/</span>
          <NuxtLink :to="localePath('/products')" class="hover:text-black transition-colors">{{ t('products.title') }}</NuxtLink>
          <span class="text-slate-600" aria-hidden="true">/</span>
          <span class="text-slate-950 font-black" aria-current="page">{{ locale === 'ar' ? 'عروض وخصومات' : 'Deals & Offers' }}</span>
        </nav>

        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div class="max-w-2xl">
            <!-- Badge -->
            <div class="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-3.5 py-1 text-xs font-bold text-[#F5CC07] shadow-sm mb-3">
              <Tag class="h-3.5 w-3.5" />
              <span>{{ locale === 'ar' ? 'تخفيضات موسمية حصرية' : 'Exclusive Limited Offers' }}</span>
            </div>

            <!-- Heading (dark text) -->
            <h1 class="font-heading text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-950 mb-2 leading-tight">
              {{ locale === 'ar' ? 'عروض وخصومات المتجر' : 'Store Offers & Deals' }}
            </h1>

            <!-- Subheading -->
            <p class="text-sm sm:text-base font-medium text-slate-800 leading-relaxed max-w-xl">
              {{ locale === 'ar' 
                ? 'أفضل الأسعار على المنتجات المختارة — عروض محدودة وتوريد مباشر للمهندسين والمصانع.' 
                : 'Best prices on selected genuine components — limited-time offers with instant dispatch.' }}
            </p>
          </div>

          <!-- Countdown Timer Badge -->
          <div class="shrink-0 rounded-2xl bg-slate-950 p-4 sm:p-5 text-white shadow-xl max-w-md">
            <div class="flex items-center gap-2 mb-2 text-[#F5CC07] text-xs font-bold uppercase tracking-wider">
              <Clock class="h-4 w-4 animate-spin" style="animation-duration: 6s;" />
              <span>{{ locale === 'ar' ? 'ينتهي العرض خلال:' : 'Offer Ends In:' }}</span>
            </div>

            <div class="flex items-center gap-2 font-mono" dir="ltr">
              <div class="flex flex-col items-center">
                <span class="text-xl sm:text-2xl font-black bg-white/10 rounded-lg px-2.5 py-1 text-white">{{ pad(timeLeft.days) }}</span>
                <span class="text-[9px] text-slate-400 mt-1 uppercase">{{ locale === 'ar' ? 'يوم' : 'Days' }}</span>
              </div>
              <span class="text-xl font-bold text-[#F5CC07] -mt-4">:</span>
              <div class="flex flex-col items-center">
                <span class="text-xl sm:text-2xl font-black bg-white/10 rounded-lg px-2.5 py-1 text-white">{{ pad(timeLeft.hours) }}</span>
                <span class="text-[9px] text-slate-400 mt-1 uppercase">{{ locale === 'ar' ? 'ساعة' : 'Hours' }}</span>
              </div>
              <span class="text-xl font-bold text-[#F5CC07] -mt-4">:</span>
              <div class="flex flex-col items-center">
                <span class="text-xl sm:text-2xl font-black bg-white/10 rounded-lg px-2.5 py-1 text-white">{{ pad(timeLeft.minutes) }}</span>
                <span class="text-[9px] text-slate-400 mt-1 uppercase">{{ locale === 'ar' ? 'دقيقة' : 'Mins' }}</span>
              </div>
              <span class="text-xl font-bold text-[#F5CC07] -mt-4">:</span>
              <div class="flex flex-col items-center">
                <span class="text-xl sm:text-2xl font-black bg-[#F5CC07] rounded-lg px-2.5 py-1 text-slate-950 font-black">{{ pad(timeLeft.seconds) }}</span>
                <span class="text-[9px] text-slate-400 mt-1 uppercase">{{ locale === 'ar' ? 'ثانية' : 'Secs' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Product Grid scoped to Discounted Products -->
    <AppProductGrid :offers-only="true" />
  </div>
</template>
