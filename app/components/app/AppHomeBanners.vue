<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'

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
</script>

<template>
  <template v-if="slotBanners.length">
    <section
      v-for="b in slotBanners"
      :key="b.id"
      class="px-4 py-10 sm:py-14"
    >
      <div class="mx-auto" :style="{ maxWidth: `min(80rem, ${b.widthPercent || 100}%)` }">
        <div class="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-r from-[#0B1520] via-[#1E3A5F] to-[#285E8E] text-white shadow-lg dark:border-slate-800">
          <img
            v-if="b.backgroundImagePath"
            :src="b.backgroundImagePath"
            :alt="titleOf(b)"
            class="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-[#0B1520]/85 via-[#0B1520]/45 to-transparent"></div>
          <div class="relative z-10 p-8 sm:p-12 text-center">
            <h2 class="font-heading text-2xl sm:text-4xl font-extrabold leading-tight mb-3">
              {{ titleOf(b) }}
            </h2>
            <p v-if="descOf(b)" class="text-sm sm:text-base text-slate-200 max-w-2xl mx-auto mb-6 leading-relaxed">
              {{ descOf(b) }}
            </p>
            <NuxtLink
              v-if="btnOf(b) && b.buttonLinkValue"
              :to="localePath(b.buttonLinkValue)"
              class="inline-flex h-11 items-center gap-2 rounded-xl bg-[#F5CC07] px-7 text-sm font-bold text-slate-950 shadow-lg hover:bg-yellow-400 active:scale-[0.98] transition-all"
            >
              <span>{{ btnOf(b) }}</span>
              <ArrowRight class="h-4 w-4 rtl:rotate-180" />
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>
  </template>
</template>
