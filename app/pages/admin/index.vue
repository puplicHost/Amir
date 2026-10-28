<script setup lang="ts">
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Coins,
  FolderTree,
  Package,
  Plus,
  RefreshCw,
  Settings,
  UserCheck,
  Users,
  Wrench,
} from 'lucide-vue-next'
import { centsToEur } from '~~/shared/booking'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t, locale } = useI18n()
const localePath = useLocalePath()

interface DashboardResponse {
  stats: {
    totalProducts: number
    totalCategories: number
    activeServices: number
  }
  bookings: {
    totalBookings: number
    paidBookings: number
    todayBookings: number
    upcomingUnassigned: number
    pendingRefunds: number
    revenueCents: number
  } | null
}

const fetch = useRequestFetch()
const { data, pending, refresh } = await useAsyncData<DashboardResponse>(
  'admin-dashboard-stats',
  () => fetch<DashboardResponse>('/api/admin/dashboard/stats'),
)

const canProductsView = useAdminCan('products.view')
const canServicesView = useAdminCan('services.manage')
const canCategoriesManage = useAdminCan('categories.manage')
const canSettingsView = useAdminCan(['settings.business', 'settings.payment', 'settings.meta', 'banners.manage'])
const canRefunds = useAdminCan(['bookings.refund_handle', 'bookings.refund_issue'])
const canTeamView = useAdminCan(['users.manage', 'schedule.manage'])

const stats = computed(() => data.value?.stats)

const cards = computed(() => [
  {
    label: locale.value === 'ar' ? 'إجمالي المنتجات' : 'Total Products',
    value: stats.value?.totalProducts ?? 0,
    hint: stats.value?.totalCategories
      ? (locale.value === 'ar' ? `في ${stats.value.totalCategories} فئات متجر` : `In ${stats.value.totalCategories} categories`)
      : (locale.value === 'ar' ? 'الكتالوج المتاح' : 'In catalog'),
    icon: Package,
    to: '/admin/catalog?tab=products',
    iconBg: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
    highlight: false,
    show: canProductsView.value,
  },
  {
    label: locale.value === 'ar' ? 'الفئات' : 'Categories',
    value: stats.value?.totalCategories ?? 0,
    hint: locale.value === 'ar' ? 'فئات الكتالوج' : 'Catalog categories',
    icon: FolderTree,
    to: '/admin/catalog?tab=categories',
    iconBg: 'bg-neutral-50 text-primary dark:bg-neutral-950/60 dark:text-neutral-400',
    highlight: false,
    show: canCategoriesManage.value,
  },
  {
    label: locale.value === 'ar' ? 'خدمات نشطة' : 'Active Services',
    value: stats.value?.activeServices ?? 0,
    hint: locale.value === 'ar' ? 'خدمات متاحة للعرض' : 'Services on showcase',
    icon: Wrench,
    to: '/admin/salon?tab=services',
    iconBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
    highlight: false,
    show: canServicesView.value,
  },
].filter(card => card.show))

// ADM-01: booking operations metrics (only sent when the user can view all
// bookings — server omits `bookings` otherwise).
const bookingStats = computed(() => data.value?.bookings || null)

const bookingCards = computed(() => {
  const b = bookingStats.value
  if (!b) return []
  const currency = 'EUR'
  return [
    {
      label: t('admin.bookingsToday'),
      value: b.todayBookings,
      icon: CalendarDays,
      to: '/admin/appointments?tab=calendar',
      iconBg: 'bg-neutral-50 text-primary dark:bg-neutral-950/60 dark:text-neutral-400',
      highlight: false,
    },
    {
      label: t('admin.upcomingUnassigned'),
      value: b.upcomingUnassigned,
      icon: UserCheck,
      to: '/admin/appointments?tab=bookings&status=UNASSIGNED',
      iconBg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
      highlight: b.upcomingUnassigned > 0,
    },
    {
      label: t('admin.pendingRefunds'),
      value: b.pendingRefunds,
      icon: AlertTriangle,
      to: canRefunds.value ? '/admin/finance?tab=payments' : '/admin/appointments?tab=bookings&needsRefund=true',
      iconBg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400',
      highlight: b.pendingRefunds > 0,
    },
    {
      label: t('admin.revenuePaid'),
      value: `${centsToEur(b.revenueCents)} ${currency}`,
      icon: Coins,
      to: '/admin/appointments?tab=bookings&status=PAID',
      iconBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
      highlight: false,
    },
  ]
})

