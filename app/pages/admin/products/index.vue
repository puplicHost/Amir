<script setup lang="ts">
import { Copy, Filter, Loader2, Package, Pencil, Plus, RotateCcw, Search, Share2, Tag, Trash2, User } from 'lucide-vue-next'

definePageMeta({ layout: 'admin', middleware: 'admin-auth', requiredPermission: 'products.view' })

interface Row {
  id: string
  slug: string
  nameAr: string
  nameEn: string
  price: string | number
  isActive: boolean
  category: { id: string, slug: string, nameAr: string, nameEn: string }
  images: { path: string }[]
  seo?: { keywords: string | null } | null
  lastAudit?: { action: string, details: string | null, userName: string, createdAt: string } | null
}

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const router = useRouter()
const toast = useAdminToast()

const search = ref(String(route.query.search || ''))
const categoryId = ref(String(route.query.categoryId || ''))
const status = ref(String(route.query.status || ''))
const showKeywordsColumn = ref(false)
const page = ref(Number(route.query.page) || 1)
const limit = 20
const deletingId = ref<string | null>(null)
const fetch = useRequestFetch()

const { data: catData } = await useAsyncData('admin-product-categories', () =>
  fetch<{ categories: { id: string, nameEn: string, nameAr: string }[] }>('/api/categories'),
)

const { data, refresh, pending } = await useAsyncData('admin-products', () => fetch<{ products: Row[], total: number, pages: number }>(
  `/api/admin/products?${new URLSearchParams({
    search: search.value,
    categoryId: categoryId.value,
    status: status.value,
    page: String(page.value),
    limit: String(limit),
  })}`,
), { watch: [page] })

const hasFilters = computed(() => !!(search.value || categoryId.value || status.value))

async function gotoPage(p: number) {
  page.value = p
  await router.replace({
    query: {
      search: search.value || undefined,
      categoryId: categoryId.value || undefined,
      status: status.value || undefined,
      page: p > 1 ? String(p) : undefined,
    },
  })
}

async function applyFilters() {
  page.value = 1
  await router.replace({
    query: {
      search: search.value || undefined,
      categoryId: categoryId.value || undefined,
      status: status.value || undefined,
    },
  })
  await refresh()
}

async function resetFilters() {
  search.value = ''
  categoryId.value = ''
  status.value = ''
  page.value = 1
  await router.replace({ query: {} })
  await refresh()
}

const { confirm: confirmDialog } = useAdminConfirm()
const canCreateProduct = useAdminCan('products.create')
const canEditProduct = useAdminCan('products.edit')
const canDeleteProduct = useAdminCan('products.delete')

const togglingId = ref<string | null>(null)
async function toggleProductActive(p: Row) {
  if (!canEditProduct.value || togglingId.value === p.id) return
  togglingId.value = p.id
  const next = !p.isActive
  try {
    await $fetch(`/api/admin/products/${p.id}`, {
      method: 'PUT',
      body: { isActive: next },
    })
    p.isActive = next
    toast.success(
      locale.value === 'ar' ? 'تم تحديث الحالة' : 'Status Updated',
      locale.value === 'ar' ? `المنتج "${p.nameAr || p.nameEn}" أصبح ${next ? 'نشطاً' : 'معطلاً'}.` : `Product is now ${next ? 'active' : 'inactive'}.`,
    )
  }
  catch (e: any) {
    toast.error(
      locale.value === 'ar' ? 'فشل تحديث الحالة' : 'Update Failed',
      e?.data?.message || 'Failed to update status',
    )
  }
  finally {
    togglingId.value = null
  }
}

const duplicatingId = ref<string | null>(null)
async function duplicateProduct(p: Row) {
  if (!canCreateProduct.value || duplicatingId.value === p.id) return
  duplicatingId.value = p.id
  try {
    const cloned = await $fetch<any>(`/api/admin/products/${p.id}/duplicate`, {
      method: 'POST',
    })
    toast.success(
      locale.value === 'ar' ? 'تم نسخ المنتج' : 'Product Duplicated',
      locale.value === 'ar' ? `تم إنشاء نسخة "${cloned.nameAr}" كمسودة بنجاح.` : `Created duplicate "${cloned.nameEn}" as draft.`,
    )
    await navigateTo(localePath(`/admin/products/${cloned.id}/edit`))
  }
  catch (e: any) {
    toast.error(
      locale.value === 'ar' ? 'فشل نسخ المنتج' : 'Duplicate Failed',
      e?.data?.message || 'Could not duplicate product',
    )
  }
  finally {
    duplicatingId.value = null
  }
}

