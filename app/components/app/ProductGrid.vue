<script setup lang="ts">
import { ArrowRight, ChevronDown, ChevronUp, Filter, RotateCcw, Search, SlidersHorizontal, Tag, X } from 'lucide-vue-next'

const props = defineProps<{ 
  categorySlug?: string
  offersOnly?: boolean
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const router = useRouter()
const quoteStore = useQuoteStore()

const search = ref(String(route.query.search || ''))
const minPrice = ref(String(route.query.minPrice || ''))
const maxPrice = ref(String(route.query.maxPrice || ''))
const sort = ref(String(route.query.sort || ''))
const page = ref(Number(route.query.page) || 1)
const mobileFilters = ref(false)

// Dynamic multi-attribute selections: { [key: string]: string[] }
const selectedAttributes = ref<Record<string, string[]>>({})

// Track which attribute groups are collapsed/expanded
const expandedAttrGroups = ref<Record<string, boolean>>({})

function initAttributesFromQuery() {
  const map: Record<string, string[]> = {}
  try {
    const raw = String(route.query.attributes || '[]')
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (item.key && item.value) {
          const k = String(item.key)
          const v = String(item.value)
          if (!map[k]) map[k] = []
          if (!map[k].includes(v)) map[k].push(v)
        }
      }
    }
  }
  catch { /* ignore */ }
  selectedAttributes.value = map
}

initAttributesFromQuery()

// Fetch available categories
const { data: catData } = await useAsyncData('catalog-categories', () =>
  $fetch<{ categories: { slug: string, nameAr: string, nameEn: string, _count?: { products: number } }[] }>('/api/categories'),
)

// Fetch store settings for pagination limit
const { data: storeSettings } = await useAsyncData('catalog-store-settings', () =>
  $fetch<{ productsPerPage: number }>('/api/settings/store'),
  { server: true, lazy: true },
)

const limit = computed(() => storeSettings.value?.productsPerPage || 16)

// Dynamic Facets Endpoint: provides real minPrice, maxPrice, and category-scoped attributes with counts
const { data: facetsData } = await useAsyncData(
  () => `catalog-facets-${props.offersOnly ? 'offers' : (props.categorySlug || 'all')}-${search.value.trim()}`,
  () => $fetch<{
    minPrice: number
    maxPrice: number
    attributes: { keyEn: string, keyAr: string, values: { valueEn: string, valueAr: string, count: number }[] }[]
  }>(`/api/products/facets?${new URLSearchParams({
    ...(props.categorySlug ? { category: props.categorySlug } : {}),
    ...(props.offersOnly ? { offers: 'true' } : {}),
    ...(search.value.trim() ? { search: search.value.trim() } : {}),
  })}`),
  { watch: [() => props.categorySlug, () => props.offersOnly] },
)

const attributesParam = computed(() => {
  const list: { key: string, value: string }[] = []
  for (const [key, vals] of Object.entries(selectedAttributes.value)) {
    for (const val of vals) {
      list.push({ key, value: val })
    }
  }
  return list.length ? JSON.stringify(list) : ''
})

const query = computed(() => {
  const q: Record<string, string> = {
    page: String(page.value),
    limit: String(limit.value),
    sort: sort.value,
    search: search.value.trim(),
    minPrice: minPrice.value,
    maxPrice: maxPrice.value,
  }
  if (props.categorySlug) q.category = props.categorySlug
  if (props.offersOnly) q.offers = 'true'
  if (attributesParam.value) q.attributes = attributesParam.value

  const clean: Record<string, string> = {}
  for (const [k, v] of Object.entries(q)) if (v) clean[k] = v
  return clean
})

const { data, pending } = await useAsyncData(
  () => `catalog-${props.categorySlug || 'all'}-${JSON.stringify(query.value)}`,
  () => $fetch<{ products: never[], total: number, pages: number }>(`/api/products?${new URLSearchParams(query.value)}`),
  { watch: [query] },
)

const hasActiveFilters = computed(() => {
  const hasAttr = Object.values(selectedAttributes.value).some(arr => arr.length > 0)
  return !!(search.value.trim() || minPrice.value || maxPrice.value || hasAttr || sort.value)
})

