<script setup lang="ts">
import {
  Filter,
  FolderTree,
  History,
  Package,
  RotateCcw,
  Wrench,
} from 'lucide-vue-next'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const router = useRouter()
const fetch = useRequestFetch()

interface AdminActivityItem {
  id: string
  entityType: string
  entityId: string
  entityName: string
  action: string
  details: string | null
  userName: string
  createdAt: string
}

const entityTypes = ['product', 'category', 'service']
const actions = ['created', 'updated', 'deleted', 'media']
const entityFilter = ref(entityTypes.includes(String(route.query.entityType || '')) ? String(route.query.entityType) : '')
const actionFilter = ref(actions.includes(String(route.query.action || '')) ? String(route.query.action) : '')
const page = ref(Number(route.query.page) || 1)
const limit = 15

const { data, refresh, pending } = await useAsyncData('admin-activity-all', () =>
  fetch<{ activities: AdminActivityItem[], total: number, page: number, pages: number }>(
    '/api/admin/activity',
    {
      params: {
        page: page.value,
        limit,
        entityType: entityFilter.value || undefined,
        action: actionFilter.value || undefined,
      },
    },
  ),
  { server: false, watch: [page, entityFilter, actionFilter] },
)

const items = computed(() => data.value?.activities || [])
const total = computed(() => data.value?.total || 0)
const pages = computed(() => data.value?.pages || 1)
const hasFilters = computed(() => !!(entityFilter.value || actionFilter.value))

function activityIcon(entityType: string) {
  if (entityType === 'category') return FolderTree
  if (entityType === 'service') return Wrench
  return Package
}

function activityLink(entry: AdminActivityItem) {
  if (entry.entityType === 'category') return '/admin/categories'
  if (entry.entityType === 'service') return '/admin/services'
  return `/admin/products/${entry.entityId}/edit`
}

function entityTypeLabel(entityType: string) {
  if (entityType === 'category') return locale.value === 'ar' ? 'قسم' : 'Category'
  if (entityType === 'service') return locale.value === 'ar' ? 'خدمة' : 'Service'
  return locale.value === 'ar' ? 'منتج' : 'Product'
}

function activityActionLabel(entry: AdminActivityItem) {
  if (entry.action === 'created') return locale.value === 'ar' ? 'أضاف' : 'created'
  if (entry.action === 'deleted') return locale.value === 'ar' ? 'حذف' : 'deleted'
  if (entry.action === 'media') return entry.details || (locale.value === 'ar' ? 'وسائط' : 'media')
  return entry.details || (locale.value === 'ar' ? 'عدّل' : 'updated')
}

function actionOptionLabel(action: string) {
  if (action === 'created') return locale.value === 'ar' ? 'إضافة' : 'Created'
  if (action === 'updated') return locale.value === 'ar' ? 'تعديل' : 'Updated'
  if (action === 'deleted') return locale.value === 'ar' ? 'حذف' : 'Deleted'
  return locale.value === 'ar' ? 'وسائط' : 'Media'
}

