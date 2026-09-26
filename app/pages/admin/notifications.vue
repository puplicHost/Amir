<script setup lang="ts">
import {
  Bell,
  CheckCheck,
  Filter,
  RotateCcw,
} from 'lucide-vue-next'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const router = useRouter()
const tick = useAdminNotifTick()
const fetch = useRequestFetch()
const { TYPE_META, typeGroupOf, typeLabel } = useNotificationUi()

interface AdminNotificationItem {
  id: string
  type: string
  titleEn: string
  titleAr: string
  bodyEn: string
  bodyAr: string
  url: string | null
  isRead: boolean
  createdAt: string
}

const typeFilter = ref(String(route.query.type || ''))
const readFilter = ref(String(route.query.read || ''))
const page = ref(Number(route.query.page) || 1)
const limit = 15

const { data, refresh, pending } = await useAsyncData('admin-notifications-all', () =>
  fetch<{ notifications: AdminNotificationItem[], unreadCount: number, total: number, pages: number }>(
    '/api/admin/notifications',
    { params: { page: page.value, limit, type: typeFilter.value || undefined, read: readFilter.value || undefined } },
  ),
  { server: false, watch: [page, typeFilter, readFilter, tick] },
)

const items = computed(() => data.value?.notifications || [])
const unreadCount = computed(() => data.value?.unreadCount || 0)
const total = computed(() => data.value?.total || 0)
const pages = computed(() => data.value?.pages || 1)
const hasFilters = computed(() => !!(typeFilter.value || readFilter.value))

function titleOf(n: AdminNotificationItem) {
  return locale.value === 'ar' ? (n.titleAr || n.titleEn) : (n.titleEn || n.titleAr)
}

function bodyOf(n: AdminNotificationItem) {
  return locale.value === 'ar' ? (n.bodyAr || n.bodyEn) : (n.bodyEn || n.bodyAr)
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
      type: typeFilter.value || undefined,
      read: readFilter.value || undefined,
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
  typeFilter.value = ''
  readFilter.value = ''
  page.value = 1
  await syncQuery()
  await refresh()
}

async function gotoPage(p: number) {
  page.value = p
  await syncQuery()
}

async function openNotification(n: AdminNotificationItem) {
  if (!n.isRead) {
    try {
      await $fetch(`/api/admin/notifications/${n.id}/read`, { method: 'PUT' })
      tick.value += 1
      await refresh()
    }
    catch { /* best-effort */ }
  }
  await navigateTo(localePath(n.url || '/admin'))
}

async function markAllRead() {
  try {
    await $fetch('/api/admin/notifications/read-all', { method: 'PUT' })
    tick.value += 1
    await refresh()
  }
  catch { /* best-effort */ }
}
</script>

