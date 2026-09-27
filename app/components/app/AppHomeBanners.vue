<script setup lang="ts">
import { ArrowRight, Sparkles } from 'lucide-vue-next'

const props = defineProps<{ placement: string }>()

const { locale } = useI18n()
const localePath = useLocalePath()

const { data } = await useAsyncData('home-banners', () =>
  $fetch<{ banners: any[] }>('/api/banners'),
)

const slotBanners = computed(() =>
  (data.value?.banners || []).filter(b => b.placement === props.placement),
)

function titleOf(b: any) {
  return locale.value === 'ar' ? (b.titleAr || b.titleEn) : (b.titleEn || b.titleAr)
}

function descOf(b: any) {
  return locale.value === 'ar' ? (b.descriptionAr || b.descriptionEn) : (b.descriptionEn || b.descriptionAr)
}

function btnOf(b: any) {
  return locale.value === 'ar' ? (b.buttonTextAr || b.buttonTextEn) : (b.buttonTextEn || b.buttonTextAr)
}

function isFullWidth(b: any) {
  return !b.widthPercent || Number(b.widthPercent) >= 100
}
</script>

<template>
  <template v-if="slotBanners.length">
    <div
      v-for="b in slotBanners"
      :key="b.id"
      class="w-full"
    >
      <!-- MODE 1: Full-Bleed Integrated Section (100% Width) -->
      <!-- Spans edge-to-edge with border-y and 7xl content grid, matching Category & Services sections -->
      <section
        v-if="isFullWidth(b)"
        class="reveal reveal-fade relative w-full overflow-hidden border-y border-slate-200/80 bg-[#0B1520] text-white dark:border-slate-800"
      >
        <!-- Background Image (if configured) -->
        <img
          v-if="b.backgroundImagePath"
          :src="b.backgroundImagePath"
          :alt="titleOf(b)"
          class="absolute inset-0 h-full w-full object-cover object-center"
          loading="lazy"
        />

        <!-- Fallback Ambient Brand Gradient (when no image) -->
        <div
          v-else
          class="absolute inset-0 bg-gradient-to-r from-[#0B1520] via-[#10243E] to-[#1E3A5F]"
        ></div>

        <!-- Technical Grid Pattern Overlay (consistent with Hero & Trust bar) -->
        <div
          class="pointer-events-none absolute inset-0 opacity-[0.06]"
          style="background-image: radial-gradient(#2B71AE 1px, transparent 1px); background-size: 24px 24px;"
        ></div>

        <!-- High-Contrast Scrim -->
        <div class="absolute inset-0 bg-gradient-to-t from-[#0B1520] via-[#0B1520]/75 to-[#0B1520]/85"></div>

        <!-- Section Content: Aligned with standard 7xl grid -->
        <div class="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24 text-center">
          <div class="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#F5CC07]/30 bg-[#F5CC07]/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#F5CC07] backdrop-blur-xs">
            <Sparkles class="h-3.5 w-3.5" />
            <span>{{ locale === 'ar' ? 'عرض خاص وتوريدات معتمدة' : 'Featured Industrial Offer' }}</span>
          </div>

          <h2 class="font-heading mx-auto mb-4 max-w-4xl text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            {{ titleOf(b) }}
          </h2>

          <p v-if="descOf(b)" class="mx-auto mb-8 max-w-2xl text-sm leading-relaxed text-slate-200 sm:text-base lg:text-lg">
            {{ descOf(b) }}
          </p>

          <NuxtLink
            v-if="btnOf(b) && b.buttonLinkValue"
            :to="localePath(b.buttonLinkValue)"
            class="inline-flex h-12 items-center gap-2 rounded-xl bg-[#F5CC07] px-8 text-sm font-bold text-slate-950 shadow-lg shadow-yellow-500/20 transition-all hover:bg-yellow-400 active:scale-[0.98] sm:text-base"
          >
            <span>{{ btnOf(b) }}</span>
            <ArrowRight class="h-4 w-4 rtl:rotate-180" />
          </NuxtLink>
        </div>
      </section>

      <!-- MODE 2: Contained Proportional Width (< 100%, e.g. 50%, 60%, 75%) -->
      <!-- Centered within the 7xl content flow with intentional rounded card styling -->
      <section
        v-else
        class="reveal reveal-fade w-full px-4 py-8 sm:px-6 sm:py-12 lg:px-8"
      >
        <div class="mx-auto max-w-7xl">
          <div
            class="relative mx-auto w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-[#0B1520] text-white shadow-xl transition-all sm:max-w-[var(--banner-width)] dark:border-slate-800"
            :style="{ '--banner-width': `${b.widthPercent}%` }"
          >
            <!-- Background Image -->
            <img
              v-if="b.backgroundImagePath"
              :src="b.backgroundImagePath"
              :alt="titleOf(b)"
              class="absolute inset-0 h-full w-full object-cover object-center"
              loading="lazy"
            />
            <div
              v-else
              class="absolute inset-0 bg-gradient-to-r from-[#0B1520] via-[#10243E] to-[#1E3A5F]"
            ></div>

            <!-- Technical Grid Pattern Overlay -->
            <div
              class="pointer-events-none absolute inset-0 opacity-[0.06]"
              style="background-image: radial-gradient(#2B71AE 1px, transparent 1px); background-size: 24px 24px;"
            ></div>

            <!-- High-Contrast Scrim -->
            <div class="absolute inset-0 bg-gradient-to-t from-[#0B1520] via-[#0B1520]/75 to-[#0B1520]/85"></div>

            <!-- Content -->
            <div class="relative z-10 px-6 py-10 text-center sm:px-10 sm:py-14">
              <div class="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#F5CC07]/30 bg-[#F5CC07]/10 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#F5CC07] backdrop-blur-xs">
                <Sparkles class="h-3 w-3" />
                <span>{{ locale === 'ar' ? 'عرض خاص' : 'Featured Offer' }}</span>
              </div>

              <h2 class="font-heading mx-auto mb-3 max-w-3xl text-xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
                {{ titleOf(b) }}
              </h2>

              <p v-if="descOf(b)" class="mx-auto mb-6 max-w-2xl text-xs leading-relaxed text-slate-200 sm:text-sm lg:text-base">
                {{ descOf(b) }}
              </p>

              <NuxtLink
                v-if="btnOf(b) && b.buttonLinkValue"
                :to="localePath(b.buttonLinkValue)"
                class="inline-flex h-11 items-center gap-2 rounded-xl bg-[#F5CC07] px-7 text-xs font-bold text-slate-950 shadow-md transition-all hover:bg-yellow-400 active:scale-[0.98] sm:text-sm"
              >
                <span>{{ btnOf(b) }}</span>
                <ArrowRight class="h-4 w-4 rtl:rotate-180" />
              </NuxtLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  </template>
</template>
