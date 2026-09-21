<script setup lang="ts">
const { t, locale } = useI18n()
const route = useRoute()
const slug = String(route.params.slug)

const { data, error } = await useAsyncData(`category-${slug}`, () =>
  $fetch<{ category: {
    nameAr: string, nameEn: string, slug: string,
    descriptionAr: string | null, descriptionEn: string | null,
    coverImagePath: string | null, coverVideoUrl: string | null,
  } }>(`/api/categories/${slug}`),
)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Category not found', fatal: true })
}

const name = computed(() => (locale.value === 'ar' ? data.value?.category.nameAr : data.value?.category.nameEn))
const desc = computed(() => (locale.value === 'ar' ? data.value?.category.descriptionAr : data.value?.category.descriptionEn))

useHead(() => ({
  title: `${name.value} — ${t('brand.name')}`,
  meta: desc.value ? [{ name: 'description', content: desc.value }] : [],
}))
</script>

<template>
  <div>
    <nav class="mx-auto max-w-7xl px-4 pt-4 text-sm text-slate-500" aria-label="Breadcrumb">
      <NuxtLink to="/" class="hover:underline">{{ t('nav.home') }}</NuxtLink>
      <span class="mx-1">/</span>
      <NuxtLink to="/products" class="hover:underline">{{ t('products.title') }}</NuxtLink>
      <span class="mx-1">/</span>
      <span>{{ name }}</span>
    </nav>
    <div class="relative mt-2 flex min-h-[300px] items-end overflow-hidden bg-[#162032] text-white">
      <img
        v-if="data?.category.coverImagePath"
        :src="data.category.coverImagePath"
        :alt="name"
        class="absolute inset-0 h-full w-full object-cover"
      />
      <div class="absolute inset-0" style="background: linear-gradient(to top, rgba(11,21,32,0.85), transparent)" />
      <div class="relative mx-auto w-full max-w-7xl px-4 py-10">
        <h1 class="font-heading text-3xl font-bold">{{ name }}</h1>
        <p v-if="desc" class="mt-1 max-w-2xl text-sm text-slate-200">{{ desc }}</p>
      </div>
    </div>
    <AppProductGrid :category-slug="slug" />
  </div>
</template>
