<script setup lang="ts">
import {
  Download,
  Eye,
  FileText,
  Filter,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Search,
  X,
} from 'lucide-vue-next'

definePageMeta({ layout: 'admin', middleware: 'admin-auth', requiredPermission: 'invoices.view' })

const { locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const router = useRouter()
const toast = useAdminToast()
const fetch = useRequestFetch()

interface InvoiceRow {
  id: string
  invoiceNumber: string
  customerName: string
  customerPhone: string
  paymentMethod: string
  status: string
  totalAmount: number
  type: string
  orderId: string | null
  quoteId: string | null
  createdAt: string
  itemCount: number
}

const search = ref(String(route.query.search || ''))
const status = ref(String(route.query.status || ''))
const type = ref(String(route.query.type || ''))
const dateFrom = ref(String(route.query.dateFrom || ''))
const dateTo = ref(String(route.query.dateTo || ''))
const page = ref(Number(route.query.page) || 1)
const limit = 20

const { data, refresh } = await useAsyncData('admin-invoices', () =>
  fetch<{ invoices: InvoiceRow[], total: number, pages: number }>(`/api/admin/invoices?${new URLSearchParams({
    search: search.value,
    status: status.value,
    type: type.value,
    dateFrom: dateFrom.value,
    dateTo: dateTo.value,
    page: String(page.value),
    limit: String(limit),
  })}`),
  { watch: [page] },
)

const hasFilters = computed(() => !!(search.value || status.value || type.value || dateFrom.value || dateTo.value))

async function applyFilters() {
  page.value = 1
  await router.replace({
    query: {
      search: search.value || undefined,
      status: status.value || undefined,
      type: type.value || undefined,
      dateFrom: dateFrom.value || undefined,
      dateTo: dateTo.value || undefined,
    },
  })
  await refresh()
}

async function resetFilters() {
  search.value = ''
  status.value = ''
  type.value = ''
  dateFrom.value = ''
  dateTo.value = ''
  page.value = 1
  await router.replace({ query: {} })
  await refresh()
}

async function gotoPage(p: number) {
  page.value = p
  await router.replace({
    query: {
      search: search.value || undefined,
      status: status.value || undefined,
      type: type.value || undefined,
      dateFrom: dateFrom.value || undefined,
      dateTo: dateTo.value || undefined,
      page: p > 1 ? String(p) : undefined,
    },
  })
}

function formatDate(d: string): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString(locale.value === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function statusAr(s: string): string {
  const map: Record<string, string> = { Paid: 'مدفوعة', Pending: 'معلقة', Cancelled: 'ملغية' }
  return locale.value === 'ar' ? (map[s] || s) : s
}

function typeAr(t: string): string {
  const map: Record<string, string> = { order: 'طلب', quote: 'عرض سعر', manual: 'يدوية' }
  return locale.value === 'ar' ? (map[t] || t) : t
}

function printInvoice(id: string) {
  window.open(`/api/invoices/${id}/pdf`, '_blank')
}

// ── Manual invoice modal ──
interface NewLine { key: string, name: string, quantity: number, unitPrice: number }
const createOpen = ref(false)
const createSaving = ref(false)
const createError = ref('')
const cForm = reactive({
  customerName: '',
  customerPhone: '',
  customerGovernorat: '',
  customerAddress: '',
  notes: '',
  paymentMethod: 'COD',
  status: 'Pending',
  taxAmount: 0,
})
const cLines = ref<NewLine[]>([{ key: `l-${Date.now()}`, name: '', quantity: 1, unitPrice: 0 }])

const cSubtotal = computed(() => Math.round(cLines.value.reduce((s, l) => s + l.quantity * (Number(l.unitPrice) || 0), 0) * 100) / 100)
const cTotal = computed(() => Math.round((cSubtotal.value + Math.max(0, Number(cForm.taxAmount) || 0)) * 100) / 100)

function addLine() {
  cLines.value.push({ key: `l-${Date.now()}-${cLines.value.length}`, name: '', quantity: 1, unitPrice: 0 })
}
function removeLine(key: string) {
  if (cLines.value.length <= 1) return
  cLines.value = cLines.value.filter(l => l.key !== key)
}

function openCreate() {
  createError.value = ''
  createOpen.value = true
}

async function saveManualInvoice() {
  if (!cForm.customerName.trim() || !cForm.customerPhone.trim()) {
    createError.value = locale.value === 'ar' ? 'اسم العميل والهاتف مطلوبان.' : 'Customer name and phone are required.'
    return
  }
  if (!/^01[0125][0-9]{8}$/.test(cForm.customerPhone.trim())) {
    createError.value = locale.value === 'ar' ? 'رقم هاتف مصري غير صالح.' : 'Invalid Egyptian phone number.'
    return
  }
  const lines = cLines.value.filter(l => l.name.trim())
  if (!lines.length) {
    createError.value = locale.value === 'ar' ? 'أضف سطراً واحداً على الأقل.' : 'Add at least one line item.'
    return
  }
  createSaving.value = true
  createError.value = ''
  try {
    await $fetch('/api/admin/invoices', {
      method: 'POST',
      body: {
        customerName: cForm.customerName.trim(),
        customerPhone: cForm.customerPhone.trim(),
        customerGovernorat: cForm.customerGovernorat.trim() || null,
        customerAddress: cForm.customerAddress.trim() || null,
        notes: cForm.notes.trim() || null,
        paymentMethod: cForm.paymentMethod,
        status: cForm.status,
        taxAmount: Math.max(0, Number(cForm.taxAmount) || 0),
        items: lines.map(l => ({ name: l.name.trim(), quantity: Math.max(1, Math.floor(l.quantity || 1)), unitPrice: Math.max(0, Number(l.unitPrice) || 0) })),
      },
    })
    createOpen.value = false
    await refresh()
    toast.success(locale.value === 'ar' ? 'تم إنشاء الفاتورة' : 'Invoice Created')
  }
  catch (e: any) {
    createError.value = e?.data?.message || (locale.value === 'ar' ? 'فشل الإنشاء' : 'Create failed')
  }
  finally {
    createSaving.value = false
  }
}
</script>

<template>
  <div>
    <AdminPageHeader
      :title="locale === 'ar' ? 'الفواتير' : 'Invoices'"
      :description="locale === 'ar' ? 'إدارة فواتير الطلبات وعروض الأسعار مع التصدير والطباعة.' : 'Manage order & quotation invoices with export and print.'"
    >
      <template #actions>
        <button
          type="button"
          class="inline-flex h-10 items-center gap-1.5 rounded-md bg-[#F5CC07] px-4 text-xs font-bold text-slate-950 shadow-xs transition-colors hover:bg-yellow-400"
          @click="openCreate"
        >
          <Plus class="h-4 w-4" aria-hidden="true" />
          <span>{{ locale === 'ar' ? 'إنشاء فاتورة' : 'New Invoice' }}</span>
        </button>
      </template>
    </AdminPageHeader>

    <!-- Filter Toolbar -->
    <div class="mb-4 rounded-md border bg-white p-3.5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <form class="flex flex-wrap items-center gap-2.5" @submit.prevent="applyFilters">
        <div class="relative min-w-48 flex-1 sm:min-w-56">
          <Search class="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            v-model="search"
            type="search"
            :placeholder="locale === 'ar' ? 'بحث برقم الفاتورة أو اسم العميل…' : 'Search by invoice # or customer…'"
            class="h-9 w-full rounded-md border bg-white ps-9 pe-3 text-xs placeholder:text-slate-400 focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520]"
            :style="{ borderColor: 'var(--color-border)' }"
          />
        </div>
        <select
          v-model="status"
          class="h-9 rounded-md border bg-white px-3 text-xs text-slate-700 dark:bg-[#0B1520] dark:text-slate-300"
          :style="{ borderColor: 'var(--color-border)' }"
          @change="applyFilters"
        >
          <option value="">{{ locale === 'ar' ? 'كل الحالات' : 'All Statuses' }}</option>
          <option value="Paid">{{ locale === 'ar' ? 'مدفوعة' : 'Paid' }}</option>
          <option value="Pending">{{ locale === 'ar' ? 'معلقة' : 'Pending' }}</option>
          <option value="Cancelled">{{ locale === 'ar' ? 'ملغية' : 'Cancelled' }}</option>
        </select>
        <select
          v-model="type"
          class="h-9 rounded-md border bg-white px-3 text-xs text-slate-700 dark:bg-[#0B1520] dark:text-slate-300"
          :style="{ borderColor: 'var(--color-border)' }"
          @change="applyFilters"
        >
          <option value="">{{ locale === 'ar' ? 'كل الأنواع' : 'All Types' }}</option>
          <option value="order">{{ locale === 'ar' ? 'طلب' : 'Order' }}</option>
          <option value="quote">{{ locale === 'ar' ? 'عرض سعر' : 'Quote' }}</option>
          <option value="manual">{{ locale === 'ar' ? 'يدوية' : 'Manual' }}</option>
        </select>
        <input
          v-model="dateFrom"
          type="date"
          :title="locale === 'ar' ? 'من تاريخ' : 'From date'"
          class="h-9 rounded-md border bg-white px-2 text-xs dark:bg-[#0B1520] dark:text-slate-300"
          :style="{ borderColor: 'var(--color-border)' }"
          @change="applyFilters"
        />
        <input
          v-model="dateTo"
          type="date"
          :title="locale === 'ar' ? 'إلى تاريخ' : 'To date'"
          class="h-9 rounded-md border bg-white px-2 text-xs dark:bg-[#0B1520] dark:text-slate-300"
          :style="{ borderColor: 'var(--color-border)' }"
          @change="applyFilters"
        />
        <button
          type="submit"
          class="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
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

    <!-- Invoices Table -->
    <div class="overflow-hidden rounded-md border bg-white shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-start text-sm">
          <thead class="sticky top-0 z-10">
            <tr class="border-b bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/40 dark:text-slate-400" :style="{ borderColor: 'var(--color-border)' }">
              <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? '# الفاتورة' : 'Invoice #' }}</th>
              <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'العميل' : 'Customer' }}</th>
              <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'المبلغ' : 'Amount' }}</th>
              <th scope="col" class="px-4 py-3 text-center">{{ locale === 'ar' ? 'النوع' : 'Type' }}</th>
              <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'التاريخ' : 'Date' }}</th>
              <th scope="col" class="px-4 py-3 text-center">{{ locale === 'ar' ? 'الحالة' : 'Status' }}</th>
              <th scope="col" class="px-4 py-3 text-end">{{ locale === 'ar' ? 'إجراءات' : 'Actions' }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
            <tr v-for="inv in data?.invoices || []" :key="inv.id" class="transition-colors even:bg-slate-50/50 even:dark:bg-slate-800/30 hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
              <td class="px-4 py-3">
                <NuxtLink :to="localePath(`/admin/invoices/${inv.id}`)" class="font-mono text-xs font-bold text-[#2B71AE] hover:underline dark:text-blue-400">
                  {{ inv.invoiceNumber }}
                </NuxtLink>
              </td>
              <td class="px-4 py-3">
                <p class="font-semibold text-slate-900 dark:text-slate-100">{{ inv.customerName }}</p>
                <p class="font-mono text-[11px] text-slate-400" dir="ltr">{{ inv.customerPhone }}</p>
              </td>
              <td class="px-4 py-3">
                <span class="font-bold text-slate-900 dark:text-slate-100">{{ Number(inv.totalAmount).toLocaleString() }}</span>
                <span class="text-xs text-slate-500">EGP</span>
              </td>
              <td class="px-4 py-3 text-center">
                <span class="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {{ typeAr(inv.type) }}
                </span>
              </td>
              <td class="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{{ formatDate(inv.createdAt) }}</td>
              <td class="px-4 py-3 text-center">
                <AdminStatusBadge :status="statusAr(inv.status)" size="sm" />
              </td>
              <td class="px-4 py-3 text-end">
                <div class="flex items-center justify-end gap-1">
                  <NuxtLink
                    :to="localePath(`/admin/invoices/${inv.id}`)"
                    class="inline-flex h-8 w-8 items-center justify-center rounded text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    :title="locale === 'ar' ? 'عرض' : 'View'"
                    :aria-label="locale === 'ar' ? 'عرض' : 'View'"
                  >
                    <Eye class="h-4 w-4" aria-hidden="true" />
                  </NuxtLink>
                  <a
                    :href="`/api/invoices/${inv.id}/pdf`"
                    target="_blank" download
                    class="inline-flex h-8 w-8 items-center justify-center rounded text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    :title="locale === 'ar' ? 'تحميل PDF' : 'Download PDF'"
                    :aria-label="locale === 'ar' ? 'تحميل PDF' : 'Download PDF'"
                  >
                    <Download class="h-4 w-4" aria-hidden="true" />
                  </a>
                  <button
                    type="button"
                    class="inline-flex h-8 w-8 items-center justify-center rounded text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    :title="locale === 'ar' ? 'طباعة' : 'Print'"
                    :aria-label="locale === 'ar' ? 'طباعة' : 'Print'"
                    @click="printInvoice(inv.id)"
                  >
                    <Printer class="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!data?.invoices?.length" class="p-8">
        <AdminEmptyState
          :title="locale === 'ar' ? 'لا توجد فواتير' : 'No invoices yet'"
          :description="locale === 'ar' ? 'تُنشأ الفواتير تلقائياً عند إتمام الطلبات وقبول عروض الأسعار، أو أنشئ واحدة يدوياً.' : 'Invoices auto-generate from orders and accepted quotes, or create one manually.'"
          :icon="FileText"
        >
          <template #action>
            <button
              type="button"
              class="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#F5CC07] px-4 text-xs font-bold text-slate-950 hover:bg-yellow-400"
              @click="openCreate"
            >
              <Plus class="h-3.5 w-3.5" aria-hidden="true" />
              <span>{{ locale === 'ar' ? 'إنشاء فاتورة' : 'New Invoice' }}</span>
            </button>
          </template>
        </AdminEmptyState>
      </div>
      <AdminPagination
        :page="page" :pages="data?.pages || 1" :total="data?.total || 0"
        :item-name="locale === 'ar' ? 'فاتورة' : 'invoices'" @change="gotoPage"
      />
    </div>

    <!-- Manual create modal -->
    <Teleport to="body">
      <div v-if="createOpen" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs" role="dialog" aria-modal="true">
        <div class="my-8 w-full max-w-2xl rounded-xl border bg-white shadow-2xl dark:border-slate-700 dark:bg-[#162032]">
          <div class="flex items-center justify-between border-b px-5 py-4" :style="{ borderColor: 'var(--color-border)' }">
            <h3 class="font-heading text-base font-bold text-slate-900 dark:text-slate-100">
              {{ locale === 'ar' ? 'إنشاء فاتورة يدوية' : 'Create Manual Invoice' }}
            </h3>
            <button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" @click="createOpen = false">
              <X class="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div class="max-h-[70vh] space-y-4 overflow-y-auto p-5">
            <p v-if="createError" role="alert" class="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
              {{ createError }}
            </p>
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="block">
                <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ locale === 'ar' ? 'اسم العميل *' : 'Customer Name *' }}</span>
                <input v-model="cForm.customerName" type="text" class="h-10 w-full rounded-md border bg-white px-3 text-xs dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }" />
              </label>
              <label class="block">
                <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ locale === 'ar' ? 'التليفون *' : 'Phone *' }}</span>
                <input v-model="cForm.customerPhone" type="tel" dir="ltr" placeholder="01xxxxxxxxx" class="h-10 w-full rounded-md border bg-white px-3 font-mono text-xs dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }" />
              </label>
              <label class="block">
                <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ locale === 'ar' ? 'المحافظة' : 'Governorate' }}</span>
                <input v-model="cForm.customerGovernorat" type="text" class="h-10 w-full rounded-md border bg-white px-3 text-xs dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }" />
              </label>
              <label class="block">
                <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ locale === 'ar' ? 'طريقة الدفع' : 'Payment' }}</span>
                <select v-model="cForm.paymentMethod" class="h-10 w-full rounded-md border bg-white px-3 text-xs dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }">
                  <option value="COD">COD</option>
                  <option value="ONLINE">{{ locale === 'ar' ? 'بوابة دفع' : 'Gateway' }}</option>
                </select>
              </label>
            </div>
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ locale === 'ar' ? 'العنوان' : 'Address' }}</span>
              <textarea v-model="cForm.customerAddress" rows="2" class="w-full rounded-md border bg-white p-2 text-xs dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }" />
            </label>

            <div>
              <h4 class="mb-2 text-xs font-bold text-slate-900 dark:text-slate-100">{{ locale === 'ar' ? 'البنود' : 'Line items' }}</h4>
              <div class="space-y-2">
                <div v-for="line in cLines" :key="line.key" class="grid grid-cols-12 items-center gap-2">
                  <input v-model="line.name" type="text" :placeholder="locale === 'ar' ? 'الاسم' : 'Name'" class="col-span-6 h-9 rounded-md border bg-white px-2 text-xs dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }" />
                  <input v-model.number="line.quantity" type="number" min="1" class="col-span-2 h-9 rounded-md border bg-white px-2 font-mono text-xs dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }" />
                  <input v-model.number="line.unitPrice" type="number" min="0" step="0.01" placeholder="0.00" class="col-span-3 h-9 rounded-md border bg-white px-2 font-mono text-xs dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }" />
                  <button type="button" class="col-span-1 flex h-9 items-center justify-center rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40" @click="removeLine(line.key)">
                    <X class="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <button type="button" class="mt-2 text-xs font-semibold text-[#2B71AE] hover:underline dark:text-blue-400" @click="addLine">
                {{ locale === 'ar' ? '+ إضافة سطر' : '+ Add line' }}
              </button>
            </div>

            <div class="grid gap-3 sm:grid-cols-3">
              <label class="block">
                <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ locale === 'ar' ? 'الضريبة' : 'Tax' }}</span>
                <input v-model.number="cForm.taxAmount" type="number" min="0" step="0.01" dir="ltr" class="h-10 w-full rounded-md border bg-white px-3 font-mono text-xs dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }" />
              </label>
              <label class="block">
                <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ locale === 'ar' ? 'الحالة' : 'Status' }}</span>
                <select v-model="cForm.status" class="h-10 w-full rounded-md border bg-white px-3 text-xs dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }">
                  <option value="Pending">{{ locale === 'ar' ? 'معلقة' : 'Pending' }}</option>
                  <option value="Paid">{{ locale === 'ar' ? 'مدفوعة' : 'Paid' }}</option>
                  <option value="Cancelled">{{ locale === 'ar' ? 'ملغية' : 'Cancelled' }}</option>
                </select>
              </label>
              <div class="rounded-md bg-slate-50 p-2.5 text-xs dark:bg-slate-800/60">
                <p class="flex justify-between text-slate-500"><span>{{ locale === 'ar' ? 'الفرعي' : 'Sub' }}</span><span class="font-mono">{{ cSubtotal.toLocaleString() }}</span></p>
                <p class="flex justify-between font-bold text-[#2B71AE] dark:text-[#F5CC07]"><span>{{ locale === 'ar' ? 'الكلي' : 'Total' }}</span><span class="font-mono">{{ cTotal.toLocaleString() }} EGP</span></p>
              </div>
            </div>

            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ locale === 'ar' ? 'ملاحظات' : 'Notes' }}</span>
              <textarea v-model="cForm.notes" rows="2" class="w-full rounded-md border bg-white p-2 text-xs dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }" />
            </label>
          </div>
          <div class="flex items-center justify-end gap-2 border-t px-5 py-4" :style="{ borderColor: 'var(--color-border)' }">
            <button type="button" class="h-10 rounded-md border px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300" @click="createOpen = false">
              {{ locale === 'ar' ? 'إلغاء' : 'Cancel' }}
            </button>
            <button
              type="button" :disabled="createSaving"
              class="inline-flex h-10 items-center gap-1.5 rounded-md bg-[#F5CC07] px-6 text-xs font-bold text-slate-950 hover:bg-yellow-400 disabled:opacity-50"
              @click="saveManualInvoice"
            >
              <Pencil class="h-3.5 w-3.5" aria-hidden="true" />
              <span>{{ createSaving ? (locale === 'ar' ? 'جاري الحفظ…' : 'Saving…') : (locale === 'ar' ? 'إنشاء الفاتورة' : 'Create Invoice') }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
