<script setup lang="ts">
import {
  RotateCcw,
  Search,
} from 'lucide-vue-next'
import { SERVICE_SECTIONS } from '~~/shared/booking'

const { t, te, locale } = useI18n()
const localePath = useLocalePath()

/** Translated display name for a service (DB stores German; EN comes from i18n). */
function serviceDisplayName(srv: any): string {
  const slug = srv?.slug || ''
  const fallback = srv?.name || ''
  if (!slug) return fallback
  const key = `serviceNames.${slug}`
  try {
    if (te(key)) {
      const translated = t(key)
      if (translated && translated !== key) return translated
    }
  }
  catch { /* fallback to DB name */ }
  return fallback
}
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
        || serviceDisplayName(srv).toLowerCase().includes(q)
        || (srv.description || '').toLowerCase().includes(q)
    })
    .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
})))

const hasResults = computed(() => grouped.value.some(g => g.items.length > 0))

/** Sections with active items (drives tabs + groups; follows search). */
const tabSections = computed(() => grouped.value.filter(g => g.items.length > 0))

function clearFilters() {
  searchQuery.value = ''
}

/** Display title for a section key: DAMEN -> Women (EN) / Damen (DE) */
function sectionTitle(section: string): string {
  const key = `serviceSections.${section}`
  try {
    if (te(key)) {
      const translated = t(key)
      if (translated && translated !== key) return translated
    }
  }
  catch { /* fallback below */ }
  return section.charAt(0) + section.slice(1).toLowerCase()
}

/** Scroll-spy for the sticky tab bar (presentation only). */
const activeSection = ref('')
function syncActiveFromScroll() {
  if (typeof window === 'undefined') return
  const y = window.scrollY + 150
  let current = ''
  for (const g of tabSections.value) {
    const el = document.getElementById(g.section)
    if (el && (el as HTMLElement).offsetTop <= y) current = g.section
  }
  if (current) activeSection.value = current
}

