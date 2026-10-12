<script setup lang="ts">
import {
  ArrowRight,
} from 'lucide-vue-next'
import { SERVICE_SECTIONS } from '~~/shared/booking'

const { t, locale } = useI18n()
const localePath = useLocalePath()

const { data: general } = await useAsyncData('home-general', () => $fetch<any>('/api/settings/general'))
const { data: contact } = await useAsyncData('home-contact', () => $fetch<any>('/api/settings/contact'))
const { data: services, pending: servicesPending } = await useAsyncData('home-services', () => $fetch<any[]>('/api/services'))
const { data: categoryData } = await useAsyncData('home-categories', () => $fetch<{ categories: any[] } | any[]>('/api/categories/featured'))
const { data: productData } = await useAsyncData('home-featured-products', () => $fetch<{ products: any[] }>('/api/products?limit=4'))

const categories = computed(() => {
  if (!categoryData.value) return []
  if (Array.isArray(categoryData.value)) return categoryData.value
  return categoryData.value.categories || []
})

const featuredProducts = computed(() => {
  return productData.value?.products || []
})

const sectionCards = computed(() => {
  // Home shows one card per service section (Damen/Herren/Kinder/Kosmetik)
  // with the minimum "ab" price and the service count. Sections without
  // active services are hidden. No hardcoded fallback anywhere.
  return SERVICE_SECTIONS.map((section) => {
    const items = (services.value || []).filter((srv: any) => srv.section === section)
    if (!items.length) return null
    return {
      section,
      title: section.charAt(0) + section.slice(1).toLowerCase(),
      priceCents: Math.min(...items.map((srv: any) => Number(srv.priceAbCents || 0))),
      count: items.length,
    }
  }).filter((c): c is NonNullable<typeof c> => c !== null)
})

const siteSeo = await useSiteSeo()

