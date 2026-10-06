<script setup lang="ts">
import { Boxes, ChevronLeft, ChevronRight } from 'lucide-vue-next'

const { t, locale } = useI18n()
const localePath = useLocalePath()
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
  title: `${name.value} | ${t('brand.name')}`,
  meta: desc.value ? [{ name: 'description', content: desc.value }] : [],
}))
</script>

<template>
  <div class="space-y-0">
    <!-- Category Hero Banner with Cover Media & Dark Scrim -->
    <div class="relative overflow-hidden bg-navy text-white border-b border-white/10">
      <!-- Background Cover Image (if available) -->
      <img
        v-if="data?.category.coverImagePath"
        :src="data.category.coverImagePath"
        :alt="name"
        class="absolute inset-0 h-full w-full object-cover opacity-25 filter blur-xs scale-102"
      />
      <!-- Gradient Overlays for High Contrast -->
      <div class="absolute inset-0 bg-gradient-to-t from-navy via-navy/85 to-navy/70"></div>
      <div
        class="pointer-events-none absolute inset-0 opacity-[0.06]"
        style="background-image: radial-gradient(rgb(var(--palette-silver) / 0.6) 1px, transparent 1px); background-size: 24px 24px;"
      ></div>
      <!-- Ambient Lighting -->
      <div class="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl"></div>
      <div class="pointer-events-none absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-primary/25 blur-[130px]"></div>

      <div class="relative z-10 mx-auto w-full max-w-[1536px] px-4 sm:px-6 lg:px-8 xl:px-10 py-10 sm:py-12">
        <!-- Breadcrumb Navigation -->
        <nav class="mb-5 flex items-center gap-1.5 text-xs font-medium text-slate-400" aria-label="Breadcrumb">
          <NuxtLink :to="localePath('/')" class="hover:text-white transition-colors">{{ t('nav.home') }}</NuxtLink>
          <span class="text-muted" aria-hidden="true">/</span>
          <NuxtLink :to="localePath('/products')" class="hover:text-white transition-colors">{{ t('products.title') }}</NuxtLink>
          <span class="text-muted" aria-hidden="true">/</span>
          <span class="text-cream font-semibold" aria-current="page">{{ name }}</span>
        </nav>

        <div class="max-w-3xl">
          <div class="inline-flex items-center gap-1.5 rounded-full border border-cream/30 bg-cream/10 px-4 py-1.5 text-xs sm:text-sm font-semibold text-cream shadow-sm backdrop-blur-md mb-4">
            <Boxes class="h-3.5 w-3.5" aria-hidden="true" />
            <span>{{ locale === 'ar' ? 'فئة معتمدة' : 'Verified Category' }}</span>
          </div>

          <h1 class="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-3 leading-tight">
            {{ name }}
          </h1>

          <p v-if="desc" class="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            {{ desc }}
          </p>
        </div>
      </div>
    </div>

    <!-- Product Grid for Category -->
    <AppProductGrid :category-slug="slug" />
  </div>
</template>
