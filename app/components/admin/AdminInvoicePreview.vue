<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

interface PreviewItem {
  id?: string
  name: string
  quantity: number
  unitPrice: number | string
  subtotal: number | string
}

interface PreviewInvoice {
  invoiceNumber: string
  status?: string
  paymentMethod?: string
  createdAt: string
  customerName: string
  customerPhone: string
  customerGovernorat?: string | null
  customerAddress?: string | null
  notes?: string | null
  subtotalAmount: number | string
  discountAmount?: number | string | null
  taxAmount: number | string
  totalAmount: number | string
  createdByName?: string | null
  items: PreviewItem[]
}

const props = withDefaults(defineProps<{
  invoice: PreviewInvoice
  general?: Record<string, any> | null
  contact?: Record<string, any> | null
  contextLabel?: string | null
}>(), {
  general: null,
  contact: null,
  contextLabel: null,
})

const { locale } = useI18n()
const isAr = computed(() => locale.value === 'ar')

function formatDate(d: string): string {
  if (!d) return '../../2026/'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '../../2026/'
  const day = String(dt.getDate()).padStart(2, '0')
  const month = String(dt.getMonth() + 1).padStart(2, '0')
  const year = dt.getFullYear()
  return `${day}/${month}/${year}/`
}

function fmt(n: number | string): string {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const discount = computed(() => {
  const explicit = Number(props.invoice.discountAmount)
  if (props.invoice.discountAmount != null && !Number.isNaN(explicit)) return explicit
  const d = Number(props.invoice.subtotalAmount) + Number(props.invoice.taxAmount) - Number(props.invoice.totalAmount)
  return d > 0 ? d : 0
})

function paymentLabel(method?: string): string {
  if (method === 'COD') return isAr.value ? 'الدفع عند الاستلام' : 'Cash on Delivery'
  if (method === 'Card') return isAr.value ? 'بطاقة' : 'Card'
  if (method === 'Transfer') return isAr.value ? 'تحويل' : 'Transfer'
  return method || (isAr.value ? 'نقدي' : 'Cash')
}

// 10 rows minimum (empty rows shown as blank lines if fewer items)
const paddedItems = computed(() => {
  const rows: Array<PreviewItem | null> = [...(props.invoice.items || [])]
  while (rows.length < 10) {
    rows.push(null)
  }
  return rows
})

// Density tier for scaling when many items
const density = computed(() => {
  const n = props.invoice.items?.length || 0
  if (n <= 10) return 'density-normal'
  if (n <= 25) return 'density-compact'
  return 'density-ultra'
})

const sheetRef = ref<HTMLElement | null>(null)

function fitToPage() {
  const el = sheetRef.value
  if (!el) return
  ;(el as HTMLElement).style.zoom = ''
  const h = el.offsetHeight
  const target = 1040
  if (h > target) (el as HTMLElement).style.zoom = String(target / h)
}

function restoreZoom() {
  if (sheetRef.value) (sheetRef.value as HTMLElement).style.zoom = ''
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeprint', fitToPage)
    window.addEventListener('afterprint', restoreZoom)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('beforeprint', fitToPage)
    window.removeEventListener('afterprint', restoreZoom)
  }
})

const companyName = computed(() => props.general?.siteNameAr || 'مانجو إلكترونيكس')
const companyAddress = computed(() =>
  props.contact?.contactAddressAr || props.contact?.contactAddressEn || 'الأسماعيلية — مصر',
)
const phones = computed(() =>
  [props.contact?.contactPhone1, props.contact?.contactPhone2].filter(Boolean).join(' - ') || '+201206692076 - +201145471933',
)
const logoSrc = computed(() => props.general?.logoPath || '/logo.png')
const customerAddress = computed(() =>
  props.invoice.customerAddress || props.invoice.customerGovernorat || '',
)

const { data: adminSession } = useAdminSession()
const adminName = computed(() =>
  adminSession.value?.user?.name || props.invoice.createdByName || 'لي عمل الفاتورة من علي الموقع',
)
</script>

