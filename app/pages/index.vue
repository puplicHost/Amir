<script setup lang="ts">
import {
  ArrowRight,
  Boxes,
  Building2,
  Check,
  Clock,
  Cpu,
  Flame,
  Gauge,
  Phone,
  Radio,
  Search,
  ShoppingCart,
  Sparkles,
  Wrench,
  Zap
} from 'lucide-vue-next'

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
      icon: fallback.icon,
      key,
      tag: locale.value === 'ar' ? fallback.tagAr : fallback.tagEn,
      isFlagship: fallback.key === 'plcSystems',
    }
  })
})

const flagshipService = computed(() => {
  return displayServices.value.find(s => s.isFlagship) || displayServices.value[0]
})

const standardServices = computed(() => {
  return displayServices.value.filter(s => s.id !== flagshipService.value?.id)
})

const phoneContact = computed(() => {
  return contact.value?.contactPhone1 || '01000000000'
})

const whatsappContact = computed(() => {
  const raw = contact.value?.contactWhatsapp || contact.value?.contactPhone1 || '01000000000'
  return whatsappLink(raw)
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
</script>

<template>
  <div class="space-y-0 selection:bg-[#F5CC07] selection:text-slate-950">

    <!-- 1. Hero Section (Full Viewport Height minus sticky navbar, Max 4 Elements, Zero Em-Dashes) -->
    <section
      class="relative flex min-h-[calc(100vh-4rem)] supports-[height:100svh]:min-h-[calc(100svh-4rem)] flex-col justify-center overflow-hidden bg-[#0B1520] bg-cover bg-center px-4 pt-16 pb-16 text-center sm:pt-20 sm:pb-20"
      :style="general?.heroImagePath ? `background-image: url('${general.heroImagePath}')` : ''"
    >
      <!-- Technical Grid & Ambient Lighting -->
      <div class="absolute inset-0 bg-gradient-to-b from-[#0B1520]/90 via-[#0B1520]/95 to-[#0B1520]"></div>
      <div 
        class="pointer-events-none absolute inset-0 opacity-[0.07]" 
        style="background-image: radial-gradient(#2B71AE 1px, transparent 1px); background-size: 24px 24px;"
      ></div>
      <div class="pointer-events-none absolute top-0 left-1/2 h-[380px] w-[600px] -translate-x-1/2 rounded-full bg-[#2B71AE]/20 blur-[130px]"></div>
      <div class="pointer-events-none absolute -bottom-24 right-1/4 h-[300px] w-[450px] rounded-full bg-[#285E8E]/25 blur-[120px]"></div>

      <div class="relative z-10 mx-auto max-w-5xl">
        <!-- Element 1: Eyebrow Badge (Rationed, Max 1 per 3 sections) -->
        <div class="hero-anim mb-5 inline-flex items-center gap-2 rounded-full border border-[#F5CC07]/30 bg-[#F5CC07]/10 px-4 py-1.5 text-xs sm:text-sm font-semibold text-[#F5CC07] shadow-sm backdrop-blur-md" style="animation-delay: 0ms">
          <Zap class="h-3.5 w-3.5 fill-current" />
          <span>{{ t('home.heroEyebrow') }}</span>
        </div>

        <!-- Element 2: Hero Headline (Max 2 lines desktop, leading-tight) -->
        <h1 class="hero-anim font-heading text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-[3.5rem] mb-5 leading-tight" style="animation-delay: 100ms">
          <span class="block">{{ t('home.heroTitleLine1') }}</span>
          <span class="block">{{ t('home.heroTitleLine2') }}</span>
        </h1>

        <!-- Element 3: Subtext (Max 20 words, strictly zero em-dashes) -->
        <p class="hero-anim mb-8 text-base text-slate-300 sm:text-lg max-w-2xl mx-auto leading-relaxed" style="animation-delay: 200ms">
          {{ t('home.heroSubtitle') }}
        </p>

        <!-- Element 4: Action CTAs (No wrap, WCAG AA min contrast, active push feedback) -->
        <div class="hero-anim flex flex-col sm:flex-row items-center justify-center gap-4" style="animation-delay: 300ms">
          <NuxtLink 
            :to="localePath('/products')" 
            class="h-12 sm:h-13 w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-lg bg-[#F5CC07] px-8 text-base font-bold text-slate-950 shadow-lg shadow-yellow-500/20 hover:bg-yellow-400 active:scale-[0.98] transition-all"
          >
            <span>{{ t('home.shopCta') }}</span>
            <ArrowRight class="h-4 w-4 rtl:rotate-180" />
          </NuxtLink>

          <NuxtLink 
            :to="localePath('/services')" 
            class="h-12 sm:h-13 w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-lg border border-white/25 bg-white/5 backdrop-blur px-8 text-base font-bold text-white hover:bg-white/15 hover:border-white/40 active:scale-[0.98] transition-all"
          >
            <span>{{ t('home.servicesCta') }}</span>
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Dynamic promo banners: below_hero slot (managed in /admin/banners) -->
    <AppHomeBanners placement="below_hero" />

    <!-- 3. Engineering Solutions (Bento Grid with Asymmetric Rhythm & Background Diversity) -->
    <section class="py-16 sm:py-24 px-4 bg-white dark:bg-[#0B1520] transition-colors">
      <div class="mx-auto max-w-7xl">
        <!-- Section Header (Vertical Stack, No Split-Header) -->
        <div class="reveal mb-12 text-center max-w-3xl mx-auto">
          <h2 class="font-heading text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-3">
            {{ t('home.servicesTitle') }}
          </h2>
          <p class="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-[65ch] mx-auto">
            {{ t('home.servicesSubtitle') }}
          </p>
          <div class="h-1 w-12 bg-[#2B71AE] mx-auto rounded-full mt-4"></div>
        </div>

        <!-- Asymmetric Bento Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          
          <!-- Bento Cell 1: Flagship Featured Service Card (Span 2 on desktop with technical accents) -->
          <div
            v-if="flagshipService"
            class="reveal lg:col-span-2 group relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-[#0B1520] via-[#16253B] to-[#1E3A5F] p-6 sm:p-8 text-white shadow-lg transition-all duration-300 hover:border-[#2B71AE] hover:shadow-2xl hover:-translate-y-1"
          >
            <!-- Circuit watermark -->
            <div 
              class="pointer-events-none absolute -right-16 -bottom-16 h-64 w-64 rounded-full bg-[#2B71AE]/20 blur-3xl"
            ></div>

            <div class="relative z-10 flex flex-col justify-between h-full">
              <div>
                <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <span class="inline-flex items-center gap-1.5 rounded-full bg-[#F5CC07]/20 border border-[#F5CC07]/40 px-3 py-1 text-xs font-bold text-[#F5CC07]">
                    <Sparkles class="h-3.5 w-3.5" />
                    <span>{{ t('home.flagshipBadge') }}</span>
                  </span>
                  <span class="text-xs font-mono font-medium text-blue-200">
                    {{ flagshipService.tag }}
                  </span>
                </div>

                <div class="flex items-center gap-4 mb-4">
                  <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#2B71AE] text-white shadow-md">
                    <component :is="flagshipService.icon" class="h-7 w-7" />
                  </div>
                  <h3 class="font-heading text-xl sm:text-2xl font-bold leading-tight text-white group-hover:text-[#F5CC07] transition-colors">
                    {{ flagshipService.name }}
                  </h3>
                </div>

                <p class="text-sm sm:text-base text-slate-300 leading-relaxed mb-6 max-w-2xl">
                  {{ flagshipService.description }}
                </p>

                <!-- Technical highlights strip -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-6 text-xs text-slate-200">
                  <div class="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
                    <Check class="h-4 w-4 text-[#F5CC07] shrink-0" />
                    <span>Siemens / Delta / Schneider</span>
                  </div>
                  <div class="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
                    <Check class="h-4 w-4 text-[#F5CC07] shrink-0" />
                    <span>HMI & SCADA Development</span>
                  </div>
                  <div class="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
                    <Check class="h-4 w-4 text-[#F5CC07] shrink-0" />
                    <span>Cabinet Wiring & Testing</span>
                  </div>
                </div>
              </div>

              <div class="pt-4 border-t border-white/10 flex items-center justify-between">
                <NuxtLink 
                  :to="localePath(`/services/${flagshipService.id}`)"
                  class="inline-flex items-center gap-2 text-sm font-bold text-[#F5CC07] hover:underline"
                >
                  <span>{{ t('home.serviceAction') }}</span>
                  <ArrowRight class="h-4 w-4 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                </NuxtLink>

                <NuxtLink 
                  :to="localePath('/services')"
                  class="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  {{ t('home.viewAllServices') }}
                </NuxtLink>
              </div>
            </div>
          </div>

          <!-- Bento Cells 2-7: Standard Specialized Engineering Services -->
          <NuxtLink
            v-for="(srv, i) in standardServices"
            :key="srv.id"
            :to="localePath(`/services/${srv.id}`)"
            class="reveal group flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#162032] p-5 sm:p-6 shadow-sm hover:border-[#2B71AE] hover:shadow-lg dark:hover:border-[#2B71AE] hover:-translate-y-1 transition-all duration-300"
            :style="{ '--reveal-delay': `${(i + 1) * 70}ms` }"
          >
            <div>
              <div class="flex items-center justify-between gap-2 mb-3.5">
                <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2B71AE]/10 text-[#2B71AE] dark:bg-[#2B71AE]/25 dark:text-blue-300 group-hover:bg-[#2B71AE] group-hover:text-white transition-colors">
                  <component :is="srv.icon" class="h-5 w-5" />
                </div>
                <span class="text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400">
                  {{ srv.tag }}
                </span>
              </div>

              <h3 class="font-heading text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-[#2B71AE] dark:group-hover:text-[#F5CC07] transition-colors line-clamp-2 mb-2 leading-snug">
                {{ srv.name }}
              </h3>

              <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed mb-4">
                {{ srv.description }}
              </p>
            </div>

            <div class="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-[#2B71AE] dark:text-[#F5CC07]">
              <span>{{ t('home.serviceAction') }}</span>
              <ArrowRight class="h-3.5 w-3.5 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
            </div>
          </NuxtLink>
        </div>

      </div>
    </section>

    <!-- Dynamic promo banners: below_services slot (managed in /admin/banners) -->
    <AppHomeBanners placement="below_services" />

    <!-- 4. Featured Categories (Visual Hardware & Component Catalog) -->
    <section class="py-16 sm:py-24 px-4 bg-slate-50 dark:bg-[#0E1B2B]/60 border-y border-slate-200/80 dark:border-slate-800/80">
      <div class="mx-auto max-w-7xl">
        <!-- Section Header -->
        <div class="reveal mb-12 text-center max-w-3xl mx-auto">
          <h2 class="font-heading text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-3">
            {{ t('home.categoriesTitle') }}
          </h2>
          <p class="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-[65ch] mx-auto">
            {{ t('home.categoriesSubtitle') }}
          </p>
          <div class="h-1 w-12 bg-[#F5CC07] mx-auto rounded-full mt-4"></div>
        </div>

        <!-- Category Grid (Responsive 2-col mobile, 3-col desktop) -->
        <div 
          v-if="categories?.length" 
          class="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
        >
          <NuxtLink
            v-for="(cat, i) in categories"
            :key="cat.id"
            :to="localePath(`/products/${cat.slug}`)"
            class="reveal group relative h-56 sm:h-72 lg:h-80 overflow-hidden rounded-2xl bg-slate-900 shadow-sm hover:shadow-xl hover:-translate-y-1 border border-slate-200/60 dark:border-slate-800 transition-all duration-300"
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
              class="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#16253B] via-[#0F1D2E] to-[#0B1520] p-6 text-center"
            >
              <div class="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mb-2">
                <Boxes class="h-8 w-8 text-blue-400/60" />
              </div>
            </div>

            <!-- Gradient Scrim for Readability -->
            <div class="absolute inset-0 bg-gradient-to-t from-[#0B1520] via-[#0B1520]/60 to-transparent opacity-90 group-hover:opacity-95 transition-opacity"></div>

            <!-- Card Bottom Content -->
            <div class="absolute inset-0 p-4 sm:p-6 flex flex-col justify-end">
              <span class="text-[11px] font-mono font-bold uppercase tracking-wider text-[#F5CC07] mb-1">
                {{ locale === 'ar' ? 'فئة معتمدة' : 'Hardware Catalog' }}
              </span>
              <h3 class="font-heading text-lg sm:text-2xl font-bold text-white mb-3 group-hover:text-[#F5CC07] transition-colors leading-tight">
                {{ locale === 'ar' ? cat.nameAr : cat.nameEn }}
              </h3>
              <div>
                <span class="inline-flex items-center gap-1.5 rounded-lg bg-white/15 backdrop-blur-md px-3 py-1.5 text-xs sm:text-sm font-semibold text-white group-hover:bg-[#F5CC07] group-hover:text-slate-950 transition-all duration-300">
                  <span>{{ t('home.categoryAction') }}</span>
                  <ArrowRight class="h-3.5 w-3.5 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                </span>
              </div>
            </div>
          </NuxtLink>
        </div>

        <!-- View All Products CTA -->
        <div class="mt-10 sm:mt-12 text-center">
          <NuxtLink 
            :to="localePath('/products')" 
            class="inline-flex items-center gap-2 rounded-lg border-2 border-[#2B71AE] px-7 py-3 text-sm sm:text-base font-bold text-[#2B71AE] hover:bg-[#2B71AE] hover:text-white dark:border-[#F5CC07] dark:text-[#F5CC07] dark:hover:bg-[#F5CC07] dark:hover:text-slate-950 active:scale-[0.98] transition-all"
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
    <section v-if="featuredProducts.length" class="py-16 sm:py-24 px-4 bg-white dark:bg-[#0B1520] transition-colors">
      <div class="mx-auto max-w-7xl">
        <div class="reveal mb-12 text-center max-w-3xl mx-auto">
          <h2 class="font-heading text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-3">
            {{ t('home.productsTitle') }}
          </h2>
          <p class="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-[65ch] mx-auto">
            {{ t('home.productsSubtitle') }}
          </p>
          <div class="h-1 w-12 bg-[#2B71AE] mx-auto rounded-full mt-4"></div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
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
    <section class="py-16 sm:py-24 px-4 bg-slate-50 dark:bg-[#0E1B2B]/60 border-t border-slate-200/80 dark:border-slate-800/80">
      <div class="mx-auto max-w-7xl">
        <div class="reveal mb-12 text-center max-w-3xl mx-auto">
          <h2 class="font-heading text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-3">
            {{ t('home.workflowTitle') }}
          </h2>
          <p class="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-[65ch] mx-auto">
            {{ t('home.workflowSubtitle') }}
          </p>
          <div class="h-1 w-12 bg-[#F5CC07] mx-auto rounded-full mt-4"></div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="reveal relative rounded-2xl bg-white dark:bg-[#162032] p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300" style="--reveal-delay: 0ms">
            <span class="text-3xl font-extrabold font-mono text-[#2B71AE] dark:text-[#F5CC07]">01</span>
            <h3 class="font-heading text-lg font-bold text-slate-900 dark:text-white mt-2 mb-2">
              {{ t('home.step1Title') }}
            </h3>
            <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {{ t('home.step1Desc') }}
            </p>
          </div>

          <div class="reveal relative rounded-2xl bg-white dark:bg-[#162032] p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300" style="--reveal-delay: 70ms">
            <span class="text-3xl font-extrabold font-mono text-[#2B71AE] dark:text-[#F5CC07]">02</span>
            <h3 class="font-heading text-lg font-bold text-slate-900 dark:text-white mt-2 mb-2">
              {{ t('home.step2Title') }}
            </h3>
            <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {{ t('home.step2Desc') }}
            </p>
          </div>

          <div class="reveal relative rounded-2xl bg-white dark:bg-[#162032] p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300" style="--reveal-delay: 140ms">
            <span class="text-3xl font-extrabold font-mono text-[#2B71AE] dark:text-[#F5CC07]">03</span>
            <h3 class="font-heading text-lg font-bold text-slate-900 dark:text-white mt-2 mb-2">
              {{ t('home.step3Title') }}
            </h3>
            <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {{ t('home.step3Desc') }}
            </p>
          </div>

          <div class="reveal relative rounded-2xl bg-white dark:bg-[#162032] p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300" style="--reveal-delay: 210ms">
            <span class="text-3xl font-extrabold font-mono text-[#2B71AE] dark:text-[#F5CC07]">04</span>
            <h3 class="font-heading text-lg font-bold text-slate-900 dark:text-white mt-2 mb-2">
              {{ t('home.step4Title') }}
            </h3>
            <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
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