const canCreateProduct = useAdminCan('products.manage')

const quickActions = computed(() => [
  {
    title: locale.value === 'ar' ? 'إضافة منتج جديد' : 'Add New Product',
    desc: locale.value === 'ar' ? 'إنشاء منتج بالصور والأسعار والمواصفات' : 'Create catalog item with specs & images',
    to: '/admin/products/new',
    icon: Plus,
    show: canCreateProduct.value,
  },
  {
    title: locale.value === 'ar' ? 'إدارة الفئات' : 'Manage Categories',
    desc: locale.value === 'ar' ? 'تعديل وتصنيف فئات المتجر وصور الغلاف' : 'Organize catalog categories & covers',
    to: '/admin/catalog?tab=categories',
    icon: FolderTree,
    show: canCategoriesManage.value,
  },
  {
    title: locale.value === 'ar' ? 'إدارة الخدمات' : 'Manage Services',
    desc: locale.value === 'ar' ? 'تكوين الخدمات المعروضة في الموقع' : 'Configure showcased services',
    to: '/admin/salon?tab=services',
    icon: Wrench,
    show: canServicesView.value,
  },
  {
    title: locale.value === 'ar' ? 'إدارة الفريق' : 'Manage Team',
    desc: locale.value === 'ar' ? 'المستخدمون والأدوار وتوافر الموظفين' : 'Users, roles & staff availability',
    to: '/admin/salon?tab=team',
    icon: Users,
    show: canTeamView.value,
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
      :description="locale === 'ar' ? 'نظرة عامة على الكتالوج والخدمات.' : 'Catalog and services overview.'"
    >
      <template #actions>
        <!-- Refresh Button -->
        <button
          type="button"
          class="inline-flex h-11 items-center gap-1.5 rounded-md border bg-white px-3 text-xs font-semibold text-neutral-700 shadow-2xs transition-colors hover:bg-neutral-50 focus-visible:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
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
          class="inline-flex h-11 items-center gap-1.5 rounded-md bg-primary px-3.5 text-xs font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Plus class="h-4 w-4" aria-hidden="true" />
          <span>{{ locale === 'ar' ? 'منتج جديد' : 'Add Product' }}</span>
        </NuxtLink>
      </template>
    </AdminPageHeader>

    <!-- KPI Metric Cards Grid -->
    <section aria-label="Metrics Overview" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <NuxtLink
        v-for="card in cards"
        :key="card.label"
        :to="localePath(card.to)"
        class="group relative flex flex-col justify-between rounded-lg border bg-white p-5 shadow-xs transition duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md dark:bg-neutral-900"
        :class="{ 'border-amber-300 dark:border-amber-700/60': card.highlight && card.label.includes('Pending') }"
        :style="{ borderColor: card.highlight ? undefined : 'var(--color-border)' }"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-1.5">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              {{ card.label }}
            </p>
            <p class="font-heading text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
              {{ card.value.toLocaleString('de-DE') }}
            </p>
          </div>
          <div
            class="flex h-11 w-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105"
            :class="card.iconBg"
          >
            <component :is="card.icon" class="h-5 w-5" aria-hidden="true" />
          </div>
        </div>

        <div class="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs text-neutral-500 dark:border-neutral-800/80 dark:text-neutral-400">
          <span class="truncate text-[11px]">{{ card.hint }}</span>
          <span
            v-if="card.badge"
            class="rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0"
            :class="card.badgeColor"
          >
            {{ card.badge }}
          </span>
          <ArrowUpRight v-else class="h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-primary dark:text-primary" aria-hidden="true" />
        </div>
      </NuxtLink>
    </section>

    <!-- Booking operations (ADM-01; managers only — server omits when absent) -->
    <section v-if="bookingCards.length" aria-label="Booking Operations" class="space-y-3">
      <div>
        <h2 class="font-heading text-sm font-bold text-neutral-900 dark:text-neutral-100 sm:text-base">
          {{ t('admin.bookingOps') }}
        </h2>
        <p class="text-xs text-neutral-500 dark:text-neutral-400">{{ t('admin.bookingOpsDesc') }}</p>
      </div>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <NuxtLink
          v-for="card in bookingCards"
          :key="card.label"
          :to="localePath(card.to)"
          class="group relative flex flex-col justify-between rounded-lg border bg-white p-5 shadow-xs transition duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md dark:bg-neutral-900"
          :class="{ 'border-amber-300 dark:border-amber-700/60': card.highlight }"
          :style="{ borderColor: card.highlight ? undefined : 'var(--color-border)' }"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="space-y-1.5">
              <p class="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {{ card.label }}
              </p>
              <p class="font-heading text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
                {{ typeof card.value === 'number' ? card.value.toLocaleString('de-DE') : card.value }}
              </p>
            </div>
            <div
              class="flex h-11 w-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105"
              :class="card.iconBg"
            >
              <component :is="card.icon" class="h-5 w-5" aria-hidden="true" />
            </div>
          </div>
          <div class="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs text-neutral-500 dark:border-neutral-800/80 dark:text-neutral-400">
            <span class="truncate text-[11px]">
              {{ card.label === t('admin.revenuePaid') ? t('admin.paidBookings') + ': ' + bookingStats?.paidBookings : '' }}
            </span>
            <ArrowUpRight class="h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-primary dark:text-primary" aria-hidden="true" />
          </div>
        </NuxtLink>
      </div>
    </section>

    <!-- Quick Shortcuts & Quick Navigation -->
    <section aria-label="Quick Actions">
      <div class="mb-3 flex items-center justify-between">
        <div>
          <h2 class="font-heading text-sm font-bold text-neutral-900 dark:text-neutral-100 sm:text-base">
            {{ locale === 'ar' ? 'إجراءات سريعة' : 'Quick Actions' }}
          </h2>
          <p class="text-xs text-neutral-500 dark:text-neutral-400">
            {{ locale === 'ar' ? 'الوصول المباشر للمهام الإدارية الأكثر تكراراً.' : 'Direct access to frequent administrative workflows.' }}
          </p>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="action in quickActions"
          :key="action.title"
          :to="localePath(action.to)"
          class="group flex flex-col justify-between rounded-xl border bg-white p-5 shadow-xs transition duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-md dark:bg-neutral-900 dark:hover:border-primary"
          :style="{ borderColor: 'var(--color-border)' }"
        >
          <div class="space-y-2.5">
            <div class="flex items-center justify-between">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-on-primary dark:bg-neutral-800 dark:text-primary dark:group-hover:bg-primary dark:group-hover:text-on-primary">
                <component :is="action.icon" class="h-5 w-5" aria-hidden="true" />
              </div>
              <ArrowUpRight class="h-4 w-4 text-neutral-400 opacity-60 transition group-hover:opacity-100 group-hover:text-primary dark:group-hover:text-primary rtl:rotate-270" aria-hidden="true" />
            </div>

            <h3 class="font-heading text-sm font-bold text-neutral-900 transition-colors group-hover:text-primary dark:text-neutral-100 dark:group-hover:text-primary">
              {{ action.title }}
            </h3>
            <p class="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              {{ action.desc }}
            </p>
          </div>

          <div class="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs font-semibold text-primary dark:border-neutral-800/80 dark:text-primary">
            <span>{{ locale === 'ar' ? 'بدء الإجراء' : 'Open action' }}</span>
            <ArrowRight class="h-3.5 w-3.5 rtl:rotate-180 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" aria-hidden="true" />
          </div>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
