<script setup lang="ts">
import {
  ArrowRight,
  RotateCcw,
  Search,
  Wrench,
} from 'lucide-vue-next'
import { SERVICE_SECTIONS, centsToEur } from '~~/shared/booking'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { trackViewContent } = useMetaEvents()

onMounted(() => {
  trackViewContent({ content_name: 'Services Catalog' })
})

const siteSeo = await useSiteSeo()

// No page-specific SEO exists for the Services list → site-wide fallback applies.
useHead(() => {
  const pageName = locale.value === 'de' ? 'Unsere Leistungen' : 'Our Services'
  const title = applySeoTitle(
    siteSeo.value?.titleTemplateEn,
    pageName,
    `${pageName} | ${t('brand.name')}`,
  )
  const description = locale.value === 'de'
    ? 'Exklusive Haarpflege und professionelle Kosmetikbehandlungen in Meitingen.'
    : 'Hair styling and beauty care treatments in Meitingen.'
  return {
    title,
    meta: [
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
    ],
  }
})

// Active services from database, grouped by section. Cards are display-only
// (booking flow lands in Phase 2c).
const { data: services } = await useAsyncData('services-list', () =>
  $fetch<any[]>('/api/services'),
)

const { data: heroGeneral } = await useAsyncData('hero-general', () => $fetch<any>('/api/settings/general'))

const searchQuery = ref('')

const grouped = computed(() => SERVICE_SECTIONS.map(section => ({
  section,
  items: (services.value || [])
    .filter((srv: any) => srv.section === section)
    .filter((srv: any) => {
      if (!searchQuery.value.trim()) return true
      const q = searchQuery.value.toLowerCase().trim()
      return (srv.name || '').toLowerCase().includes(q)
        || (srv.description || '').toLowerCase().includes(q)
    })
    .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
})))

const hasResults = computed(() => grouped.value.some(g => g.items.length > 0))

function clearFilters() {
  searchQuery.value = ''
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
          <span class="text-white font-semibold" aria-current="page">{{ t('nav.services') }}</span>
        </nav>

        <!-- Centered Page Title -->
        <h1 class="font-heading text-4xl font-extrabold tracking-tight text-white mb-4 leading-tight">
          {{ t('home.servicesTitle') }}
        </h1>

        <!-- Concise Subtitle -->
        <p class="text-sm sm:text-base text-white/80 max-w-2xl mx-auto leading-relaxed">
          {{ t('home.servicesSubtitle') }}
        </p>
      </div>
    </section>

    <!-- 2. Services Section: grouped by section -->
    <section class="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

      <!-- Live Search Input -->
      <div class="mb-12 space-y-4">
        <div class="mx-auto max-w-[500px]">
          <div class="relative flex items-center">
            <Search class="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              v-model="searchQuery"
              type="search"
              :placeholder="locale === 'ar' ? 'ابحث باسم الخدمة...' : 'Search services by name...'"
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
      </div>

      <div v-if="hasResults" class="space-y-12">
        <section v-for="group in grouped" :key="group.section" :aria-label="group.section">
          <h2 class="mb-4 font-heading text-xl sm:text-2xl font-extrabold text-text">
            {{ group.section }}
          </h2>
          <div
            v-if="group.items.length"
            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch"
          >
            <div
              v-for="srv in group.items"
              :key="srv.id"
              class="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-white dark:bg-[#1A1D2E] p-5 sm:p-6 shadow-sm hover:border-primary hover:shadow-md transition-all duration-300 h-full"
            >
              <div>
                <div class="flex items-center justify-between gap-3 mb-4">
                  <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] dark:bg-[#2B71AE]/20 text-[#2B71AE] dark:text-blue-300 shadow-xs">
                    <Wrench class="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div class="text-end">
                    <p class="font-mono text-sm font-black text-primary">
                      {{ t('services.priceAb') }} {{ centsToEur(Number(srv.priceAbCents || 0)) }}
                    </p>
                    <p class="text-[11px] text-muted">
                      {{ srv.durationMin }} {{ t('services.minutes') }}
                    </p>
                  </div>
                </div>

                <h3 class="font-heading text-lg font-bold text-text group-hover:text-primary transition-colors leading-snug line-clamp-2 mb-2">
                  {{ srv.name }}
                </h3>

                <p v-if="srv.description" class="text-sm text-muted leading-relaxed line-clamp-3 mb-6">
                  {{ srv.description }}
                </p>
              </div>

              <div class="mt-auto pt-4 border-t border-border">
                <NuxtLink
                  :to="localePath(`/booking/${srv.slug}`)"
                  class="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#F5CC07] text-sm font-bold text-slate-950 group-hover:bg-yellow-400 active:scale-[0.98] transition-colors"
                >
                  <span>{{ t('services.bookNow') }}</span>
                  <ArrowRight class="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                </NuxtLink>
              </div>
            </div>
          </div>
        </section>
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
          {{ locale === 'ar' ? 'جرّب البحث باسم مختلف أو تصفح جميع الخدمات المتاحة.' : 'Try searching with different terms or reset the filters to see all available services.' }}
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
