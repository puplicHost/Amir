<script setup lang="ts">
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Battery,
  Boxes,
  Building2,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  Flame,
  Gauge,
  GitBranch,
  Hammer,
  Layers,
  Monitor,
  Package,
  Phone,
  Radio,
  Search,
  Server,
  Settings,
  Shield,
  ShoppingCart,
  Wifi,
  Wind,
  Wrench,
  Zap
} from 'lucide-vue-next'

// Icon registry for DB-driven service card icons (saved as names via the admin icon picker)
const serviceIconMap: Record<string, any> = {
  Wrench,
  Settings,
  Zap,
  Cpu,
  Radio,
  Wind,
  Flame,
  Shield,
  Hammer,
  Monitor,
  Server,
  Database,
  Wifi,
  Battery,
  GitBranch,
  Layers,
  Package,
  Activity,
  AlertTriangle,
  CheckCircle,
}

const { t, locale } = useI18n()
const localePath = useLocalePath()
const cartStore = useCartStore()

const { data: general } = await useAsyncData('home-general', () => $fetch<any>('/api/settings/general'))
const { data: contact } = await useAsyncData('home-contact', () => $fetch<any>('/api/settings/contact'))
const { data: services } = await useAsyncData('home-services', () => $fetch<any[]>('/api/services'))
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

const defaultServices = [
  {
    key: 'machineryRepair',
    icon: Wrench,
    sortOrder: 1,
    tagEn: 'Industrial Maintenance',
    tagAr: 'صيانة صناعية',
    nameAr: 'فحص وإصلاح وصيانة المعدات',
    nameEn: 'Machinery Repair & Maintenance',
    descriptionAr: 'تشخيص دقيق، إصلاح الأعطال، وصيانة دورية لضمان استمرارية خطوط الإنتاج والآلات الصناعية.',
    descriptionEn: 'Comprehensive diagnostics, component troubleshooting, and overhaul maintenance for production machinery.',
  },
  {
    key: 'iotSystems',
    icon: Radio,
    sortOrder: 2,
    tagEn: 'Smart Telemetry',
    tagAr: 'تحكم ذكي',
    nameAr: 'تركيب وتصميم أنظمة التحكم الذكية',
    nameEn: 'IoT Systems Design & Installation',
    descriptionAr: 'حلول إنترنت الأشياء والتحكم الذكي والمراقبة السحابية للمزارع والمنشآت والمشروعات الحديثة.',
    descriptionEn: 'Custom telemetry, remote environmental monitoring, and smart automation for farms and facilities.',
  },
  {
    key: 'plcSystems',
    icon: Cpu,
    sortOrder: 3,
    tagEn: 'Automation & SCADA',
    tagAr: 'أتمتة وتحكم صناعي',
    nameAr: 'تركيب وإنشاء وصيانة أنظمة PLC',
    nameEn: 'PLC Systems & Automation',
    descriptionAr: 'برمجة وتصميم لوحات التحكم الصناعية، وشاشات HMI، ودمج الأنظمة الآلية لزيادة كفاءة الإنتاج.',
    descriptionEn: 'Industrial programming, control panel assembly, SCADA architecture, and line modernization.',
  },
  {
    key: 'fireAlarm',
    icon: Flame,
    sortOrder: 4,
    tagEn: 'Facility Safety',
    tagAr: 'سلامة المنشآت',
    nameAr: 'تصميم وتركيب أنظمة الحريق والإنذار',
    nameEn: 'Fire Alarm & Safety Systems',
    descriptionAr: 'تصميم وتنفيذ شبكات الإنذار المبكر ومكافحة الحريق بأعلى معايير السلامة والأمان للمنشآت.',
    descriptionEn: 'Certified early fire detection, emergency alarm networks, and safety engineering compliance.',
  },
  {
    key: 'pneumaticSystems',
    icon: Gauge,
    sortOrder: 5,
    tagEn: 'Pneumatics',
    tagAr: 'أنظمة نيوماتيك',
    nameAr: 'تصميم وتركيب وصيانة الأنظمة الهوائية',
    nameEn: 'Pneumatic Systems',
    descriptionAr: 'تصميم دوائر الهواء المضغوط وصيانة الصمامات والسلندرات الهوائية لرفع الكفاءة التشغيلية.',
    descriptionEn: 'Compressed air circuit optimization, solenoid valve maintenance, and pneumatic cylinder retrofits.',
  },
  {
    key: 'productSearch',
    icon: Search,
    sortOrder: 6,
    tagEn: 'Procurement',
    tagAr: 'توريد قطع نادرة',
    nameAr: 'خدمة البحث وتوفير منتج خاص',
    nameEn: 'Product Search & Rare Sourcing',
    descriptionAr: 'توفير واستيراد القطع النادرة، والرقائق الإلكترونية المتخصصة، والبدائل المعتمدة لصيانة أجهزتك.',
    descriptionEn: 'Direct procurement of rare chips, obsolete components, and specialized industrial hardware.',
  },
  {
    key: 'bulkSupply',
    icon: Building2,
    sortOrder: 7,
    tagEn: 'B2B Supply',
    tagAr: 'توريدات شركات',
    nameAr: 'خدمة التوريدات العامة للشركات',
    nameEn: 'Bulk Supply for Companies',
    descriptionAr: 'عقود توريد دورية وكميات متكاملة للشركات والمصانع ومشاريع التخرج بأسعار تنافسية.',
    descriptionEn: 'Contract supply schedules, volume pricing, and reliable procurement for factories and businesses.',
  },
]

