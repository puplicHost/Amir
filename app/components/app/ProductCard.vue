<script setup lang="ts">
interface Card {
  id?: string
  slug: string
  nameAr: string
  nameEn: string
  price: string | number
  coverImage: string | null
  category: { slug: string, nameAr: string, nameEn: string }
}

const props = defineProps<{ product: Card }>()

const { locale, t } = useI18n()
const localePath = useLocalePath()

const name = (p: Card) => (locale.value === 'ar' ? p.nameAr : p.nameEn)
</script>

<template>
  <div
    class="group flex h-full flex-col justify-between overflow-hidden rounded-lg sm:rounded-xl border border-border bg-bg shadow-xs hover:-translate-y-1 hover:border-primary hover:shadow-lg transition-all duration-300"
  >
    <NuxtLink :to="localePath(`/p/${product.slug}`)" class="block flex-1 flex flex-col">
      <!-- Cover Image with Fixed 1:1 Aspect Ratio and Smooth Zoom -->
      <div class="relative aspect-square w-full shrink-0 overflow-hidden bg-surface">
        <img
          v-if="product.coverImage"
          :src="product.coverImage"
          :alt="name(product)"
          class="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          loading="lazy"
        />
        <div v-else class="flex h-full w-full items-center justify-center text-xs font-medium text-slate-400">
          {{ t('common.noImage') }}
        </div>

        <!-- Category Chip (Top Start) - hidden on mobile -->
        <span 
          v-if="product.category" 
          class="hidden sm:inline-block absolute start-2 top-2 rounded-full bg-navy/80 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-md"
        >
          {{ locale === 'ar' ? product.category.nameAr : product.category.nameEn }}
        </span>

      </div>

      <!-- Information & Pricing with Uniform Line Height & Baseline -->
      <div class="p-2 sm:p-3.5 flex flex-1 flex-col justify-between">
        <h3 class="font-heading text-xs sm:text-sm font-semibold sm:font-bold leading-snug text-text line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] group-hover:text-primary transition-colors mb-1.5 sm:mb-2">
          {{ name(product) }}
        </h3>

        <div class="mt-auto flex items-baseline gap-1 sm:gap-1.5 flex-wrap">
          <span class="text-sm sm:text-base font-bold sm:font-black text-primary">
            {{ product.price }} <span class="text-[10px] sm:text-xs font-semibold">€</span>
          </span>
        </div>
      </div>
    </NuxtLink>
  </div>
</template>