onMounted(() => {
  syncActiveFromScroll()
  window.addEventListener('scroll', syncActiveFromScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', syncActiveFromScroll)
})
</script>

<template>
  <div class="space-y-0 selection:bg-accent selection:text-on-accent">

    <!-- 1. Header Band: eyebrow, serif H1 with accent, factual sentence (left-aligned) -->
    <section
      class="relative overflow-hidden bg-navy bg-cover bg-center text-white"
      :style="heroGeneral?.heroImagePath ? `background-image: url('${heroGeneral.heroImagePath}')` : ''"
    >
      <div class="absolute inset-0" style="background: linear-gradient(to bottom, rgba(13,27,46,0.85), rgba(13,27,46,0.95))"></div>

      <svg class="absolute bottom-0 left-0 h-[72px] w-full sm:h-[110px]" viewBox="0 0 1440 110" preserveAspectRatio="none" aria-hidden="true" style="filter: drop-shadow(0 -10px 24px rgba(13,27,46,0.35))">
        <path class="fill-bg" d="M0,110 L0,60 C360,5 1080,5 1440,60 L1440,110 Z" />
      </svg>

      <div class="relative z-10 mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 pt-14 sm:pt-20 pb-24 sm:pb-28">
        <!-- Breadcrumb -->
        <nav class="mb-4 flex items-center gap-1.5 text-xs font-medium text-white/60" aria-label="Breadcrumb">
          <NuxtLink :to="localePath('/')" class="hover:text-white transition-colors">{{ t('nav.home') }}</NuxtLink>
          <span class="text-white/40" aria-hidden="true">/</span>
          <span class="text-white font-semibold" aria-current="page">{{ t('nav.services') }}</span>
        </nav>

        <!-- Eyebrow -->
        <p class="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-white/60">
          {{ t('services.eyebrow') }}
        </p>

        <!-- Serif H1 with accented word -->
        <h1 class="font-heading text-4xl font-medium tracking-tight text-white mb-4 leading-tight text-balance">
          {{ t('services.pageTitle') }} <em class="italic">{{ t('services.pageTitleAccent') }}</em>
        </h1>

        <!-- Short factual sentence -->
        <p class="text-[15px] sm:text-base text-white/80 max-w-2xl leading-relaxed text-pretty">
          {{ t('home.servicesSubtitle') }}
        </p>
      </div>
    </section>

    <!-- 2. Sticky tab bar (anchor scroll, snap on mobile, safe-area aware) -->
    <div class="sticky z-30 border-b border-border bg-bg/95 backdrop-blur-sm [top:calc(4rem+env(safe-area-inset-top))]">
      <div class="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <nav
          class="flex gap-6 overflow-x-auto snap-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          :aria-label="t('home.servicesTitle') + ' ' + t('home.servicesTitleAccent')"
        >
          <a
            v-for="g in tabSections"
            :key="g.section"
            :href="'#' + g.section"
            class="snap-start whitespace-nowrap border-b py-3 text-[12px] font-semibold uppercase tracking-[0.12em] transition-colors"
            :class="activeSection === g.section
              ? '-mb-px border-text text-text'
              : 'border-transparent text-muted hover:text-text'"
            @click="activeSection = g.section"
          >
            {{ sectionTitle(g.section) }}
          </a>
        </nav>
      </div>
    </div>

    <!-- 3. Services content -->
    <section class="py-12 sm:py-16 px-5 sm:px-6 lg:px-8 max-w-7xl mx-auto">

      <!-- Live Search Input (same filtering behavior, restyled) -->
      <div class="mb-10 space-y-4">
        <div class="w-full max-w-[480px]">
          <div class="relative flex items-center">
            <Search class="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              v-model="searchQuery"
              type="search"
              :placeholder="locale === 'de' ? 'Leistungen nach Namen suchen...' : 'Search services by name...'"
              :aria-label="locale === 'de' ? 'Leistungen nach Namen suchen...' : 'Search services by name...'"
              class="h-11 w-full rounded-sm border border-border bg-surface ps-10 pe-9 text-xs sm:text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors shadow-xs"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="absolute end-1 flex h-11 w-11 items-center justify-center text-slate-400 hover:text-text transition-colors"
              :aria-label="t('common.clearSearch')"
              @click="searchQuery = ''"
            >
              <RotateCcw class="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div v-if="hasResults" class="space-y-12">
        <template v-for="group in grouped" :key="group.section">
        <section v-if="group.items.length" :id="group.section" :aria-label="group.section" class="scroll-mt-36">
          <div class="mb-5 flex flex-wrap items-baseline gap-x-3 border-b border-border pb-3">
            <h2 class="font-heading text-[28px] sm:text-4xl font-medium text-text text-balance">
              {{ sectionTitle(group.section) }}
            </h2>
            <span class="text-xs text-muted">{{ t('services.sectionCount', { n: group.items.length }) }}</span>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-5 items-stretch auto-rows-fr">
            <ServiceCard
              v-for="srv in group.items"
              :key="srv.id"
              :section="srv.section || group.section"
              :name="serviceDisplayName(srv)"
              :cover="srv.coverImagePath || null"
              :price-cents="Number(srv.priceAbCents || 0)"
              :duration-min="Number(srv.durationMin || 0)"
              :needs-duration-review="srv.needsDurationReview !== false"
              :to="localePath(`/booking/${srv.slug}`)"
            />
          </div>
        </section>
        </template>
      </div>

      <!-- Empty State -->
      <div
        v-else
        class="rounded-2xl border border-border bg-bg p-12 sm:p-16 text-center shadow-xs"
      >
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Search class="h-8 w-8" aria-hidden="true" />
        </div>
        <h3 class="font-heading text-xl sm:text-2xl font-bold text-text mb-2">
          {{ locale === 'de' ? 'Keine passenden Leistungen gefunden' : 'No Matching Services Found' }}
        </h3>
        <p class="text-sm text-muted max-w-sm mx-auto mb-6">
          {{ locale === 'de' ? 'Versuchen Sie andere Suchbegriffe oder setzen Sie die Filter zurück.' : 'Try searching with different terms or reset the filters to see all available services.' }}
        </p>
        <button
          type="button"
          class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-7 text-xs sm:text-sm font-bold text-on-accent shadow-xs hover:bg-accent-hover active:scale-95 transition cursor-pointer"
          @click="clearFilters"
        >
          <RotateCcw class="h-4 w-4" aria-hidden="true" />
          <span>{{ locale === 'de' ? 'Alle Leistungen anzeigen' : 'View All Services' }}</span>
        </button>
      </div>

    </section>

    <!-- Bottom spacer so the mobile booking bar never overlaps content -->
    <div class="h-[88px] md:hidden" aria-hidden="true" />

  </div>
</template>
