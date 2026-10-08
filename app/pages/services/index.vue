<script setup lang="ts">
import {
  ArrowRight,
  Building2,
  Cpu,
  Flame,
  Gauge,
  Radio,
  RotateCcw,
  Search,
  Sparkles,
  Wrench,
} from 'lucide-vue-next'

const { t, locale } = useI18n()
const localePath = useLocalePath()

const siteSeo = await useSiteSeo()

// No page-specific SEO exists for the Services list → site-wide fallback applies.
useHead(() => {
  const pageName = locale.value === 'ar' ? 'خدماتنا' : 'Our Services'
  const title = applySeoTitle(
    locale.value === 'ar' ? siteSeo.value?.titleTemplateAr : siteSeo.value?.titleTemplateEn,
    pageName,
    `${pageName} | ${t('brand.name')}`,
  )
  const description = (locale.value === 'ar' ? siteSeo.value?.descriptionAr : siteSeo.value?.descriptionEn) || undefined
  return {
    title,
    meta: [
      ...(description ? [{ name: 'description', content: description }] : []),
      { property: 'og:title', content: title },
      ...(description ? [{ property: 'og:description', content: description }] : []),
    ],
  }
})

// Active services from database. Each card links to its dedicated
// `/services/[id]` page which renders that service's own dynamic form.
const { data: services } = await useAsyncData('services-list', () =>
  $fetch<any[]>('/api/services'),
)

const { data: heroGeneral } = await useAsyncData('hero-general', () => $fetch<any>('/api/settings/general'))

const serviceMetaMap: Record<number, { icon: any, category: string, tagAr: string, tagEn: string }> = {
  1: { icon: Wrench, category: 'maintenance', tagAr: 'صيانة وإصلاح', tagEn: 'Maintenance & Repair' },
  2: { icon: Radio, category: 'iot', tagAr: 'أنظمة ذكية IoT', tagEn: 'Smart IoT & Telemetry' },
  3: { icon: Cpu, category: 'automation', tagAr: 'تحكم وأتمتة PLC', tagEn: 'PLC & Automation' },
  4: { icon: Flame, category: 'safety', tagAr: 'سلامة ومكافحة حريق', tagEn: 'Fire & Safety' },
  5: { icon: Gauge, category: 'pneumatics', tagAr: 'أنظمة هوائية', tagEn: 'Pneumatic Systems' },
  6: { icon: Search, category: 'sourcing', tagAr: 'بحث وتوريد خاص', tagEn: 'Rare Sourcing' },
  7: { icon: Building2, category: 'sourcing', tagAr: 'توريدات شركات', tagEn: 'Bulk Corporate Supply' },
}

const categories = computed(() => [
  { id: 'all', labelAr: 'كل الخدمات', labelEn: 'All Services' },
  { id: 'maintenance', labelAr: 'صيانة وإصلاح', labelEn: 'Maintenance & Repair' },
  { id: 'automation', labelAr: 'أتمتة و PLC', labelEn: 'Automation & PLC' },
  { id: 'iot', labelAr: 'أنظمة ذكية IoT', labelEn: 'Smart IoT' },
  { id: 'safety', labelAr: 'سلامة ومكافحة حريق', labelEn: 'Fire & Safety' },
  { id: 'pneumatics', labelAr: 'أنظمة هوائية', labelEn: 'Pneumatics' },
  { id: 'sourcing', labelAr: 'توريدات وبحث', labelEn: 'Sourcing & Supply' },
])

const enrichedServices = computed(() => {
  return (services.value || []).map((srv, idx) => {
    const meta = serviceMetaMap[srv.sortOrder] || serviceMetaMap[(idx % 7) + 1]
    return {
      ...srv,
      icon: meta.icon,
      category: meta.category,
      tag: locale.value === 'ar' ? meta.tagAr : meta.tagEn,
      name: locale.value === 'ar' ? srv.nameAr : srv.nameEn,
      description: locale.value === 'ar' ? srv.descriptionAr : srv.descriptionEn,
    }
  })
})

const searchQuery = ref('')
const selectedCategory = ref('all')

const filteredServices = computed(() => {
  return enrichedServices.value.filter((srv) => {
    const matchesCat = selectedCategory.value === 'all' || srv.category === selectedCategory.value
    if (!matchesCat) return false

    if (!searchQuery.value.trim()) return true
    const q = searchQuery.value.toLowerCase().trim()
    return (
      srv.name?.toLowerCase().includes(q) ||
      srv.description?.toLowerCase().includes(q) ||
      srv.tag?.toLowerCase().includes(q)
    )
  })
})

function clearFilters() {
  searchQuery.value = ''
  selectedCategory.value = 'all'
}
</script>

