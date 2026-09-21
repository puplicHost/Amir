<script setup lang="ts">
const props = defineProps<{ categorySlug?: string }>()

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

const search = ref(String(route.query.search || ''))
const minPrice = ref(String(route.query.minPrice || ''))
const maxPrice = ref(String(route.query.maxPrice || ''))
const attrKey = ref('')
const attrValue = ref('')
const sort = ref(String(route.query.sort || ''))
const page = ref(Number(route.query.page) || 1)
const mobileFilters = ref(false)

try {
  const a = JSON.parse(String(route.query.attributes || '[]'))
  if (Array.isArray(a) && a[0]) {
    attrKey.value = String(a[0].key || '')
    attrValue.value = String(a[0].value || '')
  }
}
catch { /* ignore */ }

const { data: catData } = await useAsyncData('catalog-categories', () =>
  $fetch<{ categories: { slug: string, nameAr: string, nameEn: string }[] }>('/api/categories'),
)

const query = computed(() => {
  const q: Record<string, string> = {
    page: String(page.value),
    sort: sort.value,
    search: search.value.trim(),
    minPrice: minPrice.value,
    maxPrice: maxPrice.value,
  }
  if (props.categorySlug) q.category = props.categorySlug
  if (attrKey.value || attrValue.value) {
    q.attributes = JSON.stringify([{ key: attrKey.value, value: attrValue.value }])
  }
  const clean: Record<string, string> = {}
  for (const [k, v] of Object.entries(q)) if (v) clean[k] = v
  return clean
})

const { data, pending } = await useAsyncData(
  () => `catalog-${props.categorySlug || 'all'}-${JSON.stringify(query.value)}`,
  () => $fetch<{ products: never[], total: number, pages: number }>(`/api/products?${new URLSearchParams(query.value)}`),
  { watch: [query] },
)

async function apply() {
  page.value = 1
  mobileFilters.value = false
  await router.replace({ query: { ...query.value, page: undefined } })
}

function gotoPage(p: number) {
  page.value = p
  if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
}

</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8">
    <div class="mb-4 flex flex-wrap items-center gap-2">
      <input
        v-model="search"
        type="search"
        :placeholder="t('products.search')"
        class="h-11 min-w-0 flex-1 rounded border bg-transparent px-3"
        :style="{ borderColor: 'var(--color-border)' }"
        @keyup.enter="apply"
      />
      <select v-model="sort" class="h-11 rounded border bg-transparent px-2 text-sm" :style="{ borderColor: 'var(--color-border)' }" @change="apply">
        <option value="">{{ t('products.sortDefault') }}</option>
        <option value="price_asc">{{ t('products.sortPriceAsc') }}</option>
        <option value="price_desc">{{ t('products.sortPriceDesc') }}</option>
        <option value="newest">{{ t('products.sortNewest') }}</option>
      </select>
      <button type="button" class="h-11 rounded border px-4 text-sm md:hidden" :style="{ borderColor: 'var(--color-border)' }" @click="mobileFilters = !mobileFilters">
        {{ t('products.filters') }}
      </button>
      <button type="button" class="hidden h-11 rounded bg-[#2B71AE] px-5 font-semibold text-white md:block" @click="apply">{{ t('common.apply') }}</button>
    </div>

    <div class="gap-6 md:flex">
      <aside class="mb-4 w-full shrink-0 md:mb-0 md:w-60" :class="{ hidden: !mobileFilters, block: mobileFilters, 'md:block': true }">
        <div class="rounded-md border p-4" :style="{ borderColor: 'var(--color-border)' }">
          <template v-if="!categorySlug">
            <p class="mb-2 text-sm font-semibold">{{ t('products.category') }}</p>
            <div class="mb-4 flex flex-wrap gap-1.5">
              <NuxtLink
                v-for="c in catData?.categories || []"
                :key="c.slug"
                :to="`/products/${c.slug}`"
                class="rounded-full border px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                :style="{ borderColor: 'var(--color-border)' }"
              >
                {{ locale === 'ar' ? c.nameAr : c.nameEn }}
              </NuxtLink>
            </div>
          </template>
          <p class="mb-2 text-sm font-semibold">{{ t('products.priceRange') }}</p>
          <div class="mb-4 flex items-center gap-2">
            <input v-model="minPrice" type="number" min="0" :placeholder="t('products.min')" class="h-10 w-full rounded border bg-transparent px-2 text-sm" :style="{ borderColor: 'var(--color-border)' }" />
            <span class="text-slate-400">–</span>
            <input v-model="maxPrice" type="number" min="0" :placeholder="t('products.max')" class="h-10 w-full rounded border bg-transparent px-2 text-sm" :style="{ borderColor: 'var(--color-border)' }" />
          </div>
          <p class="mb-2 text-sm font-semibold">{{ t('products.attribute') }}</p>
          <div class="mb-4 grid grid-cols-2 gap-2">
            <input v-model="attrKey" :placeholder="t('products.attrKeyPh')" class="h-10 rounded border bg-transparent px-2 text-sm" :style="{ borderColor: 'var(--color-border)' }" />
            <input v-model="attrValue" :placeholder="t('products.attrValuePh')" class="h-10 rounded border bg-transparent px-2 text-sm" :style="{ borderColor: 'var(--color-border)' }" />
          </div>
          <button type="button" class="h-10 w-full rounded bg-[#2B71AE] text-sm font-semibold text-white md:hidden" @click="apply">{{ t('products.applyFilters') }}</button>
        </div>
      </aside>

      <div class="flex-1">
        <p v-if="pending" class="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Loading">
          <span v-for="i in 8" :key="i" class="h-64 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
        </p>
        <div v-else-if="data?.products?.length" class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <AppProductCard v-for="p in data.products" :key="(p as {slug:string}).slug" :product="p as never" />
        </div>
        <div v-else class="rounded-md border px-4 py-16 text-center" :style="{ borderColor: 'var(--color-border)' }">
          <p class="font-heading text-xl font-bold">{{ t('products.noResults') }}</p>
          <p class="mt-1 text-sm text-slate-500">{{ t('products.noResultsHint') }}</p>
          <NuxtLink to="/products" class="mt-4 inline-block rounded bg-[#2B71AE] px-5 py-2.5 text-sm font-semibold text-white">{{ t('products.browseAll') }}</NuxtLink>
        </div>
        <AppPagination v-if="data" :page="page" :pages="data.pages" @change="gotoPage" />
      </div>
    </div>
  </div>
</template>