async function removeProduct(p: Row) {
  const ok = await confirmDialog({
    title: locale.value === 'ar' ? `حذف المنتج "${p.nameAr || p.nameEn}"؟` : `Delete product "${p.nameEn}"?`,
    message: locale.value === 'ar' ? 'سيتم حذف جميع صور المنتج نهائياً. لا يمكن التراجع عن هذا الإجراء.' : 'All product images will be permanently removed. This cannot be undone.',
  })
  if (!ok) return
  deletingId.value = p.id
  try {
    await $fetch(`/api/admin/products/${p.id}`, { method: 'DELETE' })
    await refresh()
    toast.success(
      locale.value === 'ar' ? 'تم حذف المنتج' : 'Product Deleted',
      locale.value === 'ar' ? `تم حذف المنتج "${p.nameAr || p.nameEn}" بنجاح.` : `"${p.nameEn}" has been removed.`,
    )
  }
  catch (e: any) {
    toast.error(
      locale.value === 'ar' ? 'فشل حذف المنتج' : 'Delete Failed',
      e?.data?.message || 'Delete failed',
    )
  }
  finally {
    deletingId.value = null
  }
}

function formatAuditDate(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString(locale.value === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function shareProduct(p: Row) {
  const path = localePath(`/p/${p.slug}`)
  const url = typeof window !== 'undefined'
    ? `${window.location.origin}${path}`
    : path
  try {
    await navigator.clipboard.writeText(url)
    toast.success(
      locale.value === 'ar' ? 'تم نسخ الرابط' : 'Link Copied',
      locale.value === 'ar' ? `تم نسخ رابط المنتج "${p.nameAr || p.nameEn}" إلى الحافظة.` : `Public product link copied to clipboard.`,
    )
  }
  catch {
    toast.error(
      locale.value === 'ar' ? 'فشل نسخ الرابط' : 'Copy Failed',
      locale.value === 'ar' ? 'تعذر الوصول إلى الحافظة.' : 'Could not access clipboard.',
    )
  }
}
</script>

<template>
  <div>
    <!-- Page Header -->
    <AdminPageHeader
      :title="t('admin.products')"
      :description="locale === 'ar' ? 'إدارة كتالوج المنتجات، المواصفات، الأسعار، وصور العرض.' : 'Manage product catalog, technical attributes, prices, and media galleries.'"
    >
      <template #actions>
        <NuxtLink
          v-if="canCreateProduct"
          :to="localePath('/admin/products/new')"
          class="inline-flex h-10 items-center gap-1.5 rounded-md bg-[#F5CC07] px-4 text-xs font-semibold text-slate-950 shadow-xs transition-colors hover:bg-yellow-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5CC07]"
        >
          <Plus class="h-4 w-4" aria-hidden="true" />
          <span>{{ locale === 'ar' ? 'إضافة منتج' : 'Add Product' }}</span>
        </NuxtLink>
      </template>
    </AdminPageHeader>

    <!-- Filter Toolbar -->
    <div
      class="mb-4 rounded-md border bg-white p-3.5 shadow-xs dark:bg-[#162032]"
      :style="{ borderColor: 'var(--color-border)' }"
    >
      <form class="flex flex-wrap items-center gap-2.5" @submit.prevent="applyFilters">
        <!-- Search Input -->
        <div class="relative min-w-48 flex-1 sm:min-w-64">
          <Search class="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            v-model="search"
            type="search"
            :placeholder="locale === 'ar' ? 'بحث بالاسم أو الكود…' : 'Search by product name or slug…'"
            class="h-9 w-full rounded-md border bg-white ps-9 pe-3 text-xs placeholder:text-slate-400 focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520]"
            :style="{ borderColor: 'var(--color-border)' }"
          />
        </div>

        <!-- Category Dropdown -->
        <select
          v-model="categoryId"
          class="h-9 rounded-md border bg-white px-3 text-xs text-slate-700 focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520] dark:text-slate-300"
          :style="{ borderColor: 'var(--color-border)' }"
          @change="applyFilters"
        >
          <option value="">{{ locale === 'ar' ? 'جميع الفئات' : 'All Categories' }}</option>
          <option v-for="c in catData?.categories || []" :key="c.id" :value="c.id">
            {{ locale === 'ar' ? (c.nameAr || c.nameEn) : c.nameEn }}
          </option>
        </select>

        <!-- Status Dropdown -->
        <select
          v-model="status"
          class="h-9 rounded-md border bg-white px-3 text-xs text-slate-700 focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520] dark:text-slate-300"
          :style="{ borderColor: 'var(--color-border)' }"
          @change="applyFilters"
        >
          <option value="">{{ locale === 'ar' ? 'جميع الحالات' : 'All Statuses' }}</option>
          <option value="active">{{ locale === 'ar' ? 'نشط فقط' : 'Active Only' }}</option>
          <option value="inactive">{{ locale === 'ar' ? 'غير نشط' : 'Inactive Only' }}</option>
        </select>

        <!-- Apply Button -->
        <button
          type="submit"
          class="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <Filter class="h-3.5 w-3.5" aria-hidden="true" />
          <span>{{ locale === 'ar' ? 'تصفية' : 'Filter' }}</span>
        </button>

        <!-- Toggle Keywords Column Button (Change 7) -->
        <button
          type="button"
          class="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition-colors"
          :class="showKeywordsColumn ? 'border-[#2B71AE] bg-[#2B71AE]/10 text-[#2B71AE] dark:border-[#F5CC07] dark:text-[#F5CC07]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'"
          @click="showKeywordsColumn = !showKeywordsColumn"
        >
          <Tag class="h-3.5 w-3.5" />
          <span>{{ locale === 'ar' ? 'كلمات البحث' : 'Keywords' }}</span>
        </button>

        <!-- Reset Button -->
        <button
          v-if="hasFilters"
          type="button"
          class="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          @click="resetFilters"
        >
          <RotateCcw class="h-3.5 w-3.5" aria-hidden="true" />
          <span>{{ locale === 'ar' ? 'إلغاء الفلاتر' : 'Reset' }}</span>
        </button>
      </form>
    </div>

    <!-- Products Table Card -->
    <div class="overflow-hidden rounded-md border bg-white shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[1020px] text-start text-[13px] [&_td]:align-middle [&_th]:align-middle">
          <thead class="sticky top-0 z-10">
            <tr class="border-b bg-slate-50/75 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/40 dark:text-slate-400" :style="{ borderColor: 'var(--color-border)' }">
              <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'المنتج' : 'Product' }}</th>
              <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'الفئة' : 'Category' }}</th>
              <th v-if="showKeywordsColumn" scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'كلمات البحث' : 'Keywords' }}</th>
              <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'السعر' : 'Price' }}</th>
              <th scope="col" class="px-4 py-3 text-center">{{ locale === 'ar' ? 'الحالة' : 'Status' }}</th>
              <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'آخر تعديل' : 'Last Modified' }}</th>
              <th scope="col" class="px-4 py-3 text-end">{{ locale === 'ar' ? 'الإجراءات' : 'Actions' }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
            <tr
              v-for="p in data?.products || []"
              :key="p.id"
              class="transition-colors even:bg-slate-50/50 even:dark:bg-slate-800/30 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
            >
              <!-- Product Image & Name -->
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="h-11 w-11 shrink-0 overflow-hidden rounded-md border bg-slate-100 dark:bg-slate-800" :style="{ borderColor: 'var(--color-border)' }">
                    <img
                      v-if="p.images[0]"
                      :src="p.images[0].path"
                      :alt="p.nameEn"
                      class="h-full w-full object-cover"
                      loading="lazy"
                    />
                    <div v-else class="flex h-full w-full items-center justify-center text-slate-400">
                      <Package class="h-5 w-5" aria-hidden="true" />
                    </div>
                  </div>
                  <div class="min-w-0 max-w-[260px]">
                    <p class="truncate font-semibold leading-snug text-slate-900 dark:text-slate-100">{{ p.nameEn }}</p>
                    <p class="truncate text-xs leading-snug text-slate-500 dark:text-slate-400">{{ p.nameAr }}</p>
                  </div>
                </div>
              </td>

              <!-- Category -->
              <td class="px-4 py-3">
                <span class="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {{ locale === 'ar' ? (p.category.nameAr || p.category.nameEn) : p.category.nameEn }}
                </span>
              </td>

              <!-- Keywords Column (Change 7) -->
              <td v-if="showKeywordsColumn" class="px-4 py-3">
                <div v-if="p.seo?.keywords" class="flex flex-wrap gap-1 max-w-[220px]">
                  <span
                    v-for="k in p.seo.keywords.split(',').slice(0, 3)"
                    :key="k"
                    class="inline-block rounded-full bg-[#EFF6FF] px-2 py-0.5 text-[10px] font-medium text-[#2B71AE] dark:bg-[#1e3a5f] dark:text-[#9ccaff]"
                  >
                    {{ k.trim() }}
                  </span>
                  <span v-if="p.seo.keywords.split(',').length > 3" class="text-[10px] text-slate-400">
                    +{{ p.seo.keywords.split(',').length - 3 }}
                  </span>
                </div>
                <span v-else class="text-xs text-slate-400">—</span>
              </td>

              <!-- Price -->
              <td class="px-4 py-3">
                <div class="flex items-baseline gap-1.5">
                  <span class="font-bold text-slate-900 dark:text-slate-100">{{ p.price }}</span>
                  <span class="text-xs text-slate-500 font-medium">€</span>
                </div>
              </td>

              <!-- Status Toggle Switch -->
              <td class="px-4 py-3 text-center">
                <button
                  v-if="canEditProduct"
                  type="button"
                  role="switch"
                  :aria-checked="p.isActive"
                  :disabled="togglingId === p.id"
                  class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 disabled:cursor-wait"
                  :class="p.isActive ? 'bg-[#2B71AE]' : 'bg-slate-300 dark:bg-slate-700'"
                  :title="locale === 'ar' ? (p.isActive ? 'نشط (اضغط للتعطيل)' : 'معطل (اضغط للتفعيل)') : (p.isActive ? 'Active (click to deactivate)' : 'Inactive (click to activate)')"
                  @click="toggleProductActive(p)"
                >
                  <span class="sr-only">{{ p.isActive ? 'Active' : 'Inactive' }}</span>
                  <span
                    v-if="togglingId === p.id"
                    class="absolute inset-0 flex items-center justify-center"
                  >
                    <Loader2 class="h-3 w-3 animate-spin text-white" />
                  </span>
                  <span
                    v-else
                    class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                    :class="p.isActive ? (locale === 'ar' ? '-translate-x-4' : 'translate-x-4') : 'translate-x-0'"
                  />
                </button>
                <AdminStatusBadge v-else :status="p.isActive ? (locale === 'ar' ? 'نشط' : 'Active') : (locale === 'ar' ? 'معطل' : 'Inactive')" size="sm" />
              </td>

              <!-- Last Modification (Audit Log) -->
              <td class="px-4 py-3">
                <div v-if="p.lastAudit" class="flex items-start gap-1.5 min-w-[140px]" :title="p.lastAudit.details || ''">
                  <User class="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                  <div class="min-w-0">
                    <p class="truncate text-[13px] text-slate-500 dark:text-slate-400">
                      {{ p.lastAudit.action === 'created'
                        ? (locale === 'ar' ? `أضافه: ${p.lastAudit.userName}` : `Added by ${p.lastAudit.userName}`)
                        : (locale === 'ar' ? `${p.lastAudit.details || 'عدّله'}: ${p.lastAudit.userName}` : `${p.lastAudit.userName}`) }}
                    </p>
                    <p class="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                      {{ formatAuditDate(p.lastAudit.createdAt) }}
                    </p>
                  </div>
                </div>
                <span v-else class="text-xs text-slate-400">—</span>
              </td>

              <!-- Actions -->
              <td class="px-4 py-3 text-end">
                <div class="flex items-center justify-end gap-1">
                  <button
                    v-if="canCreateProduct"
                    type="button"
                    :disabled="duplicatingId === p.id"
                    class="inline-flex h-8 w-8 items-center justify-center rounded text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                    :title="locale === 'ar' ? 'نسخ' : 'Duplicate'"
                    :aria-label="locale === 'ar' ? 'نسخ' : 'Duplicate'"
                    @click="duplicateProduct(p)"
                  >
                    <Loader2 v-if="duplicatingId === p.id" class="h-4 w-4 animate-spin text-[#2B71AE]" />
                    <Copy v-else class="h-4 w-4" aria-hidden="true" />
                  </button>
                  <NuxtLink
                    v-if="canEditProduct"
                    :to="localePath(`/admin/products/${p.id}/edit`)"
                    :title="locale === 'ar' ? 'تعديل' : 'Edit'"
                    :aria-label="locale === 'ar' ? 'تعديل' : 'Edit'"
                    class="inline-flex h-8 w-8 items-center justify-center rounded text-[#2B71AE] transition-colors hover:bg-[#2B71AE]/10 dark:text-blue-400 dark:hover:bg-blue-950/50"
                  >
                    <Pencil class="h-4 w-4" aria-hidden="true" />
                  </NuxtLink>
                  <button
                    type="button"
                    class="inline-flex h-8 w-8 items-center justify-center rounded text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                    :title="locale === 'ar' ? 'مشاركة' : 'Share'"
                    :aria-label="locale === 'ar' ? 'مشاركة' : 'Share'"
                    @click="shareProduct(p)"
                  >
                    <Share2 class="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    v-if="canDeleteProduct"
                    type="button"
                    :disabled="deletingId === p.id"
                    class="inline-flex h-8 w-8 items-center justify-center rounded text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                    :title="locale === 'ar' ? 'حذف' : 'Delete'"
                    :aria-label="locale === 'ar' ? 'حذف' : 'Delete'"
                    @click="removeProduct(p)"
                  >
                    <Trash2 class="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Empty State -->
      <div v-if="!data?.products?.length" class="p-8">
        <AdminEmptyState
          :title="hasFilters ? (locale === 'ar' ? 'لا توجد منتجات مطابقة للبحث' : 'No products matching filters') : (locale === 'ar' ? 'لا توجد منتجات مسجلة حتى الآن' : 'No products in catalog yet')"
          :description="hasFilters ? (locale === 'ar' ? 'جرب تعديل خيارات البحث أو التصفية.' : 'Try changing search terms or clearing active filters.') : (locale === 'ar' ? 'ابدأ بإضافة أول منتج للمتجر.' : 'Get started by creating your first product.')"
          :icon="Package"
        >
          <template #action>
            <button
              v-if="hasFilters"
              type="button"
              class="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              @click="resetFilters"
            >
              <RotateCcw class="h-3.5 w-3.5" aria-hidden="true" />
              <span>{{ locale === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset filters' }}</span>
            </button>
            <NuxtLink
              v-else
              v-if="canCreateProduct"
              :to="localePath('/admin/products/new')"
              class="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#F5CC07] px-4 text-xs font-semibold text-slate-950 shadow-xs hover:bg-yellow-400"
            >
              <Plus class="h-3.5 w-3.5" aria-hidden="true" />
              <span>{{ locale === 'ar' ? 'إضافة منتج' : 'Add Product' }}</span>
            </NuxtLink>
          </template>
        </AdminEmptyState>
      </div>

      <AdminPagination
        :page="page"
        :pages="data?.pages || 1"
        :total="data?.total || 0"
        :item-name="locale === 'ar' ? 'منتج' : 'products'"
        @change="gotoPage"
      />
    </div>
  </div>
</template>
