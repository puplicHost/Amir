<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()

const { data: general } = await useAsyncData('home-general', () => $fetch<any>('/api/settings/general'))
const { data: contact } = await useAsyncData('home-contact', () => $fetch<any>('/api/settings/contact'))
const { data: services } = await useAsyncData('home-services', () => $fetch<any[]>('/api/services'))
const { data: categories } = await useAsyncData('home-categories', () => $fetch<any[]>('/api/categories/featured'))

useHead(() => {
  const siteName = general.value ? (locale.value === 'ar' ? general.value.siteNameAr : general.value.siteNameEn) : t('brand.name')
  const tagline = general.value ? (locale.value === 'ar' ? general.value.taglineAr : general.value.taglineEn) : ''
  return {
    title: `${siteName}${tagline ? ` — ${tagline}` : ''}`,
    script: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": siteName,
          "url": "https://mango-electronics.com", // update dynamically if domain is known
          "logo": general.value?.logoPath || "",
          "contactPoint": {
            "@type": "ContactPoint",
            "telephone": contact.value?.contactPhone1 || "",
            "contactType": "customer service"
          }
        })
      }
    ]
  }
})
</script>

<template>
  <div>
    <!-- Hero Section -->
    <section 
      class="relative flex min-h-[500px] flex-col items-center justify-center bg-slate-900 bg-cover bg-center px-4 py-20 text-center"
      :style="general?.heroImagePath ? `background-image: url('${general.heroImagePath}')` : ''"
    >
      <div class="absolute inset-0 bg-black/60"></div>
      <div class="relative z-10 max-w-3xl">
        <h1 class="font-heading text-4xl font-bold text-white md:text-6xl mb-6">
          {{ general ? (locale === 'ar' ? general.siteNameAr : general.siteNameEn) : t('brand.name') }}
        </h1>
        <p class="mb-8 text-lg text-slate-200 md:text-xl">
          {{ general ? (locale === 'ar' ? general.taglineAr : general.taglineEn) : '' }}
        </p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
          <NuxtLink :to="localePath('/products')" class="h-12 w-full sm:w-auto flex items-center justify-center rounded bg-[#F5CC07] px-8 font-bold text-slate-900 hover:bg-yellow-500 transition-colors">
            {{ locale === 'ar' ? 'تسوق الآن' : 'Shop Now' }}
          </NuxtLink>
          <NuxtLink :to="localePath('/services')" class="h-12 w-full sm:w-auto flex items-center justify-center rounded border-2 border-white px-8 font-bold text-white hover:bg-white/10 transition-colors">
            {{ locale === 'ar' ? 'خدماتنا' : 'Our Services' }}
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Services Section -->
    <section v-if="services?.length" class="py-20 px-4">
      <div class="mx-auto max-w-7xl">
        <div class="mb-12 text-center">
          <h2 class="font-heading text-3xl font-bold mb-4 text-slate-900 dark:text-white">{{ locale === 'ar' ? 'الخدمات الهندسية' : 'Engineering Services' }}</h2>
          <div class="h-1 w-20 bg-[#2B71AE] mx-auto rounded"></div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <NuxtLink 
            v-for="srv in services" :key="srv.id" 
            :to="`${localePath('/services')}#service-${srv.id}`"
            class="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-[#2B71AE]/30 transition-all dark:bg-slate-900 dark:border-slate-800"
          >
            <div class="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-[#2B71AE]/10 text-[#2B71AE] group-hover:bg-[#2B71AE] group-hover:text-white transition-colors">
              <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            </div>
            <h3 class="text-xl font-bold mb-2 group-hover:text-[#2B71AE] transition-colors">{{ locale === 'ar' ? srv.nameAr : srv.nameEn }}</h3>
            <p class="text-slate-500 text-sm line-clamp-3">{{ locale === 'ar' ? srv.descriptionAr : srv.descriptionEn }}</p>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Featured Categories Section -->
    <section v-if="categories?.length" class="py-20 px-4 bg-slate-50 dark:bg-slate-900/50">
      <div class="mx-auto max-w-7xl">
        <div class="mb-12 text-center">
          <h2 class="font-heading text-3xl font-bold mb-4 text-slate-900 dark:text-white">{{ locale === 'ar' ? 'تسوق حسب الفئة' : 'Shop by Category' }}</h2>
          <div class="h-1 w-20 bg-[#F5CC07] mx-auto rounded"></div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <NuxtLink 
            v-for="cat in categories" :key="cat.id" 
            :to="localePath(`/products/${cat.slug}`)"
            class="group relative h-64 overflow-hidden rounded-xl bg-slate-200"
          >
            <img v-if="cat.coverImagePath" :src="cat.coverImagePath" class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            <div class="absolute bottom-0 left-0 right-0 p-6 flex items-end justify-between">
              <div>
                <h3 class="text-2xl font-bold text-white mb-1">{{ locale === 'ar' ? cat.nameAr : cat.nameEn }}</h3>
                <span class="text-yellow-400 font-medium text-sm group-hover:underline">{{ locale === 'ar' ? 'تصفح المنتجات' : 'Browse Products' }} &rarr;</span>
              </div>
            </div>
          </NuxtLink>
        </div>
        <div class="mt-10 text-center">
          <NuxtLink :to="localePath('/products')" class="inline-flex items-center gap-2 font-bold text-[#2B71AE] hover:underline">
            {{ locale === 'ar' ? 'عرض جميع المنتجات' : 'View All Products' }}
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Banner Section -->
    <section v-if="general?.bannerTextEn || general?.bannerTextAr" class="py-16 px-4 bg-[#2B71AE] text-center text-white">
      <div class="mx-auto max-w-4xl">
        <h2 class="font-heading text-3xl md:text-4xl font-bold mb-8">{{ locale === 'ar' ? general.bannerTextAr : general.bannerTextEn }}</h2>
        <NuxtLink v-if="general.bannerButtonUrl" :to="localePath(general.bannerButtonUrl)" class="inline-flex h-14 items-center justify-center rounded bg-white px-10 font-bold text-[#2B71AE] hover:bg-slate-100 transition-colors shadow-lg">
          {{ locale === 'ar' ? general.bannerButtonTextAr : general.bannerButtonTextEn }}
        </NuxtLink>
      </div>
    </section>

  </div>
</template>
