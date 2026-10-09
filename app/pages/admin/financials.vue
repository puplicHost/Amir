<script setup lang="ts">
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Calendar,
  Download,
  Eye,
  EyeOff,
  Minus,
  Package,
  Plus,
  Receipt,
  Repeat,
  ShoppingCart,
  Trash2,
  Trophy,
  Undo2,
  Wallet,
  X,
} from 'lucide-vue-next'

definePageMeta({ layout: 'admin', middleware: 'admin-auth', requiredPermission: 'financials.view' })

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const router = useRouter()
const toast = useAdminToast()
const fetch = useRequestFetch()
const { confirm: confirmDialog } = useAdminConfirm()
const canManage = useAdminCan('financials.manage')

const VALID_TABS = ['summary', 'expenses'] as const
const activeTab = ref<string>(
  (VALID_TABS as readonly string[]).includes(String(route.query.tab || '')) ? String(route.query.tab) : 'summary',
)
function switchTab(id: string) {
  activeTab.value = id
  router.replace({ query: { tab: id } })
}

// ═════════ Tab 1: monthly summary ═════════
const now = new Date()
const selMonth = ref(now.getMonth() + 1)
const selYear = ref(now.getFullYear())
const months = Array.from({ length: 12 }, (_, i) => i + 1)
const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 2 + i)
const activePreset = ref<'this-month' | 'last-month' | 'this-year' | null>('this-month')

function setPreset(p: 'this-month' | 'last-month' | 'this-year') {
  activePreset.value = p
  const current = new Date()
  if (p === 'this-month') {
    selMonth.value = current.getMonth() + 1
    selYear.value = current.getFullYear()
  }
  else if (p === 'last-month') {
    const lm = current.getMonth() === 0 ? 12 : current.getMonth()
    const ly = current.getMonth() === 0 ? current.getFullYear() - 1 : current.getFullYear()
    selMonth.value = lm
    selYear.value = ly
  }
  else if (p === 'this-year') {
    selYear.value = current.getFullYear()
    selMonth.value = 0
  }
  refreshSummary()
}

watch([selMonth, selYear], () => {
  const current = new Date()
  if (selYear.value === current.getFullYear() && selMonth.value === current.getMonth() + 1) {
    activePreset.value = 'this-month'
  }
  else if (
    (current.getMonth() === 0 && selMonth.value === 12 && selYear.value === current.getFullYear() - 1) ||
    (current.getMonth() > 0 && selMonth.value === current.getMonth() && selYear.value === current.getFullYear())
  ) {
    activePreset.value = 'last-month'
  }
  else if (selYear.value === current.getFullYear() && selMonth.value === 0) {
    activePreset.value = 'this-year'
  }
  else {
    activePreset.value = null
  }
})

const { data: summary, pending: summaryPending, refresh: refreshSummary } = await useAsyncData(
  'admin-financial-summary',
  () => fetch<any>(`/api/admin/financials/summary?month=${selMonth.value}&year=${selYear.value}`),
  { watch: [selMonth, selYear] },
)

const monthName = computed(() => {
  if (selMonth.value === 0) {
    return locale.value === 'ar' ? `عام ${selYear.value} كاملاً` : `Full Year ${selYear.value}`
  }
  try {
    return new Date(selYear.value, selMonth.value - 1, 1).toLocaleDateString(
      locale.value === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' },
    )
  }
  catch { return '' }
})