const displayServices = computed(() => {
  const list = services.value && services.value.length > 0 ? services.value : defaultServices
  return list.map((srv, idx) => {
    const fallback = defaultServices.find(d => 
      d.sortOrder === srv.sortOrder || 
      (srv.nameEn && d.nameEn.toLowerCase() === srv.nameEn.toLowerCase())
    ) || defaultServices[idx % defaultServices.length]

    const key = fallback.key
    const name = locale.value === 'ar' 
      ? (srv.nameAr || t(`engineeringServices.${key}.name`))
      : (srv.nameEn || t(`engineeringServices.${key}.name`))
    const description = (locale.value === 'ar' ? srv.descriptionAr : srv.descriptionEn) || t(`engineeringServices.${key}.description`)
    const id = srv.id || `service-${idx + 1}`

    return {
      id,
      name,
      description,
      icon: (srv.iconName && serviceIconMap[srv.iconName]) || fallback.icon,
      iconPath: srv.iconPath || null,
      cardColor: srv.cardColor || '#FFFFFF',
      key,
      tag: locale.value === 'ar' ? fallback.tagAr : fallback.tagEn,
      pill: locale.value === 'ar'
        ? (srv.tagAr || fallback.tagAr)
        : (srv.tagEn || fallback.tagEn),
      isFlagship: fallback.key === 'plcSystems',
      isFeatured: Boolean(srv.isFeatured),
    }
  })
})

const flagshipService = computed(() => {
  return displayServices.value.find(s => s.isFlagship) || displayServices.value[0]
})