<template>
  <div class="space-y-0 selection:bg-accent selection:text-on-accent">

    <!-- 1. Hero Band: Centered Title + Breadcrumb on Dark Themed Banner -->
    <section
      class="relative overflow-hidden bg-navy bg-cover bg-center text-white"
      :style="heroGeneral?.heroImagePath ? `background-image: url('${heroGeneral.heroImagePath}')` : ''"
    >
      <div class="absolute inset-0" style="background: linear-gradient(to bottom, rgba(13,27,46,0.85), rgba(13,27,46,0.95))"></div>

      <svg class="absolute bottom-0 left-0 h-[72px] w-full sm:h-[110px]" viewBox="0 0 1440 110" preserveAspectRatio="none" aria-hidden="true" style="filter: drop-shadow(0 -10px 24px rgba(13,27,46,0.35))">
        <path class="fill-bg" d="M0,110 L0,60 C360,5 1080,5 1440,60 L1440,110 Z" />
      </svg>

      <div class="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-14 sm:pt-20 pb-24 sm:pb-28 text-center">
        <!-- Eyebrow Pill -->
        <div class="inline-flex items-center gap-1.5 rounded-full border border-cream/30 bg-cream/10 px-4 py-1.5 text-xs sm:text-sm font-semibold text-cream shadow-sm backdrop-blur-md mb-4">
          <Wrench class="h-3.5 w-3.5 text-cream" aria-hidden="true" />
          <span>{{ locale === 'ar' ? 'حلول وتوريدات صناعية معتمدة' : 'Certified Engineering Solutions' }}</span>
        </div>

        <!-- Centered Breadcrumb -->
        <nav class="mb-4 flex items-center justify-center gap-1.5 text-xs font-medium text-white/60" aria-label="Breadcrumb">
          <NuxtLink :to="localePath('/')" class="hover:text-white transition-colors">{{ t('nav.home') }}</NuxtLink>
          <span class="text-white/40" aria-hidden="true">/</span>
          <span class="text-white font-semibold" aria-current="page">{{ locale === 'ar' ? 'خدماتنا' : 'Services' }}</span>
        </nav>

        <!-- Centered Page Title -->
        <h1 class="font-heading text-4xl font-extrabold tracking-tight text-white mb-4 leading-tight">
          {{ locale === 'ar' ? 'خدماتنا' : 'Our Services' }}
        </h1>

        <!-- Concise Subtitle -->
        <p class="text-sm sm:text-base text-white/80 max-w-2xl mx-auto leading-relaxed">
          {{ locale === 'ar'
            ? 'فحص دوري، أتمتة خطوط الإنتاج، برمجة لوحات PLC، وتركيب الأنظمة الذكية بأيدي مهندسين معتمدين.'
            : 'Certified diagnostics, line automation, PLC cabinet programming, and smart telemetry tailored for modern industrial facilities.' }}
        </p>
      </div>
    </section>

    <!-- 2. Services Grid Section: Eyebrow + Heading + 3-Col Card Grid -->
    <section class="py-14 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

      <!-- Section Header -->
      <div class="text-center max-w-3xl mx-auto mb-10">
        <div class="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-primary mb-3 backdrop-blur-xs">
          <Sparkles class="h-3.5 w-3.5" aria-hidden="true" />
          <span>{{ locale === 'ar' ? 'ما نقدمه لشركائنا' : 'What We Offer' }}</span>
        </div>

        <h2 class="font-heading text-2xl sm:text-4xl lg:text-5xl font-extrabold text-text tracking-tight mb-3">
          {{ locale === 'ar' ? 'خدمات هندسية وصناعية متكاملة وموثوقة' : 'Complete Engineering & Industrial Services' }}
        </h2>

        <p class="text-sm sm:text-base text-muted leading-relaxed max-w-2xl mx-auto">
          {{ locale === 'ar'
            ? 'حلول تقنية متقدمة تلبي متطلبات خطوط الإنتاج والورش والمصانع بأعلى معايير الجودة والأمان التشغيلي.'
            : 'Advanced technical solutions engineered for production lines, workshops, and industrial facilities with maximum uptime.' }}
        </p>

        <div class="h-1 w-12 bg-accent mx-auto rounded-full mt-4"></div>
      </div>

      <!-- Search & Category Filters -->
      <div class="mb-10 space-y-4">
        <!-- Live Search Input -->
        <div class="mx-auto max-w-xl">
          <div class="relative flex items-center">
            <Search class="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              v-model="searchQuery"
              type="search"
              :placeholder="locale === 'ar' ? 'ابحث باسم الخدمة (صيانة، PLC، حساسات، نيوماتيك...)' : 'Search services by name (repair, PLC, IoT, pneumatics...)'"
              class="h-11 sm:h-12 w-full rounded-2xl border border-border bg-surface ps-11 pe-10 text-xs sm:text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-xs"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="absolute end-3 text-slate-400 hover:text-muted p-1"
              @click="searchQuery = ''"
            >
              <RotateCcw class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- Filter Category Tabs -->
        <div class="flex flex-wrap items-center justify-center gap-2 pt-2">
          <button
            v-for="cat in categories"
            :key="cat.id"
            type="button"
            class="rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer"
            :class="selectedCategory === cat.id
              ? 'bg-accent text-on-accent shadow-md'
              : 'border border-border bg-surface text-muted hover:border-primary hover:text-primary'"
            @click="selectedCategory = cat.id"
          >
            {{ locale === 'ar' ? cat.labelAr : cat.labelEn }}
          </button>
        </div>
      </div>

      <!-- Services Grid: 3 cols desktop, 2 cols tablet, 1 col mobile -->
      <!-- Each card links to its dedicated /services/[id] page with its own dynamic form -->
      <div
        v-if="filteredServices.length"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 lg:gap-8"
      >
        <NuxtLink
          v-for="srv in filteredServices"
          :key="srv.id"
          :to="localePath(`/services/${srv.id}`)"
          class="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-bg p-6 sm:p-7 shadow-xs hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 h-full"
          :class="[
            srv.isFeatured
              ? 'border-s-4 border-s-accent border-border'
              : 'border-border hover:border-primary'
          ]"
        >
          <div>
            <!-- Top: Icon Badge + Category Tag -->
            <div class="flex items-center justify-between gap-3 mb-5">
              <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:scale-105 group-hover:bg-accent group-hover:text-on-accent transition-all duration-300 shadow-xs">
                <component :is="srv.icon" class="h-7 w-7" aria-hidden="true" />
              </div>

              <span class="rounded-full bg-border/40 px-3 py-1 text-[11px] font-mono font-bold text-muted">
                {{ srv.tag }}
              </span>
            </div>

            <!-- Sponsored Label (Change 13) -->
            <span
              v-if="srv.isFeatured"
              class="mb-1.5 inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-wider text-primary"
            >
              ★ {{ locale === 'ar' ? 'خدمة مميزة' : 'Featured Service' }}
            </span>

            <!-- Service Title -->
            <h3 class="font-heading text-xl sm:text-2xl font-bold text-text group-hover:text-primary transition-colors leading-snug line-clamp-2 mb-3">
              {{ srv.name }}
            </h3>

            <!-- Service Description -->
            <p class="text-xs sm:text-sm text-muted leading-relaxed line-clamp-3 mb-6">
              {{ srv.description }}
            </p>
          </div>

          <!-- Bottom: Action Link with Circular Arrow Button -->
          <div class="mt-auto pt-4 border-t border-border flex items-center justify-between">
            <span class="text-xs sm:text-sm font-bold text-primary group-hover:underline">
              {{ locale === 'ar' ? 'طلب الخدمة والتفاصيل' : 'Request Service & Details' }}
            </span>

            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-border/40 text-muted group-hover:bg-accent group-hover:text-on-accent transition-all duration-300 shadow-xs group-hover:scale-110" aria-hidden="true">
              <ArrowRight class="h-4 w-4 rtl:rotate-180 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
            </span>
          </div>
        </NuxtLink>
      </div>

      <!-- Empty State -->
      <div
        v-else
        class="rounded-2xl border border-border bg-bg p-12 sm:p-16 text-center shadow-xs"
      >
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Search class="h-8 w-8" />
        </div>
        <h3 class="font-heading text-xl sm:text-2xl font-bold text-text mb-2">
          {{ locale === 'ar' ? 'لم نجد خدمة مطابقة لبحثك' : 'No Matching Services Found' }}
        </h3>
        <p class="text-sm text-muted max-w-sm mx-auto mb-6">
          {{ locale === 'ar' ? 'جرّب البحث باسم مختلف أو تصفح جميع الخدمات الهندسية المتاحة.' : 'Try searching with different terms or reset the filters to see all available services.' }}
        </p>
        <button
          type="button"
          class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-7 text-xs sm:text-sm font-bold text-on-accent shadow-xs hover:bg-accent-hover active:scale-95 transition-all cursor-pointer"
          @click="clearFilters"
        >
          <RotateCcw class="h-4 w-4" />
          <span>{{ locale === 'ar' ? 'عرض كل الخدمات' : 'View All Services' }}</span>
        </button>
      </div>

    </section>

  </div>
</template>