function formatMoney(n: number): string {
  const f = (Number(n) || 0).toLocaleString(locale.value === 'ar' ? 'ar-EG' : 'en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })
  return locale.value === 'ar' ? `${f} ج.م` : `${f} EGP`
}

function formatInt(n: number): string {
  return (Number(n) || 0).toLocaleString(locale.value === 'ar' ? 'ar-EG' : 'en-US')
}

// ═════════ Tab 1b: sales breakdown (top products, best seller, units) ═════════
const payFilter = ref<'all' | 'COD' | 'ONLINE'>('all')

const { data: salesData, pending: salesPending, refresh: refreshSales } = await useAsyncData(
  'admin-fin-sales',
  () => fetch<any>(`/api/admin/financials/sales?month=${selMonth.value}&year=${selYear.value}&page=1&perPage=50${payFilter.value !== 'all' ? `&pay=${payFilter.value}` : ''}`),
  { watch: [selMonth, selYear, payFilter] },
)
const { data: chartData, pending: chartPending, refresh: refreshChart } = await useAsyncData('admin-fin-chart', () =>
  fetch<{ data: { month: number, year: number, label: string, labelEn: string, sales: number, costs: number, profit: number }[] }>('/api/admin/financials/chart?months=12'),
)

function exportExcel() {
  window.open(`/api/admin/financials/export?month=${selMonth.value}&year=${selYear.value}`, '_blank')
}

// ── SVG line chart (sales blue / costs red / profit green) ──
const CW = 640
const CH = 240
const CP = { t: 16, r: 12, b: 32, l: 12 }
const chartPoints = computed(() => chartData.value?.data || [])
const chartMax = computed(() => {
  const vals = chartPoints.value.flatMap(p => [p.sales, p.costs, Math.max(0, p.profit)])
  return Math.max(1, ...vals)
})
function chartX(i: number): number {
  const n = Math.max(1, chartPoints.value.length - 1)
  return CP.l + (i / n) * (CW - CP.l - CP.r)
}
function chartY(v: number): number {
  const h = CH - CP.t - CP.b
  const clamped = Math.max(0, Math.min(chartMax.value, v))
  return CP.t + h - (clamped / chartMax.value) * h
}
function seriesPath(key: 'sales' | 'costs' | 'profit'): string {
  return chartPoints.value.map((p, i) => `${i === 0 ? 'M' : 'L'}${chartX(i).toFixed(1)},${chartY(p[key]).toFixed(1)}`).join(' ')
}
const hoverIdx = ref<number | null>(null)
function onChartMove(e: MouseEvent) {
  const el = e.currentTarget as SVGElement
  const rect = el.getBoundingClientRect()
  const scaleX = CW / rect.width
  const x = (e.clientX - rect.left) * scaleX
  const n = chartPoints.value.length
  if (!n) {
    hoverIdx.value = null
    return
  }
  const step = (CW - CP.l - CP.r) / Math.max(1, n - 1)
  const idx = Math.round((x - CP.l) / step)
  hoverIdx.value = Math.max(0, Math.min(n - 1, idx))
}
const hoverPoint = computed(() => hoverIdx.value === null ? null : chartPoints.value[hoverIdx.value])
function chartGridVals(): number[] {
  const m = chartMax.value
  return [m, m / 2, 0]
}

// ═════════ Overview cards (image-style, 100% real API data) ═════════
const canOrdersView = useAdminCan('orders.view')
const hideAmounts = ref(false)
function money(n: number): string {
  return hideAmounts.value ? '••••••' : formatMoney(n)
}

const { data: txData, pending: txPending, refresh: refreshTx } = await useAsyncData('admin-fin-transactions', () =>
  fetch<{ transactions: { id: string, orderNumber: string, paymentMethod: string, total: number, itemCount: number, deliveredAt: string }[] }>(
    `/api/admin/financials/transactions?month=${selMonth.value}&year=${selYear.value}&limit=5${payFilter.value !== 'all' ? `&pay=${payFilter.value}` : ''}`,
  ),
  { watch: [selMonth, selYear, payFilter] },
)
const transactions = computed(() => txData.value?.transactions || [])

const netBalance = computed(() =>
  Number(summary.value?.revenue?.total || 0) - Number(summary.value?.expenses?.total || 0),
)
const deliveredCount = computed(() => Number(summary.value?.counts?.completedOrders || 0))
const itemsSold = computed(() => Number(salesData.value?.meta?.grandQty || 0))
const earningTotal = computed(() => Number(salesData.value?.meta?.grandTotal || summary.value?.revenue?.total || 0))
const profitMargin = computed(() => Number(summary.value?.margin || 0))

const expenseCats = computed(() => [
  { key: 'cogs', label: locale.value === 'ar' ? 'تكلفة البضاعة' : 'COGS', value: Number(summary.value?.expenses?.cogs || 0), color: '#a3e635' },
  { key: 'payroll', label: locale.value === 'ar' ? 'المرتبات' : 'Payroll', value: Number(summary.value?.expenses?.salaries || 0), color: '#2B71AE' },
  { key: 'other', label: locale.value === 'ar' ? 'مصاريف أخرى' : 'Other', value: Number(summary.value?.expenses?.other || 0), color: '#f59e0b' },
])
const expenseTotal = computed(() => expenseCats.value.reduce((s, c) => s + c.value, 0))
const DONUT_R = 50
const DONUT_C = 2 * Math.PI * DONUT_R
const donutSegs = computed(() => {
  let acc = 0
  return expenseCats.value.map((c) => {
    const frac = expenseTotal.value > 0 ? c.value / expenseTotal.value : 0
    const seg = { ...c, frac, start: acc }
    acc += frac * DONUT_C
    return seg
  })
})
const expenseShareOfSales = computed(() => {
  const sales = Number(summary.value?.revenue?.total || 0)
  return sales > 0 ? Math.round((expenseTotal.value / sales) * 100) : 0
})

const topProducts = computed(() => (salesData.value?.data || []).slice(0, 4))
function earningShare(total: number): number {
  const base = earningTotal.value
  return base > 0 ? Math.max(2, Math.round((Number(total) / base) * 100)) : 0
}

// ═════════ KPI summary row (period totals + best seller) ═════════
const productsCount = computed(() => Number(salesData.value?.meta?.total || 0))
const avgOrderValue = computed(() => {
  const orders = Number(summary.value?.counts?.completedOrders || 0)
  return orders > 0 ? Number(summary.value?.revenue?.total || 0) / orders : 0
})
const bestSeller = computed(() => {
  let best: { name: string, quantity: number } | null = null
  for (const row of salesData.value?.data || []) {
    const qty = Number(row.quantity || 0)
    if (!best || qty > best.quantity) best = { name: String(row.name || ''), quantity: qty }
  }
  return best || { name: '', quantity: 0 }
})

function txTime(d: string): string {
  if (!d) return ''
  return new Date(d).toLocaleString(locale.value === 'ar' ? 'ar-EG' : 'en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}
function payLabel(pay: string): string {
  if (pay === 'ONLINE') return locale.value === 'ar' ? 'أونلاين' : 'Online'
  return 'COD'
}

// ═════════ MoM/YoY delta chips (Fix 4) ═════════
// Positive → green ↑, negative → red ↓, zero or no prior data → gray dash.
function deltaOf(current: number, prev: number | null | undefined): { text: string, chip: string, dir: 'up' | 'down' | 'flat' } {
  const flat = { text: '—', chip: 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500', dir: 'flat' } as const
  if (prev === null || prev === undefined || prev === 0) return { ...flat }
  const pct = ((Number(current) - Number(prev)) / Math.abs(Number(prev))) * 100
  if (!Number.isFinite(pct) || pct === 0) return { ...flat }
  const rounded = `${pct > 0 ? '+' : ''}${Math.round(pct * 10) / 10}%`
  return pct > 0
    ? { text: rounded, chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300', dir: 'up' }
    : { text: rounded, chip: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300', dir: 'down' }
}
const prevBalance = computed(() =>
  Number(summary.value?.previous?.revenue || 0) - Number(summary.value?.previous?.expensesTotal || 0),
)
// Earning tile shows pay-filtered sales; a prior figure only exists unfiltered (All).
const earningDelta = computed(() =>
  payFilter.value === 'all'
    ? deltaOf(earningTotal.value, summary.value?.previous?.revenue)
    : deltaOf(0, 0),
)
const balanceDelta = computed(() => deltaOf(netBalance.value, prevBalance.value))
const profitDelta = computed(() => deltaOf(Number(summary.value?.profit || 0), summary.value?.previous?.profit))
const spendingDelta = computed(() => deltaOf(expenseTotal.value, summary.value?.previous?.expensesTotal))
const txCountDelta = computed(() => deltaOf(deliveredCount.value, summary.value?.previous?.deliveredCount))
const refundsDelta = computed(() => deltaOf(Number(summary.value?.refunds?.total || 0), summary.value?.previous?.refundTotal))

// ═════════ Refund action (Fix 5) ═════════
const canOrdersManage = useAdminCan('orders.manage')
const refundingId = ref<string | null>(null)
const refundReason = ref('customer_request')
const refundSaving = ref(false)
const REFUND_REASONS = [
  { id: 'customer_request', key: 'admin.finReasonCustomerRequest' },
  { id: 'damaged', key: 'admin.finReasonDamaged' },
  { id: 'wrong_item', key: 'admin.finReasonWrongItem' },
  { id: 'other', key: 'admin.finReasonOther' },
] as const
function startRefund(txId: string) {
  refundingId.value = txId
  refundReason.value = 'customer_request'
}
function cancelRefund() {
  refundingId.value = null
}
async function confirmRefund(tx: { id: string, orderNumber: string }) {
  if (!refundReason.value) {
    toast.error(t('admin.finRefundNeedsReason'))
    return
  }
  refundSaving.value = true
  try {
    await $fetch(`/api/admin/orders/${tx.id}/status`, {
      method: 'PUT',
      body: { status: 'Refunded', refundReason: refundReason.value },
    })
    refundingId.value = null
    toast.success(t('admin.finRefundSuccess'), `${tx.orderNumber}`)
    await Promise.all([refreshSummary(), refreshTx(), refreshSales(), refreshChart()])
  }
  catch (e: any) {
    toast.error(
      t('admin.finRefundFailed'),
      e?.data?.message || 'Could not mark order as refunded',
    )
  }
  finally {
    refundSaving.value = false
  }
}

// ═════════ Tab 2: other expenses ═════════
interface Expense { id: string, category: string, description: string | null, amount: number, month: number, year: number, recurring: boolean }
const { data: expData, refresh: refreshExpenses } = await useAsyncData('admin-expenses', () =>
  fetch<{ expenses: Expense[] }>(`/api/admin/expenses?month=${selMonth.value}&year=${selYear.value}`),
  { watch: [selMonth, selYear] },
)
const expenses = computed(() => expData.value?.expenses || [])
const expensesTotal = computed(() => Math.round(expenses.value.reduce((s, e) => s + Number(e.amount), 0) * 100) / 100)

const EXP_CATS = [
  { id: 'rent', ar: 'إيجار', en: 'Rent' },
  { id: 'electricity', ar: 'كهرباء', en: 'Electricity' },
  { id: 'shipping', ar: 'شحن وتوصيل', en: 'Shipping' },
  { id: 'marketing', ar: 'تسويق', en: 'Marketing' },
  { id: 'maintenance', ar: 'صيانة', en: 'Maintenance' },
  { id: 'other', ar: 'أخرى', en: 'Other' },
]
function catLabel(id: string): string {
  const c = EXP_CATS.find(c => c.id === id)
  return locale.value === 'ar' ? (c?.ar || id) : (c?.en || id)
}

const expModalOpen = ref(false)
const expSaving = ref(false)
const expError = ref('')
const expForm = reactive({ category: 'rent', description: '', amount: '' as number | '', recurring: false })

function openAddExpense() {
  expForm.category = 'rent'
  expForm.description = ''
  expForm.amount = ''
  expForm.recurring = false
  expError.value = ''
  expModalOpen.value = true
}
async function saveExpense() {
  if (Number(expForm.amount) < 0 || !Number.isFinite(Number(expForm.amount)) || expForm.amount === '') {
    expError.value = locale.value === 'ar' ? 'يرجى إدخال مبلغ صحيح.' : 'Valid amount is required.'
    return
  }
  expSaving.value = true
  expError.value = ''
  try {
    await $fetch('/api/admin/expenses', {
      method: 'POST',
      body: {
        category: expForm.category,
        description: expForm.description.trim() || null,
        amount: Number(expForm.amount),
        month: selMonth.value,
        year: selYear.value,
        recurring: expForm.recurring,
      },
    })
    expModalOpen.value = false
    await refreshExpenses()
    await refreshSummary()
    toast.success(locale.value === 'ar' ? 'تم تسجيل المصروف' : 'Expense Recorded')
  }
  catch (e: any) {
    expError.value = e?.data?.message || (locale.value === 'ar' ? 'فشل الحفظ' : 'Save failed')
  }
  finally {
    expSaving.value = false
  }
}
async function removeExpense(e: Expense) {
  const ok = await confirmDialog({
    title: locale.value === 'ar' ? 'حذف هذا المصروف؟' : 'Delete this expense?',
    message: e.description || catLabel(e.category),
  })
  if (!ok) return
  try {
    await $fetch(`/api/admin/expenses/${e.id}`, { method: 'DELETE' })
    await refreshExpenses()
    await refreshSummary()
    toast.success(locale.value === 'ar' ? 'تم حذف المصروف' : 'Expense Deleted')
  }
  catch (err: any) {
    toast.error(locale.value === 'ar' ? 'فشل الحذف' : 'Delete Failed', err?.data?.message)
  }
}

</script>

<template>
  <div>
    <AdminPageHeader
      :title="locale === 'ar' ? 'المالية والمصاريف' : 'Financials & Expenses'"
      :description="locale === 'ar' ? 'الملخص المالي الشهري، المرتبات، المصاريف، والفواتير.' : 'Monthly P&L, payroll, expenses, and invoices.'"
    />

    <!-- Tabs -->
    <div class="mb-6 flex gap-1 overflow-x-auto border-b" :style="{ borderColor: 'var(--color-border)' }" role="tablist">
      <button
        v-for="tab in ([
          { id: 'summary', label: locale === 'ar' ? 'الملخص الشهري' : 'Summary' },
          { id: 'expenses', label: locale === 'ar' ? 'المصاريف الأخرى' : 'Expenses' },
        ] as const)"
        :key="tab.id"
        type="button" role="tab" :aria-selected="activeTab === tab.id"
        class="inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors"
        :class="activeTab === tab.id ? 'border-[#2B71AE] text-[#2B71AE] dark:border-[#F5CC07] dark:text-[#F5CC07]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
        @click="switchTab(tab.id)"
      >
        <span>{{ tab.label }}</span>
      </button>
    </div>

    <!-- ═══ Tab 1: Monthly financials (Change E) ═══ -->
    <div v-if="activeTab === 'summary'" role="tabpanel" class="space-y-4">
      <!-- Quick date presets pill buttons -->
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="inline-flex h-8 items-center rounded-full px-3.5 text-xs font-bold transition-all shadow-xs"
          :class="activePreset === 'this-month'
            ? 'bg-[#2B71AE] text-white shadow-sm'
            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#162032] dark:text-slate-300 dark:hover:bg-slate-800'"
          @click="setPreset('this-month')"
        >
          {{ locale === 'ar' ? 'هذا الشهر' : 'This Month' }}
        </button>
        <button
          type="button"
          class="inline-flex h-8 items-center rounded-full px-3.5 text-xs font-bold transition-all shadow-xs"
          :class="activePreset === 'last-month'
            ? 'bg-[#2B71AE] text-white shadow-sm'
            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#162032] dark:text-slate-300 dark:hover:bg-slate-800'"
          @click="setPreset('last-month')"
        >
          {{ locale === 'ar' ? 'الشهر الماضي' : 'Last Month' }}
        </button>
        <button
          type="button"
          class="inline-flex h-8 items-center rounded-full px-3.5 text-xs font-bold transition-all shadow-xs"
          :class="activePreset === 'this-year'
            ? 'bg-[#2B71AE] text-white shadow-sm'
            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#162032] dark:text-slate-300 dark:hover:bg-slate-800'"
          @click="setPreset('this-year')"
        >
          {{ locale === 'ar' ? 'هذا العام' : 'This Year' }}
        </button>
      </div>

      <!-- Top Controls: Month/Year picker + Excel export -->
      <div class="flex flex-wrap items-center gap-2.5 rounded-md border bg-white p-3.5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
        <Calendar class="h-4 w-4 text-slate-400" aria-hidden="true" />
        <select v-model.number="selMonth" class="h-9 rounded-md border bg-white px-3 text-xs font-semibold dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }">
          <option :value="0">{{ locale === 'ar' ? 'العام كاملاً' : 'Full Year' }}</option>
          <option v-for="m in months" :key="m" :value="m">
            {{ new Date(2000, m - 1, 1).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { month: 'long' }) }}
          </option>
        </select>
        <select v-model.number="selYear" class="h-9 rounded-md border bg-white px-3 font-mono text-xs font-semibold dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
        <span class="text-xs text-slate-500">{{ monthName }}</span>
        <span class="ms-auto" />
        <button
          type="button"
          class="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#2B71AE] bg-transparent px-3.5 text-xs font-bold text-[#2B71AE] transition-colors hover:bg-[#2B71AE]/10 dark:border-blue-500 dark:text-blue-300"
          @click="exportExcel"
        >
          <Download class="h-3.5 w-3.5" aria-hidden="true" />
          <span>{{ locale === 'ar' ? 'تصدير Excel' : 'Export Excel' }} ↓</span>
        </button>
      </div>

      <div v-if="summaryPending" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div v-for="i in 4" :key="i" class="h-28 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      </div>

      <template v-else-if="summary">
        <!-- Overview: balance + profit hero cards -->
        <div class="grid gap-4 lg:grid-cols-5">
          <!-- Active balance card -->
          <div class="rounded-2xl border bg-white p-5 shadow-xs sm:p-6 lg:col-span-3 dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {{ locale === 'ar' ? 'بالجنيه المصري' : 'EGP' }}
              </span>
              <span class="text-[11px] font-semibold text-slate-400">
                {{ monthName }} · {{ locale === 'ar' ? `${deliveredCount} طلب تم تسليمه` : `${deliveredCount} delivered orders` }}
              </span>
            </div>
            <p class="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400">
              {{ locale === 'ar' ? 'صافي الرصيد النشط' : 'Active Balance' }}
            </p>
            <div class="mt-1 flex items-center gap-2">
              <p class="font-heading text-4xl font-black tracking-tight text-slate-900 sm:text-5xl dark:text-white">
                {{ money(netBalance) }}
              </p>
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                :aria-label="hideAmounts ? (locale === 'ar' ? 'إظهار المبالغ' : 'Show amounts') : (locale === 'ar' ? 'إخفاء المبالغ' : 'Hide amounts')"
                :title="hideAmounts ? (locale === 'ar' ? 'إظهار المبالغ' : 'Show amounts') : (locale === 'ar' ? 'إخفاء المبالغ' : 'Hide amounts')"
                @click="hideAmounts = !hideAmounts"
              >
                <EyeOff v-if="hideAmounts" class="h-4 w-4" aria-hidden="true" />
                <Eye v-else class="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <span class="mt-2 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black" :class="balanceDelta.chip">
              <ArrowUp v-if="balanceDelta.dir === 'up'" class="h-3 w-3" aria-hidden="true" />
              <ArrowDown v-else-if="balanceDelta.dir === 'down'" class="h-3 w-3" aria-hidden="true" />
              <Minus v-else class="h-3 w-3" aria-hidden="true" />
              <span>{{ balanceDelta.text }}</span>
              <span class="font-semibold opacity-70">{{ t('admin.finVsPrev') }}</span>
            </span>
            <div class="mt-5 flex flex-wrap items-center gap-2">
              <button
                v-if="canManage"
                type="button"
                class="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#1d4d2b] px-4 text-xs font-bold text-white transition-colors hover:bg-[#163d22]"
                @click="openAddExpense"
              >
                <Plus class="h-4 w-4" aria-hidden="true" />
                <span>{{ locale === 'ar' ? 'تسجيل مصروف' : 'Add Expense' }}</span>
              </button>
              <button
                type="button"
                class="inline-flex h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-transparent dark:text-slate-200 dark:hover:bg-slate-800"
                @click="exportExcel"
              >
                <Download class="h-4 w-4" aria-hidden="true" />
                <span>{{ locale === 'ar' ? 'تصدير Excel' : 'Export Excel' }}</span>
              </button>
              <a
                href="#finance-transactions"
                class="ms-auto flex h-12 w-12 items-center justify-center rounded-full bg-lime-300 text-slate-900 transition-transform hover:scale-105"
                :aria-label="locale === 'ar' ? 'الانتقال إلى المعاملات' : 'Go to transactions'"
              >
                <ArrowUpRight class="h-5 w-5" aria-hidden="true" />
              </a>
            </div>
          </div>

          <!-- Net profit hero card -->
          <div class="rounded-2xl bg-lime-300 p-5 text-slate-900 shadow-xs sm:p-6 lg:col-span-2">
            <div class="flex items-center justify-between gap-2">
              <span class="inline-flex items-center gap-1.5 rounded-full bg-[#1d4d2b] px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white">
                {{ locale === 'ar' ? 'صافي الربح' : 'Net Profit' }}
              </span>
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-black/10"
                :aria-label="hideAmounts ? (locale === 'ar' ? 'إظهار المبالغ' : 'Show amounts') : (locale === 'ar' ? 'إخفاء المبالغ' : 'Hide amounts')"
                @click="hideAmounts = !hideAmounts"
              >
                <EyeOff v-if="hideAmounts" class="h-4 w-4" aria-hidden="true" />
                <Eye v-else class="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <p class="mt-4 text-xs font-medium text-slate-700">
              {{ locale === 'ar' ? 'أرباح هذه الفترة' : 'Your Profit' }}
            </p>
            <div class="mt-1 flex flex-wrap items-center gap-2">
              <p class="font-heading text-4xl font-black tracking-tight sm:text-5xl">
                {{ money(Number(summary.profit || 0)) }}
              </p>
              <span class="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-black text-[#1d4d2b]">
                {{ profitMargin }}% {{ locale === 'ar' ? 'هامش' : 'margin' }}
              </span>
            </div>
            <span class="mt-2 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black" :class="profitDelta.chip">
              <ArrowUp v-if="profitDelta.dir === 'up'" class="h-3 w-3" aria-hidden="true" />
              <ArrowDown v-else-if="profitDelta.dir === 'down'" class="h-3 w-3" aria-hidden="true" />
              <Minus v-else class="h-3 w-3" aria-hidden="true" />
              <span>{{ profitDelta.text }}</span>
              <span class="font-semibold opacity-70">{{ t('admin.finVsPrev') }}</span>
            </span>
            <div class="mt-5 grid grid-cols-2 gap-2.5">
              <div class="rounded-xl bg-white/60 p-3">
                <p class="text-[11px] font-semibold text-slate-600">{{ locale === 'ar' ? 'طلبات تم تسليمها' : 'Delivered Orders' }}</p>
                <p class="mt-1 font-heading text-xl font-black">{{ formatInt(deliveredCount) }}</p>
              </div>
              <div class="rounded-xl bg-white/60 p-3">
                <p class="text-[11px] font-semibold text-slate-600">{{ locale === 'ar' ? 'وحدات مباعة' : 'Units Sold' }}</p>
                <p class="mt-1 font-heading text-xl font-black">{{ formatInt(itemsSold) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Refunds KPI tile -->
        <div class="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-rose-200 bg-rose-50/60 px-5 py-4 dark:border-rose-900/50 dark:bg-rose-950/30">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300" aria-hidden="true">
            <Undo2 class="h-5 w-5" />
          </span>
          <div class="min-w-0">
            <p class="text-[11px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-300">{{ t('admin.finRefunds') }}</p>
            <p class="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {{ formatInt(Number(summary.refunds?.count || 0)) }} {{ t('admin.finRefundedOrders') }}
            </p>
          </div>
          <p class="ms-auto font-heading text-2xl font-black text-rose-600 dark:text-rose-300">
            {{ money(Number(summary.refunds?.total || 0)) }}
          </p>
          <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black" :class="refundsDelta.chip">
            <ArrowUp v-if="refundsDelta.dir === 'up'" class="h-3 w-3" aria-hidden="true" />
            <ArrowDown v-else-if="refundsDelta.dir === 'down'" class="h-3 w-3" aria-hidden="true" />
            <Minus v-else class="h-3 w-3" aria-hidden="true" />
            <span>{{ refundsDelta.text }}</span>
            <span class="font-semibold opacity-70">{{ t('admin.finVsPrev') }}</span>
          </span>
        </div>

        <!-- Overview: spending donut + earning bars + transactions -->
        <div class="grid gap-4 lg:grid-cols-3">
          <!-- Spending donut -->
          <div class="rounded-2xl border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
            <div class="flex items-center justify-between gap-2">
              <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">
                {{ locale === 'ar' ? 'المصروفات' : 'Spending' }}
              </h3>
              <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {{ monthName }}
              </span>
            </div>
            <div class="relative mx-auto mt-2 h-44 w-44" dir="ltr">
              <svg viewBox="0 0 120 120" class="h-full w-full -rotate-90">
                <circle cx="60" cy="60" :r="DONUT_R" fill="none" stroke-width="13" class="stroke-slate-100 dark:stroke-slate-800" />
                <circle
                  v-for="seg in donutSegs"
                  :key="seg.key"
                  cx="60" cy="60" :r="DONUT_R" fill="none"
                  :stroke="seg.color" stroke-width="13"
                  :stroke-dasharray="`${Math.max(seg.frac * DONUT_C - 4, seg.frac > 0 ? 2 : 0)} ${DONUT_C}`"
                  :stroke-dashoffset="-seg.start"
                  stroke-linecap="round"
                />
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <p class="font-heading text-xl font-black text-slate-900 dark:text-white">{{ money(expenseTotal) }}</p>
                <p class="text-[11px] font-bold text-rose-500">
                  {{ expenseShareOfSales }}% {{ locale === 'ar' ? 'من المبيعات' : 'of sales' }}
                </p>
              </div>
            </div>
            <ul class="mt-3 space-y-2">
              <li class="flex justify-center">
                <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black" :class="spendingDelta.chip">
                  <ArrowUp v-if="spendingDelta.dir === 'up'" class="h-3 w-3" aria-hidden="true" />
                  <ArrowDown v-else-if="spendingDelta.dir === 'down'" class="h-3 w-3" aria-hidden="true" />
                  <Minus v-else class="h-3 w-3" aria-hidden="true" />
                  <span>{{ spendingDelta.text }}</span>
                  <span class="font-semibold opacity-70">{{ t('admin.finVsPrev') }}</span>
                </span>
              </li>
              <li v-for="cat in expenseCats" :key="cat.key" class="flex items-center gap-2 text-xs">
                <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ backgroundColor: cat.color }" aria-hidden="true" />
                <span class="font-semibold text-slate-600 dark:text-slate-300">{{ cat.label }}</span>
                <span class="ms-auto font-mono font-bold text-slate-900 dark:text-slate-100">{{ money(cat.value) }}</span>
                <span class="w-9 shrink-0 text-end font-mono text-[11px] text-slate-400">
                  {{ expenseTotal > 0 ? Math.round((cat.value / expenseTotal) * 100) : 0 }}%
                </span>
              </li>
            </ul>
          </div>

          <!-- Earning bars -->
          <div class="rounded-2xl border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
            <div class="flex items-center justify-between gap-2">
              <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">
                {{ locale === 'ar' ? 'الإيرادات' : 'Earning' }}
              </h3>
              <div class="flex items-center gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  v-for="opt in ([
                    { id: 'all', label: locale === 'ar' ? 'الكل' : 'All' },
                    { id: 'COD', label: 'COD' },
                    { id: 'ONLINE', label: locale === 'ar' ? 'أونلاين' : 'Online' },
                  ] as const)"
                  :key="opt.id"
                  type="button"
                  class="h-7 rounded-full px-2.5 text-[11px] font-bold transition-colors"
                  :class="payFilter === opt.id ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white' : 'text-slate-500 dark:text-slate-400'"
                  @click="payFilter = opt.id"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>
            <p class="mt-3 font-heading text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {{ money(earningTotal) }}
            </p>
            <p class="mt-1 text-[11px] font-semibold text-slate-400">
              {{ locale === 'ar' ? `من ${formatInt(salesData?.meta?.total || 0)} منتج · ${monthName}` : `from ${formatInt(salesData?.meta?.total || 0)} products · ${monthName}` }}
            </p>
            <span class="mt-2 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black" :class="earningDelta.chip">
              <ArrowUp v-if="earningDelta.dir === 'up'" class="h-3 w-3" aria-hidden="true" />
              <ArrowDown v-else-if="earningDelta.dir === 'down'" class="h-3 w-3" aria-hidden="true" />
              <Minus v-else class="h-3 w-3" aria-hidden="true" />
              <span>{{ earningDelta.text }}</span>
              <span class="font-semibold opacity-70">{{ t('admin.finVsPrev') }}</span>
            </span>
            <div v-if="salesPending" class="mt-4 space-y-3" aria-hidden="true">
              <div v-for="i in 4" :key="i" class="h-9 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
            <ul v-else-if="topProducts.length" class="mt-4 space-y-3.5">
              <li v-for="row in topProducts" :key="row.productId || row.name">
                <div class="flex items-baseline justify-between gap-2 text-xs">
                  <span class="truncate font-semibold text-slate-700 dark:text-slate-200">{{ row.name }}</span>
                  <span class="shrink-0 font-mono font-bold text-slate-900 dark:text-slate-100">{{ money(row.total) }}</span>
                </div>
                <div class="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" dir="ltr">
                  <div
                    class="h-full rounded-full bg-gradient-to-r from-lime-400 to-lime-500 transition-all"
                    :style="{ width: `${earningShare(row.total)}%` }"
                  />
                </div>
              </li>
            </ul>
            <p v-else class="mt-4 rounded-lg bg-slate-50 p-4 text-center text-xs text-slate-400 dark:bg-slate-800/50">
              {{ locale === 'ar' ? 'لا توجد مبيعات في هذه الفترة.' : 'No sales in this period.' }}
            </p>
          </div>

          <!-- Transactions -->
          <div id="finance-transactions" class="scroll-mt-24 rounded-2xl border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
            <div class="flex items-center justify-between gap-2">
              <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">
                {{ locale === 'ar' ? 'المعاملات' : 'Transactions' }}
              </h3>
              <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {{ locale === 'ar' ? 'أحدث الطلبات المسلمة' : 'Latest delivered' }}
              </span>
            </div>
            <div class="mt-1.5 flex items-center gap-1.5">
              <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black" :class="txCountDelta.chip">
                <ArrowUp v-if="txCountDelta.dir === 'up'" class="h-3 w-3" aria-hidden="true" />
                <ArrowDown v-else-if="txCountDelta.dir === 'down'" class="h-3 w-3" aria-hidden="true" />
                <Minus v-else class="h-3 w-3" aria-hidden="true" />
                <span>{{ txCountDelta.text }}</span>
                <span class="font-semibold opacity-70">{{ t('admin.finVsPrev') }}</span>
              </span>
            </div>
            <div v-if="txPending" class="mt-4 space-y-2.5" aria-hidden="true">
              <div v-for="i in 5" :key="i" class="flex animate-pulse items-center gap-2.5">
                <div class="h-9 w-9 shrink-0 rounded-full bg-slate-100 dark:bg-slate-800" />
                <div class="h-3 flex-1 rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            </div>
            <ul v-else-if="transactions.length" class="mt-2 divide-y divide-slate-100 dark:divide-slate-800/60">
              <li v-for="tx in transactions" :key="tx.id">
                <component
                  :is="canOrdersView ? 'NuxtLink' : 'div'"
                  :to="canOrdersView ? localePath(`/admin/orders/${tx.id}`) : undefined"
                  class="group flex items-center gap-2.5 py-2.5"
                  :class="{ 'rounded-lg transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50': canOrdersView }"
                >
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300" aria-hidden="true">
                    {{ payLabel(tx.paymentMethod).slice(0, 1) }}
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                      {{ locale === 'ar' ? `طلب ${tx.orderNumber}` : `Order ${tx.orderNumber}` }}
                    </span>
                    <span class="block truncate text-[11px] text-slate-400">
                      {{ payLabel(tx.paymentMethod) }} · {{ txTime(tx.deliveredAt) }} · {{ locale === 'ar' ? `${formatInt(tx.itemCount)} صنف` : `${formatInt(tx.itemCount)} items` }}
                    </span>
                  </span>
                  <span class="shrink-0 font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
                    +{{ money(tx.total) }}
                  </span>
                </component>
                <div v-if="canOrdersManage" class="pb-1.5">
                  <button
                    v-if="refundingId !== tx.id"
                    type="button"
                    class="mt-0.5 inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-bold text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                    :title="t('admin.finRefund')"
                    :aria-label="`${t('admin.finRefund')} ${tx.orderNumber}`"
                    @click="startRefund(tx.id)"
                  >
                    <Undo2 class="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{{ t('admin.finRefund') }}</span>
                  </button>
                  <div v-else class="mt-1.5 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60">
                    <label class="text-[11px] font-bold text-slate-600 dark:text-slate-300" :for="`refund-reason-${tx.id}`">
                      {{ t('admin.finRefundReason') }}
                    </label>
                    <select
                      :id="`refund-reason-${tx.id}`"
                      v-model="refundReason"
                      class="h-8 rounded-md border bg-white px-2 text-xs font-semibold dark:bg-[#0B1520]"
                      :style="{ borderColor: 'var(--color-border)' }"
                    >
                      <option v-for="r in REFUND_REASONS" :key="r.id" :value="r.id">{{ t(r.key) }}</option>
                    </select>
                    <button
                      type="button"
                      :disabled="refundSaving"
                      class="inline-flex h-8 items-center rounded-md bg-rose-600 px-3 text-xs font-bold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
                      @click="confirmRefund(tx)"
                    >
                      {{ t('admin.finConfirm') }}
                    </button>
                    <button
                      type="button"
                      class="inline-flex h-8 items-center rounded-md px-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      @click="cancelRefund"
                    >
                      {{ t('admin.finCancel') }}
                    </button>
                  </div>
                </div>
              </li>
            </ul>
            <p v-else class="mt-4 rounded-lg bg-slate-50 p-4 text-center text-xs text-slate-400 dark:bg-slate-800/50">
              {{ locale === 'ar' ? 'لا توجد معاملات مسلمة في هذه الفترة.' : 'No delivered transactions in this period.' }}
            </p>
          </div>
        </div>

        <!-- KPI summary row -->
        <section aria-label="Period KPIs" class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <!-- Orders -->
          <div class="rounded-2xl border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
            <div class="flex items-center gap-2">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2B71AE]/10 text-[#2B71AE] dark:bg-[#2B71AE]/20 dark:text-blue-300" aria-hidden="true">
                <ShoppingCart class="h-5 w-5" />
              </span>
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{{ t('admin.fin.kpi.ordersTitle') }}</p>
            </div>
            <p class="mt-3 font-heading text-3xl font-black text-slate-900 dark:text-white">
              {{ formatInt(deliveredCount) }}
              <span class="font-heading text-sm font-bold text-slate-500 dark:text-slate-400">{{ t('admin.fin.kpi.deliveredOrders') }}</span>
            </p>
            <p class="mt-1 text-[11px] text-slate-400">{{ t('admin.fin.kpi.ordersSub') }}</p>
          </div>
          <!-- Units sold -->
          <div class="rounded-2xl border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
            <div class="flex items-center gap-2">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400" aria-hidden="true">
                <Package class="h-5 w-5" />
              </span>
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{{ t('admin.fin.kpi.unitsTitle') }}</p>
            </div>
            <p class="mt-3 font-heading text-3xl font-black text-slate-900 dark:text-white">
              {{ formatInt(itemsSold) }}
              <span class="font-heading text-sm font-bold text-slate-500 dark:text-slate-400">{{ t('admin.fin.kpi.unitsUnit') }}</span>
            </p>
            <p class="mt-1 text-[11px] text-slate-400">{{ t('admin.fin.kpi.across') }} {{ formatInt(productsCount) }} {{ t('admin.fin.kpi.products') }}</p>
          </div>
          <!-- Avg order value -->
          <div class="rounded-2xl border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
            <div class="flex items-center gap-2">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400" aria-hidden="true">
                <Receipt class="h-5 w-5" />
              </span>
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{{ t('admin.fin.kpi.aovTitle') }}</p>
            </div>
            <p class="mt-3 font-heading text-2xl font-black text-slate-900 dark:text-white">{{ money(avgOrderValue) }}</p>
            <p class="mt-1 text-[11px] text-slate-400">{{ t('admin.fin.kpi.perOrder') }}</p>
          </div>
          <!-- Best seller -->
          <div class="rounded-2xl border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
            <div class="flex items-center gap-2">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-100 text-lime-700 dark:bg-lime-950/50 dark:text-lime-300" aria-hidden="true">
                <Trophy class="h-5 w-5" />
              </span>
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{{ t('admin.fin.kpi.bestSellerTitle') }}</p>
            </div>
            <p class="mt-3 truncate font-heading text-xl font-black text-slate-900 dark:text-white" :title="bestSeller.name || '—'">{{ bestSeller.name || '—' }}</p>
            <p class="mt-1 text-[11px] text-slate-400">{{ formatInt(bestSeller.quantity) }} {{ t('admin.fin.kpi.unitsSold') }}</p>
          </div>
        </section>

        <!-- Section 3: Monthly performance chart -->
        <section aria-label="Monthly performance" class="overflow-hidden rounded-md border bg-white shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
          <div class="border-b px-5 py-4 dark:border-slate-800" :style="{ borderColor: 'var(--color-border)' }">
            <h2 class="font-heading text-sm font-bold text-slate-900 dark:text-slate-100 sm:text-base">
              {{ locale === 'ar' ? 'الأداء الشهري — آخر 12 شهر' : 'Monthly Performance — Last 12 Months' }}
            </h2>
            <div class="mt-2 flex flex-wrap items-center gap-4 text-[11px] font-semibold">
              <span class="inline-flex items-center gap-1.5 text-[#2B71AE] dark:text-blue-400"><span class="h-2 w-4 rounded-full bg-[#2B71AE]" />{{ locale === 'ar' ? 'المبيعات' : 'Sales' }}</span>
              <span class="inline-flex items-center gap-1.5 text-rose-500"><span class="h-2 w-4 rounded-full bg-rose-500" />{{ locale === 'ar' ? 'التكاليف' : 'Costs' }}</span>
              <span class="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400"><span class="h-2 w-4 rounded-full bg-emerald-500" />{{ locale === 'ar' ? 'صافي الربح' : 'Net Profit' }}</span>
            </div>
          </div>
          <div class="relative p-4 sm:p-5">
            <div v-if="chartPending" class="h-[240px] animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <svg
              v-else-if="chartPoints.length"
              :viewBox="`0 0 ${CW} ${CH}`"
              class="w-full touch-none select-none"
              style="height: 240px;"
              dir="ltr"
              @mousemove="onChartMove"
              @mouseleave="hoverIdx = null"
            >
              <!-- Gridlines -->
              <g v-for="gv in chartGridVals()" :key="gv">
                <line :x1="CP.l" :x2="CW - CP.r" :y1="chartY(gv)" :y2="chartY(gv)" stroke="currentColor" class="text-slate-200 dark:text-slate-800" stroke-width="1" />
                <text :x="CP.l + 2" :y="chartY(gv) - 3" font-size="9" fill="currentColor" class="text-slate-400">{{ gv >= 1000 ? `${Math.round(gv / 100) / 10}k` : Math.round(gv) }}</text>
              </g>
              <!-- Series -->
              <path :d="seriesPath('costs')" fill="none" stroke="#f43f5e" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
              <path :d="seriesPath('profit')" fill="none" stroke="#10b981" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
              <path :d="seriesPath('sales')" fill="none" stroke="#2B71AE" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
              <!-- Dots -->
              <g v-for="(p, i) in chartPoints" :key="`${p.year}-${p.month}`">
                <circle :cx="chartX(i)" :cy="chartY(p.sales)" r="3" fill="#2B71AE" stroke="#fff" stroke-width="1" />
                <circle :cx="chartX(i)" :cy="chartY(p.costs)" r="2.5" fill="#f43f5e" stroke="#fff" stroke-width="1" />
                <circle :cx="chartX(i)" :cy="chartY(p.profit)" r="2.5" fill="#10b981" stroke="#fff" stroke-width="1" />
              </g>
              <!-- Hover crosshair + tooltip anchor -->
              <g v-if="hoverPoint">
                <line :x1="chartX(hoverIdx || 0)" :x2="chartX(hoverIdx || 0)" :y1="CP.t" :y2="CH - CP.b" stroke="currentColor" class="text-slate-300 dark:text-slate-600" stroke-dasharray="3 3" />
                <circle :cx="chartX(hoverIdx || 0)" :cy="chartY(hoverPoint.sales)" r="4.5" fill="#2B71AE" stroke="#fff" stroke-width="2" />
              </g>
              <!-- X labels -->
              <g v-for="(p, i) in chartPoints" :key="`l-${p.year}-${p.month}`">
                <text
                  v-if="i % 2 === 0"
                  :x="chartX(i)" :y="CH - 10" text-anchor="middle" font-size="9.5" fill="currentColor"
                  class="text-slate-500 dark:text-slate-400"
                >{{ locale === 'ar' ? p.label : p.labelEn }}</text>
              </g>
            </svg>
            <!-- Hover tooltip -->
            <div
              v-if="hoverPoint"
              class="pointer-events-none absolute z-10 min-w-[160px] rounded-lg border bg-white/95 p-2.5 text-[11px] shadow-xl backdrop-blur dark:border-slate-700 dark:bg-[#0B1520]/95"
              :style="{
                top: '8px',
                ...(hoverIdx !== null && hoverIdx > chartPoints.length / 2 ? { right: '8px' } : { left: '8px' }),
              }"
            >
              <p class="mb-1.5 font-bold text-slate-900 dark:text-white">
                {{ locale === 'ar' ? `${hoverPoint.label} ${hoverPoint.year}` : `${hoverPoint.labelEn} ${hoverPoint.year}` }}
              </p>
              <p class="flex justify-between gap-4 text-[#2B71AE] dark:text-blue-400"><span>{{ locale === 'ar' ? 'المبيعات' : 'Sales' }}</span><span class="font-mono font-bold">{{ formatMoney(hoverPoint.sales) }}</span></p>
              <p class="flex justify-between gap-4 text-rose-500"><span>{{ locale === 'ar' ? 'التكاليف' : 'Costs' }}</span><span class="font-mono font-bold">{{ formatMoney(hoverPoint.costs) }}</span></p>
              <p class="flex justify-between gap-4 text-emerald-600 dark:text-emerald-400"><span>{{ locale === 'ar' ? 'صافي الربح' : 'Profit' }}</span><span class="font-mono font-bold">{{ formatMoney(hoverPoint.profit) }}</span></p>
            </div>
            <p class="mt-2 text-[11px] text-slate-400">
              {{ locale === 'ar' ? 'ملاحظة: تكاليف المرتبات تُحتسب في الملخص الشهري أعلاه.' : 'Note: payroll costs are reflected in the monthly summary above.' }}
            </p>
          </div>
        </section>
      </template>
    </div>

    <!-- ═══ Tab 2: Other expenses ═══ -->
    <div v-else-if="activeTab === 'expenses'" role="tabpanel">
      <div class="mb-4 flex items-center justify-end">
        <button
          v-if="canManage"
          type="button"
          class="inline-flex h-10 items-center gap-1.5 rounded-md bg-[#F5CC07] px-4 text-xs font-bold text-slate-950 shadow-xs hover:bg-yellow-400"
          @click="openAddExpense"
        >
          <Plus class="h-4 w-4" aria-hidden="true" />
          <span>{{ locale === 'ar' ? 'إضافة مصروف' : 'Add Expense' }}</span>
        </button>
      </div>

      <div class="overflow-hidden rounded-md border bg-white shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[640px] text-start text-sm">
            <thead class="sticky top-0 z-10">
              <tr class="border-b bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/40 dark:text-slate-400" :style="{ borderColor: 'var(--color-border)' }">
                <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'التصنيف' : 'Category' }}</th>
                <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'الوصف' : 'Description' }}</th>
                <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'المبلغ' : 'Amount' }}</th>
                <th scope="col" class="px-4 py-3 text-center">{{ locale === 'ar' ? 'الشهر' : 'Month' }}</th>
                <th scope="col" class="px-4 py-3 text-end">{{ locale === 'ar' ? 'إجراءات' : 'Actions' }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
              <tr v-for="e in expenses" :key="e.id" class="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                <td class="px-4 py-3">
                  <span class="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {{ catLabel(e.category) }}
                  </span>
                  <span v-if="e.recurring" class="ms-1 inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.2 text-[10px] font-bold text-[#2B71AE] dark:bg-blue-950/50 dark:text-blue-300" :title="locale === 'ar' ? 'متكرر شهرياً' : 'Recurring monthly'">
                    <Repeat class="h-2.5 w-2.5" aria-hidden="true" />↻
                  </span>
                </td>
                <td class="max-w-[260px] truncate px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{{ e.description || '—' }}</td>
                <td class="px-4 py-3 font-mono text-xs font-bold text-slate-900 dark:text-slate-100">{{ Number(e.amount).toLocaleString() }} EGP</td>
                <td class="px-4 py-3 text-center font-mono text-xs text-slate-500">{{ e.month }}/{{ e.year }}</td>
                <td class="px-4 py-3 text-end">
                  <button
                    v-if="canManage"
                    type="button"
                    class="inline-flex h-8 w-8 items-center justify-center rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    :title="locale === 'ar' ? 'حذف' : 'Delete'"
                    :aria-label="locale === 'ar' ? 'حذف' : 'Delete'"
                    @click="removeExpense(e)"
                  >
                    <Trash2 class="h-4 w-4" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="!expenses.length" class="p-8">
          <AdminEmptyState
            :title="locale === 'ar' ? 'لا توجد مصاريف هذا الشهر' : 'No expenses this month'"
            :description="locale === 'ar' ? 'سجّل المصاريف التشغيلية لاحتساب صافي الربح بدقة.' : 'Record operating expenses for accurate profit calculation.'"
            :icon="Wallet"
          />
        </div>
        <div class="flex items-center justify-between border-t bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40" :style="{ borderColor: 'var(--color-border)' }">
          <span class="text-xs font-bold text-slate-900 dark:text-slate-100">
            {{ locale === 'ar' ? 'إجمالي المصاريف الأخرى هذا الشهر:' : 'Other expenses this month:' }}
          </span>
          <span class="font-mono text-sm font-black text-slate-900 dark:text-slate-100">{{ formatMoney(expensesTotal) }}</span>
        </div>
      </div>
    </div>

    <!-- Expense modal (shared by overview + expenses tab) -->
    <Teleport to="body">
        <div v-if="expModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" role="dialog" aria-modal="true">
          <div class="w-full max-w-md rounded-xl border bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-[#162032]">
            <div class="mb-4 flex items-center justify-between">
              <h3 class="font-heading text-base font-bold text-slate-900 dark:text-slate-100">
                {{ locale === 'ar' ? 'إضافة مصروف جديد' : 'Add Expense' }}
              </h3>
              <button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" @click="expModalOpen = false">
                <X class="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <p v-if="expError" role="alert" class="mb-3 rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">{{ expError }}</p>
            <div class="space-y-3">
              <label class="block">
                <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ locale === 'ar' ? 'التصنيف *' : 'Category *' }}</span>
                <select v-model="expForm.category" class="h-10 w-full rounded-md border bg-white px-3 text-xs dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }">
                  <option v-for="c in EXP_CATS" :key="c.id" :value="c.id">{{ locale === 'ar' ? c.ar : c.en }}</option>
                </select>
              </label>
              <label class="block">
                <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ locale === 'ar' ? 'الوصف' : 'Description' }}</span>
                <textarea v-model="expForm.description" rows="2" class="w-full rounded-md border bg-white p-2 text-xs dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }" />
              </label>
              <label class="block">
                <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ locale === 'ar' ? 'المبلغ (جنيه) *' : 'Amount (EGP) *' }}</span>
                <input v-model.number="expForm.amount" type="number" min="0" step="0.01" dir="ltr" class="h-10 w-full rounded-md border bg-white px-3 font-mono text-xs dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }" />
              </label>
              <label class="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                <input v-model="expForm.recurring" type="checkbox" class="h-4 w-4 rounded accent-[#2B71AE]" />
                <span>{{ locale === 'ar' ? 'متكرر شهرياً؟ (يُضاف تلقائياً كل شهر)' : 'Recurring monthly? (auto-added each month)' }}</span>
              </label>
            </div>
            <div class="mt-5 flex items-center justify-end gap-2 border-t pt-4" :style="{ borderColor: 'var(--color-border)' }">
              <button type="button" class="h-10 rounded-md border px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300" @click="expModalOpen = false">
                {{ locale === 'ar' ? 'إلغاء' : 'Cancel' }}
              </button>
              <button type="button" :disabled="expSaving" class="inline-flex h-10 items-center rounded-md bg-[#F5CC07] px-6 text-xs font-bold text-slate-950 hover:bg-yellow-400 disabled:opacity-50" @click="saveExpense">
                {{ expSaving ? (locale === 'ar' ? 'جاري الحفظ…' : 'Saving…') : (locale === 'ar' ? 'حفظ' : 'Save') }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>

  </div>
</template>
