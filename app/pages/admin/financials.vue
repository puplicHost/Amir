<script setup lang="ts">
import {
  Banknote,
  Boxes,
  Calendar,
  Download,
  Plus,
  Repeat,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-vue-next'

definePageMeta({ layout: 'admin', middleware: 'admin-auth', requiredPermission: 'financials.view' })

const { locale } = useI18n()
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

const { data: summary, pending: summaryPending, refresh: refreshSummary } = await useAsyncData(
  'admin-financial-summary',
  () => fetch<any>(`/api/admin/financials/summary?month=${selMonth.value}&year=${selYear.value}`),
  { watch: [selMonth, selYear] },
)

const monthName = computed(() => {
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

// ═════════ Tab 1b: sales / costs breakdown + chart (Change E) ═════════
const payFilter = ref<'all' | 'COD' | 'ONLINE'>('all')
const salesPage = ref(1)
const costsPage = ref(1)
watch([selMonth, selYear, payFilter], () => {
  salesPage.value = 1
  costsPage.value = 1
})

const { data: salesData, pending: salesPending } = await useAsyncData(
  'admin-fin-sales',
  () => fetch<any>(`/api/admin/financials/sales?month=${selMonth.value}&year=${selYear.value}&page=${salesPage.value}&perPage=10${payFilter.value !== 'all' ? `&pay=${payFilter.value}` : ''}`),
  { watch: [selMonth, selYear, payFilter, salesPage] },
)
const { data: costsData, pending: costsPending } = await useAsyncData(
  'admin-fin-costs',
  () => fetch<any>(`/api/admin/financials/costs?month=${selMonth.value}&year=${selYear.value}&page=${costsPage.value}&perPage=10${payFilter.value !== 'all' ? `&pay=${payFilter.value}` : ''}`),
  { watch: [selMonth, selYear, payFilter, costsPage] },
)
const { data: chartData, pending: chartPending } = await useAsyncData('admin-fin-chart', () =>
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
    <div v-if="activeTab === 'summary'" role="tabpanel" class="space-y-8">
      <!-- Top Controls: Month/Year picker + Excel export -->
      <div class="flex flex-wrap items-center gap-2.5 rounded-md border bg-white p-3.5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
        <Calendar class="h-4 w-4 text-slate-400" aria-hidden="true" />
        <select v-model.number="selMonth" class="h-9 rounded-md border bg-white px-3 text-xs font-semibold dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }">
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
        <!-- Section 1: 4 summary cards -->
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div class="rounded-xl border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
            <div class="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <span aria-hidden="true">📈</span>
              <p class="text-[11px] font-semibold uppercase tracking-wider">{{ locale === 'ar' ? 'إجمالي المبيعات' : 'Total Sales' }}</p>
            </div>
            <p class="mt-2 font-heading text-[28px] font-bold leading-none text-slate-900 dark:text-white">{{ formatMoney(summary.revenue.total) }}</p>
            <p class="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              {{ locale === 'ar'
                ? `من ${formatInt(summary.counts?.completedOrders || 0)} طلب مكتمل (تم التسليم)`
                : `From ${formatInt(summary.counts?.completedOrders || 0)} delivered orders` }}
            </p>
          </div>
          <div class="rounded-xl border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
            <div class="flex items-center gap-2 text-orange-500 dark:text-orange-400">
              <span aria-hidden="true">📦</span>
              <p class="text-[11px] font-semibold uppercase tracking-wider">{{ locale === 'ar' ? 'تكلفة البضاعة المباعة' : 'COGS' }}</p>
            </div>
            <p class="mt-2 font-heading text-[28px] font-bold leading-none text-slate-900 dark:text-white">{{ formatMoney(summary.expenses.cogs) }}</p>
            <p class="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              {{ locale === 'ar' ? 'سعر الشراء × الكميات المباعة هذا الشهر' : 'Cost × quantities sold this month' }}
            </p>
          </div>
          <div class="rounded-xl border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
            <div class="flex items-center gap-2 text-[#2B71AE] dark:text-blue-400">
              <span aria-hidden="true">👥</span>
              <p class="text-[11px] font-semibold uppercase tracking-wider">{{ locale === 'ar' ? 'إجمالي المرتبات' : 'Payroll Total' }}</p>
            </div>
            <p class="mt-2 font-heading text-[28px] font-bold leading-none text-slate-900 dark:text-white">{{ formatMoney(summary.expenses.salaries) }}</p>
            <p class="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              {{ locale === 'ar' ? `${formatInt(summary.counts?.activeEmployees || 0)} موظف نشط` : `${formatInt(summary.counts?.activeEmployees || 0)} active staff` }}
            </p>
          </div>
          <div
            class="rounded-xl border p-5 shadow-xs dark:bg-[#162032]"
            :class="summary.profit >= 0 ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/30' : 'border-rose-200 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/30'"
          >
            <div class="flex items-center gap-2" :class="summary.profit >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'">
              <TrendingUp class="h-5 w-5" aria-hidden="true" />
              <p class="text-[11px] font-semibold uppercase tracking-wider">{{ locale === 'ar' ? 'صافي الربح' : 'Net Profit' }}</p>
            </div>
            <p class="mt-2 font-heading text-[28px] font-bold leading-none" :class="summary.profit >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'">
              {{ formatMoney(summary.profit) }}
            </p>
            <p class="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              {{ locale === 'ar' ? '= المبيعات − تكلفة البضاعة − المرتبات' : '= Sales − COGS − Payroll' }}
            </p>
          </div>
        </div>

        <!-- Section 2: step-by-step calculation -->
        <section aria-label="Calculation details" class="space-y-4">
          <h2 class="border-b pb-2 font-heading text-sm font-bold text-slate-900 dark:text-slate-100 sm:text-base" :style="{ borderColor: 'var(--color-border)' }">
            {{ locale === 'ar' ? 'تفاصيل الحسابة' : 'Calculation Breakdown' }}
          </h2>

          <!-- Block 1: Sales -->
          <div class="overflow-hidden rounded-md border bg-white shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
            <div class="border-b px-5 py-4 dark:border-slate-800" :style="{ borderColor: 'var(--color-border)' }">
              <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">{{ locale === 'ar' ? 'المبيعات' : 'Sales' }}</h3>
              <!-- Payment method mini-tabs -->
              <div class="mt-2.5 flex items-center gap-1.5">
                <button
                  v-for="opt in ([
                    { id: 'all', label: locale === 'ar' ? 'الكل' : 'All' },
                    { id: 'COD', label: 'COD' },
                    { id: 'ONLINE', label: locale === 'ar' ? 'بوابة الدفع' : 'Gateway' },
                  ] as const)"
                  :key="opt.id"
                  type="button"
                  class="h-7 rounded-full border px-3 text-[11px] font-bold transition-all"
                  :class="payFilter === opt.id
                    ? 'border-[#2B71AE] bg-[#2B71AE] text-white'
                    : 'border-slate-200 text-slate-500 hover:border-[#2B71AE] hover:text-[#2B71AE] dark:border-slate-700 dark:text-slate-400'"
                  @click="payFilter = opt.id"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[520px] text-start text-xs">
                <thead class="sticky top-0 z-10">
                  <tr class="border-b bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
                    <th scope="col" class="px-5 py-2.5 text-start">{{ locale === 'ar' ? 'المنتج' : 'Product' }}</th>
                    <th scope="col" class="px-4 py-2.5 text-center">{{ locale === 'ar' ? 'الكمية المباعة' : 'Qty Sold' }}</th>
                    <th scope="col" class="px-4 py-2.5 text-end">{{ locale === 'ar' ? 'إجمالي البيع' : 'Sales Total' }}</th>
                  </tr>
                </thead>
                <tbody v-if="!salesPending" class="divide-y divide-slate-100 dark:divide-slate-800/60">
                  <tr v-for="row in salesData?.data || []" :key="row.productId || row.name" class="even:bg-slate-50/50 even:dark:bg-slate-800/30 hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td class="max-w-[260px] truncate px-5 py-2.5 font-semibold text-slate-900 dark:text-slate-100">{{ row.name }}</td>
                    <td class="px-4 py-2.5 text-center font-mono">{{ formatInt(row.quantity) }}</td>
                    <td class="px-4 py-2.5 text-end font-mono font-bold">{{ formatMoney(row.total) }}</td>
                  </tr>
                </tbody>
                <tbody v-else>
                  <tr v-for="i in 5" :key="i"><td colspan="3" class="px-5 py-2"><div class="h-7 animate-pulse rounded bg-slate-100 dark:bg-slate-800" /></td></tr>
                </tbody>
              </table>
            </div>
            <div v-if="!salesPending && !(salesData?.data?.length)" class="p-6 text-center text-xs text-slate-400">
              {{ locale === 'ar' ? 'لا توجد مبيعات في هذه الفترة.' : 'No sales in this period.' }}
            </div>
            <div class="flex items-center justify-between border-t bg-slate-50/70 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/40">
              <span class="text-xs font-bold text-slate-900 dark:text-white">
                {{ locale === 'ar' ? 'إجمالي المبيعات:' : 'Total sales:' }} {{ formatMoney(salesData?.meta?.grandTotal || 0) }}
              </span>
              <div v-if="(salesData?.meta?.totalPages || 1) > 1" class="flex items-center gap-1">
                <button type="button" :disabled="salesPage <= 1" class="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-700" @click="salesPage--">‹</button>
                <span class="font-mono text-[11px] text-slate-500">{{ salesPage }} / {{ salesData?.meta?.totalPages }}</span>
                <button type="button" :disabled="salesPage >= (salesData?.meta?.totalPages || 1)" class="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-700" @click="salesPage++">›</button>
              </div>
            </div>
          </div>

          <!-- Connector arrow (−) -->
          <div class="flex justify-center" aria-hidden="true">
            <span class="flex h-9 w-9 items-center justify-center rounded-full border border-[#2B71AE]/40 bg-[#2B71AE]/10 font-black text-[#2B71AE] dark:text-[#F5CC07]">−</span>
          </div>

          <!-- Block 2: COGS -->
          <div class="overflow-hidden rounded-md border bg-white shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
            <div class="border-b px-5 py-4 dark:border-slate-800" :style="{ borderColor: 'var(--color-border)' }">
              <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">{{ locale === 'ar' ? 'تكلفة البضاعة' : 'Cost of Goods' }}</h3>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[560px] text-start text-xs">
                <thead class="sticky top-0 z-10">
                  <tr class="border-b bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
                    <th scope="col" class="px-5 py-2.5 text-start">{{ locale === 'ar' ? 'المنتج' : 'Product' }}</th>
                    <th scope="col" class="px-4 py-2.5 text-center">{{ locale === 'ar' ? 'الكمية المباعة' : 'Qty Sold' }}</th>
                    <th scope="col" class="px-4 py-2.5 text-center">{{ locale === 'ar' ? 'سعر الشراء' : 'Unit Cost' }}</th>
                    <th scope="col" class="px-4 py-2.5 text-end">{{ locale === 'ar' ? 'إجمالي التكلفة' : 'Cost Total' }}</th>
                  </tr>
                </thead>
                <tbody v-if="!costsPending" class="divide-y divide-slate-100 dark:divide-slate-800/60">
                  <tr v-for="row in costsData?.data || []" :key="row.productId || row.name" class="even:bg-slate-50/50 even:dark:bg-slate-800/30 hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td class="max-w-[220px] truncate px-5 py-2.5 font-semibold text-slate-900 dark:text-slate-100">{{ row.name }}</td>
                    <td class="px-4 py-2.5 text-center font-mono">{{ formatInt(row.quantity) }}</td>
                    <td class="px-4 py-2.5 text-center font-mono text-slate-500">{{ formatMoney(row.unitCost) }}</td>
                    <td class="px-4 py-2.5 text-end font-mono font-bold">{{ formatMoney(row.totalCost) }}</td>
                  </tr>
                </tbody>
                <tbody v-else>
                  <tr v-for="i in 5" :key="i"><td colspan="4" class="px-5 py-2"><div class="h-7 animate-pulse rounded bg-slate-100 dark:bg-slate-800" /></td></tr>
                </tbody>
              </table>
            </div>
            <div v-if="!costsPending && !(costsData?.data?.length)" class="p-6 text-center text-xs text-slate-400">
              {{ locale === 'ar' ? 'لا توجد تكاليف مسجلة في هذه الفترة.' : 'No recorded costs in this period.' }}
            </div>
            <div class="flex items-center justify-between border-t bg-slate-50/70 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/40">
              <span class="text-xs font-bold text-slate-900 dark:text-white">
                {{ locale === 'ar' ? 'إجمالي التكلفة:' : 'Total cost:' }} {{ formatMoney(costsData?.meta?.grandCost || 0) }}
              </span>
              <div v-if="(costsData?.meta?.totalPages || 1) > 1" class="flex items-center gap-1">
                <button type="button" :disabled="costsPage <= 1" class="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-700" @click="costsPage--">‹</button>
                <span class="font-mono text-[11px] text-slate-500">{{ costsPage }} / {{ costsData?.meta?.totalPages }}</span>
                <button type="button" :disabled="costsPage >= (costsData?.meta?.totalPages || 1)" class="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-700" @click="costsPage++">›</button>
              </div>
            </div>
            <div class="bg-[#2B71AE] px-5 py-3 text-xs font-bold text-white dark:bg-[#1e3a5f]">
              {{ locale === 'ar' ? 'هامش ربح البضاعة:' : 'Goods margin:' }} {{ formatMoney((costsData?.meta?.grandSales || 0) - (costsData?.meta?.grandCost || 0)) }}
            </div>
            <div class="border-t px-5 py-2.5 text-[11px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
              {{ locale === 'ar'
                ? `＋ تكلفة البضاعة المضافة للمخزون هذا الشهر (معلومة): ${formatMoney(summary.stockAdditions || 0)}`
                : `＋ Stock additions value this month (info): ${formatMoney(summary.stockAdditions || 0)}` }}
            </div>
          </div>

          <!-- Connector arrow (−) -->
          <div class="flex justify-center" aria-hidden="true">
            <span class="flex h-9 w-9 items-center justify-center rounded-full border border-[#2B71AE]/40 bg-[#2B71AE]/10 font-black text-[#2B71AE] dark:text-[#F5CC07]">−</span>
          </div>

          <!-- Block 3: Payroll (single line, no names) -->
          <div class="rounded-md border bg-white px-5 py-4 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
            <p class="text-xs font-semibold text-slate-700 dark:text-slate-200 sm:text-sm">
              {{ locale === 'ar'
                ? `إجمالي مرتبات ${formatInt(summary.counts?.activeEmployees || 0)} موظف نشط: ${formatMoney(summary.expenses.salaries)}`
                : `Total payroll for ${formatInt(summary.counts?.activeEmployees || 0)} active staff: ${formatMoney(summary.expenses.salaries)}` }}
            </p>
          </div>

          <!-- Connector arrow (=) -->
          <div class="flex justify-center" aria-hidden="true">
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-[#2B71AE] font-black text-white">=</span>
          </div>

          <!-- Final result card -->
          <div class="rounded-lg border border-[#2B71AE] bg-white p-6 text-center shadow-sm dark:bg-[#162032]">
            <p class="font-heading text-sm font-bold text-slate-900 dark:text-white">
              {{ locale === 'ar' ? 'صافي الربح النهائي' : 'Final Net Profit' }}
            </p>
            <p class="mt-2 font-heading text-2xl font-black" :class="summary.profit >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'">
              {{ formatMoney(summary.profit) }}
            </p>
            <p class="mt-2 text-base text-slate-500 dark:text-slate-400">
              {{ locale === 'ar' ? `هامش الربح: ${summary.margin}%` : `Margin: ${summary.margin}%` }}
            </p>
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
                {{ locale === 'ar' ? hoverPoint.label : `${hoverPoint.labelEn} ${hoverPoint.year}` }} {{ hoverPoint.year }}
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

      <!-- Expense modal -->
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

  </div>
</template>
