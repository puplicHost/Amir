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
  <div class="space-y-0 selection:bg-[#F5CC07] selection:text-slate-950">

    <!-- 1. Hero Band: Centered Title + Breadcrumb on Dark Themed Banner -->
    <section class="relative overflow-hidden bg-[#0B1520] text-white border-b border-slate-800">
      <!-- Ambient Lighting Highlights -->
      <div class="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#2B71AE]/20 blur-3xl"></div>
      <div class="pointer-events-none absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-[#285E8E]/25 blur-[130px]"></div>

      <!-- Technical Circuit Grid Overlay -->
      <div
        class="pointer-events-none absolute inset-0 opacity-[0.06]"
        style="background-image: radial-gradient(#2B71AE 1px, transparent 1px); background-size: 24px 24px;"
      ></div>

      <!-- Deep Dark Contrast Scrim -->
      <div class="absolute inset-0 bg-gradient-to-t from-[#0B1520] via-[#0B1520]/85 to-[#0B1520]/75"></div>

      <div class="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20 text-center">
        <!-- Eyebrow Pill -->
        <div class="inline-flex items-center gap-1.5 rounded-full border border-[#F5CC07]/30 bg-[#F5CC07]/10 px-4 py-1.5 text-xs sm:text-sm font-semibold text-[#F5CC07] shadow-sm backdrop-blur-md mb-4">
          <Wrench class="h-3.5 w-3.5 text-[#F5CC07]" aria-hidden="true" />
          <span>{{ locale === 'ar' ? 'حلول وتوريدات صناعية معتمدة' : 'Certified Engineering Solutions' }}</span>
        </div>

        <!-- Centered Page Title -->
        <h1 class="font-heading text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4 leading-tight">
          {{ locale === 'ar' ? 'خدماتنا' : 'Our Services' }}
        </h1>

        <!-- Centered Breadcrumb (Mirrored in RTL) -->
        <nav class="mb-5 flex items-center justify-center gap-2 text-xs sm:text-sm font-medium text-slate-400" aria-label="Breadcrumb">
          <NuxtLink :to="localePath('/')" class="hover:text-white transition-colors">{{ t('nav.home') }}</NuxtLink>
          <span class="text-slate-600" aria-hidden="true">/</span>
          <span class="text-[#F5CC07] font-semibold" aria-current="page">{{ locale === 'ar' ? 'خدماتنا' : 'Services' }}</span>
        </nav>

        <!-- Concise Subtitle -->
        <p class="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
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
        <div class="inline-flex items-center gap-1.5 rounded-full border border-[#F5CC07]/30 bg-[#F5CC07]/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#F5CC07] mb-3 backdrop-blur-xs">
          <Sparkles class="h-3.5 w-3.5" aria-hidden="true" />
          <span>{{ locale === 'ar' ? 'ما نقدمه لشركائنا' : 'What We Offer' }}</span>
        </div>

        <h2 class="font-heading text-2xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
          {{ locale === 'ar' ? 'خدمات هندسية وصناعية متكاملة وموثوقة' : 'Complete Engineering & Industrial Services' }}
        </h2>

        <p class="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
          {{ locale === 'ar'
            ? 'حلول تقنية متقدمة تلبي متطلبات خطوط الإنتاج والورش والمصانع بأعلى معايير الجودة والأمان التشغيلي.'
            : 'Advanced technical solutions engineered for production lines, workshops, and industrial facilities with maximum uptime.' }}
        </p>

        <div class="h-1 w-12 bg-[#F5CC07] mx-auto rounded-full mt-4"></div>
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
              class="h-11 sm:h-12 w-full rounded-2xl border border-slate-200 bg-white ps-11 pe-10 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:border-slate-800 dark:bg-[#162032] dark:text-white dark:focus:border-[#F5CC07] dark:focus:ring-[#F5CC07]/20 transition-all shadow-xs"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="absolute end-3 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
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
              ? 'bg-[#2B71AE] text-white shadow-md dark:bg-[#F5CC07] dark:text-slate-950'
              : 'border border-slate-200 bg-white text-slate-700 hover:border-[#2B71AE] hover:text-[#2B71AE] dark:border-slate-800 dark:bg-[#162032] dark:text-slate-300 dark:hover:border-[#F5CC07] dark:hover:text-[#F5CC07]'"
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
          class="group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white p-6 sm:p-7 shadow-xs hover:-translate-y-1.5 hover:shadow-xl dark:bg-[#162032] transition-all duration-300"
          :class="[
            srv.isFeatured
              ? 'border-s-4 border-s-[#F5CC07] border-slate-200/90 dark:border-slate-800'
              : 'border-slate-200/90 hover:border-[#2B71AE] dark:border-slate-800 dark:hover:border-[#2B71AE]'
          ]"
        >
          <div>
            <!-- Top: Icon Badge + Category Tag -->
            <div class="flex items-center justify-between gap-3 mb-5">
              <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#2B71AE]/10 text-[#2B71AE] dark:bg-[#2B71AE]/25 dark:text-blue-300 group-hover:scale-105 group-hover:bg-[#2B71AE] group-hover:text-white transition-all duration-300 shadow-xs">
                <component :is="srv.icon" class="h-7 w-7" aria-hidden="true" />
              </div>

              <span class="rounded-full bg-slate-100 dark:bg-slate-800/90 px-3 py-1 text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
                {{ srv.tag }}
              </span>
            </div>

            <!-- Sponsored Label (Change 13) -->
            <span
              v-if="srv.isFeatured"
              class="mb-1.5 inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-wider text-[#d4af00] dark:text-[#F5CC07]"
            >
              ★ {{ locale === 'ar' ? 'خدمة مميزة' : 'Featured Service' }}
            </span>

            <!-- Service Title -->
            <h3 class="font-heading text-xl sm:text-2xl font-bold text-slate-900 group-hover:text-[#2B71AE] dark:text-white dark:group-hover:text-[#F5CC07] transition-colors leading-snug line-clamp-2 mb-3">
              {{ srv.name }}
            </h3>

            <!-- Service Description -->
            <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3 mb-6">
              {{ srv.description }}
            </p>
          </div>

          <!-- Bottom: Action Link with Circular Arrow Button -->
          <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span class="text-xs sm:text-sm font-bold text-[#2B71AE] dark:text-[#F5CC07] group-hover:underline">
              {{ locale === 'ar' ? 'طلب الخدمة والتفاصيل' : 'Request Service & Details' }}
            </span>

            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 group-hover:bg-[#2B71AE] group-hover:text-white dark:group-hover:bg-[#F5CC07] dark:group-hover:text-slate-950 transition-all duration-300 shadow-xs group-hover:scale-110" aria-hidden="true">
              <ArrowRight class="h-4 w-4 rtl:rotate-180 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
            </span>
          </div>
        </NuxtLink>
      </div>

      <!-- Empty State -->
      <div
        v-else
        class="rounded-2xl border border-slate-200/90 bg-white p-12 sm:p-16 text-center shadow-xs dark:border-slate-800 dark:bg-[#162032]"
      >
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#2B71AE]/10 text-[#2B71AE] dark:bg-[#F5CC07]/15 dark:text-[#F5CC07]">
          <Search class="h-8 w-8" />
        </div>
        <h3 class="font-heading text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {{ locale === 'ar' ? 'لم نجد خدمة مطابقة لبحثك' : 'No Matching Services Found' }}
        </h3>
        <p class="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
          {{ locale === 'ar' ? 'جرّب البحث باسم مختلف أو تصفح جميع الخدمات الهندسية المتاحة.' : 'Try searching with different terms or reset the filters to see all available services.' }}
        </p>
        <button
          type="button"
          class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2B71AE] px-7 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#285E8E] active:scale-95 transition-all cursor-pointer"
          @click="clearFilters"
        >
          <RotateCcw class="h-4 w-4" />
          <span>{{ locale === 'ar' ? 'عرض كل الخدمات' : 'View All Services' }}</span>
        </button>
      </div>

    </section>

  </div>
</template>
