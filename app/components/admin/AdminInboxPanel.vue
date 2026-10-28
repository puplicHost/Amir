<script setup lang="ts">
import {
  CheckCheck,
  Inbox,
  MailOpen,
  Trash2,
  X,
} from 'lucide-vue-next'


const { locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const router = useRouter()
const fetch = useRequestFetch()
const { confirm: confirmDialog } = useAdminConfirm()

interface ContactMessageItem {
  id: string
  name: string
  phone: string
  message: string
  isRead: boolean
  createdAt: string
}

const tab = ref<'all' | 'unread' | 'read'>(
  route.query.inboxTab === 'unread' || route.query.inboxTab === 'read' ? route.query.inboxTab : 'all',
)
const page = ref(Number(route.query.page) || 1)
const limit = 20
const selected = ref<ContactMessageItem | null>(null)
const deletingId = ref<string | null>(null)

const readParam = computed(() =>
  tab.value === 'all' ? undefined : tab.value === 'read' ? 'true' : 'false',
)

const { data, refresh, pending } = await useAsyncData('admin-inbox', () =>
  fetch<{ messages: ContactMessageItem[], unreadCount: number, total: number, pages: number }>(
    '/api/admin/inbox',
    { params: { page: page.value, limit, isRead: readParam.value } },
  ),
  { server: false, watch: [page, readParam] },
)

const selectedInitials = computed(() => {
  const name = (selected.value?.name || '').trim()
  if (!name) return '?'
  return name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
})

const items = computed(() => data.value?.messages || [])
const unreadCount = computed(() => data.value?.unreadCount || 0)
const total = computed(() => data.value?.total || 0)
const pages = computed(() => data.value?.pages || 1)

function formatFull(d: string) {
  if (!d) return ''
  return new Date(d).toLocaleString(locale.value === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

async function syncQuery() {
  await router.replace({
    query: {
      ...route.query,
      inboxTab: tab.value === 'all' ? undefined : tab.value,
      page: page.value > 1 ? String(page.value) : undefined,
    },
  })
}

async function setTab(t: 'all' | 'unread' | 'read') {
  tab.value = t
  page.value = 1
  await syncQuery()
  await refresh()
}

async function gotoPage(p: number) {
  page.value = p
  await syncQuery()
}

async function openMessage(m: ContactMessageItem) {
  selected.value = m
  if (!m.isRead) {
    try {
      await $fetch(`/api/admin/inbox/${m.id}/read`, { method: 'PUT' })
      m.isRead = true
      await refresh()
    }
    catch { /* best-effort */ }
  }
}

async function markRead(m: ContactMessageItem, e: Event) {
  e.stopPropagation()
  if (m.isRead) return
  try {
    await $fetch(`/api/admin/inbox/${m.id}/read`, { method: 'PUT' })
    m.isRead = true
    await refresh()
  }
  catch { /* best-effort */ }
}

async function deleteMessage(m: ContactMessageItem, e?: Event) {
  e?.stopPropagation()
  const ok = await confirmDialog({
    title: locale.value === 'ar' ? `حذف رسالة "${m.name}"؟` : `Delete message from "${m.name}"?`,
    message: locale.value === 'ar' ? 'لا يمكن التراجع عن هذا الإجراء.' : 'This action cannot be undone.',
  })
  if (!ok) return
  deletingId.value = m.id
  try {
    await $fetch(`/api/admin/inbox/${m.id}`, { method: 'DELETE' })
    if (selected.value?.id === m.id) selected.value = null
    await refresh()
  }
  catch { /* best-effort */ }
  finally {
    deletingId.value = null
  }
}

const markingAllRead = ref(false)
async function markAllAsRead() {
  if (unreadCount.value === 0 || markingAllRead.value) return
  markingAllRead.value = true
  try {
    await $fetch('/api/admin/inbox/read-all', { method: 'PUT' })
    items.value.forEach(m => { m.isRead = true })
    if (data.value) data.value.unreadCount = 0
    await refresh()
  }
  catch { /* best-effort */ }
  finally {
    markingAllRead.value = false
  }
}

const tabs = computed(() => [
  { id: 'all' as const, labelAr: 'الكل', labelEn: 'All' },
  { id: 'unread' as const, labelAr: 'غير المقروءة', labelEn: 'Unread' },
  { id: 'read' as const, labelAr: 'المقروءة', labelEn: 'Read' },
])
</script>

<template>
  <div>
<div class="mb-4 flex flex-wrap items-center justify-end gap-2">
      <button
          v-if="unreadCount > 0"
          type="button"
          :disabled="markingAllRead"
          class="inline-flex h-11 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
          @click="markAllAsRead"
        >
          <CheckCheck class="h-4 w-4" aria-hidden="true" />
          <span>{{ locale === 'ar' ? 'تعليم الكل كمقروء' : 'Mark all as read' }}</span>
        </button>
    </div>

    <!-- Filter tabs & top actions -->
    <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-1 rounded-md border bg-white p-1 shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
        <button
          v-for="t in tabs"
          :key="t.id"
          type="button"
          class="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-bold transition-colors sm:flex-none sm:px-4"
          :class="tab === t.id ? 'bg-primary text-on-primary shadow-xs' : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'"
          @click="setTab(t.id)"
        >
          <span>{{ locale === 'ar' ? t.labelAr : t.labelEn }}</span>
          <span
            v-if="t.id === 'unread' && unreadCount > 0"
            class="rounded-full bg-primary px-1.5 py-px text-[10px] font-black text-on-primary"
          >
            {{ unreadCount }}
          </span>
        </button>
      </div>

      <button
        v-if="unreadCount > 0"
        type="button"
        :disabled="markingAllRead"
        class="inline-flex h-11 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors shadow-xs"
        @click="markAllAsRead"
      >
        <CheckCheck class="h-4 w-4" aria-hidden="true" />
        <span>{{ locale === 'ar' ? 'تعليم الكل كمقروء' : 'Mark all as read' }}</span>
      </button>
    </div>

    <!-- Messages table -->
    <div class="overflow-hidden rounded-md border bg-white shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-start text-sm">
          <thead class="sticky top-0 z-10">
            <tr class="border-b bg-neutral-50/75 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:bg-neutral-800/40 dark:text-neutral-400" :style="{ borderColor: 'var(--color-border)' }">
              <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'الاسم' : 'Name' }}</th>
              <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'رقم الهاتف' : 'Phone' }}</th>
              <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'الرسالة' : 'Message' }}</th>
              <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'التاريخ' : 'Date' }}</th>
              <th scope="col" class="px-4 py-3 text-center">{{ locale === 'ar' ? 'الحالة' : 'Status' }}</th>
              <th scope="col" class="px-4 py-3 text-end">{{ locale === 'ar' ? 'إجراءات' : 'Actions' }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800/60">
            <tr
              v-for="m in items"
              :key="m.id"
              class="cursor-pointer transition-colors even:bg-neutral-50/50 even:dark:bg-neutral-800/30 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40"
              :class="m.isRead ? '' : 'font-bold'"
              @click="openMessage(m)"
            >
              <td class="px-4 py-3">
                <span class="flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
                  <span v-if="!m.isRead" class="h-2 w-2 shrink-0 rounded-full bg-primary dark:bg-primary" aria-hidden="true" />
                  <span class="truncate">{{ m.name }}</span>
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-3 font-mono text-xs text-neutral-600 dark:text-neutral-300" dir="ltr">{{ m.phone }}</td>
              <td class="max-w-[280px] px-4 py-3 text-xs font-normal text-neutral-500 dark:text-neutral-400">
                <span class="line-clamp-2">{{ m.message }}</span>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-xs font-normal text-neutral-500 dark:text-neutral-400">
                {{ formatFull(m.createdAt) }}
              </td>
              <td class="px-4 py-3 text-center">
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold"
                  :class="m.isRead ? 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400' : 'bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary'"
                >
                  {{ m.isRead ? (locale === 'ar' ? 'مقروءة' : 'Read') : (locale === 'ar' ? 'غير مقروءة' : 'Unread') }}
                </span>
              </td>
              <td class="px-4 py-3 text-end">
                <div class="flex items-center justify-end gap-1">
                  <button
                    v-if="!m.isRead"
                    type="button"
                    class="inline-flex h-11 w-8 items-center justify-center rounded text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    :title="locale === 'ar' ? 'تعليم كمقروءة' : 'Mark as read'"
                    :aria-label="locale === 'ar' ? 'تعليم كمقروءة' : 'Mark as read'"
                    @click="markRead(m, $event)"
                  >
                    <MailOpen class="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    :disabled="deletingId === m.id"
                    class="inline-flex h-11 w-8 items-center justify-center rounded text-rose-500 hover:bg-rose-50 disabled:opacity-40 dark:hover:bg-rose-950/40"
                    :title="locale === 'ar' ? 'حذف الرسالة' : 'Delete message'"
                    :aria-label="locale === 'ar' ? 'حذف الرسالة' : 'Delete message'"
                    @click="deleteMessage(m, $event)"
                  >
                    <Trash2 class="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="pending && !items.length" class="space-y-2.5 p-4" aria-hidden="true">
        <div v-for="i in 5" :key="i" class="flex animate-pulse items-center gap-3">
          <div class="h-8 w-8 shrink-0 rounded-lg bg-neutral-200 dark:bg-neutral-700" />
          <div class="h-3 flex-1 rounded bg-neutral-200 dark:bg-neutral-700" />
          <div class="hidden h-3 w-24 rounded bg-neutral-100 sm:block dark:bg-neutral-800" />
        </div>
      </div>

      <div v-if="!pending && !items.length" class="flex flex-col items-center p-8 text-center">
        <Inbox class="mb-2 h-6 w-6 text-neutral-300 dark:text-neutral-600" aria-hidden="true" />
        <p class="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
          {{ locale === 'ar' ? 'لا توجد رسائل' : 'No messages' }}
        </p>
      </div>

      <AdminPagination
        :page="page"
        :pages="pages"
        :total="total"
        :item-name="locale === 'ar' ? 'رسالة' : 'messages'"
        @change="gotoPage"
      />
    </div>

    <!-- Message detail modal -->
    <div
      v-if="selected"
      class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      @click.self="selected = null"
@keydown.escape="selected = null"
    >
      <div
        class="my-8 w-full max-w-lg overflow-hidden rounded-lg border bg-white shadow-xl dark:bg-neutral-900"
        :style="{ borderColor: 'var(--color-border)' }"
      >
        <div class="flex items-center justify-between rounded-t-lg bg-neutral-800 p-5">
          <div class="flex items-center gap-3">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary" aria-hidden="true">
              {{ selectedInitials }}
            </span>
            <div>
              <p class="text-base font-bold text-white">{{ selected.name }}</p>
              <p class="text-[13px] text-white/70" dir="ltr">{{ selected.phone }}</p>
            </div>
          </div>
          <button
            type="button"
            class="flex h-11 w-8 shrink-0 items-center justify-center rounded-md text-white hover:bg-white/10 transition-colors"
            :aria-label="locale === 'ar' ? 'إغلاق' : 'Close'"
            @click="selected = null"
          >
            <X class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div class="bg-white p-5 dark:bg-neutral-900">
          <div class="mb-4 flex justify-end rtl:justify-start">
            <span class="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-300">
              {{ formatFull(selected.createdAt) }}
            </span>
          </div>
          <p class="whitespace-pre-wrap break-words rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm leading-relaxed text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-200">{{ selected.message }}</p>
        </div>
        <div class="flex items-center justify-between gap-2 border-t border-neutral-100 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
          <button
            type="button"
            class="inline-flex h-11 items-center gap-1.5 rounded-md border border-rose-300 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
            @click="deleteMessage(selected)"
          >
            <Trash2 class="h-3.5 w-3.5" aria-hidden="true" />
            <span>{{ locale === 'ar' ? 'حذف' : 'Delete' }}</span>
          </button>
          <button
            type="button"
            class="inline-flex h-11 items-center gap-1.5 rounded-md border border-primary px-3 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
            @click="selected = null"
          >
            <span>{{ locale === 'ar' ? 'إغلاق' : 'Close' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
