<script setup lang="ts">
import { ChevronDown, History, User } from 'lucide-vue-next'

definePageMeta({ layout: 'admin', middleware: 'admin-auth', requiredPermission: 'products.manage' })

const { t, locale } = useI18n()
const route = useRoute()
const id = String(route.params.id)
const fetch = useRequestFetch()

const { data, error } = await useAsyncData(`admin-product-${id}`, () =>
  fetch<{ product: Record<string, unknown> }>(`/api/admin/products/${id}`),
)

// ── Modification history timeline (collapsible, latest first, 20 per page) ──
interface AuditEntry {
  id: string
  action: string
  details: string | null
  userName: string
  createdAt: string
}

const historyOpen = ref(false)
const historyPage = ref(1)
const historyLimit = 20
const historyPending = ref(false)
const historyLogs = ref<AuditEntry[]>([])
const historyTotal = ref(0)
const historyPages = computed(() => Math.max(1, Math.ceil(historyTotal.value / historyLimit)))

async function loadHistory() {
  historyPending.value = true
  try {
    const res = await fetch<{ logs: AuditEntry[], total: number }>(
      `/api/admin/products/${id}/audit?page=${historyPage.value}&limit=${historyLimit}`,
    )
    if (historyPage.value === 1) historyLogs.value = res.logs || []
    else historyLogs.value.push(...(res.logs || []))
    historyTotal.value = res.total || 0
  }
  finally {
    historyPending.value = false
  }
}

function toggleHistory() {
  historyOpen.value = !historyOpen.value
  if (historyOpen.value && !historyLogs.value.length) loadHistory()
}

function loadMoreHistory() {
  if (historyPage.value < historyPages.value) {
    historyPage.value++
    loadHistory()
  }
}

function resetHistory() {
  historyPage.value = 1
  loadHistory()
}

function formatHistoryDate(dateStr: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString(locale.value === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function actionLabel(log: AuditEntry): string {
  if (log.action === 'created') return locale.value === 'ar' ? 'أضاف المنتج' : 'Created product'
  return log.details || (locale.value === 'ar' ? 'عدّل المنتج' : 'Updated product')
}
</script>

<template>
  <div>
    <AdminPageHeader
      :title="locale === 'ar' ? 'تعديل بيانات المنتج' : 'Edit Product'"
      :description="locale === 'ar' ? 'تعديل المواصفات الفنية، التسعير، والصور.' : 'Update product attributes, retail pricing, and media gallery.'"
      back-to="/admin/products"
      :back-label="locale === 'ar' ? 'العودة للمنتجات' : 'Back to Products'"
    />
    <p v-if="error" class="rounded-md border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
      {{ locale === 'ar' ? 'المنتج غير موجود أو تعذر تحميل بياناته.' : 'Product not found or failed to load.' }}
    </p>
    <AdminProductForm v-else-if="data?.product" :existing="data.product as never" />

    <!-- Modification History (Audit Log Timeline) -->
    <div
      v-if="!error && data?.product"
      class="mt-6 overflow-hidden rounded-md border bg-white shadow-xs dark:bg-neutral-900"
      :style="{ borderColor: 'var(--color-border)' }"
    >
      <button
        type="button"
        class="flex w-full items-center justify-between px-5 py-4 text-start transition-colors hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40"
        :aria-expanded="historyOpen"
        @click="toggleHistory"
      >
        <span class="flex items-center gap-2">
          <History class="h-4 w-4 text-primary dark:text-neutral-400" aria-hidden="true" />
          <span class="font-heading text-sm font-bold text-neutral-900 dark:text-neutral-100">
            {{ locale === 'ar' ? 'سجل التعديلات' : 'Modification History' }}
          </span>
          <span v-if="historyTotal" class="rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-[11px] font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            {{ historyTotal }}
          </span>
        </span>
        <span class="inline-flex items-center gap-1 text-xs font-semibold text-primary dark:text-neutral-400">
          {{ locale === 'ar' ? 'عرض السجل' : 'View history' }}
          <ChevronDown class="h-4 w-4 transition-transform duration-300" :class="{ 'rotate-180': historyOpen }" aria-hidden="true" />
        </span>
      </button>

      <div v-if="historyOpen" class="border-t px-5 py-5" :style="{ borderColor: 'var(--color-border)' }">
        <div v-if="historyPending && !historyLogs.length" class="space-y-3">
          <div v-for="i in 3" :key="i" class="h-10 animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800" />
        </div>

        <div v-else-if="historyLogs.length" class="relative ms-2 border-s-2 border-primary/20 ps-6 dark:border-primary/30">
          <div
            v-for="log in historyLogs"
            :key="log.id"
            class="relative pb-6 last:pb-0"
          >
            <span class="absolute -start-[33px] top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-primary shadow-xs dark:border-neutral-900" aria-hidden="true" />
            <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <User class="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
              <p class="text-xs font-bold text-neutral-900 dark:text-neutral-100">{{ log.userName }}</p>
              <span class="text-xs text-neutral-500 dark:text-neutral-400">{{ actionLabel(log) }}</span>
            </div>
            <p class="mt-0.5 text-[13px] text-neutral-400 dark:text-neutral-500">
              {{ formatHistoryDate(log.createdAt) }}
            </p>
          </div>
        </div>

        <p v-else class="text-xs text-neutral-400">
          {{ locale === 'ar' ? 'لا يوجد سجل تعديلات لهذا المنتج بعد.' : 'No modification history for this product yet.' }}
        </p>

        <div v-if="historyPages > 1" class="mt-5 flex items-center justify-center gap-3 border-t pt-4" :style="{ borderColor: 'var(--color-border)' }">
          <button
            v-if="historyPage < historyPages"
            type="button"
            :disabled="historyPending"
            class="text-xs font-semibold text-primary hover:underline disabled:opacity-50 dark:text-neutral-400"
            @click="loadMoreHistory"
          >
            {{ historyPending ? (locale === 'ar' ? 'جاري التحميل…' : 'Loading…') : (locale === 'ar' ? 'تحميل المزيد' : 'Load more') }}
            ({{ historyTotal - historyLogs.length }} {{ locale === 'ar' ? 'متبقي' : 'remaining' }})
          </button>
          <button
            v-if="historyPage > 1"
            type="button"
            class="text-xs text-neutral-500 hover:underline"
            @click="resetHistory"
          >
            {{ locale === 'ar' ? 'العودة للبداية' : 'Back to start' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