const resultCountText = computed(() => {
  if (!data.value) return ''
  const total = data.value.total
  if (total === 0) return locale.value === 'ar' ? 'لا توجد نتائج' : 'No results found'
  const start = (page.value - 1) * limit.value + 1
  const end = Math.min(page.value * limit.value, total)
  return locale.value === 'ar'
    ? `عرض ${start} - ${end} من إجمالي ${total} منتج`
    : `Showing ${start} - ${end} of ${total} products`
})

function isAttrSelected(key: string, val: string): boolean {
  return selectedAttributes.value[key]?.includes(val) || false
}

function toggleAttr(key: string, val: string) {
  const current = selectedAttributes.value[key] || []
  if (current.includes(val)) {
    selectedAttributes.value[key] = current.filter(v => v !== val)
    if (!selectedAttributes.value[key].length) {
      delete selectedAttributes.value[key]
    }
  }
  else {
    selectedAttributes.value[key] = [...current, val]
  }
  apply()
}

function isGroupOpen(key: string): boolean {
  return expandedAttrGroups.value[key] !== false
}

function toggleGroup(key: string) {
  expandedAttrGroups.value[key] = !isGroupOpen(key)
}

async function apply() {
  page.value = 1
  mobileFilters.value = false
  await router.replace({ query: { ...route.query, ...query.value, page: undefined } })
}

async function resetFilters() {
  search.value = ''
  minPrice.value = ''
  maxPrice.value = ''
  sort.value = ''
  selectedAttributes.value = {}
  page.value = 1
  mobileFilters.value = false
  await router.replace({ query: {} })
}

async function gotoPage(p: number) {
  page.value = p
  await router.replace({ query: { ...route.query, page: p > 1 ? String(p) : undefined } })
  if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
}

watch(() => props.categorySlug, () => {
  page.value = 1
  selectedAttributes.value = {}
  initAttributesFromQuery()
})

watch(() => route.query.page, (qp) => {
  const next = Number(qp) || 1
  if (next !== page.value) page.value = next
})

watch(() => route.query, (newQ) => {
  if (newQ.minPrice !== undefined) minPrice.value = String(newQ.minPrice)
  if (newQ.maxPrice !== undefined) maxPrice.value = String(newQ.maxPrice)
  if (newQ.search !== undefined) search.value = String(newQ.search)
  if (newQ.sort !== undefined) sort.value = String(newQ.sort)
  initAttributesFromQuery()
})
</script>

