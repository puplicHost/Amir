<script setup lang="ts">
import { ArrowRight, Bell, CheckCheck, Inbox } from 'lucide-vue-next'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const tick = useAdminNotifTick()
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

const open = ref(false)
// Dropdown shows the latest items only (fixed first page); deeper browsing
// lives on the dedicated /admin/notifications page.
const limit = 7
const fetch = useRequestFetch()

// Client-only fetch: relative timestamps depend on wall-clock "now".
const { data, refresh, pending } = await useAsyncData('admin-notifications', () =>
  fetch<{ notifications: AdminNotificationItem[], unreadCount: number, total: number, pages: number }>(
    '/api/admin/notifications',
    { params: { page: 1, limit } },
  ),
  { server: false, watch: [tick] },
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
  setOpen(false)
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

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') setOpen(false)
}

// Imperative listener management (no lifecycle APIs after await).
function setOpen(v: boolean) {
  open.value = v
  if (import.meta.client) {
    if (v) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  }
}

function toggle() {
  const next = !open.value
  setOpen(next)
  if (next) refresh()
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
        role="status"
        :aria-label="locale === 'ar' ? `${unreadCount} إشعارات غير مقروءة` : `${unreadCount} unread notifications`"
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
      @click="setOpen(false)"
    />

    <Transition
      enter-active-class="transition duration-150 ease-out motion-reduce:transition-none"
      enter-from-class="transform opacity-0 scale-95 -translate-y-1"
      enter-to-class="transform opacity-100 scale-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in motion-reduce:transition-none"
      leave-from-class="transform opacity-100 scale-100"
      leave-to-class="transform opacity-0 scale-95"
    >
    <div
      v-if="open"
      class="absolute end-0 top-full z-50 mt-2 flex max-h-[min(26rem,calc(100vh-5rem))] w-80 origin-top flex-col overflow-hidden rounded-xl border bg-white/95 shadow-2xl backdrop-blur-md sm:w-96 dark:bg-[#162032]/95"
      :class="locale === 'ar' ? 'origin-top-left' : 'origin-top-right'"
      :style="{ borderColor: 'var(--color-border)' }"
      role="menu"
      :aria-label="t('admin.notifications')"
    >
      <div
        class="flex shrink-0 items-center justify-between border-b px-4 py-3"
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

      <div class="min-h-0 flex-1 overflow-y-auto">
        <div v-if="pending && !items.length" class="space-y-2.5 p-4" aria-hidden="true">
          <div v-for="i in 3" :key="i" class="flex animate-pulse items-start gap-2.5">
            <div class="mt-1 h-8 w-8 shrink-0 rounded-lg bg-slate-200 dark:bg-slate-700" />
            <div class="flex-1 space-y-1.5">
              <div class="h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
              <div class="h-2.5 w-full rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          </div>
        </div>

        <button
          v-for="n in items"
          :key="n.id"
          type="button"
          class="flex w-full items-start gap-2.5 border-b px-4 py-3 text-start transition-colors last:border-b-0 hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-800/50 dark:active:bg-slate-800"
          :class="{ 'bg-[#2B71AE]/[0.04] dark:bg-[#F5CC07]/[0.05]': !n.isRead }"
          :style="{ borderColor: 'var(--color-border)' }"
          @click="openNotification(n)"
        >
          <span
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            :class="TYPE_META[typeGroupOf(n.type)]?.chip || 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'"
            aria-hidden="true"
          >
            <component :is="TYPE_META[typeGroupOf(n.type)]?.icon" v-if="TYPE_META[typeGroupOf(n.type)]" class="h-4 w-4" />
            <span v-else class="h-2 w-2 rounded-full" :class="n.isRead ? 'bg-slate-300 dark:bg-slate-600' : TYPE_META[typeGroupOf(n.type)]?.dot" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="flex items-center gap-1.5">
              <span class="block truncate text-xs font-bold" :class="n.isRead ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'">
                {{ titleOf(n) }}
              </span>
              <span
                v-if="!n.isRead"
                class="shrink-0 rounded-full bg-[#F5CC07]/20 px-1.5 py-px text-[9px] font-black uppercase tracking-wide text-amber-700 dark:text-[#F5CC07]"
              >
                {{ locale === 'ar' ? 'جديد' : 'New' }}
              </span>
            </span>
            <span class="mt-0.5 line-clamp-2 block text-[11px] text-slate-500 dark:text-slate-400">
              {{ bodyOf(n) }}
            </span>
            <span class="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
              <span>{{ typeLabel(typeGroupOf(n.type)) }}</span>
              <span aria-hidden="true">·</span>
              <span>{{ formatRel(n.createdAt) }}</span>
            </span>
          </span>
        </button>

        <div v-if="!pending && !items.length" class="flex flex-col items-center p-8 text-center">
          <Inbox class="mb-2 h-6 w-6 text-slate-300 dark:text-slate-600" aria-hidden="true" />
          <p class="text-xs font-semibold text-slate-600 dark:text-slate-300">{{ t('admin.noNotifications') }}</p>
        </div>
      </div>

      <div
        class="flex shrink-0 items-center justify-between gap-2 border-t bg-slate-50/70 px-4 py-2.5 dark:bg-slate-800/40"
        :style="{ borderColor: 'var(--color-border)' }"
      >
        <span v-if="total > limit" class="text-[11px] text-slate-500 dark:text-slate-400">
          {{ locale === 'ar' ? `عرض أحدث ${items.length} من ${total}` : `Showing latest ${items.length} of ${total}` }}
        </span>
        <span v-else class="text-[11px] text-slate-400 dark:text-slate-500">
          {{ locale === 'ar' ? 'أحدث الإشعارات' : 'Latest notifications' }}
        </span>
        <NuxtLink
          :to="localePath('/admin/notifications')"
          class="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#2B71AE]/10 px-3 py-1.5 text-xs font-bold text-[#2B71AE] transition-colors hover:bg-[#2B71AE]/20 dark:bg-[#F5CC07]/15 dark:text-[#F5CC07] dark:hover:bg-[#F5CC07]/25"
          @click="setOpen(false)"
        >
          <span>{{ t('admin.viewAllNotifications') }}</span>
          <ArrowRight class="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
        </NuxtLink>
      </div>
    </div>
    </Transition>
  </div>
</template>
