<script setup lang="ts">
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Megaphone,
  PlugZap,
  RefreshCw,
  ShieldAlert,
} from 'lucide-vue-next'

definePageMeta({
  layout: 'admin',
  middleware: 'admin-auth',
  // Configuration and testing are Super-Admin only. The API enforces the same
  // rule; this meta flag keeps non-super admins out of the page entirely.
  superAdminOnly: true,
})

interface Integration {
  id: string
  name: string
  descriptionEn: string
  descriptionDe: string
  docsUrl: string
  enabled: boolean
  status: string
  config: Record<string, string>
  events: Record<string, boolean>
  hasSecrets: Record<string, boolean>
  missingRequired: string[]
  delivery: { browser: boolean, server: boolean }
  testConnection: boolean
  testNoteEn?: string
  testNoteDe?: string
  lastVerifiedAt: string | null
  lastError: string | null
  lastErrorAt: string | null
}

interface DeliveryRow {
  platform: string
  eventName: string
  status: string
  responseCode: number | null
  error: string | null
  createdAt: string
}

interface MarketingOverview {
  integrations: Integration[]
  totals: {
    configured: number
    enabled: number
    attention: number
  }
  lastSuccessfulDelivery: {
    platform: string
    eventName: string
    createdAt: string
  } | null
  recentDeliveries: DeliveryRow[]
  recentErrors: DeliveryRow[]
}

const { t, locale } = useI18n()
const fetch = useRequestFetch()
const refreshing = ref(false)

const { data, pending, error, refresh } = await useAsyncData<MarketingOverview>(
  'admin-marketing-overview',
  () => fetch<MarketingOverview>('/api/admin/marketing'),
)

const integrations = computed(() => data.value?.integrations || [])
const totals = computed(() => data.value?.totals || { configured: 0, enabled: 0, attention: 0 })

