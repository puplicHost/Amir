<script setup lang="ts">
import {
  ArrowRight,
  ArrowUpRight,
  Clock,
  ExternalLink,
  FileText,
  FolderTree,
  Package,
  Plus,
  RefreshCw,
  Settings,
  ShoppingCart,
  TrendingUp,
  Wrench,
} from 'lucide-vue-next'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t, locale } = useI18n()
const localePath = useLocalePath()

interface DashboardResponse {
  stats: {
    totalOrders: number
    pendingOrders: number
    newServiceRequests: number
    totalProducts: number
    totalCategories: number
    activeServices: number
    totalRevenue: number
    lowStockCount: number
  }
  recentOrders: Array<{
    id: string
    orderNumber: string
    customerName: string
    customerGovernorat: string
    status: string
    totalAmount: number
    createdAt: string
    itemCount: number
  }>
  recentServiceRequests: Array<{
    id: string
    status: string
    submittedAt: string
    serviceNameAr: string
    serviceNameEn: string
    customerName: string
  }>
}

const fetch = useRequestFetch()
const { data, pending, refresh } = await useAsyncData<DashboardResponse>(
  'admin-dashboard-stats',
  () => fetch<DashboardResponse>('/api/admin/dashboard/stats'),
)

const canOrdersView = useAdminCan('orders.view')
const canServicesView = useAdminCan('services.view')
const canCategoriesManage = useAdminCan('categories.manage')
const canSettingsView = useAdminCan('settings.view')
const canFinancialsView = useAdminCan('dashboard.financials.view')
const canFinancialsTab = useAdminCan('financials.view')

// Monthly financial summary widget (current month, totals only — no names exposed).
const { data: finSummary, pending: finPending } = await useAsyncData(
  'admin-dashboard-financial-summary',
  () => {
    const now = new Date()
    return fetch<{ revenue: { total: number }, profit: number, margin: number }>(
      `/api/admin/financials/summary?month=${now.getMonth() + 1}&year=${now.getFullYear()}`,
    )
  },
)

const stats = computed(() => data.value?.stats)
const recentOrders = computed(() => data.value?.recentOrders || [])
const recentServiceRequests = computed(() => data.value?.recentServiceRequests || [])
const lowStockCount = computed(() => stats.value?.lowStockCount || 0)

const canProductsView = useAdminCan('products.view')