function formatFull(d: string) {
  if (!d) return ''
  return new Date(d).toLocaleString(locale.value === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

async function syncQuery() {
  await router.replace({
    query: {
      entityType: entityFilter.value || undefined,
      action: actionFilter.value || undefined,
      page: page.value > 1 ? String(page.value) : undefined,
    },
  })
}

async function applyFilters() {
  page.value = 1
  await syncQuery()
  await refresh()
}

async function resetFilters() {
  entityFilter.value = ''
  actionFilter.value = ''
  page.value = 1
  await syncQuery()
  await refresh()
}

async function gotoPage(p: number) {
  page.value = p
  await syncQuery()
}

async function openActivity(entry: AdminActivityItem) {
  await navigateTo(localePath(activityLink(entry)))
}
</script>

<template>
  <div>
    <AdminPageHeader
      :title="t('admin.allActivity')"
      :description="t('admin.allActivityDescription')"
    />

    <!-- Filter toolbar -->
    <div
      class="mb-4 rounded-md border bg-white p-3.5 shadow-xs dark:bg-[#162032]"
      :style="{ borderColor: 'var(--color-border)' }"
    >
      <form class="flex flex-wrap items-center gap-2.5" @submit.prevent="applyFilters">
        <select
          v-model="entityFilter"
          class="h-9 rounded-md border bg-white px-3 text-xs text-slate-700 focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520] dark:text-slate-300"
          :style="{ borderColor: 'var(--color-border)' }"
          :aria-label="locale === 'ar' ? 'تصفية حسب النوع' : 'Filter by type'"
          @change="applyFilters"
        >
          <option value="">{{ locale === 'ar' ? 'كل الأنواع' : 'All types' }}</option>
          <option v-for="entityType in entityTypes" :key="entityType" :value="entityType">
            {{ entityTypeLabel(entityType) }}
          </option>
        </select>

        <select
          v-model="actionFilter"
          class="h-9 rounded-md border bg-white px-3 text-xs text-slate-700 focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520] dark:text-slate-300"
          :style="{ borderColor: 'var(--color-border)' }"
          :aria-label="locale === 'ar' ? 'تصفية حسب الإجراء' : 'Filter by action'"
          @change="applyFilters"
        >
          <option value="">{{ locale === 'ar' ? 'كل الإجراءات' : 'All actions' }}</option>
          <option v-for="action in actions" :key="action" :value="action">
            {{ actionOptionLabel(action) }}
          </option>
        </select>

        <button
          type="submit"
          class="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          <Filter class="h-3.5 w-3.5" aria-hidden="true" />
          <span>{{ locale === 'ar' ? 'تصفية' : 'Filter' }}</span>
        </button>

        <button
          v-if="hasFilters"
          type="button"
          class="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          @click="resetFilters"
        >
          <RotateCcw class="h-3.5 w-3.5" aria-hidden="true" />
          <span>{{ locale === 'ar' ? 'إلغاء' : 'Reset' }}</span>
        </button>
      </form>
    </div>

    <!-- History table -->
    <div class="overflow-hidden rounded-md border bg-white shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-start text-sm">
          <thead class="sticky top-0 z-10">
            <tr class="border-b bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/40 dark:text-slate-400" :style="{ borderColor: 'var(--color-border)' }">
              <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'النشاط' : 'Activity' }}</th>
              <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'النوع' : 'Type' }}</th>
              <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'المستخدم' : 'User' }}</th>
              <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'التاريخ' : 'Date' }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
            <tr
              v-for="entry in items"
              :key="entry.id"
              class="cursor-pointer transition-colors even:bg-slate-50/50 even:dark:bg-slate-800/30 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
              @click="openActivity(entry)"
            >
              <td class="px-4 py-3">
                <div class="flex items-start gap-2.5">
                  <span
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2B71AE]/10 text-[#2B71AE] dark:bg-[#2B71AE]/20 dark:text-blue-300"
                    aria-hidden="true"
                  >
                    <component :is="activityIcon(entry.entityType)" class="h-4 w-4" />
                  </span>
                  <div class="min-w-0">
                    <p class="truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                      {{ entry.entityName }}
                    </p>
                    <p class="mt-0.5 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">
                      {{ activityActionLabel(entry) }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center gap-1 rounded bg-[#2B71AE]/10 px-2 py-0.5 text-[11px] font-semibold text-[#2B71AE] dark:bg-[#2B71AE]/20 dark:text-blue-300">
                  <span>{{ entityTypeLabel(entry.entityType) }}</span>
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                {{ entry.userName }}
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                {{ formatFull(entry.createdAt) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="pending && !items.length" class="space-y-2.5 p-4" aria-hidden="true">
        <div v-for="i in 5" :key="i" class="flex animate-pulse items-center gap-3">
          <div class="h-8 w-8 shrink-0 rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div class="h-3 flex-1 rounded bg-slate-200 dark:bg-slate-700" />
          <div class="hidden h-3 w-24 rounded bg-slate-100 sm:block dark:bg-slate-800" />
        </div>
      </div>

      <div v-if="!pending && !items.length" class="flex flex-col items-center p-8 text-center">
        <History class="mb-2 h-6 w-6 text-slate-300 dark:text-slate-600" aria-hidden="true" />
        <p class="text-xs font-semibold text-slate-600 dark:text-slate-300">{{ t('admin.noActivity') }}</p>
      </div>

      <p class="sr-only" role="status">
        {{ locale === 'ar' ? `${total} نشاط` : `${total} activities` }}
      </p>

      <AdminPagination
        :page="page"
        :pages="pages"
        :total="total"
        :item-name="locale === 'ar' ? 'نشاط' : 'activities'"
        @change="gotoPage"
      />
    </div>
  </div>
</template>
