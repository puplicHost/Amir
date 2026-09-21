<script setup lang="ts">
const { t, locale } = useI18n()

useHead(() => ({
  title: `${t('brand.name')} — ${t('brand.tagline')}`,
}))

const { data: catData } = await useAsyncData('home-featured-categories', () =>
  $fetch<{ categories: { slug: string, nameAr: string, nameEn: string, coverImagePath: string | null }[] }>('/api/categories/featured'),
)
</script>

<template>
  <div>
    <section class="bg-[#2B71AE] text-white">
      <div class="mx-auto max-w-7xl px-4 py-16 md:py-24">
        <h1 class="font-heading text-4xl font-extrabold">{{ t('home.title') }}</h1>
        <p class="mt-3 max-w-xl text-lg text-white/90">{{ t('brand.tagline') }}</p>
        <div class="mt-6 flex flex-wrap gap-3">
          <NuxtLink to="/products" class="rounded bg-[#F5CC07] px-4 py-2 font-semibold text-slate-900">{{ t('nav.products') }}</NuxtLink>
          <NuxtLink to="/services" class="rounded border border-white/50 px-4 py-2 font-semibold">{{ t('nav.services') }}</NuxtLink>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-4 py-12">
      <h2 class="font-heading text-2xl font-bold">Featured Categories</h2>
      <p class="mt-2 text-sm text-slate-500">Explore our most popular product categories.</p>
      
      <div v-if="catData?.categories?.length" class="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <NuxtLink
          v-for="c in catData.categories"
          :key="c.slug"
          :to="`/products/${c.slug}`"
          class="group relative flex h-48 items-end overflow-hidden rounded-md border bg-slate-100 dark:bg-slate-800"
          :style="{ borderColor: 'var(--color-border)' }"
        >
          <img
            v-if="c.coverImagePath"
            :src="c.coverImagePath"
            :alt="locale === 'ar' ? c.nameAr : c.nameEn"
            class="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <h3 class="relative p-4 font-heading text-xl font-bold text-white shadow-black drop-shadow-md">
            {{ locale === 'ar' ? c.nameAr : c.nameEn }}
          </h3>
        </NuxtLink>
      </div>
      
      <div v-else class="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div v-for="i in 4" :key="i" class="rounded-md border p-6" :style="{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }">
          <div class="h-24 rounded bg-slate-200 dark:bg-slate-700" />
          <div class="mt-3 h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
    </section>
  </div>
</template>
