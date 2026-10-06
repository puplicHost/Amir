<script setup lang="ts">
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
  taxAmount: number | string
  totalAmount: number | string
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

function formatDate(d: string): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString(locale.value === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}
</script>

<template>
  <div class="mx-auto w-full max-w-[794px]">
    <div class="overflow-hidden rounded-xl border bg-white shadow-md dark:border-slate-700 dark:bg-[#162032] print:rounded-none print:border-0 print:shadow-none" :style="{ borderColor: 'var(--color-border)' }">
      <!-- Header: logo (right) + title (left) -->
      <div class="flex items-start justify-between gap-4 border-b-2 border-[#2B71AE] p-6 sm:p-8" dir="rtl">
        <div class="flex items-center gap-3">
          <img v-if="props.general?.logoPath" :src="props.general.logoPath" alt="Mango Electronics" class="h-12 w-auto max-w-[140px] rounded bg-white p-1 object-contain" />
          <img v-else src="/logo.png" alt="Mango Electronics" class="h-12 w-12 rounded object-contain" />
          <div>
            <p class="font-heading text-base font-extrabold text-slate-900 dark:text-white">
              {{ props.general?.siteNameAr || 'مانجو إلكترونيكس' }}
            </p>
            <p class="text-[11px] text-slate-500">{{ props.general?.siteNameEn || 'Mango Electronics' }}</p>
          </div>
        </div>
        <div class="text-start" dir="ltr">
          <h1 class="font-heading text-2xl font-black text-[#1F4E79] dark:text-white">فاتورة ضريبية</h1>
          <p class="mt-1 font-mono text-sm font-bold text-[#2B71AE] dark:text-[#F5CC07]">#{{ props.invoice.invoiceNumber }}</p>
          <p v-if="props.contextLabel" class="mt-1 text-[11px] font-semibold text-slate-500">{{ props.contextLabel }}</p>
        </div>
      </div>

      <div class="grid gap-6 p-6 sm:grid-cols-2 sm:p-8" dir="rtl">
        <!-- Company -->
        <div>
          <h3 class="mb-2 text-xs font-bold uppercase tracking-wider text-[#1F4E79] dark:text-blue-300">
            {{ locale === 'ar' ? 'بيانات الشركة' : 'Company Details' }}
          </h3>
          <p class="text-sm font-bold text-slate-900 dark:text-white">{{ props.general?.siteNameAr || 'مانجو إلكترونيكس' }}</p>
          <p v-if="props.contact?.contactAddressAr || props.contact?.contactAddressEn" class="mt-1 text-xs text-slate-500">
            {{ locale === 'ar' ? (props.contact.contactAddressAr || props.contact.contactAddressEn) : (props.contact.contactAddressEn || props.contact.contactAddressAr) }}
          </p>
          <p v-if="props.contact?.contactPhone1" class="mt-1 font-mono text-xs text-slate-500" dir="ltr">{{ props.contact.contactPhone1 }}</p>
          <p v-if="props.contact?.contactEmail" class="text-xs text-slate-500">{{ props.contact.contactEmail }}</p>
        </div>
        <!-- Customer -->
        <div>
          <h3 class="mb-2 text-xs font-bold uppercase tracking-wider text-[#1F4E79] dark:text-blue-300">
            {{ locale === 'ar' ? 'بيانات العميل' : 'Bill To' }}
          </h3>
          <p class="text-sm font-bold text-slate-900 dark:text-white">{{ props.invoice.customerName }}</p>
          <p class="mt-1 font-mono text-xs text-slate-500" dir="ltr">{{ props.invoice.customerPhone }}</p>
          <p v-if="props.invoice.customerGovernorat" class="text-xs text-slate-500">{{ props.invoice.customerGovernorat }}</p>
          <p v-if="props.invoice.customerAddress" class="mt-1 text-xs leading-relaxed text-slate-500">{{ props.invoice.customerAddress }}</p>
        </div>
      </div>

      <div class="flex flex-wrap gap-x-8 gap-y-1 px-6 text-xs text-slate-500 sm:px-8" dir="rtl">
        <p><span class="font-bold text-[#1F4E79] dark:text-blue-300">{{ locale === 'ar' ? 'تاريخ الفاتورة: ' : 'Issue Date: ' }}</span>{{ formatDate(props.invoice.createdAt) }}</p>
        <p><span class="font-bold text-[#1F4E79] dark:text-blue-300">{{ locale === 'ar' ? 'تاريخ الاستحقاق: ' : 'Due Date: ' }}</span>{{ formatDate(props.invoice.createdAt) }}</p>
      </div>

      <!-- Items table -->
      <div class="overflow-x-auto p-6 sm:p-8">
        <table class="w-full text-start text-sm">
          <thead>
            <tr class="border-b-2 border-[#2B71AE] text-[11px] font-bold uppercase tracking-wider text-[#1F4E79] dark:text-blue-300">
              <th scope="col" class="pb-2 text-start">{{ locale === 'ar' ? 'الاسم' : 'Item' }}</th>
              <th scope="col" class="pb-2 text-center">{{ locale === 'ar' ? 'الكمية' : 'Qty' }}</th>
              <th scope="col" class="pb-2 text-center">{{ locale === 'ar' ? 'سعر الوحدة' : 'Unit' }}</th>
              <th scope="col" class="pb-2 text-end">{{ locale === 'ar' ? 'الإجمالي' : 'Subtotal' }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="(item, i) in props.invoice.items" :key="item.id || i" class="text-xs">
              <td class="py-2.5 font-semibold text-slate-900 dark:text-slate-100">{{ item.name }}</td>
              <td class="py-2.5 text-center font-mono">{{ item.quantity }}</td>
              <td class="py-2.5 text-center font-mono text-slate-600 dark:text-slate-400">{{ Number(item.unitPrice).toLocaleString() }}</td>
              <td class="py-2.5 text-end font-mono font-bold text-slate-900 dark:text-slate-100">{{ Number(item.subtotal).toLocaleString() }} EGP</td>
            </tr>
          </tbody>
        </table>

        <div class="mt-4 flex justify-end">
          <div class="w-full max-w-[260px] space-y-1.5 text-xs" dir="rtl">
            <p class="flex justify-between text-slate-500">
              <span>{{ locale === 'ar' ? 'الإجمالي قبل الضريبة' : 'Subtotal' }}</span>
              <span class="font-mono font-bold text-slate-800 dark:text-slate-200">{{ Number(props.invoice.subtotalAmount).toLocaleString() }} EGP</span>
            </p>
            <p class="flex justify-between text-slate-500">
              <span>{{ locale === 'ar' ? 'الضريبة' : 'Tax' }}</span>
              <span class="font-mono font-bold text-slate-800 dark:text-slate-200">{{ Number(props.invoice.taxAmount).toLocaleString() }} EGP</span>
            </p>
            <p class="flex items-center justify-between rounded-lg bg-[#2B71AE]/10 px-3 py-2 dark:bg-[#F5CC07]/10">
              <span class="font-bold text-[#1F4E79] dark:text-white">{{ locale === 'ar' ? 'الإجمالي الكلي' : 'Grand Total' }}</span>
              <span class="font-mono text-base font-black text-[#2B71AE] dark:text-[#F5CC07]">{{ Number(props.invoice.totalAmount).toLocaleString() }} EGP</span>
            </p>
          </div>
        </div>

        <div v-if="props.invoice.notes" class="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 dark:bg-slate-800/60 dark:text-slate-300" dir="rtl">
          <p class="mb-1 font-bold text-[#1F4E79] dark:text-blue-300">{{ locale === 'ar' ? 'ملاحظات:' : 'Notes:' }}</p>
          <p>{{ props.invoice.notes }}</p>
        </div>

        <div class="mt-6 border-t pt-4 text-center" :style="{ borderColor: 'var(--color-border)' }">
          <p class="text-sm font-bold text-[#1F4E79] dark:text-white">
            {{ locale === 'ar' ? 'شكراً لتعاملكم مع Mango Electronics' : 'Thank you for your business with Mango Electronics' }}
          </p>
          <p v-if="props.contact?.contactPhone1 || props.contact?.contactEmail" class="mt-1 text-[11px] text-slate-400">
            <span v-if="props.contact?.contactPhone1" dir="ltr">{{ props.contact.contactPhone1 }}</span>
            <span v-if="props.contact?.contactPhone1 && props.contact?.contactEmail"> · </span>
            <span v-if="props.contact?.contactEmail">{{ props.contact.contactEmail }}</span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