const kpis = computed(() => [
  {
    key: 'configured',
    label: t('admin.marketingConfigured'),
    value: totals.value.configured,
    icon: PlugZap,
    classes: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  },
  {
    key: 'enabled',
    label: t('admin.marketingEnabled'),
    value: totals.value.enabled,
    icon: CheckCircle2,
    classes: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  {
    key: 'attention',
    label: t('admin.marketingAttention'),
    value: totals.value.attention,
    icon: AlertTriangle,
    classes: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  },
])

function formatDate(iso: string | null | undefined): string {
  if (!iso) return t('admin.marketingNever')
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return t('admin.marketingNever')
  return date.toLocaleString(locale.value === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function platformLabel(platform: string): string {
  return integrations.value.find(i => i.id === platform)?.name || platform
}

function deliveryTone(status: string): string {
  if (status === 'SENT') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
  if (status === 'FAILED') return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
  return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
}

function deliveryStatusLabel(status: string): string {
  if (status === 'SENT') return t('admin.marketingStatusSent')
  if (status === 'FAILED') return t('admin.marketingStatusFailed')
  if (status === 'PENDING') return t('admin.marketingStatusPending')
  if (status === 'SKIPPED') return t('admin.marketingStatusSkipped')
  return status
}

async function refreshAll() {
  if (refreshing.value) return
  refreshing.value = true
  try {
    await refresh()
  }
  finally {
    refreshing.value = false
  }
}
</script>

<template>
  <div>
    <AdminPageHeader
      :title="t('admin.marketing')"
      :description="t('admin.marketingDescription')"
    >
      <template #actions>
        <button
          type="button"
          class="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3.5 text-xs font-semibold text-text transition hover:border-primary disabled:opacity-50"
          :disabled="refreshing || pending"
          @click="refreshAll"
        >
          <RefreshCw class="h-3.5 w-3.5" :class="refreshing ? 'animate-spin' : ''" aria-hidden="true" />
          {{ t('admin.marketingRefresh') }}
        </button>
      </template>
    </AdminPageHeader>

    <div v-if="error" role="alert" class="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
      <ShieldAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{{ t('admin.marketingLoadFailed') }}</span>
    </div>

    <div v-if="pending && !data" class="mb-4 grid gap-3 sm:grid-cols-3">
      <div v-for="i in 3" :key="i" class="h-24 animate-pulse rounded-xl border border-border bg-surface" />
    </div>

    <section v-else class="mb-6" aria-labelledby="marketing-overview-heading">
      <h2 id="marketing-overview-heading" class="mb-3 font-heading text-lg font-bold text-text">
        {{ t('admin.marketingOverview') }}
      </h2>

      <div class="grid gap-3 sm:grid-cols-3">
        <article
          v-for="kpi in kpis"
          :key="kpi.key"
          class="rounded-xl border border-border bg-surface p-4"
        >
          <div class="flex items-center justify-between gap-3">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-muted">{{ kpi.label }}</p>
            <span class="flex h-8 w-8 items-center justify-center rounded-full" :class="kpi.classes">
              <component :is="kpi.icon" class="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
          <p class="mt-2 font-heading text-2xl font-bold text-text">{{ kpi.value }}</p>
        </article>
      </div>

      <div class="mt-3 grid gap-3 lg:grid-cols-2">
        <article class="rounded-xl border border-border bg-surface p-4">
          <div class="flex items-center gap-2">
            <Clock3 class="h-4 w-4 text-muted" aria-hidden="true" />
            <h3 class="text-xs font-bold uppercase tracking-wider text-muted">{{ t('admin.marketingLastSuccess') }}</h3>
          </div>
          <p v-if="data?.lastSuccessfulDelivery" class="mt-2 text-sm font-semibold text-text">
            {{ platformLabel(data.lastSuccessfulDelivery.platform) }} · {{ data.lastSuccessfulDelivery.eventName }}
          </p>
          <p v-if="data?.lastSuccessfulDelivery" class="mt-1 text-[11px] text-muted">
            {{ formatDate(data.lastSuccessfulDelivery.createdAt) }}
          </p>
          <p v-else class="mt-2 text-xs text-muted">{{ t('admin.marketingNoDeliveries') }}</p>
        </article>

        <article class="rounded-xl border border-border bg-surface p-4">
          <div class="flex items-center gap-2">
            <Megaphone class="h-4 w-4 text-muted" aria-hidden="true" />
            <h3 class="text-xs font-bold uppercase tracking-wider text-muted">{{ t('admin.marketingRecentDeliveries') }}</h3>
          </div>
          <ul v-if="data?.recentDeliveries?.length" class="mt-2 space-y-1.5">
            <li v-for="(row, index) in data.recentDeliveries.slice(0, 5)" :key="`${row.platform}-${row.eventName}-${row.createdAt}-${index}`" class="flex items-center justify-between gap-2 text-[11px]">
              <span class="min-w-0 truncate text-text">{{ platformLabel(row.platform) }} · {{ row.eventName }}</span>
              <span class="shrink-0 rounded-full px-2 py-0.5 font-bold uppercase tracking-wide" :class="deliveryTone(row.status)">
                {{ deliveryStatusLabel(row.status) }}
              </span>
            </li>
          </ul>
          <p v-else class="mt-2 text-xs text-muted">{{ t('admin.marketingNoDeliveries') }}</p>
        </article>
      </div>

      <article v-if="data?.recentErrors?.length" class="mt-3 rounded-xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900/50 dark:bg-rose-950/20">
        <h3 class="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">{{ t('admin.marketingRecentErrors') }}</h3>
        <ul class="mt-2 space-y-1.5 text-[11px] text-rose-700 dark:text-rose-300">
          <li v-for="(row, index) in data.recentErrors" :key="`err-${row.platform}-${row.eventName}-${row.createdAt}-${index}`" class="break-words">
            <span class="font-semibold">{{ platformLabel(row.platform) }} · {{ row.eventName }}</span>
            <span class="text-rose-600/80 dark:text-rose-300/80"> — {{ row.error || '—' }}</span>
            <span class="block text-[10px] opacity-70">{{ formatDate(row.createdAt) }}</span>
          </li>
        </ul>
      </article>
    </section>

    <section aria-labelledby="marketing-integrations-heading">
      <div class="mb-3">
        <h2 id="marketing-integrations-heading" class="font-heading text-lg font-bold text-text">
          {{ t('admin.marketingIntegrations') }}
        </h2>
        <p class="mt-1 text-xs text-muted">{{ t('admin.marketingIntegrationsDesc') }}</p>
      </div>

      <div v-if="integrations.length" class="grid gap-4 xl:grid-cols-2">
        <AdminMarketingCard
          v-for="integration in integrations"
          :key="integration.id"
          :integration="integration"
          @saved="refreshAll"
        />
      </div>
      <AdminEmptyState
        v-else-if="!pending"
        :title="t('admin.marketingNoIntegrations')"
        :description="t('admin.marketingNoIntegrationsDesc')"
        :icon="Megaphone"
      />
    </section>
  </div>
</template>
