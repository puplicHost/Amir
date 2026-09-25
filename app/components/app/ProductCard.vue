<script setup lang="ts">
interface Card {
  slug: string
  nameAr: string
  nameEn: string
  price: string | number
  compareAtPrice: string | number | null
  coverImage: string | null
  category: { slug: string, nameAr: string, nameEn: string }
}

defineProps<{ product: Card }>()

const { locale, t } = useI18n()
const localePath = useLocalePath()
const name = (p: Card) => (locale.value === 'ar' ? p.nameAr : p.nameEn)
</script>

<template>
  <NuxtLink
    :to="localePath(`/p/${product.slug}`)"
    class="group flex flex-col overflow-hidden rounded-md border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-[#162032]"
    :style="{ borderColor: 'var(--color-border)' }"
  >
    <div class="aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
      <img
        v-if="product.coverImage"
        :src="product.coverImage"
        :alt="name(product)"
        class="h-full w-full object-cover"
        loading="lazy"
      />
      <div v-else class="flex h-full items-center justify-center text-sm text-slate-400">{{ t('common.noImage') }}</div>
    </div>
    <div class="flex flex-1 flex-col gap-1 p-4">
      <span class="w-fit rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        {{ locale === 'ar' ? product.category.nameAr : product.category.nameEn }}
      </span>
      <h3 class="text-base font-semibold leading-snug">{{ name(product) }}</h3>
      <p class="mt-auto pt-1">
        <span class="font-bold text-[#2B71AE]">{{ product.price }} EGP</span>
        <span v-if="product.compareAtPrice" class="ml-2 text-sm text-slate-400 line-through">{{ product.compareAtPrice }} EGP</span>
      </p>
    </div>
  </NuxtLink>
</template>
