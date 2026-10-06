<script setup lang="ts">
import { AlertTriangle, Boxes, ChevronLeft, ChevronRight, Package, RotateCcw, Search, Wallet } from 'lucide-vue-next'

definePageMeta({ layout: 'admin', middleware: 'admin-auth', requiredPermission: ['products.view', 'inventory.view'] })

const { locale } = useI18n()
const localePath = useLocalePath()

interface InventoryRow {
  id: string
  nameAr: string
  nameEn: string
  slug: string
  price: number
  costPrice: number | null
  stock: number
  minStock: number
  isActive: boolean
  category: { id: string, slug: string, nameAr: string, nameEn: string }
  coverImage: string | null
  stockValue: number
  status: 'ok' | 'low' | 'out'
}

const fetch = useRequestFetch()
const search = ref('')
const searchInput = ref('')
const lowOnly = ref(false)
const page = ref(1)
const perPage = ref(20)
let searchTimer: ReturnType<typeof setTimeout> | null = null

watch(searchInput, (v) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    search.value = v.trim()
    page.value = 1
  }, 300)
})

watch([lowOnly, perPage], () => {
  page.value = 1
})

const { data, pending, refresh } = await useAsyncData('admin-inventory', () =>
  fetch<{
    data: InventoryRow[]
    meta: { total: number, page: number, perPage: number, totalPages: number }
    summary: { totalValue: number, activeCount: number, lowCount: number, totalCount: number }
  }>(
    `/api/admin/inventory?${new URLSearchParams({
      search: search.value,
      lowStock: lowOnly.value ? 'true' : 'false',
      page: String(page.value),
      perPage: String(perPage.value),
    })}`,
  ),
  { watch: [search, lowOnly, page, perPage] },
)

const rows = computed(() => data.value?.data || [])
const meta = computed(() => data.value?.meta || { total: 0, page: 1, perPage: 20, totalPages: 1 })
const summary = computed(() => data.value?.summary || { totalValue: 0, activeCount: 0, lowCount: 0, totalCount: 0 })

const pageNumbers = computed(() => {
  const total = meta.value.totalPages
  const current = meta.value.page
  const pages: (number | '…')[] = []
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
    return pages
  }
  pages.push(1)
  if (current > 3) pages.push('…')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
  if (current < total - 2) pages.push('…')
  pages.push(total)
  return pages
})

const rangeText = computed(() => {
  if (!meta.value.total) return locale.value === 'ar' ? 'لا توجد منتجات' : 'No products'
  const from = (meta.value.page - 1) * meta.value.perPage + 1
  const to = Math.min(meta.value.page * meta.value.perPage, meta.value.total)
  return locale.value === 'ar'
    ? `عرض ${from}-${to} من ${meta.value.total} منتج`
    : `Showing ${from}-${to} of ${meta.value.total} products`
})

function gotoPage(p: number | '…') {
  if (p === '…' || p === meta.value.page) return
  page.value = p
}

