<script setup lang="ts">
import {
  ArrowRight,
  ArrowUpRight,
  FolderTree,
  Package,
  Plus,
  RefreshCw,
  Settings,
  Wrench,
} from 'lucide-vue-next'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t, locale } = useI18n()
const localePath = useLocalePath()

interface DashboardResponse {
  stats: {
    totalProducts: number
    totalCategories: number
    activeServices: number
  }
}

const fetch = useRequestFetch()
const { data, pending, refresh } = await useAsyncData<DashboardResponse>(
  'admin-dashboard-stats',
  () => fetch<DashboardResponse>('/api/admin/dashboard/stats'),
)

const canServicesView = useAdminCan('services.manage')
const canCategoriesManage = useAdminCan('categories.manage')
const canSettingsView = useAdminCan('settings.view')

const stats = computed(() => data.value?.stats)

const cards = computed(() => [
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
  {
    label: locale.value === 'ar' ? 'الفئات' : 'Categories',
    value: stats.value?.totalCategories ?? 0,
    hint: locale.value === 'ar' ? 'فئات الكتالوج' : 'Catalog categories',
    icon: FolderTree,
    to: '/admin/categories',
    iconBg: 'bg-blue-50 text-[#2B71AE] dark:bg-blue-950/60 dark:text-blue-400',
    highlight: false,
  },
  {
    label: locale.value === 'ar' ? 'خدمات نشطة' : 'Active Services',
    value: stats.value?.activeServices ?? 0,
    hint: locale.value === 'ar' ? 'خدمات متاحة للعرض' : 'Services on showcase',
    icon: Wrench,
    to: '/admin/services',
    iconBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
    highlight: false,
  },
])

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
    title: locale.value === 'ar' ? 'إدارة الفئات' : 'Manage Categories',
    desc: locale.value === 'ar' ? 'تعديل وتصنيف فئات المتجر وصور الغلاف' : 'Organize catalog categories & covers',
    to: '/admin/categories',
    icon: FolderTree,
    show: canCategoriesManage.value,
  },
  {
    title: locale.value === 'ar' ? 'إدارة الخدمات' : 'Manage Services',
    desc: locale.value === 'ar' ? 'تكوين الخدمات المعروضة في الموقع' : 'Configure showcased services',
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
      :description="locale === 'ar' ? 'نظرة عامة على الكتالوج والخدمات.' : 'Catalog and services overview.'"
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