<template>
  <div class="mx-auto w-full max-w-[1536px] px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8">
    
    <!-- Top Toolbar: Live Result Count, Search Bar, Sort Dropdown & Action Controls -->
    <div 
      class="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3.5 rounded-xl border border-border bg-bg p-3 sm:px-4 sm:py-3 shadow-xs transition-colors"
      :style="{ borderColor: 'var(--color-border)' }"
    >
      <!-- Results Count -->
      <div class="flex items-center gap-2">
        <span class="font-mono text-xs font-semibold text-muted">
          {{ resultCountText }}
        </span>
      </div>

      <!-- Action Toolbar (Search, Sort, Apply, Mobile Filter Trigger, Reset) -->
      <div class="flex flex-wrap items-center gap-2.5">
        <!-- Search Input with Embedded Icon -->
        <div class="relative w-full sm:w-60 md:w-64">
          <Search class="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            v-model="search"
            type="search"
            :placeholder="t('products.search')"
            class="h-9 w-full rounded-lg border-border bg-surface ps-8 pe-3 text-xs text-text placeholder:text-slate-400 focus:border-primary focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            :style="{ borderColor: 'var(--color-border)' }"
            @keyup.enter="apply"
          />
        </div>

        <!-- Sort Select -->
        <select 
          v-model="sort" 
          class="h-9 rounded-lg border-border bg-surface px-2.5 text-xs font-semibold text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" 
          :style="{ borderColor: 'var(--color-border)' }" 
          @change="apply"
        >
          <option value="">{{ t('products.sortDefault') }}</option>
          <option value="price_asc">{{ t('products.sortPriceAsc') }}</option>
          <option value="price_desc">{{ t('products.sortPriceDesc') }}</option>
          <option value="newest">{{ t('products.sortNewest') }}</option>
        </select>

        <!-- Cohesive Apply Button -->
        <button 
          type="button" 
          class="inline-flex h-9 items-center justify-center rounded-lg bg-accent px-3.5 text-xs font-bold text-on-accent shadow-xs hover:bg-accent-hover active:scale-95 transition-all" 
          @click="apply"
        >
          <span>{{ t('common.apply') }}</span>
        </button>

        <!-- Mobile Filter Drawer Trigger (only visible on mobile/tablet < md) -->
        <button 
          type="button" 
          class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-bold text-muted hover:bg-border/40 md:hidden" 
          :style="{ borderColor: 'var(--color-border)' }" 
          @click="mobileFilters = true"
        >
          <SlidersHorizontal class="h-3.5 w-3.5 text-muted" />
          <span>{{ t('products.filters') }}</span>
        </button>

        <!-- Reset Button -->
        <button
          v-if="hasActiveFilters"
          type="button"
          class="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-medium text-muted hover:text-text transition-colors"
          :title="locale === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset filters'"
          @click="resetFilters"
        >
          <RotateCcw class="h-3.5 w-3.5" />
          <span class="hidden sm:inline">{{ locale === 'ar' ? 'إلغاء' : 'Reset' }}</span>
        </button>
      </div>
    </div>

    <!-- Main Content: Sibling Layout [ Products Content Column ] + [ Desktop Sticky Filters Sidebar ] -->
    <div class="flex flex-col md:flex-row items-start gap-6 lg:gap-8">
      
      <!-- DESKTOP STICKY FILTERS SIDEBAR (visible only on md and up; strictly sticky with fit-content & internal scroll) -->
      <aside 
        class="hidden md:block md:sticky md:top-20 md:h-fit md:max-h-[calc(100vh-6rem)] md:overflow-y-auto md:pe-1 w-56 lg:w-64 xl:w-68 shrink-0 self-start space-y-4 [scrollbar-width:thin]"
      >
        <!-- Category Navigation Block -->
        <div 
          class="rounded-xl border border-border bg-bg p-4 shadow-xs"
          :style="{ borderColor: 'var(--color-border)' }"
        >
          <div class="flex items-center justify-between mb-2.5 pb-2 border-b border-border">
            <h3 class="font-heading text-xs font-bold uppercase tracking-wider text-text">
              {{ t('products.category') }}
            </h3>
            <NuxtLink 
              v-if="categorySlug" 
              :to="localePath('/products')" 
              class="text-[11px] font-bold text-primary hover:underline"
            >
              {{ locale === 'ar' ? 'كل المنتجات' : 'All Products' }}
            </NuxtLink>
          </div>
          <ul class="space-y-0.5 text-xs max-h-52 overflow-y-auto pr-1">
            <li v-for="c in catData?.categories || []" :key="c.slug">
              <NuxtLink
                :to="localePath(`/products/${c.slug}`)"
                class="flex items-center justify-between rounded-lg px-2.5 py-1.5 font-medium transition-colors"
                :class="(categorySlug === c.slug || route.params.slug === c.slug) 
                  ? 'bg-primary/10 text-primary font-bold' 
                  : 'text-muted hover:bg-border/40 hover:text-primary'"
              >
                <span class="truncate">{{ locale === 'ar' ? c.nameAr : c.nameEn }}</span>
                <span v-if="c._count?.products" class="font-mono text-[10px] text-slate-400">
                  {{ c._count.products }}
                </span>
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Filter Parameters Card -->
        <div 
          class="rounded-xl border border-border bg-bg p-4 shadow-xs space-y-4" 
          :style="{ borderColor: 'var(--color-border)' }"
        >
          <!-- Price Range Filter -->
          <div>
            <h3 class="font-heading text-xs font-bold uppercase tracking-wider text-text mb-2 pb-1.5 border-b border-border">
              {{ t('products.priceRange') }} (EGP)
            </h3>
            <div class="flex items-center gap-1.5 pt-1">
              <input 
                v-model="minPrice" 
                type="number" 
                min="0" 
                :placeholder="facetsData?.minPrice !== undefined ? String(facetsData.minPrice) : t('products.min')" 
                class="h-8.5 w-full rounded-lg border-border bg-surface px-2 text-xs text-text focus:border-primary focus:outline-none" 
                :style="{ borderColor: 'var(--color-border)' }" 
                @keyup.enter="apply"
              />
              <span class="text-xs text-slate-400 font-bold">-</span>
              <input 
                v-model="maxPrice" 
                type="number" 
                min="0" 
                :placeholder="facetsData?.maxPrice !== undefined ? String(facetsData.maxPrice) : t('products.max')" 
                class="h-8.5 w-full rounded-lg border-border bg-surface px-2 text-xs text-text focus:border-primary focus:outline-none" 
                :style="{ borderColor: 'var(--color-border)' }" 
                @keyup.enter="apply"
              />
            </div>
            <div v-if="facetsData" class="mt-1 flex justify-between text-[10px] font-mono text-slate-400">
              <span>Min: {{ facetsData.minPrice }}</span>
              <span>Max: {{ facetsData.maxPrice }}</span>
            </div>
          </div>

          <!-- Dynamic Attributes Filters -->
          <template v-if="facetsData?.attributes?.length">
            <div 
              v-for="attr in facetsData.attributes" 
              :key="attr.keyEn" 
              class="border-t border-border pt-3"
            >
              <button
                type="button"
                class="flex w-full items-center justify-between text-start font-heading text-xs font-bold uppercase tracking-wider text-text mb-2"
                @click="toggleGroup(attr.keyEn)"
              >
                <span>{{ locale === 'ar' ? attr.keyAr : attr.keyEn }}</span>
                <ChevronUp v-if="isGroupOpen(attr.keyEn)" class="h-3.5 w-3.5 text-slate-400" />
                <ChevronDown v-else class="h-3.5 w-3.5 text-slate-400" />
              </button>

              <div v-if="isGroupOpen(attr.keyEn)" class="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                <label 
                  v-for="val in attr.values" 
                  :key="val.valueEn"
                  class="flex items-center justify-between text-xs cursor-pointer rounded px-1.5 py-1 hover:bg-surface transition-colors"
                  :class="isAttrSelected(attr.keyEn, val.valueEn) ? 'font-bold text-primary' : 'text-muted'"
                >
                  <span class="flex items-center gap-2 truncate">
                    <input 
                      type="checkbox" 
                      :checked="isAttrSelected(attr.keyEn, val.valueEn)" 
                      class="h-3.5 w-3.5 rounded border-border accent-accent" 
                      @change="toggleAttr(attr.keyEn, val.valueEn)"
                    />
                    <span class="truncate">{{ locale === 'ar' ? val.valueAr : val.valueEn }}</span>
                  </span>
                  <span class="ms-1.5 shrink-0 font-mono text-[10px] text-slate-400">
                    ({{ val.count }})
                  </span>
                </label>
              </div>
            </div>
          </template>

          <!-- Apply Filter Button inside Sidebar -->
          <div class="pt-2 border-t border-border">
            <button 
              type="button" 
              class="h-9 w-full rounded-lg bg-accent text-xs font-bold text-on-accent shadow-xs hover:bg-accent-hover active:scale-95 transition-all" 
              @click="apply"
            >
              {{ t('products.applyFilters') }}
            </button>
          </div>
        </div>
      </aside>

      <!-- PRODUCTS CONTENT COLUMN: Product Grid + Pagination together inside this column -->
      <div class="min-w-0 flex-1 w-full flex flex-col justify-between min-h-[480px]">
        
        <div>
          <!-- Loading State Skeleton -->
          <div v-if="pending" class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 w-full" aria-label="Loading catalog">
            <div v-for="i in 8" :key="i" class="overflow-hidden rounded-xl border border-border bg-bg p-3">
              <div class="aspect-square w-full animate-pulse rounded-lg bg-border mb-3" />
              <div class="h-4 w-2/3 animate-pulse rounded bg-border mb-2" />
              <div class="h-5 w-1/3 animate-pulse rounded bg-border mb-3" />
              <div class="h-8.5 w-full animate-pulse rounded-lg bg-border/40" />
            </div>
          </div>

          <!-- Populated Grid: 4 cards per row on large desktop (xl:grid-cols-4), 3 on lg, 2 on md/mobile -->
          <div v-else-if="data?.products?.length" class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 w-full">
            <AppProductCard 
              v-for="p in data.products" 
              :key="(p as {slug:string}).slug" 
              :product="p as never" 
            />
          </div>

          <!-- Empty State with Clear Filters CTA -->
          <div 
            v-else 
            class="rounded-2xl border border-border bg-bg px-6 py-16 text-center shadow-xs" 
            :style="{ borderColor: 'var(--color-border)' }"
          >
            <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Search class="h-6 w-6" />
            </div>
            <h3 class="font-heading text-xl font-bold text-text mb-1.5">
              {{ t('products.noResults') }}
            </h3>
            <p class="text-sm text-muted max-w-sm mx-auto mb-6">
              {{ t('products.noResultsHint') }}
            </p>
            <button 
              type="button"
              class="inline-flex h-10 items-center justify-center rounded-xl bg-accent px-6 text-xs font-bold text-on-accent shadow-xs hover:bg-accent-hover active:scale-95 transition-all"
              @click="resetFilters"
            >
              {{ locale === 'ar' ? 'إلغاء جميع الفلاتر وعرض المنتجات' : 'Clear Filters & Browse All' }}
            </button>
          </div>
        </div>

        <!-- Pagination Navigation: strictly within products content column, anchored at bottom -->
        <div class="mt-auto pt-6">
          <AppPagination 
            v-if="data && data.pages > 1" 
            :page="page" 
            :pages="data.pages" 
            @change="gotoPage" 
          />
        </div>

      </div>

    </div>

    <!-- RESPONSIVE MOBILE/TABLET DRAWER SHEET (< md) -->
    <Teleport to="body">
      <div 
        v-if="mobileFilters" 
        class="fixed inset-0 z-50 flex md:hidden"
        role="dialog"
        aria-modal="true"
      >
        <!-- Backdrop Overlay -->
        <div 
          class="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
          aria-hidden="true" 
          @click="mobileFilters = false" 
        />

        <!-- Slide-over Drawer Panel -->
        <div 
          class="relative ms-auto flex h-full w-full max-w-xs flex-col bg-bg shadow-2xl z-10"
        >
          <!-- Drawer Header -->
          <div class="flex h-14 items-center justify-between border-b px-4" :style="{ borderColor: 'var(--color-border)' }">
            <div class="flex items-center gap-2">
              <SlidersHorizontal class="h-4 w-4 text-primary" />
              <h2 class="font-heading text-sm font-bold text-text">
                {{ t('products.filters') }}
              </h2>
            </div>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-border/40 hover:text-text"
              :aria-label="locale === 'ar' ? 'إغلاق' : 'Close'"
              @click="mobileFilters = false"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <!-- Drawer Scrollable Content -->
          <div class="flex-1 overflow-y-auto p-4 space-y-4">
            <!-- Category Navigation -->
            <div class="rounded-xl border border-border bg-bg p-3.5 shadow-xs">
              <div class="flex items-center justify-between mb-2 pb-1.5 border-b border-border">
                <h3 class="font-heading text-xs font-bold uppercase tracking-wider text-text">
                  {{ t('products.category') }}
                </h3>
                <NuxtLink 
                  v-if="categorySlug" 
                  :to="localePath('/products')" 
                  class="text-[11px] font-bold text-primary hover:underline"
                  @click="mobileFilters = false"
                >
                  {{ locale === 'ar' ? 'كل المنتجات' : 'All Products' }}
                </NuxtLink>
              </div>
              <ul class="space-y-0.5 text-xs max-h-48 overflow-y-auto pr-1">
                <li v-for="c in catData?.categories || []" :key="c.slug">
                  <NuxtLink
                    :to="localePath(`/products/${c.slug}`)"
                    class="flex items-center justify-between rounded-lg px-2 py-1.5 font-medium transition-colors"
                    :class="(categorySlug === c.slug || route.params.slug === c.slug) 
                      ? 'bg-primary/10 text-primary font-bold' 
                      : 'text-muted hover:bg-border/40'"
                    @click="mobileFilters = false"
                  >
                    <span class="truncate">{{ locale === 'ar' ? c.nameAr : c.nameEn }}</span>
                    <span v-if="c._count?.products" class="font-mono text-[10px] text-slate-400">
                      {{ c._count.products }}
                    </span>
                  </NuxtLink>
                </li>
              </ul>
            </div>

            <!-- Price & Attributes -->
            <div class="rounded-xl border border-border bg-bg p-3.5 shadow-xs space-y-4">
              <!-- Price Filter -->
              <div>
                <h3 class="font-heading text-xs font-bold uppercase tracking-wider text-text mb-2 pb-1 border-b border-border">
                  {{ t('products.priceRange') }} (EGP)
                </h3>
                <div class="flex items-center gap-1.5 pt-1">
                  <input 
                    v-model="minPrice" 
                    type="number" 
                    min="0" 
                    :placeholder="facetsData?.minPrice !== undefined ? String(facetsData.minPrice) : t('products.min')" 
                    class="h-8.5 w-full rounded-lg border-border bg-surface px-2 text-xs text-text" 
                    :style="{ borderColor: 'var(--color-border)' }" 
                  />
                  <span class="text-xs text-slate-400 font-bold">-</span>
                  <input 
                    v-model="maxPrice" 
                    type="number" 
                    min="0" 
                    :placeholder="facetsData?.maxPrice !== undefined ? String(facetsData.maxPrice) : t('products.max')" 
                    class="h-8.5 w-full rounded-lg border-border bg-surface px-2 text-xs text-text" 
                    :style="{ borderColor: 'var(--color-border)' }" 
                  />
                </div>
              </div>

              <!-- Dynamic Attributes -->
              <template v-if="facetsData?.attributes?.length">
                <div 
                  v-for="attr in facetsData.attributes" 
                  :key="attr.keyEn" 
                  class="border-t border-border pt-3"
                >
                  <p class="font-heading text-xs font-bold uppercase tracking-wider text-text mb-2">
                    {{ locale === 'ar' ? attr.keyAr : attr.keyEn }}
                  </p>
                  <div class="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    <label 
                      v-for="val in attr.values" 
                      :key="val.valueEn"
                      class="flex items-center justify-between text-xs cursor-pointer rounded px-1.5 py-1"
                      :class="isAttrSelected(attr.keyEn, val.valueEn) ? 'font-bold text-primary' : 'text-muted'"
                    >
                      <span class="flex items-center gap-2 truncate">
                        <input 
                          type="checkbox" 
                          :checked="isAttrSelected(attr.keyEn, val.valueEn)" 
                          class="h-3.5 w-3.5 rounded accent-accent" 
                          @change="toggleAttr(attr.keyEn, val.valueEn)"
                        />
                        <span class="truncate">{{ locale === 'ar' ? val.valueAr : val.valueEn }}</span>
                      </span>
                      <span class="ms-1.5 font-mono text-[10px] text-slate-400">({{ val.count }})</span>
                    </label>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <!-- Drawer Footer Action -->
          <div class="p-4 border-t border-border bg-surface">
            <button 
              type="button" 
              class="h-10 w-full rounded-xl bg-accent text-xs font-bold text-on-accent shadow-xs hover:bg-accent-hover active:scale-95 transition-all" 
              @click="apply"
            >
              {{ t('products.applyFilters') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Persistent Floating Quote Selection Bar -->
    <Transition
      enter-active-class="transition duration-300 ease-out transform"
      enter-from-class="translate-y-12 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in transform"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-12 opacity-0"
    >
      <div 
        v-if="quoteStore.itemCount > 0"
        class="fixed bottom-5 inset-x-4 sm:inset-x-auto sm:end-8 z-40 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-navy/95 px-5 py-3.5 text-white shadow-2xl backdrop-blur-md sm:min-w-[380px]"
      >
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-on-accent font-black shadow-xs">
            {{ quoteStore.itemCount }}
          </div>
          <div>
            <p class="text-xs font-bold leading-tight text-white">
              {{ locale === 'ar' ? `تم تحديد ${quoteStore.itemCount} منتج لعرض السعر` : `${quoteStore.itemCount} product${quoteStore.itemCount > 1 ? 's' : ''} selected` }}
            </p>
            <p class="font-mono text-[11px] text-cream font-semibold mt-0.5">
              {{ quoteStore.totalAmount.toLocaleString() }} EGP
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="text-xs font-medium text-slate-400 hover:text-white px-2 py-1 transition-colors"
            :title="locale === 'ar' ? 'إلغاء التحديد' : 'Clear selection'"
            @click="quoteStore.clearQuote()"
          >
            {{ locale === 'ar' ? 'إلغاء' : 'Clear' }}
          </button>
          <NuxtLink
            :to="localePath('/quote')"
            class="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent px-4 text-xs font-bold text-on-accent shadow-xs hover:bg-accent-hover active:scale-95 transition-all"
          >
            <span>{{ locale === 'ar' ? 'إنشاء العرض' : 'Generate Quote' }}</span>
            <ArrowRight class="h-3.5 w-3.5 rtl:rotate-180" />
          </NuxtLink>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
aside::-webkit-scrollbar {
  width: 3px;
}
aside::-webkit-scrollbar-track {
  background: transparent;
}
aside::-webkit-scrollbar-thumb {
  background: rgb(var(--border) / 1);
  border-radius: 4px;
}
</style>