function formatMoney(n: number): string {
  const f = (n || 0).toLocaleString(locale.value === 'ar' ? 'ar-EG' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return locale.value === 'ar' ? `${f} ج.م` : `${f} EGP`
}

function statusMeta(status: string) {
  if (status === 'out') {
    return {
      label: locale.value === 'ar' ? 'نفد' : 'Out',
      cls: 'bg-rose-700 text-white dark:bg-rose-900/70 dark:text-rose-200',
    }
  }
  if (status === 'low') {
    return {
      label: locale.value === 'ar' ? 'منخفض' : 'Low',
      cls: 'bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900/50',
    }
  }
  return {
    label: locale.value === 'ar' ? 'متوفر' : 'In stock',
    cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50',
  }
}
</script>

<template>
  <div>
    <AdminPageHeader
      :title="locale === 'ar' ? 'إدارة المخزون' : 'Inventory Management'"
      :description="locale === 'ar' ? 'متابعة كميات المخزون، حدود التنبيه، والقيمة المالية للمخزون.' : 'Track stock levels, alert thresholds, and inventory valuation.'"
    />

    <!-- Top bar: search + low-stock toggle -->
    <div
      class="mb-4 flex flex-wrap items-center gap-2.5 rounded-md border bg-white p-3.5 shadow-xs dark:bg-[#162032]"
      :style="{ borderColor: lowOnly ? '#f43f5e' : 'var(--color-border)' }"
    >
      <div class="relative min-w-48 flex-1 sm:min-w-64">
        <Search class="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          v-model="searchInput"
          type="search"
          :placeholder="locale === 'ar' ? 'بحث باسم المنتج…' : 'Search products…'"
          class="h-9 w-full rounded-md border bg-white ps-9 pe-3 text-xs placeholder:text-slate-400 focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520]"
          :style="{ borderColor: 'var(--color-border)' }"
        />
      </div>
      <button
        type="button"
        role="switch"
        :aria-checked="lowOnly"
        class="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-xs font-bold transition-all active:scale-95"
        :class="lowOnly
          ? 'border-rose-500 bg-rose-600 text-white shadow-xs'
          : 'border-slate-200 bg-white text-slate-600 hover:border-rose-300 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'"
        @click="lowOnly = !lowOnly"
      >
        <AlertTriangle class="h-4 w-4" aria-hidden="true" />
        <span>{{ locale === 'ar' ? 'عرض المنخفض فقط' : 'Low stock only' }}</span>
        <span
          v-if="summary.lowCount"
          class="rounded-full px-1.5 py-0.2 font-mono text-[11px] font-black"
          :class="lowOnly ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'"
        >
          {{ summary.lowCount }}
        </span>
      </button>
    </div>

    <!-- Inventory Table -->
    <div class="overflow-hidden rounded-md border bg-white shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-start text-sm">
          <thead>
            <tr class="border-b bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/40 dark:text-slate-400" :style="{ borderColor: 'var(--color-border)' }">
              <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'المنتج' : 'Product' }}</th>
              <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'القسم' : 'Category' }}</th>
              <th scope="col" class="px-4 py-3 text-center">{{ locale === 'ar' ? 'المخزون الحالي' : 'Current Stock' }}</th>
              <th scope="col" class="px-4 py-3 text-center">{{ locale === 'ar' ? 'الحد الأدنى' : 'Min Level' }}</th>
              <th scope="col" class="px-4 py-3 text-center">{{ locale === 'ar' ? 'سعر الشراء' : 'Cost Price' }}</th>
              <th scope="col" class="px-4 py-3 text-center">{{ locale === 'ar' ? 'إجمالي قيمة المخزون' : 'Stock Value' }}</th>
              <th scope="col" class="px-4 py-3 text-center">{{ locale === 'ar' ? 'الحالة' : 'Status' }}</th>
            </tr>
          </thead>
          <tbody v-if="!pending" class="divide-y divide-slate-100 dark:divide-slate-800/60">
            <tr
              v-for="p in rows"
              :key="p.id"
              class="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
            >
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-slate-100 dark:bg-slate-800" :style="{ borderColor: 'var(--color-border)' }">
                    <img v-if="p.coverImage" :src="p.coverImage" :alt="p.nameEn" class="h-full w-full object-cover" loading="lazy" />
                    <div v-else class="flex h-full w-full items-center justify-center text-slate-400">
                      <Package class="h-4 w-4" aria-hidden="true" />
                    </div>
                  </div>
                  <div class="min-w-0 max-w-[240px]">
                    <NuxtLink :to="localePath(`/admin/products/${p.id}/edit`)" class="block truncate font-semibold text-slate-900 hover:text-[#2B71AE] dark:text-slate-100 dark:hover:text-blue-400">
                      {{ locale === 'ar' ? p.nameAr : p.nameEn }}
                    </NuxtLink>
                    <p class="truncate font-mono text-[11px] text-slate-400">{{ p.slug }}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {{ locale === 'ar' ? (p.category.nameAr || p.category.nameEn) : p.category.nameEn }}
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <span
                  v-if="p.stock === 0"
                  class="inline-block rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-bold text-white"
                >
                  {{ locale === 'ar' ? 'نفد المخزون' : 'Out of stock' }}
                </span>
                <span v-else-if="p.status === 'low'" class="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                  <span aria-hidden="true">⚠️</span> {{ p.stock }}
                </span>
                <span v-else class="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{{ p.stock }}</span>
              </td>
              <td class="px-4 py-3 text-center font-mono text-xs text-slate-600 dark:text-slate-300">{{ p.minStock }}</td>
              <td class="px-4 py-3 text-center font-mono text-xs text-slate-600 dark:text-slate-300">
                {{ p.costPrice !== null ? `${p.costPrice} EGP` : '—' }}
              </td>
              <td class="px-4 py-3 text-center font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                {{ p.stockValue.toLocaleString() }} EGP
              </td>
              <td class="px-4 py-3 text-center">
                <span class="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold" :class="statusMeta(p.status).cls">
                  {{ statusMeta(p.status).label }}
                </span>
              </td>
            </tr>
          </tbody>
          <!-- Skeleton loading -->
          <tbody v-else>
            <tr v-for="i in 8" :key="i" class="border-b border-slate-100 dark:border-slate-800/60">
              <td v-for="c in 7" :key="c" class="px-4 py-3">
                <div class="h-8 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!pending && !rows.length" class="p-8">
        <AdminEmptyState
          :title="locale === 'ar' ? 'لا توجد منتجات مطابقة' : 'No matching products'"
          :description="locale === 'ar' ? 'جرب تعديل البحث أو إلغاء فلتر المخزون المنخفض.' : 'Try a different search or clear the low-stock filter.'"
          :icon="Boxes"
        >
          <template #action>
            <button
              v-if="lowOnly || search"
              type="button"
              class="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              @click="lowOnly = false; searchInput = ''"
            >
              <RotateCcw class="h-3.5 w-3.5" aria-hidden="true" />
              <span>{{ locale === 'ar' ? 'عرض كل المنتجات' : 'Show all' }}</span>
            </button>
          </template>
        </AdminEmptyState>
      </div>

      <!-- Pagination bar -->
      <div
        v-if="meta.totalPages > 1 || meta.total > 0"
        class="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 sm:flex-row dark:border-slate-800"
        :style="{ borderColor: 'var(--color-border)' }"
      >
        <!-- Per-page select (right in RTL) -->
        <div class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>{{ locale === 'ar' ? 'عرض' : 'Show' }}</span>
          <select
            v-model.number="perPage"
            class="h-8 rounded-md border bg-white px-2 font-mono text-xs font-bold dark:bg-[#0B1520]"
            :style="{ borderColor: 'var(--color-border)' }"
          >
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
          <span>{{ locale === 'ar' ? 'عنصر في الصفحة' : 'per page' }}</span>
        </div>

        <!-- Page numbers -->
        <div class="flex items-center gap-1" dir="ltr">
          <button
            type="button"
            :disabled="meta.page <= 1"
            class="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
            :aria-label="locale === 'ar' ? 'السابق' : 'Previous'"
            @click="gotoPage(meta.page - 1)"
          >
            <ChevronLeft class="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </button>
          <template v-for="p in pageNumbers" :key="`${p}`">
            <span v-if="p === '…'" class="px-1 text-xs text-slate-400">…</span>
            <button
              v-else
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-full font-mono text-xs font-bold transition-all"
              :class="p === meta.page
                ? 'bg-[#2B71AE] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'"
              @click="gotoPage(p)"
            >
              {{ p }}
            </button>
          </template>
          <button
            type="button"
            :disabled="meta.page >= meta.totalPages"
            class="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
            :aria-label="locale === 'ar' ? 'التالي' : 'Next'"
            @click="gotoPage(meta.page + 1)"
          >
            <ChevronRight class="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </button>
        </div>

        <!-- Range text (left in RTL) -->
        <p class="text-[13px] text-slate-500 dark:text-slate-400">{{ rangeText }}</p>
      </div>
    </div>

    <!-- Inventory Financial Summary -->
    <div
      class="mt-4 grid gap-4 rounded-md border bg-white p-5 shadow-xs sm:grid-cols-3 dark:bg-[#162032]"
      :style="{ borderColor: 'var(--color-border)' }"
    >
      <div class="flex items-center gap-3">
        <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2B71AE]/10 text-[#2B71AE] dark:bg-[#2B71AE]/20 dark:text-blue-300">
          <Wallet class="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {{ locale === 'ar' ? 'إجمالي قيمة المخزون' : 'Total inventory value' }}
          </p>
          <p class="font-heading text-xl font-extrabold text-[#2B71AE] dark:text-[#F5CC07]">
            {{ formatMoney(summary.totalValue) }}
          </p>
          <p class="text-[11px] text-slate-400">{{ locale === 'ar' ? '(سعر شراء × كمية)' : '(cost × qty)' }}</p>
        </div>
      </div>
      <div class="flex items-center gap-3 border-t pt-4 sm:border-t-0 sm:border-s sm:ps-4 sm:pt-0" :style="{ borderColor: 'var(--color-border)' }">
        <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
          <Package class="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {{ locale === 'ar' ? 'عدد المنتجات النشطة' : 'Active products' }}
          </p>
          <p class="font-heading text-xl font-extrabold text-slate-900 dark:text-slate-100">
            {{ locale === 'ar' ? `${summary.activeCount} منتج` : `${summary.activeCount} products` }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-3 border-t pt-4 sm:border-t-0 sm:border-s sm:ps-4 sm:pt-0" :style="{ borderColor: 'var(--color-border)' }">
        <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
          <span aria-hidden="true">⚠️</span>
        </div>
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {{ locale === 'ar' ? 'عدد المنتجات المنخفضة' : 'Low-stock products' }}
          </p>
          <p class="font-heading text-xl font-extrabold text-rose-600 dark:text-rose-400">
            {{ locale === 'ar' ? `${summary.lowCount} منتجات` : `${summary.lowCount} products` }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