function formatCurrency(amount: number): string {
  const formatted = (amount || 0).toLocaleString(locale.value === 'ar' ? 'ar-EG' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return locale.value === 'ar' ? `${formatted} ج.م` : `${formatted} EGP`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString(locale.value === 'ar' ? 'ar-EG' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return locale.value === 'ar' ? 'الآن' : 'Just now'
  if (diffMins < 60) return locale.value === 'ar' ? `منذ ${diffMins} دقيقة` : `${diffMins}m ago`
  if (diffHours < 24) return locale.value === 'ar' ? `منذ ${diffHours} ساعة` : `${diffHours}h ago`
  if (diffDays < 7) return locale.value === 'ar' ? `منذ ${diffDays} يوم` : `${diffDays}d ago`
  return formatDate(dateStr)
}

const cards = computed(() => [
  {
    label: locale.value === 'ar' ? 'إجمالي الطلبات' : 'Total Orders',
    value: stats.value?.totalOrders ?? 0,
    hint: canFinancialsView.value
      ? (stats.value?.totalRevenue !== null && stats.value?.totalRevenue !== undefined
        ? (locale.value === 'ar' ? `حجم المبيعات: ${formatCurrency(stats.value.totalRevenue)}` : `Volume: ${formatCurrency(stats.value.totalRevenue)}`)
        : (locale.value === 'ar' ? 'كل الطلبات المسجلة' : 'All lifetime orders'))
      : (locale.value === 'ar' ? 'حجم المبيعات: •••' : 'Volume: •••'),
    icon: ShoppingCart,
    to: '/admin/orders',
    iconBg: 'bg-blue-50 text-[#2B71AE] dark:bg-blue-950/60 dark:text-blue-400',
    highlight: false,
  },
  {
    label: locale.value === 'ar' ? 'طلبات قيد المراجعة' : 'Pending Orders',
    value: stats.value?.pendingOrders ?? 0,
    hint: locale.value === 'ar' ? 'تحتاج إلى مراجعة وتأكيد' : 'Requires dispatch review',
    icon: Clock,
    to: '/admin/orders',
    iconBg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
    badge: (stats.value?.pendingOrders || 0) > 0 ? (locale.value === 'ar' ? 'تحتاج إجراء' : 'Action needed') : undefined,
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
    highlight: (stats.value?.pendingOrders || 0) > 0,
  },
  {
    label: locale.value === 'ar' ? 'طلبات الخدمات الجديدة' : 'New Service Requests',
    value: stats.value?.newServiceRequests ?? 0,
    hint: stats.value?.activeServices
      ? (locale.value === 'ar' ? `ضمن ${stats.value.activeServices} خدمات نشطة` : `Across ${stats.value.activeServices} active services`)
      : (locale.value === 'ar' ? 'استفسارات هندسية' : 'Engineering inquiries'),
    icon: Wrench,
    to: '/admin/services',
    iconBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
    badge: (stats.value?.newServiceRequests || 0) > 0 ? (locale.value === 'ar' ? 'جديد' : 'New') : undefined,
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
    highlight: (stats.value?.newServiceRequests || 0) > 0,
  },
  {
    label: locale.value === 'ar' ? 'إجمالي المنتجات' : 'Total Products',
    value: stats.value?.totalProducts ?? 0,
    hint: stats.value?.totalCategories
      ? (locale.value === 'ar' ? `في ${stats.value.totalCategories} فئات متجر` : `In ${stats.value.totalCategories} categories`)
      : (locale.value === 'ar' ? 'الكتالوج المتاح' : 'In catalog'),
    icon: Package,
    to: '/admin/products',
    iconBg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    highlight: false,
  },
])

const canQuotesView = useAdminCan('quotes.view')
const canCreateProduct = useAdminCan('products.create')

const quickActions = computed(() => [
  {
    title: locale.value === 'ar' ? 'إضافة منتج جديد' : 'Add New Product',
    desc: locale.value === 'ar' ? 'إنشاء منتج بالصور والأسعار والمواصفات' : 'Create catalog item with specs & images',
    to: '/admin/products/new',
    icon: Plus,
    show: canCreateProduct.value,
  },
  {
    title: locale.value === 'ar' ? 'إدارة الطلبات والشحن' : 'Manage Orders',
    desc: locale.value === 'ar' ? 'متابعة وتحديث حالات الشحن والطلبات' : 'Process, filter & update order dispatch',
    to: '/admin/orders',
    icon: ShoppingCart,
    show: canOrdersView.value,
  },
  {
    title: locale.value === 'ar' ? 'إنشاء عرض سعر جديد' : 'Create Price Quote',
    desc: locale.value === 'ar' ? 'إنشاء عرض سعر رسمي واستخراج ملف PDF' : 'Draft official B2B quote with PDF export',
    to: '/admin/quotes/new',
    icon: FileText,
    show: canQuotesView.value,
  },
  {
    title: locale.value === 'ar' ? 'إدارة الفئات' : 'Manage Categories',
    desc: locale.value === 'ar' ? 'تعديل وتصنيف فئات المتجر وصور الغلاف' : 'Organize catalog categories & covers',
    to: '/admin/categories',
    icon: FolderTree,
    show: canCategoriesManage.value,
  },
  {
    title: locale.value === 'ar' ? 'طلبات الخدمات الهندسية' : 'Service Requests',
    desc: locale.value === 'ar' ? 'متابعة طلبات الصيانة واستفسارات العملاء' : 'Review incoming maintenance inquiries',
    to: '/admin/services',
    icon: Wrench,
    show: canServicesView.value,
  },
  {
    title: locale.value === 'ar' ? 'إعدادات المنصة' : 'Platform Settings',
    desc: locale.value === 'ar' ? 'تحديث معلومات التواصل والبانرات والسيو' : 'Update contact info, SEO & store config',
    to: '/admin/settings',
    icon: Settings,
    show: canSettingsView.value,
  },
].filter(a => a.show))
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <AdminPageHeader
      :title="t('admin.dashboard')"
      :description="locale === 'ar' ? 'نظرة عامة على النشاط، الطلبات، والخدمات الهندسية.' : 'System overview, active orders, and engineering service requests.'"
    >
      <template #actions>
        <!-- Refresh Button -->
        <button
          type="button"
          class="inline-flex h-9 items-center gap-1.5 rounded-md border bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 focus-visible:outline-none dark:border-slate-700 dark:bg-[#162032] dark:text-slate-300 dark:hover:bg-slate-800"
          :style="{ borderColor: 'var(--color-border)' }"
          :disabled="pending"
          @click="refresh"
        >
          <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': pending }" aria-hidden="true" />
          <span>{{ locale === 'ar' ? 'تحديث' : 'Refresh' }}</span>
        </button>

        <!-- Add Product CTA -->
        <NuxtLink
          v-if="canCreateProduct"
          :to="localePath('/admin/products/new')"
          class="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#2B71AE] px-3.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#285E8E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B71AE]"
        >
          <Plus class="h-4 w-4" aria-hidden="true" />
          <span>{{ locale === 'ar' ? 'منتج جديد' : 'Add Product' }}</span>
        </NuxtLink>
      </template>
    </AdminPageHeader>

    <!-- Low Stock Warning Banner -->
    <div
      v-if="lowStockCount > 0"
      role="alert"
      class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-3.5 dark:border-rose-900/50 dark:bg-rose-950/40"
    >
      <p class="flex items-center gap-2 text-xs font-semibold text-rose-700 dark:text-rose-300 sm:text-sm">
        <span aria-hidden="true">⚠️</span>
        <span>
          {{ locale === 'ar'
            ? `${lowStockCount} منتجات وصلت للحد الأدنى من المخزون`
            : `${lowStockCount} products at or below minimum stock` }}
        </span>
      </p>
      <NuxtLink
        v-if="canProductsView"
        :to="localePath('/admin/products')"
        class="inline-flex items-center gap-1 rounded-md bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-rose-700"
      >
        <span>{{ locale === 'ar' ? 'عرض المنتجات' : 'View products' }}</span>
        <ArrowRight class="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
      </NuxtLink>
    </div>

    <!-- Monthly Financial Summary Widget -->
    <section
      v-if="canFinancialsTab"
      aria-label="Monthly Financial Summary"
      class="rounded-xl border bg-white p-5 shadow-xs dark:bg-[#162032]"
      :style="{ borderColor: 'var(--color-border)' }"
    >
      <h2 class="font-heading text-sm font-bold text-slate-900 dark:text-slate-100 sm:text-base">
        {{ locale === 'ar' ? 'الملخص المالي لهذا الشهر' : 'This Month’s Financial Summary' }}
      </h2>

      <!-- Skeleton loading (same pattern as KPI cards) -->
      <div v-if="finPending" class="mt-4 grid gap-4 sm:grid-cols-3">
        <div v-for="i in 3" :key="i" class="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
      </div>

      <div v-else-if="finSummary && finSummary.revenue.total > 0" class="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {{ locale === 'ar' ? 'إجمالي المبيعات' : 'Total Sales' }}
          </p>
          <p class="mt-1 font-heading text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {{ formatCurrency(finSummary.revenue.total) }}
          </p>
        </div>
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {{ locale === 'ar' ? 'صافي الربح' : 'Net Profit' }}
          </p>
          <p
            class="mt-1 font-heading text-2xl font-extrabold"
            :class="finSummary.profit >= 0 ? 'text-[#2B71AE] dark:text-[#F5CC07]' : 'text-rose-600 dark:text-rose-400'"
          >
            {{ formatCurrency(finSummary.profit) }}
          </p>
        </div>
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {{ locale === 'ar' ? 'هامش الربح %' : 'Profit Margin %' }}
          </p>
          <p class="mt-1 font-heading text-2xl font-extrabold text-slate-900 dark:text-slate-100">
            {{ finSummary.margin }}%
          </p>
        </div>
      </div>

      <p v-else class="mt-4 text-xs text-slate-500 dark:text-slate-400">
        {{ locale === 'ar' ? 'لا توجد مبيعات مكتملة هذا الشهر' : 'No completed sales this month' }}
      </p>

      <p class="mt-4 text-[13px] text-slate-500 dark:text-slate-400">
        {{ locale === 'ar' ? 'بناءً على الطلبات المكتملة هذا الشهر — ' : 'Based on this month’s completed orders — ' }}
        <NuxtLink :to="localePath('/admin/financials')" class="font-semibold text-[#2B71AE] hover:underline dark:text-blue-400">
          {{ locale === 'ar' ? 'عرض التفاصيل ←' : 'View details ←' }}
        </NuxtLink>
      </p>
    </section>

    <!-- KPI Metric Cards Grid -->
    <section aria-label="Metrics Overview" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <NuxtLink
        v-for="card in cards"
        :key="card.label"
        :to="localePath(card.to)"
        class="group relative flex flex-col justify-between rounded-lg border bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2B71AE]/50 hover:shadow-md dark:bg-[#162032]"
        :class="{ 'border-amber-300 dark:border-amber-700/60': card.highlight && card.label.includes('Pending') }"
        :style="{ borderColor: card.highlight ? undefined : 'var(--color-border)' }"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-1.5">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {{ card.label }}
            </p>
            <p class="font-heading text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {{ card.value.toLocaleString() }}
            </p>
          </div>
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105"
            :class="card.iconBg"
          >
            <component :is="card.icon" class="h-5 w-5" aria-hidden="true" />
          </div>
        </div>

        <div class="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800/80 dark:text-slate-400">
          <span class="truncate text-[11px]">{{ card.hint }}</span>
          <span
            v-if="card.badge"
            class="rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0"
            :class="card.badgeColor"
          >
            {{ card.badge }}
          </span>
          <ArrowUpRight v-else class="h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-[#2B71AE] dark:text-[#F5CC07]" />
        </div>
      </NuxtLink>
    </section>

    <!-- Main Activity Section: Recent Orders & Recent Service Requests -->
    <section aria-label="Recent Activity" class="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <!-- Left Column: Recent Orders Mini-Table (7 cols) -->
      <div
        class="flex flex-col justify-between rounded-xl border bg-white shadow-xs dark:bg-[#162032] lg:col-span-7"
        :style="{ borderColor: 'var(--color-border)' }"
      >
        <div>
          <!-- Card Header -->
          <div class="flex items-center justify-between border-b px-5 py-4 dark:border-slate-800" :style="{ borderColor: 'var(--color-border)' }">
            <div class="space-y-0.5">
              <div class="flex items-center gap-2">
                <ShoppingCart class="h-4 w-4 text-[#2B71AE] dark:text-blue-400" aria-hidden="true" />
                <h2 class="font-heading text-sm font-bold text-slate-900 dark:text-slate-100 sm:text-base">
                  {{ locale === 'ar' ? 'أحدث الطلبات' : 'Recent Orders' }}
                </h2>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                {{ locale === 'ar' ? 'آخر طلبات العملاء وحالة التنفيذ والشحن' : 'Latest orders received through the platform' }}
              </p>
            </div>

            <NuxtLink
              v-if="canOrdersView"
              :to="localePath('/admin/orders')"
              class="inline-flex items-center gap-1 text-xs font-semibold text-[#2B71AE] transition-colors hover:text-[#285E8E] hover:underline dark:text-blue-400 dark:hover:text-blue-300"
            >
              <span>{{ locale === 'ar' ? 'عرض الكل' : 'View all' }}</span>
              <ArrowRight class="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
            </NuxtLink>
          </div>

          <!-- Orders Table -->
          <div v-if="recentOrders.length > 0" class="overflow-x-auto">
            <table class="w-full text-start text-xs">
              <thead class="sticky top-0 z-10">
                <tr class="border-b bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/40 dark:text-slate-400" :style="{ borderColor: 'var(--color-border)' }">
                  <th scope="col" class="px-5 py-3 text-start">{{ locale === 'ar' ? 'رقم الطلب' : 'Order #' }}</th>
                  <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'العميل' : 'Customer' }}</th>
                  <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'الحالة' : 'Status' }}</th>
                  <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'الإجمالي' : 'Total' }}</th>
                  <th scope="col" class="px-5 py-3 text-end">{{ locale === 'ar' ? 'التوقيت' : 'Time' }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
                <tr
                  v-for="order in recentOrders"
                  :key="order.id"
                  class="group transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                >
                  <!-- Order Number -->
                  <td class="px-5 py-3.5 whitespace-nowrap">
                    <NuxtLink
                      :to="localePath(`/admin/orders/${order.id}`)"
                      class="font-mono text-xs font-semibold text-[#2B71AE] transition-colors hover:underline dark:text-blue-400"
                    >
                      {{ order.orderNumber }}
                    </NuxtLink>
                  </td>

                  <!-- Customer Name & Governorate -->
                  <td class="px-4 py-3.5">
                    <div class="min-w-0">
                      <p class="truncate font-semibold text-slate-900 dark:text-slate-100">
                        {{ order.customerName }}
                      </p>
                      <p class="truncate text-[11px] text-slate-400 dark:text-slate-500">
                        {{ order.customerGovernorat }} · {{ order.itemCount }} {{ locale === 'ar' ? 'منتج' : 'items' }}
                      </p>
                    </div>
                  </td>

                  <!-- Status -->
                  <td class="px-4 py-3.5 whitespace-nowrap">
                    <AdminStatusBadge :status="order.status" size="sm" />
                  </td>

                  <!-- Total Amount -->
                  <td class="px-4 py-3.5 whitespace-nowrap font-bold text-slate-900 dark:text-slate-100">
                    <span v-if="order.totalAmount !== null && order.totalAmount !== undefined && canFinancialsView">
                      {{ formatCurrency(order.totalAmount) }}
                    </span>
                    <span v-else class="font-mono text-slate-400 font-bold" :title="locale === 'ar' ? 'بيانات مالية محجوبة' : 'Financial data masked'">
                      •••
                    </span>
                  </td>

                  <!-- Time (relative time depends on wall-clock "now", which differs
                    between SSR and hydration — ClientOnly with absolute-date fallback) -->
                  <td class="px-5 py-3.5 whitespace-nowrap text-end text-[11px] text-slate-500 dark:text-slate-400">
                    <ClientOnly>
                      {{ formatRelativeTime(order.createdAt) }}
                      <template #fallback>{{ formatDate(order.createdAt) }}</template>
                    </ClientOnly>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Empty State for Orders -->
          <div v-else class="flex flex-col items-center justify-center p-8 text-center">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
              <ShoppingCart class="h-5 w-5" />
            </div>
            <p class="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              {{ locale === 'ar' ? 'لا توجد طلبات مسجلة بعد' : 'No recent orders yet' }}
            </p>
            <p class="text-[11px] text-slate-400">
              {{ locale === 'ar' ? 'ستظهر هنا أحدث طلبات المتجر بمجرد قيام العملاء بالطلب' : 'Customer orders will appear here automatically.' }}
            </p>
          </div>
        </div>

        <!-- Card Footer -->
        <div class="border-t border-slate-100 bg-slate-50/50 px-5 py-2.5 dark:border-slate-800/80 dark:bg-slate-800/20">
          <NuxtLink
            v-if="canOrdersView"
            :to="localePath('/admin/orders')"
            class="flex items-center justify-between text-xs font-semibold text-[#2B71AE] transition-colors hover:text-[#285E8E] dark:text-blue-400"
          >
            <span>{{ locale === 'ar' ? 'إدارة جميع الطلبات في المتجر' : 'Manage all orders & fulfillment' }}</span>
            <ArrowRight class="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
          </NuxtLink>
        </div>
      </div>

      <!-- Right Column: Recent Service Requests (5 cols) -->
      <div
        class="flex flex-col justify-between rounded-xl border bg-white shadow-xs dark:bg-[#162032] lg:col-span-5"
        :style="{ borderColor: 'var(--color-border)' }"
      >
        <div>
          <!-- Card Header -->
          <div class="flex items-center justify-between border-b px-5 py-4 dark:border-slate-800" :style="{ borderColor: 'var(--color-border)' }">
            <div class="space-y-0.5">
              <div class="flex items-center gap-2">
                <Wrench class="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <h2 class="font-heading text-sm font-bold text-slate-900 dark:text-slate-100 sm:text-base">
                  {{ locale === 'ar' ? 'طلبات الخدمات الهندسية' : 'Service Requests' }}
                </h2>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                {{ locale === 'ar' ? 'أحدث استفسارات وطلبات الصيانة الواردة' : 'Recent maintenance & engineering inquiries' }}
              </p>
            </div>

            <NuxtLink
              v-if="canServicesView"
              :to="localePath('/admin/services')"
              class="inline-flex items-center gap-1 text-xs font-semibold text-[#2B71AE] transition-colors hover:text-[#285E8E] hover:underline dark:text-blue-400 dark:hover:text-blue-300"
            >
              <span>{{ locale === 'ar' ? 'عرض الكل' : 'View all' }}</span>
              <ArrowRight class="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
            </NuxtLink>
          </div>

          <!-- Service Requests List -->
          <div v-if="recentServiceRequests.length > 0" class="divide-y divide-slate-100 p-2 dark:divide-slate-800/60">
            <NuxtLink
              v-for="req in recentServiceRequests"
              :key="req.id"
              :to="localePath(`/admin/services/requests/${req.id}`)"
              class="group flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
            >
              <div class="flex items-start gap-3 min-w-0">
                <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 transition-transform group-hover:scale-105 dark:bg-emerald-950/50 dark:text-emerald-400">
                  <Wrench class="h-4 w-4" />
                </div>
                <div class="min-w-0">
                  <p class="truncate text-xs font-bold text-slate-900 transition-colors group-hover:text-[#2B71AE] dark:text-slate-100 dark:group-hover:text-blue-400">
                    {{ locale === 'ar' ? req.serviceNameAr : req.serviceNameEn }}
                  </p>
                  <p class="truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {{ locale === 'ar' ? 'العميل:' : 'Client:' }} <span class="font-medium text-slate-700 dark:text-slate-300">{{ req.customerName }}</span>
                  </p>
                </div>
              </div>

              <!-- Status Badge & Relative Time (ClientOnly: wall-clock dependent, see above) -->
              <div class="flex flex-col items-end gap-1.5 ps-2 shrink-0">
                <AdminStatusBadge :status="req.status" size="sm" />
                <span class="text-[10px] text-slate-400 dark:text-slate-500">
                  <ClientOnly>
                    {{ formatRelativeTime(req.submittedAt) }}
                    <template #fallback>{{ formatDate(req.submittedAt) }}</template>
                  </ClientOnly>
                </span>
              </div>
            </NuxtLink>
          </div>

          <!-- Empty State for Service Requests -->
          <div v-else class="flex flex-col items-center justify-center p-8 text-center">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
              <Wrench class="h-5 w-5" />
            </div>
            <p class="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              {{ locale === 'ar' ? 'لا توجد طلبات خدمات جديدة' : 'No service requests yet' }}
            </p>
            <p class="text-[11px] text-slate-400">
              {{ locale === 'ar' ? 'ستظهر هنا طلبات الصيانة والأنظمة بمجرد إرسالها من العملاء' : 'Client engineering inquiries will appear here.' }}
            </p>
          </div>
        </div>

        <!-- Card Footer -->
        <div class="border-t border-slate-100 bg-slate-50/50 px-5 py-2.5 dark:border-slate-800/80 dark:bg-slate-800/20">
          <NuxtLink
            v-if="canServicesView"
            :to="localePath('/admin/services')"
            class="flex items-center justify-between text-xs font-semibold text-[#2B71AE] transition-colors hover:text-[#285E8E] dark:text-blue-400"
          >
            <span>{{ locale === 'ar' ? 'متابعة جدول وطلبات الخدمات' : 'Review all client requests' }}</span>
            <ArrowRight class="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Quick Shortcuts & Quick Navigation -->
    <section aria-label="Quick Actions">
      <div class="mb-3 flex items-center justify-between">
        <div>
          <h2 class="font-heading text-sm font-bold text-slate-900 dark:text-slate-100 sm:text-base">
            {{ locale === 'ar' ? 'إجراءات سريعة' : 'Quick Actions' }}
          </h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            {{ locale === 'ar' ? 'الوصول المباشر للمهام الإدارية الأكثر تكراراً.' : 'Direct access to frequent administrative workflows.' }}
          </p>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="action in quickActions"
          :key="action.title"
          :to="localePath(action.to)"
          class="group flex flex-col justify-between rounded-xl border bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2B71AE] hover:shadow-md dark:bg-[#162032] dark:hover:border-[#2B71AE]"
          :style="{ borderColor: 'var(--color-border)' }"
        >
          <div class="space-y-2.5">
            <div class="flex items-center justify-between">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2B71AE]/10 text-[#2B71AE] transition-colors group-hover:bg-[#2B71AE] group-hover:text-white dark:bg-slate-800 dark:text-[#F5CC07] dark:group-hover:bg-[#F5CC07] dark:group-hover:text-slate-950">
                <component :is="action.icon" class="h-5 w-5" aria-hidden="true" />
              </div>
              <ArrowUpRight class="h-4 w-4 text-slate-400 opacity-60 transition-all group-hover:opacity-100 group-hover:text-[#2B71AE] dark:group-hover:text-[#F5CC07] rtl:rotate-270" aria-hidden="true" />
            </div>

            <h3 class="font-heading text-sm font-bold text-slate-900 transition-colors group-hover:text-[#2B71AE] dark:text-slate-100 dark:group-hover:text-[#F5CC07]">
              {{ action.title }}
            </h3>
            <p class="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {{ action.desc }}
            </p>
          </div>

          <div class="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-[#2B71AE] dark:border-slate-800/80 dark:text-[#F5CC07]">
            <span>{{ locale === 'ar' ? 'بدء الإجراء' : 'Open action' }}</span>
            <ArrowRight class="h-3.5 w-3.5 rtl:rotate-180 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" aria-hidden="true" />
          </div>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