<template>
  <div class="mx-auto w-full max-w-[794px]">
    <div
      ref="sheetRef"
      class="invoice-sheet relative overflow-hidden bg-white p-8 shadow-md print:p-0 print:shadow-none"
      :class="density"
      dir="rtl"
    >
      <!-- Header:
           Top-left: company name "مانجو إلكترونيكس" (bold, #2B71AE) + address "الأسماعيلية — مصر" + phone numbers — stacked, RTL
           Top-right: Mango Electronics logo image (use the existing logo from settings)
      -->
      <div class="header-row">
        <!-- Top-right (in RTL, first flex child is on the RIGHT): Logo -->
        <div class="logo-col">
          <img :src="logoSrc" alt="Mango Electronics" class="h-16 w-auto max-w-[180px] object-contain" />
        </div>
        <!-- Top-left (in RTL, second flex child is on the LEFT): Company info stacked, RTL -->
        <div class="company-col" dir="rtl">
          <p class="company-name">{{ companyName }}</p>
          <p class="company-addr">{{ companyAddress }}</p>
          <p class="company-phone" dir="ltr">{{ phones }}</p>
        </div>
      </div>

      <!-- Below header: centered title "فاتورة شركة **مانجو إلكترونيكس**" — "مانجو إلكترونيكس" in #2B71AE bold -->
      <h1 class="invoice-title">
        <span>{{ isAr ? 'فاتورة شركة ' : 'Invoice ' }}</span><span class="highlight">{{ isAr ? 'مانجو إلكترونيكس' : 'Mango Electronics' }}</span>
      </h1>

      <!-- Horizontal divider line (#2B71AE, full width) below the title -->
      <div class="main-divider" />

      <!-- Customer Info Block (2 columns, below divider):
           Right column:
           - اسم العميل/الشركة: ........................
           - العنوان: ........................
           Left column:
           - التليفون: ........................
           - التاريخ: ../../2026/
           - طريقة الدفع: ........................
           - رقم الفاتورة: ........................
      -->
      <div class="customer-info-grid">
        <!-- Right column (first in RTL) -->
        <div class="info-column">
          <p class="info-row">
            <span class="info-label">{{ isAr ? 'اسم العميل/الشركة:' : 'Customer/Company:' }}</span>
            <span class="dotted-fill">{{ props.invoice.customerName || '........................' }}</span>
          </p>
          <p class="info-row">
            <span class="info-label">{{ isAr ? 'العنوان:' : 'Address:' }}</span>
            <span class="dotted-fill">{{ customerAddress || '........................' }}</span>
          </p>
        </div>
        <!-- Left column -->
        <div class="info-column">
          <p class="info-row">
            <span class="info-label">{{ isAr ? 'التليفون:' : 'Phone:' }}</span>
            <span class="dotted-fill">{{ props.invoice.customerPhone || '........................' }}</span>
          </p>
          <p class="info-row">
            <span class="info-label">{{ isAr ? 'التاريخ:' : 'Date:' }}</span>
            <span class="date-val">{{ formatDate(props.invoice.createdAt) }}</span>
          </p>
          <p class="info-row">
            <span class="info-label">{{ isAr ? 'طريقة الدفع:' : 'Payment:' }}</span>
            <span class="dotted-fill">{{ paymentLabel(props.invoice.paymentMethod) }}</span>
          </p>
          <p class="info-row">
            <span class="info-label">{{ isAr ? 'رقم الفاتورة:' : 'Invoice No:' }}</span>
            <span class="invoice-no-val">{{ props.invoice.invoiceNumber }}</span>
          </p>
        </div>
      </div>

      <!-- Items Table:
           Columns (RTL order): م | البيان | الكمية | سعر الوحدة | الإجمالي
           - Header row: #2B71AE background, white text, bold, centered
           - Data rows: 10 rows minimum (empty rows shown as blank lines if fewer items)
           - Alternating row bg: white / very light gray #f9f9f9
           - All borders: 1px solid #e0e0e0
           - Watermark: Mango Electronics logo centered behind the table, very low opacity (8%), large (400px)
      -->
      <div class="table-container">
        <!-- Watermark: Mango Electronics logo centered behind table, very low opacity (8%), large (400px) -->
        <div class="table-watermark" aria-hidden="true">
          <img :src="logoSrc" alt="" />
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th scope="col" class="th-seq">{{ isAr ? 'م' : '#' }}</th>
              <th scope="col" class="th-desc">{{ isAr ? 'البيان' : 'Description' }}</th>
              <th scope="col" class="th-qty">{{ isAr ? 'الكمية' : 'Qty' }}</th>
              <th scope="col" class="th-price">{{ isAr ? 'سعر الوحدة' : 'Unit Price' }}</th>
              <th scope="col" class="th-total">{{ isAr ? 'الإجمالي' : 'Subtotal' }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, i) in paddedItems" :key="i">
              <td class="td-seq">{{ i + 1 }}</td>
              <td class="td-desc">{{ item?.name || '' }}</td>
              <td class="td-qty">{{ item ? item.quantity : '' }}</td>
              <td class="td-price">{{ item ? fmt(item.unitPrice) : '' }}</td>
              <td class="td-total">{{ item ? fmt(item.subtotal) : '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Totals Block (bottom right):
           4 rows in a bordered box:
           - الإجمالي: ........
           - خصم: ........
           - ضريبة القيمة المضافة: ........
           - الصافي المستحق: [yellow #F5CC07 background, bold, larger text]
      -->
      <div class="totals-container">
        <div class="totals-box">
          <div class="totals-line">
            <span class="tot-label">{{ isAr ? 'الإجمالي:' : 'Subtotal:' }}</span>
            <span class="tot-val">{{ fmt(props.invoice.subtotalAmount) }}</span>
          </div>
          <div class="totals-line">
            <span class="tot-label">{{ isAr ? 'خصم:' : 'Discount:' }}</span>
            <span class="tot-val">{{ fmt(discount) }}</span>
          </div>
          <div class="totals-line">
            <span class="tot-label">{{ isAr ? 'ضريبة القيمة المضافة:' : 'VAT:' }}</span>
            <span class="tot-val">{{ fmt(props.invoice.taxAmount) }}</span>
          </div>
          <div class="totals-line net-line">
            <span class="tot-label">{{ isAr ? 'الصافي المستحق:' : 'Net Due:' }}</span>
            <span class="tot-val">{{ fmt(props.invoice.totalAmount) }}</span>
          </div>
        </div>
      </div>

      <!-- Notes line: ملاحظات: ............................ -->
      <div class="notes-block">
        <span class="notes-label">{{ isAr ? 'ملاحظات:' : 'Notes:' }}</span>
        <span v-if="props.invoice.notes" class="notes-text">{{ props.invoice.notes }}</span>
        <span v-else class="dotted-fill notes-fill">............................</span>
      </div>

      <!-- Footer (bottom, 2 columns):
           - Right: توقيع المستلم ......................
           - Left: ختم وتوقيع الشركة ......................
           - Centered below: المسؤول: "لي عمل الفاتورة من علي الموقع"
      -->
      <div class="footer-signatures">
        <!-- Right in RTL: توقيع المستلم ...................... -->
        <div class="sig-col">
          <p class="sig-title">{{ isAr ? 'توقيع المستلم' : 'Recipient Signature' }}</p>
          <p class="sig-line">......................</p>
        </div>
        <!-- Left in RTL: ختم وتوقيع الشركة ...................... -->
        <div class="sig-col">
          <p class="sig-title">{{ isAr ? 'ختم وتوقيع الشركة' : 'Company Stamp & Signature' }}</p>
          <p class="sig-line">......................</p>
        </div>
      </div>

      <div class="footer-admin-line">
        {{ isAr ? `المسؤول: "${adminName}"` : `Responsible: "${adminName}"` }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.invoice-sheet {
  font-family: Arial, Tahoma, 'Segoe UI', sans-serif;
  color: #0F172A;
  border: 1px solid #e0e0e0;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ── Header ── */
.header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
}

.logo-col img {
  display: block;
}

.company-col {
  text-align: left;
}

.company-name {
  color: #2B71AE;
  font-weight: bold;
  font-size: 15px;
  line-height: 1.3;
}

.company-addr {
  font-size: 12px;
  color: #334155;
  margin-top: 2px;
}

.company-phone {
  font-size: 11px;
  color: #334155;
  margin-top: 2px;
}

/* ── Title ── */
.invoice-title {
  text-align: center;
  font-size: 19px;
  font-weight: bold;
  color: #0F172A;
  margin: 8px 0;
}

.invoice-title .highlight {
  color: #2B71AE;
  font-weight: bold;
}

/* ── Divider line: #2B71AE, full width ── */
.main-divider {
  border-bottom: 2px solid #2B71AE;
  width: 100%;
  margin: 4px 0 14px;
}

/* ── Customer Info Block ── */
.customer-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 12px;
  font-size: 13px;
}

.info-column {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 0;
}

.info-label {
  font-weight: bold;
  color: #0F172A;
  white-space: nowrap;
}

.dotted-fill {
  border-bottom: 1px dotted #999;
  display: inline-block;
  min-width: 140px;
  padding-inline-end: 8px;
  color: #0F172A;
}

.date-val {
  color: #0F172A;
}

.invoice-no-val {
  color: #2B71AE;
  font-weight: bold;
}

/* ── Table Container & Watermark ── */
.table-container {
  position: relative;
  margin-bottom: 10px;
}

.table-watermark {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 420px;
  max-width: 85%;
  opacity: 0.16;
  z-index: 0;
  pointer-events: none;
}

.table-watermark img {
  width: 100%;
  height: auto;
  display: block;
}

/* ── Items Table ── */
.items-table {
  position: relative;
  z-index: 1;
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  background: transparent;
}

.items-table thead th {
  background: #2B71AE;
  color: #ffffff;
  font-weight: bold;
  text-align: center;
  padding: 8px 6px;
  border: 1px solid #e0e0e0;
}

.items-table tbody td {
  border: 1px solid #e0e0e0;
  padding: 6px 8px;
  height: 29px;
  background: rgba(255, 255, 255, 0.72);
}

.items-table tbody tr:nth-child(even) td {
  background: rgba(249, 249, 249, 0.72);
}

.th-seq, .td-seq {
  width: 34px;
  text-align: center;
}

.th-desc, .td-desc {
  text-align: right;
}

.th-qty, .td-qty {
  width: 60px;
  text-align: center;
}

.th-price, .td-price {
  width: 105px;
  text-align: center;
}

.th-total, .td-total {
  width: 115px;
  text-align: center;
  font-weight: bold;
}

/* ── Totals Block (bottom right): 4 rows in a bordered box ── */
.totals-container {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 10px;
}

.totals-box {
  width: 230px;
  border: 1px solid #e0e0e0;
  background: #ffffff;
  font-size: 13px;
}

.totals-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-bottom: 1px solid #e0e0e0;
}

.totals-line:last-child {
  border-bottom: 0;
}

.tot-label {
  font-weight: normal;
}

.tot-val {
  font-weight: bold;
}

/* Accent row: yellow #F5CC07 background, bold, larger text */
.totals-line.net-line {
  background: #F5CC07;
  font-weight: bold;
  font-size: 14px;
}

/* ── Notes line ── */
.notes-block {
  margin-bottom: 16px;
  font-size: 13px;
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.notes-label {
  font-weight: bold;
  color: #0F172A;
}

.notes-text {
  color: #0F172A;
}

.notes-fill {
  flex: 1;
}

/* ── Footer ── */
.footer-signatures {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-top: 10px;
  margin-bottom: 14px;
  text-align: center;
  font-size: 13px;
}

.sig-col {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sig-title {
  font-weight: bold;
  color: #0F172A;
}

.sig-line {
  color: #999999;
  margin-top: 16px;
}

.footer-admin-line {
  text-align: center;
  font-size: 11px;
  color: #475569;
  padding-bottom: 4px;
}

/* ── Responsive & Print Density ── */
.density-compact .items-table {
  font-size: 11px;
}
.density-compact .items-table tbody td {
  padding: 4px 6px;
  height: 23px;
}

.density-ultra .items-table {
  font-size: 10px;
}
.density-ultra .items-table tbody td {
  padding: 2px 4px;
  height: 19px;
}

@media print {
  .invoice-sheet {
    border: 0;
    box-shadow: none;
    max-width: none;
    padding: 0;
  }

  .items-table tr,
  .totals-box {
    page-break-inside: avoid;
  }

  @page {
    size: A4 portrait;
    margin: 10mm;
  }
}
</style>