const standardServices = computed(() => {
  const list = displayServices.value.filter(s => s.id !== flagshipService.value?.id)
  let sponsoredSlots = 0
  return list
    .map(s => {
      const showSponsored = s.isFeatured && sponsoredSlots < 2
      if (showSponsored) sponsoredSlots++
      return { ...s, showSponsored }
    })
    .sort((a, b) => (b.showSponsored ? 1 : 0) - (a.showSponsored ? 1 : 0))
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
          "url": "https://mango-electronics.com",
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
        <p class="hero-anim mb-8 text-base text-white/80 sm:text-lg max-w-3xl mx-auto leading-relaxed truncate" style="animation-delay: 200ms">
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

    <!-- 3. Engineering Solutions (Bento Grid with Asymmetric Rhythm & Background Diversity) -->
    <section class="py-16 sm:py-24 px-4 bg-bg transition-colors">
      <div class="mx-auto max-w-7xl">
        <!-- Section Header (Vertical Stack, No Split-Header) -->
        <div class="reveal mb-12 text-center max-w-3xl mx-auto">
          <h2 class="font-heading text-2xl sm:text-4xl font-extrabold text-text mb-3">
            {{ t('home.servicesTitle') }}
          </h2>
          <p class="text-sm sm:text-base text-muted leading-relaxed max-w-[65ch] mx-auto">
            {{ t('home.servicesSubtitle') }}
          </p>
          <div class="h-1 w-12 bg-accent mx-auto rounded-full mt-4"></div>
        </div>

        <!-- Asymmetric Bento Grid -->
        <div class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-6 items-stretch">
          
          <!-- Unified Service Card: flagship entry (same style as all cards) -->
          <div
            v-if="flagshipService"
            class="reveal group relative flex flex-col rounded-xl border border-[#E2E8F0] dark:border-[#2D3748] bg-[var(--card-bg)] dark:bg-[#1A1D2E] p-3 sm:p-5 shadow-sm h-full"
            :style="{ '--card-bg': flagshipService.cardColor || '#FFFFFF' }"
          >
            <div class="flex items-center justify-between gap-2 mb-2.5 sm:mb-3.5">
              <div class="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] dark:bg-[#2B71AE]/20 text-[#2B71AE] dark:text-blue-300">
                <img v-if="flagshipService.iconPath" :src="flagshipService.iconPath" :alt="flagshipService.name" class="h-5 w-5 object-contain" loading="lazy" />
                <component v-else :is="flagshipService.icon" class="h-5 w-5" aria-hidden="true" />
              </div>
              <span class="inline-flex items-center border border-border text-xs rounded-full px-2 py-0.5 text-muted">
                {{ flagshipService.pill }}
              </span>
            </div>

            <h3 class="font-heading text-base font-bold text-text line-clamp-2 mb-1.5 leading-snug">
              {{ flagshipService.name }}
            </h3>

            <p class="text-sm text-muted line-clamp-2 leading-relaxed mb-3 sm:mb-4">
              {{ flagshipService.description }}
            </p>

            <NuxtLink
              :to="localePath(`/services/${flagshipService.id}`)"
              class="mt-auto flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#F5CC07] text-sm font-bold text-slate-950 hover:bg-yellow-400 active:scale-[0.98] transition-colors"
            >
              <span>{{ t('home.serviceAction') }}</span>
              <ArrowRight class="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            </NuxtLink>
          </div>

          <!-- Unified Service Cards -->
          <NuxtLink
            v-for="(srv, i) in standardServices"
            :key="srv.id"
            :to="localePath(`/services/${srv.id}`)"
            class="reveal group relative flex flex-col rounded-xl border border-[#E2E8F0] dark:border-[#2D3748] bg-[var(--card-bg)] dark:bg-[#1A1D2E] p-3 sm:p-5 shadow-sm h-full"
            :style="{ '--reveal-delay': `${(i + 1) * 70}ms`, '--card-bg': srv.cardColor || '#FFFFFF' }"
          >
            <div class="flex items-center justify-between gap-2 mb-2.5 sm:mb-3.5">
              <div class="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] dark:bg-[#2B71AE]/20 text-[#2B71AE] dark:text-blue-300">
                <img v-if="srv.iconPath" :src="srv.iconPath" :alt="srv.name" class="h-5 w-5 object-contain" loading="lazy" />
                <component v-else :is="srv.icon" class="h-5 w-5" aria-hidden="true" />
              </div>
              <div class="flex items-center gap-1.5">
                <span class="inline-flex items-center border border-border text-xs rounded-full px-2 py-0.5 text-muted">
                  {{ srv.pill }}
                </span>
                <span
                  v-if="srv.showSponsored"
                  class="inline-flex items-center rounded-full border border-[#F5CC07]/60 bg-[#F5CC07]/10 px-2 py-0.5 text-xs font-bold text-[#7a6200] dark:text-[#F5CC07]"
                >
                  {{ locale === 'ar' ? 'مميز' : 'Featured' }}
                </span>
              </div>
            </div>

            <h3 class="font-heading text-base font-bold text-text line-clamp-2 mb-1.5 leading-snug">
              {{ srv.name }}
            </h3>

            <p class="text-sm text-muted line-clamp-2 leading-relaxed mb-3 sm:mb-4">
              {{ srv.description }}
            </p>

            <span
              class="mt-auto flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#F5CC07] text-sm font-bold text-slate-950 group-hover:bg-yellow-400 active:scale-[0.98] transition-colors"
            >
              <span>{{ t('home.serviceAction') }}</span>
              <ArrowRight class="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            </span>
          </NuxtLink>
        </div>

      </div>
    </section>

    <!-- Dynamic promo banners: below_services slot (managed in /admin/banners) -->
    <AppHomeBanners placement="below_services" />

    <!-- 4. Featured Categories (Visual Hardware & Component Catalog) -->
    <section class="py-16 sm:py-24 px-4 bg-surface border-y border-border">
      <div class="mx-auto max-w-7xl">
        <!-- Section Header -->
        <div class="reveal mb-12 text-center max-w-3xl mx-auto">
          <h2 class="font-heading text-2xl sm:text-4xl font-extrabold text-text mb-3">
            {{ t('home.categoriesTitle') }}
          </h2>
          <p class="text-sm sm:text-base text-muted leading-relaxed max-w-[65ch] mx-auto">
            {{ t('home.categoriesSubtitle') }}
          </p>
          <div class="h-1 w-12 bg-accent mx-auto rounded-full mt-4"></div>
        </div>

        <!-- Category Grid (Responsive 2-col mobile, 3-col desktop) -->
        <div 
          v-if="categories?.length" 
          class="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-6"
        >
          <NuxtLink
            v-for="(cat, i) in categories"
            :key="cat.id"
            :to="localePath(`/products/${cat.slug}`)"
            class="reveal group relative h-32 sm:h-72 lg:h-80 overflow-hidden rounded-lg sm:rounded-2xl bg-slate-900 shadow-sm hover:shadow-xl hover:-translate-y-1 border border-border transition-all duration-300"
            :style="{ '--reveal-delay': `${i * 70}ms` }"
          >
            <!-- Category Cover Image -->
            <img 
              v-if="cat.coverImagePath" 
              :src="cat.coverImagePath" 
              :alt="locale === 'ar' ? cat.nameAr : cat.nameEn" 
              class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105" 
            />
            <!-- Fallback Technical Pattern -->
            <div 
              v-else 
              class="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-navy-light via-navy-dark to-navy p-6 text-center"
            >
              <div class="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mb-2">
                <Boxes class="h-8 w-8 text-cream/60" />
              </div>
            </div>

            <!-- Gradient Scrim for Readability -->
            <div class="absolute inset-0 bg-gradient-to-t from-navy via-navy/60 to-transparent opacity-90 group-hover:opacity-95 transition-opacity"></div>

            <!-- Card Bottom Content -->
            <div class="absolute inset-0 p-2.5 sm:p-6 flex flex-col justify-end">
              <span class="hidden sm:block text-[11px] font-mono font-bold uppercase tracking-wider text-cream mb-1">
                {{ locale === 'ar' ? 'فئة معتمدة' : 'Hardware Catalog' }}
              </span>
              <h3 class="font-heading text-sm sm:text-2xl font-semibold sm:font-bold text-white mb-1.5 sm:mb-3 group-hover:text-cream transition-colors leading-tight line-clamp-2">
                {{ locale === 'ar' ? cat.nameAr : cat.nameEn }}
              </h3>
              <div>
                <span class="inline-flex items-center gap-1 sm:gap-1.5 rounded-md sm:rounded-lg bg-white/15 backdrop-blur-md px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold text-white group-hover:bg-cream group-hover:text-navy transition-all duration-300">
                  <span>{{ t('home.categoryAction') }}</span>
                  <ArrowRight class="h-3 w-3 sm:h-3.5 sm:w-3.5 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                </span>
              </div>
            </div>
          </NuxtLink>
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

    <!-- 5. Featured Hardware Products (Live E-Commerce Component Grid) -->
    <section v-if="featuredProducts.length" class="py-16 sm:py-24 px-4 bg-bg transition-colors">
      <div class="mx-auto max-w-7xl">
        <div class="reveal mb-12 text-center max-w-3xl mx-auto">
          <h2 class="font-heading text-2xl sm:text-4xl font-extrabold text-text mb-3">
            {{ t('home.productsTitle') }}
          </h2>
          <p class="text-sm sm:text-base text-muted leading-relaxed max-w-[65ch] mx-auto">
            {{ t('home.productsSubtitle') }}
          </p>
          <div class="h-1 w-12 bg-accent mx-auto rounded-full mt-4"></div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-6">
          <AppProductCard
            v-for="(product, i) in featuredProducts"
            :key="product.id"
            :product="product"
            class="reveal"
            :style="{ '--reveal-delay': `${i * 70}ms` }"
          />
        </div>
      </div>
    </section>

    <!-- 6. Precision Engineering Workflow (No Generic 'Step 1' Labels) -->
    <section class="py-16 sm:py-24 px-4 bg-surface border-t border-border">
      <div class="mx-auto max-w-7xl">
        <div class="reveal mb-12 text-center max-w-3xl mx-auto">
          <h2 class="font-heading text-2xl sm:text-4xl font-extrabold text-text mb-3">
            {{ t('home.workflowTitle') }}
          </h2>
          <p class="text-sm sm:text-base text-muted leading-relaxed max-w-[65ch] mx-auto">
            {{ t('home.workflowSubtitle') }}
          </p>
          <div class="h-1 w-12 bg-accent mx-auto rounded-full mt-4"></div>
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
