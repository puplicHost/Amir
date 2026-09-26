<script setup lang="ts">
import { Bell, CheckCheck, Inbox } from 'lucide-vue-next'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const tick = useAdminNotifTick()

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

const open = ref(false)
const page = ref(1)
const limit = 15
const fetch = useRequestFetch()

// Client-only fetch: relative timestamps depend on wall-clock "now".
const { data, refresh } = await useAsyncData('admin-notifications', () =>
  fetch<{ notifications: AdminNotificationItem[], unreadCount: number, total: number, pages: number }>(
    '/api/admin/notifications',
    { params: { page: page.value, limit } },
  ),
  { server: false, watch: [page, tick] },
)

let poller: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  poller = setInterval(() => refresh(), 30000)
})
onUnmounted(() => {
  if (poller) clearInterval(poller)
})

const items = computed(() => data.value?.notifications || [])
const unreadCount = computed(() => data.value?.unreadCount || 0)
const total = computed(() => data.value?.total || 0)
const pages = computed(() => data.value?.pages || 1)

function titleOf(n: AdminNotificationItem) {
  return locale.value === 'ar' ? (n.titleAr || n.titleEn) : (n.titleEn || n.titleAr)
}

function bodyOf(n: AdminNotificationItem) {
  return locale.value === 'ar' ? (n.bodyAr || n.bodyEn) : (n.bodyEn || n.bodyAr)
}

function formatRel(dateStr: string) {
  if (!dateStr) return ''
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  const ar = locale.value === 'ar'
  if (mins < 1) return ar ? 'الآن' : 'Just now'
  if (mins < 60) return ar ? `منذ ${mins} دقيقة` : `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return ar ? `منذ ${hours} ساعة` : `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return ar ? `منذ ${days} يوم` : `${days}d ago`
  return new Date(dateStr).toLocaleDateString(ar ? 'ar-EG' : 'en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

async function openNotification(n: AdminNotificationItem) {
  open.value = false
  if (!n.isRead) {
    try {
      await $fetch(`/api/admin/notifications/${n.id}/read`, { method: 'PUT' })
      await refresh()
    }
    catch { /* read-marker is best-effort */ }
  }
  await navigateTo(localePath(n.url || '/admin'))
}

async function markAllRead() {
  try {
    await $fetch('/api/admin/notifications/read-all', { method: 'PUT' })
    await refresh()
  }
  catch { /* best-effort */ }
}

function toggle() {
  open.value = !open.value
  if (open.value) refresh()
}
</script>

<template>
  <div class="relative">
    <button
      type="button"
      :aria-label="t('admin.notifications')"
      :title="t('admin.notifications')"
      class="relative flex h-9 w-9 items-center justify-center rounded-md border text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
      :aria-expanded="open"
      @click="toggle"
    >
      <Bell class="h-4 w-4" aria-hidden="true" />
      <span
        v-if="unreadCount > 0"
        class="absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F5CC07] px-1 text-[10px] font-black text-slate-950 shadow-xs"
      >
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <button
      v-if="open"
      type="button"
      tabindex="-1"
      aria-hidden="true"
      class="fixed inset-0 z-40 cursor-default bg-transparent"
      @click="open = false"
    />

    <div
      v-if="open"
      class="absolute end-0 top-full z-50 mt-2 max-h-96 w-80 overflow-hidden rounded-lg border bg-white shadow-xl sm:w-96 dark:bg-[#162032]"
      :style="{ borderColor: 'var(--color-border)' }"
      role="menu"
      :aria-label="t('admin.notifications')"
    >
      <div
        class="flex items-center justify-between border-b px-4 py-3"
        :style="{ borderColor: 'var(--color-border)' }"
      >
        <p class="text-xs font-bold text-slate-900 dark:text-slate-100">
          {{ t('admin.notifications') }}
          <span v-if="total" class="ms-1 font-mono text-[11px] text-slate-400">{{ total }}</span>
        </p>
        <button
          v-if="unreadCount > 0"
          type="button"
          class="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2B71AE] hover:underline dark:text-[#F5CC07]"
          @click="markAllRead"
        >
          <CheckCheck class="h-3.5 w-3.5" aria-hidden="true" />
          <span>{{ t('admin.markAllRead') }}</span>
        </button>
      </div>

      <div class="max-h-80 overflow-y-auto">
        <button
          v-for="n in items"
          :key="n.id"
          type="button"
          class="flex w-full items-start gap-2.5 border-b px-4 py-3 text-start transition-colors last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/50"
          :style="{ borderColor: 'var(--color-border)' }"
          @click="openNotification(n)"
        >
          <span
            class="mt-1.5 h-2 w-2 shrink-0 rounded-full"
            :class="n.isRead ? 'bg-slate-200 dark:bg-slate-700' : 'bg-[#2B71AE] dark:bg-[#F5CC07]'"
            aria-hidden="true"
          />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-xs font-bold" :class="n.isRead ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'">
              {{ titleOf(n) }}
            </span>
            <span class="mt-0.5 line-clamp-2 block text-[11px] text-slate-500 dark:text-slate-400">
              {{ bodyOf(n) }}
            </span>
            <span class="mt-1 block text-[10px] text-slate-400 dark:text-slate-500">
              {{ formatRel(n.createdAt) }}
            </span>
          </span>
        </button>

        <div v-if="!items.length" class="flex flex-col items-center p-8 text-center">
          <Inbox class="mb-2 h-6 w-6 text-slate-300 dark:text-slate-600" aria-hidden="true" />
          <p class="text-xs font-semibold text-slate-600 dark:text-slate-300">{{ t('admin.noNotifications') }}</p>
        </div>
      </div>

      <div
        v-if="pages > 1"
        class="flex items-center justify-between border-t px-4 py-2 text-[11px]"
        :style="{ borderColor: 'var(--color-border)' }"
      >
        <button
          type="button"
          :disabled="page <= 1"
          class="font-semibold text-[#2B71AE] disabled:opacity-40 dark:text-[#F5CC07]"
          @click="page = Math.max(1, page - 1)"
        >
          ←
        </button>
        <span class="font-mono text-slate-500">{{ page }} / {{ pages }}</span>
        <button
          type="button"
          :disabled="page >= pages"
          class="font-semibold text-[#2B71AE] disabled:opacity-40 dark:text-[#F5CC07]"
          @click="page = Math.min(pages, page + 1)"
        >
          →
        </button>
      </div>
    </div>
  </div>
</template>
