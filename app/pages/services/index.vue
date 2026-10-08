<script setup lang="ts">
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Battery,
  Building2,
  CheckCircle,
  Cpu,
  Database,
  Flame,
  Gauge,
  GitBranch,
  Hammer,
  Layers,
  Monitor,
  Package,
  Radio,
  RotateCcw,
  Search,
  Server,
  Settings,
  Shield,
  Sparkles,
  Wifi,
  Wind,
  Wrench,
  Zap,
} from 'lucide-vue-next'

const { t, locale } = useI18n()
const localePath = useLocalePath()

const siteSeo = await useSiteSeo()

// No page-specific SEO exists for the Services list → site-wide fallback applies.
useHead(() => {
  const pageName = locale.value === 'ar' ? 'خدماتنا الهندسية' : 'Our Engineering Services'
  const title = applySeoTitle(
    locale.value === 'ar' ? siteSeo.value?.titleTemplateAr : siteSeo.value?.titleTemplateEn,
    pageName,
    `${pageName} | ${t('brand.name')}`,
  )
  const description = (locale.value === 'ar' ? 'حلول متكاملة للمصانع والورش' : 'Integrated solutions for factories and workshops')
  return {
    title,
    meta: [
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
    ],
  }
})

// Active services from database. Each card links to its dedicated
// `/services/[id]` page which renders that service's own dynamic form.
const { data: services } = await useAsyncData('services-list', () =>
  $fetch<any[]>('/api/services'),
)

const { data: heroGeneral } = await useAsyncData('hero-general', () => $fetch<any>('/api/settings/general'))

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
    const resolvedIcon = (srv.iconName && serviceIconMap[srv.iconName]) || meta.icon
    const pillTag = locale.value === 'ar'
      ? (srv.tagAr || meta.tagAr)
      : (srv.tagEn || meta.tagEn)

    return {
      ...srv,
      icon: resolvedIcon,
      category: meta.category,
      tag: pillTag,
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
        <!-- Centered Breadcrumb -->
        <nav class="mb-4 flex items-center justify-center gap-1.5 text-xs font-medium text-white/60" aria-label="Breadcrumb">
          <NuxtLink :to="localePath('/')" class="hover:text-white transition-colors">{{ t('nav.home') }}</NuxtLink>
          <span class="text-white/40" aria-hidden="true">/</span>
          <span class="text-white font-semibold" aria-current="page">{{ locale === 'ar' ? 'خدماتنا' : 'Services' }}</span>
        </nav>

        <!-- Centered Page Title -->
        <h1 class="font-heading text-4xl font-extrabold tracking-tight text-white mb-4 leading-tight">
          {{ locale === 'ar' ? 'خدماتنا الهندسية' : 'Our Engineering Services' }}
        </h1>

        <!-- Concise Subtitle -->
        <p class="text-sm sm:text-base text-white/80 max-w-2xl mx-auto leading-relaxed">
          {{ locale === 'ar'
            ? 'حلول متكاملة للمصانع والورش'
            : 'Integrated solutions for factories and workshops' }}
        </p>
      </div>
    </section>

    <!-- 2. Services Grid Section: 80px padding top/bottom -->
    <section class="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

      <!-- Search & Category Filters -->
      <div class="mb-12 space-y-4">
        <!-- Live Search Input (Clean centered, max-width 500px, h-11, rounded-xl) -->
        <div class="mx-auto max-w-[500px]">
          <div class="relative flex items-center">
            <Search class="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              v-model="searchQuery"
              type="search"
              :placeholder="locale === 'ar' ? 'ابحث باسم الخدمة (صيانة، PLC، حساسات، نيوماتيك...)' : 'Search services by name (repair, PLC, IoT, pneumatics...)'"
              class="h-11 w-full rounded-xl border border-border bg-surface ps-10 pe-9 text-xs sm:text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-xs"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="absolute end-2.5 p-1 text-slate-400 hover:text-text transition-colors"
              @click="searchQuery = ''"
            >
              <RotateCcw class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <!-- Filter Category Tabs (Horizontal Scroll) -->
        <div class="flex items-center gap-2 overflow-x-auto justify-start sm:justify-center py-1.5 px-1 [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">
          <button
            v-for="cat in categories"
            :key="cat.id"
            type="button"
            class="shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer"
            :class="selectedCategory === cat.id
              ? 'bg-[#F5CC07] text-slate-950 shadow-sm'
              : 'border border-border bg-surface text-muted hover:border-primary hover:text-primary'"
            @click="selectedCategory = cat.id"
          >
            {{ locale === 'ar' ? cat.labelAr : cat.labelEn }}
          </button>
        </div>
      </div>

      <!-- Services Grid: 3-column (desktop) / 2-column (tablet) / 1-column (mobile), 24px gap, items-stretch -->
      <div
        v-if="filteredServices.length"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch"
      >
        <NuxtLink
          v-for="srv in filteredServices"
          :key="srv.id"
          :to="localePath(`/services/${srv.id}`)"
          class="group relative flex flex-col overflow-hidden rounded-xl bg-white dark:bg-[#1A1D2E] p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 h-full"
          :class="srv.isFeatured ? 'border-2 border-yellow-400' : 'border border-border hover:border-primary'"
        >
          <div>
            <!-- Top: Icon in #EFF6FF square (48x48px, rounded-lg) + Category Tag Pill -->
            <div class="flex items-center justify-between gap-3 mb-4">
              <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] dark:bg-[#2B71AE]/20 text-[#2B71AE] dark:text-blue-300 shadow-xs">
                <component :is="srv.icon" class="h-6 w-6" aria-hidden="true" />
              </div>

              <div class="flex items-center gap-1.5 flex-wrap justify-end">
                <span
                  v-if="srv.isFeatured"
                  class="inline-flex items-center rounded-full bg-yellow-400/15 border border-yellow-400/50 px-2 py-0.5 text-[11px] font-bold text-yellow-800 dark:text-yellow-300"
                >
                  {{ locale === 'ar' ? 'مميز ★' : 'Featured ★' }}
                </span>
                <span class="inline-flex items-center border border-border text-xs rounded-full px-2.5 py-0.5 text-muted font-medium">
                  {{ srv.tag }}
                </span>
              </div>
            </div>

            <!-- Service Name: text-lg font-bold below icon row -->
            <h3 class="font-heading text-lg font-bold text-text group-hover:text-primary transition-colors leading-snug line-clamp-2 mb-2">
              {{ srv.name }}
            </h3>

            <!-- Service Description: text-sm text-muted line-clamp-3 -->
            <p class="text-sm text-muted leading-relaxed line-clamp-3 mb-6">
              {{ srv.description }}
            </p>
          </div>

          <!-- Bottom: Full-width Yellow Button [طلب الخدمة ←] -->
          <div class="mt-auto pt-4 border-t border-border">
            <span
              class="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#F5CC07] text-sm font-bold text-slate-950 group-hover:bg-yellow-400 active:scale-[0.98] transition-colors"
            >
              <span>{{ locale === 'ar' ? 'طلب الخدمة' : 'Request Service' }}</span>
              <ArrowRight class="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
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