<template>
  <div>
    <AdminPageHeader
      :title="t('admin.allNotifications')"
      :description="locale === 'ar' ? 'سجل كامل لجميع تنبيهات الإدارة مع تصفية حسب النوع والحالة.' : 'Complete history of admin alerts, filterable by type and read state.'"
    >
      <template #actions>
        <button
          v-if="unreadCount > 0"
          type="button"
          class="inline-flex h-10 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#162032] dark:text-slate-300 dark:hover:bg-slate-800"
          @click="markAllRead"
        >
          <CheckCheck class="h-4 w-4" aria-hidden="true" />
          <span>{{ t('admin.markAllRead') }}</span>
        </button>
      </template>
    </AdminPageHeader>

    <!-- Filter toolbar -->
    <div
      class="mb-4 rounded-md border bg-white p-3.5 shadow-xs dark:bg-[#162032]"
      :style="{ borderColor: 'var(--color-border)' }"
    >
      <form class="flex flex-wrap items-center gap-2.5" @submit.prevent="applyFilters">
        <select
          v-model="typeFilter"
          class="h-9 rounded-md border bg-white px-3 text-xs text-slate-700 focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520] dark:text-slate-300"
          :style="{ borderColor: 'var(--color-border)' }"
          :aria-label="locale === 'ar' ? 'تصفية حسب النوع' : 'Filter by type'"
          @change="applyFilters"
        >
          <option value="">{{ locale === 'ar' ? 'كل الأنواع' : 'All types' }}</option>
          <option v-for="(m, key) in TYPE_META" :key="key" :value="key">
            {{ locale === 'ar' ? m.ar : m.en }}
          </option>
        </select>

        <select
          v-model="readFilter"
          class="h-9 rounded-md border bg-white px-3 text-xs text-slate-700 focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520] dark:text-slate-300"
          :style="{ borderColor: 'var(--color-border)' }"
          :aria-label="locale === 'ar' ? 'تصفية حسب الحالة' : 'Filter by read state'"
          @change="applyFilters"
        >
          <option value="">{{ locale === 'ar' ? 'الكل' : 'All' }}</option>
          <option value="unread">{{ locale === 'ar' ? 'غير المقروءة' : 'Unread' }}</option>
          <option value="read">{{ locale === 'ar' ? 'المقروءة' : 'Read' }}</option>
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
        <table class="w-full min-w-[720px] text-start text-sm">
          <thead>
            <tr class="border-b bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/40 dark:text-slate-400" :style="{ borderColor: 'var(--color-border)' }">
              <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'التنبيه' : 'Notification' }}</th>
              <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'النوع' : 'Type' }}</th>
              <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'التاريخ' : 'Date' }}</th>
              <th scope="col" class="px-4 py-3 text-center">{{ locale === 'ar' ? 'الحالة' : 'Status' }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
            <tr
              v-for="n in items"
              :key="n.id"
              class="cursor-pointer transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
              @click="openNotification(n)"
            >
              <td class="px-4 py-3">
                <div class="flex items-start gap-2.5">
                  <span
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    :class="n.isRead ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500' : (TYPE_META[typeGroupOf(n.type)]?.chip || 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400')"
                    aria-hidden="true"
                  >
                    <component :is="TYPE_META[typeGroupOf(n.type)]?.icon || Bell" class="h-4 w-4" />
                  </span>
                  <div class="min-w-0">
                    <p class="flex items-center gap-1.5 text-xs font-bold" :class="n.isRead ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'">
                      <span class="truncate">{{ titleOf(n) }}</span>
                      <span
                        v-if="!n.isRead"
                        class="shrink-0 rounded-full bg-[#F5CC07]/20 px-1.5 py-px text-[9px] font-black uppercase tracking-wide text-amber-700 dark:text-[#F5CC07]"
                      >
                        {{ locale === 'ar' ? 'جديد' : 'New' }}
                      </span>
                    </p>
                    <p class="mt-0.5 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">
                      {{ bodyOf(n) }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold" :class="TYPE_META[typeGroupOf(n.type)]?.chip || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'">
                  <span>{{ typeLabel(typeGroupOf(n.type)) }}</span>
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                {{ formatFull(n.createdAt) }}
              </td>
              <td class="px-4 py-3 text-center">
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold"
                  :class="n.isRead ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' : 'bg-[#2B71AE]/10 text-[#2B71AE] dark:bg-[#F5CC07]/15 dark:text-[#F5CC07]'"
                >
                  {{ n.isRead ? (locale === 'ar' ? 'مقروءة' : 'Read') : (locale === 'ar' ? 'غير مقروءة' : 'Unread') }}
                </span>
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
        <Bell class="mb-2 h-6 w-6 text-slate-300 dark:text-slate-600" aria-hidden="true" />
        <p class="text-xs font-semibold text-slate-600 dark:text-slate-300">{{ t('admin.noNotifications') }}</p>
      </div>

      <p class="sr-only" role="status">
        {{ locale === 'ar' ? `${total} تنبيه` : `${total} notifications` }}
      </p>

      <AdminPagination
        :page="page"
        :pages="pages"
        :total="total"
        :item-name="locale === 'ar' ? 'تنبيه' : 'notifications'"
        @change="gotoPage"
      />
    </div>
  </div>
</template>