useHead(() => {
  const siteName = general.value ? (locale.value === 'ar' ? general.value.siteNameAr : general.value.siteNameEn) : t('brand.name')
  const tagline = (locale.value === 'ar' ? general.value?.taglineAr : general.value?.taglineEn) || t('brand.tagline')
  const geoDescription = (siteSeo.value?.geoDescription || '').trim()
  return {
    title: `${siteName}${tagline ? ` - ${tagline}` : ''}`,
    script: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": siteName,
          "url": "https://amir.com",
          "logo": general.value?.logoPath || "",
          ...(geoDescription ? { description: geoDescription } : {}),
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

// Transparent navbar overlays the hero: pull the hero up under the header
// stack (announcement + navbar + ticker, all measured live so dismissing the
// ticker, font zoom, or locale changes stay correct) and compensate with
// inner top padding so content never hides. Vertical-only math: RTL/LTR safe.
const heroSection = ref<HTMLElement | null>(null)
const heroContent = ref<HTMLElement | null>(null)

function layoutHero() {
  if (!heroSection.value || !heroContent.value) return
  const q = (sel: string) => document.querySelector(sel) as HTMLElement | null
  const h = (el: HTMLElement | null) => {
    if (!el || getComputedStyle(el).display === 'none') return 0
    return el.offsetHeight || 0
  }
  const offset = h(q('[data-site-announce]')) + h(q('[data-site-header]')) + h(q('[data-site-ticker]'))
  heroSection.value.style.marginTop = offset ? `${-offset}px` : ''
  heroContent.value.style.paddingTop = offset ? `${offset}px` : ''
}

onMounted(() => {
  layoutHero()
  window.addEventListener('resize', layoutHero, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', layoutHero)
})

// Re-measure when the locale changes (ticker/announcement copy may wrap)
// or when the ticker is dismissed (shared state with AppTicker).
watch(locale, () => nextTick(() => layoutHero()))
try {
  watch(() => useState('ticker-dismissed').value, () => nextTick(() => layoutHero()))
}
catch { /* state not registered yet — mount layout already ran */ }
</script>

<template>
  <div class="space-y-0 selection:bg-accent selection:text-on-accent">

    <!-- 1. Hero Section (image + dark overlay + arch curve; content vertically centered) -->
    <section
      ref="heroSection"
      class="relative flex min-h-[calc(100vh-4rem)] supports-[height:100svh]:min-h-[calc(100svh-4rem)] flex-col justify-center overflow-hidden bg-navy bg-cover bg-center px-4 pt-16 pb-16 text-center sm:pt-20 sm:pb-20"
      :style="general?.heroImagePath ? `background-image: url('${general.heroImagePath}')` : ''"
    >
      <!-- Dark overlay -->
      <div class="absolute inset-0" style="background: linear-gradient(to bottom, rgba(13,27,46,0.5), rgba(13,27,46,0.75))"></div>

      <!-- Arch curve: page background rises into the hero at the bottom center -->
      <svg class="absolute bottom-0 left-0 h-[72px] w-full sm:h-[110px]" viewBox="0 0 1440 110" preserveAspectRatio="none" aria-hidden="true" style="filter: drop-shadow(0 -10px 24px rgba(13,27,46,0.35))">
        <path class="fill-bg" d="M0,110 L0,60 C360,5 1080,5 1440,60 L1440,110 Z" />
      </svg>

      <div ref="heroContent" class="relative z-10 mx-auto w-full max-w-5xl pb-20 sm:pb-24">
        <!-- Tagline divider centered above the headline -->
        <div
          class="hero-anim mx-auto mb-5 flex items-center justify-center gap-4"
          style="animation-delay: 0ms"
        >
          <span class="h-px max-w-[80px] flex-1 bg-white/30" aria-hidden="true"></span>
          <span class="text-white text-[14px] font-light uppercase tracking-[0.2em] drop-shadow-lg">{{ t('brand.tagline') }}</span>
          <span class="h-px max-w-[80px] flex-1 bg-white/30" aria-hidden="true"></span>
        </div>

        <!-- Headline (max 2 lines) -->
        <h1 class="hero-anim font-heading text-3xl font-extrabold tracking-tight text-balance text-white sm:text-4xl lg:text-[3.5rem] mb-4 leading-tight" style="animation-delay: 100ms">
          <span class="block">{{ t('home.heroTitleLine1') }}</span>
          <span class="block">{{ t('home.heroTitleLine2') }}</span>
        </h1>

        <!-- Subheadline (1 line) -->
        <p class="hero-anim mb-8 text-base text-white/80 sm:text-lg max-w-3xl mx-auto leading-relaxed text-pretty" style="animation-delay: 200ms">
          {{ t('home.heroSubtitle') }}
        </p>

        <!-- Single primary CTA -->
        <div class="hero-anim flex items-center justify-center" style="animation-delay: 300ms">
          <NuxtLink
            :to="localePath('/products')"
            class="h-12 sm:h-13 inline-flex items-center justify-center gap-2.5 rounded-lg bg-accent px-8 text-base font-bold text-on-accent shadow-lg shadow-accent/20 hover:bg-accent-hover active:scale-[0.98] transition-all"
          >
            <span>{{ t('home.shopCta') }}</span>
            <ArrowRight class="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Dynamic promo banners: below_hero slot (managed in /admin/banners) -->
    <AppHomeBanners placement="below_hero" />

    <!-- 3. Service Sections (one card per section, links to /services#SECTION) -->
    <!-- Shown while loading or when at least one section has active services -->
    <section v-if="servicesPending || sectionCards.length" class="py-16 sm:py-24 px-5 bg-bg transition-colors">
      <div class="mx-auto max-w-7xl">
        <!-- Section Header -->
        <div class="reveal mb-8 max-w-3xl">
          <p class="mb-2 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            {{ t('home.servicesEyebrow') }}
          </p>
          <h2 class="font-heading text-[28px] sm:text-4xl font-medium text-text mb-3 text-balance">
            {{ t('home.servicesTitle') }} <em class="italic">{{ t('home.servicesTitleAccent') }}</em>
          </h2>
          <p class="text-[15px] sm:text-base text-muted leading-relaxed max-w-[65ch] text-pretty">
            {{ t('home.servicesSubtitle') }}
          </p>
        </div>

        <!-- Loading skeleton (same card footprint, no fake content) -->
        <div
          v-if="servicesPending"
          class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 items-stretch auto-rows-fr"
          aria-hidden="true"
        >
          <div
            v-for="i in 4"
            :key="i"
            class="flex animate-pulse flex-col rounded-sm border border-border bg-surface p-3.5 min-h-[120px] h-full"
          >
            <div class="flex items-start justify-between gap-2 mb-2.5">
              <div class="h-7 w-7 rounded bg-border" />
              <div class="h-4 w-4 rounded bg-border" />
            </div>
            <div class="h-7 w-3/4 rounded bg-border mb-2" />
            <div class="mt-auto border-t border-border pt-2.5">
              <div class="h-4 w-1/2 rounded bg-border" />
            </div>
          </div>
        </div>

        <!-- Section Cards Grid -->
        <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 items-stretch auto-rows-fr">
          <ServiceSectionCard
            v-for="(card, i) in sectionCards"
            :key="card.section"
            :section="card.section"
            :title="card.title"
            :price-cents="card.priceCents"
            :count="card.count"
            :to="localePath('/services') + '#' + card.section"
            class="reveal"
            :style="{ '--reveal-delay': `${i * 70}ms` }"
          />
        </div>

      </div>
    </section>

    <!-- Dynamic promo banners: below_services slot (managed in /admin/banners) -->
    <AppHomeBanners placement="below_services" />

    <!-- 4. Featured Categories (image tile + name only, text never overlaps) -->
    <!-- Hidden when no active items -->
    <section v-if="categories?.length" class="py-16 sm:py-24 px-5 bg-surface border-y border-border">
      <div class="mx-auto max-w-7xl">
        <!-- Section Header -->
        <div class="reveal mb-8 max-w-3xl">
          <p class="mb-2 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            {{ t('home.categoriesEyebrow') }}
          </p>
          <h2 class="font-heading text-[28px] sm:text-4xl font-medium text-text mb-3 text-balance">
            {{ t('home.categoriesTitle') }} <em class="italic">{{ t('home.categoriesTitleAccent') }}</em>
          </h2>
          <p class="text-[15px] sm:text-base text-muted leading-relaxed max-w-[65ch] text-pretty">
            {{ t('home.categoriesSubtitle') }}
          </p>
        </div>

        <!-- Category Grid (2-col mobile, 3 from 768px, 4 from 1024px) -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 items-stretch auto-rows-fr">
          <CategoryCard
            v-for="(cat, i) in categories"
            :key="cat.id"
            :name="locale === 'ar' ? cat.nameAr : cat.nameEn"
            :cover="cat.coverImagePath || null"
            :to="localePath(`/products/${cat.slug}`)"
            class="reveal"
            :style="{ '--reveal-delay': `${i * 70}ms` }"
          />
        </div>

        <!-- View All Products CTA -->
        <div class="mt-10 sm:mt-12 text-center">
          <NuxtLink
            :to="localePath('/products')"
            class="inline-flex items-center gap-2 rounded-lg border-2 border-primary px-7 py-3 text-sm sm:text-base font-bold text-primary hover:bg-accent hover:text-on-accent active:scale-[0.98] transition-all"
          >
            <span>{{ t('home.allCategories') }}</span>
            <ArrowRight class="h-4 w-4 rtl:rotate-180" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Dynamic promo banners: below_categories slot (managed in /admin/banners) -->
    <AppHomeBanners placement="below_categories" />

    <!-- 5. Products (left-aligned header, desktop link right, mobile button below) -->
    <section v-if="featuredProducts.length" class="py-14 md:py-20 lg:py-24 px-5 bg-bg transition-colors">
      <div class="mx-auto max-w-7xl">
        <div class="reveal mb-8 flex items-end justify-between gap-4">
          <div class="max-w-3xl">
            <p class="mb-2 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              {{ t('home.productsEyebrow') }}
            </p>
            <h2 class="font-heading text-[28px] sm:text-4xl font-medium text-text mb-3 text-balance">
              {{ t('home.productsTitle') }} <em class="italic">{{ t('home.productsTitleAccent') }}</em>
            </h2>
            <p class="text-[15px] sm:text-base text-muted leading-relaxed max-w-[65ch] text-pretty">
              {{ t('home.productsSubtitle') }}
            </p>
          </div>
          <NuxtLink
            :to="localePath('/products')"
            class="hidden md:inline-flex h-11 shrink-0 items-center gap-1.5 text-sm font-bold text-text hover:underline underline-offset-4"
          >
            <span>{{ t('nav.allProducts') }}</span>
            <ArrowRight class="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </NuxtLink>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 items-stretch auto-rows-fr">
          <AppProductCard
            v-for="(product, i) in featuredProducts.slice(0, 4)"
            :key="product.id"
            :product="product"
            class="reveal"
            :style="{ '--reveal-delay': `${i * 70}ms` }"
          />
        </div>

        <!-- Bottom button (mobile only) -->
        <div class="mt-6 text-center md:hidden">
          <NuxtLink
            :to="localePath('/products')"
            class="inline-flex h-12 items-center gap-2 whitespace-nowrap border border-text px-6 text-sm font-bold text-text transition-colors hover:bg-text hover:text-bg"
          >
            <span>{{ t('nav.allProducts') }}</span>
            <ArrowRight class="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- 6. Salon Experience -->
    <section class="py-16 sm:py-24 px-5 bg-surface border-t border-border">
      <div class="mx-auto max-w-7xl">
        <div class="reveal mb-8 max-w-3xl">
          <p class="mb-2 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            {{ t('home.workflowEyebrow') }}
          </p>
          <h2 class="font-heading text-[28px] sm:text-4xl font-medium text-text mb-3 text-balance">
            {{ t('home.workflowTitle') }} <em class="italic">{{ t('home.workflowTitleAccent') }}</em>
          </h2>
          <p class="text-[15px] sm:text-base text-muted leading-relaxed max-w-[65ch] text-pretty">
            {{ t('home.workflowSubtitle') }}
          </p>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6 items-stretch">
          <div class="reveal relative rounded-lg sm:rounded-2xl bg-bg p-3 sm:p-6 border border-border shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 h-full flex flex-col" style="--reveal-delay: 0ms">
            <span class="text-xl sm:text-3xl font-extrabold font-mono text-primary">01</span>
            <h3 class="font-heading text-sm sm:text-lg font-bold text-text mt-1 sm:mt-2 mb-1 sm:mb-2 line-clamp-2">
              {{ t('home.step1Title') }}
            </h3>
            <p class="text-xs sm:text-sm text-muted leading-relaxed line-clamp-3 sm:line-clamp-none">
              {{ t('home.step1Desc') }}
            </p>
          </div>

          <div class="reveal relative rounded-lg sm:rounded-2xl bg-bg p-3 sm:p-6 border border-border shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 h-full flex flex-col" style="--reveal-delay: 70ms">
            <span class="text-xl sm:text-3xl font-extrabold font-mono text-primary">02</span>
            <h3 class="font-heading text-sm sm:text-lg font-bold text-text mt-1 sm:mt-2 mb-1 sm:mb-2 line-clamp-2">
              {{ t('home.step2Title') }}
            </h3>
            <p class="text-xs sm:text-sm text-muted leading-relaxed line-clamp-3 sm:line-clamp-none">
              {{ t('home.step2Desc') }}
            </p>
          </div>

          <div class="reveal relative rounded-lg sm:rounded-2xl bg-bg p-3 sm:p-6 border border-border shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 h-full flex flex-col" style="--reveal-delay: 140ms">
            <span class="text-xl sm:text-3xl font-extrabold font-mono text-primary">03</span>
            <h3 class="font-heading text-sm sm:text-lg font-bold text-text mt-1 sm:mt-2 mb-1 sm:mb-2 line-clamp-2">
              {{ t('home.step3Title') }}
            </h3>
            <p class="text-xs sm:text-sm text-muted leading-relaxed line-clamp-3 sm:line-clamp-none">
              {{ t('home.step3Desc') }}
            </p>
          </div>

          <div class="reveal relative rounded-lg sm:rounded-2xl bg-bg p-3 sm:p-6 border border-border shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 h-full flex flex-col" style="--reveal-delay: 210ms">
            <span class="text-xl sm:text-3xl font-extrabold font-mono text-primary">04</span>
            <h3 class="font-heading text-sm sm:text-lg font-bold text-text mt-1 sm:mt-2 mb-1 sm:mb-2 line-clamp-2">
              {{ t('home.step4Title') }}
            </h3>
            <p class="text-xs sm:text-sm text-muted leading-relaxed line-clamp-3 sm:line-clamp-none">
              {{ t('home.step4Desc') }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Dynamic promo banners: above_footer slot (managed in /admin/banners) -->
    <AppHomeBanners placement="above_footer" />

  </div>
</template>
