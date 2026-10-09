<script setup lang="ts">
import { 
  AlertCircle, 
  ArrowLeft, 
  ArrowRight, 
  Building2, 
  Calendar, 
  Check, 
  Download, 
  FileText, 
  Mail, 
  MapPin,
  Pencil,
  Phone, 
  RotateCcw, 
  ShieldCheck, 
  User 
} from 'lucide-vue-next'

definePageMeta({ layout: 'admin', middleware: 'admin-auth', requiredPermission: ['quotes.view', 'services.view', 'orders.view'] })

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const id = String(route.params.id)
const toast = useAdminToast()

const fetch = useRequestFetch()

const { data, refresh, error } = await useAsyncData(`admin-quote-${id}`, () =>
  fetch<{ quote: any }>(`/api/admin/quotes/${id}`),
)

const newStatus = ref('')
const updating = ref(false)
const updateMessage = ref('')

if (data.value?.quote) {
  newStatus.value = data.value.quote.status
}

const { confirm: confirmDialog } = useAdminConfirm()
const canQuotesManage = useAdminCan('quotes.manage')

function formatExpiry(d: string): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString(locale.value === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

async function updateStatus() {
  const okStatus = await confirmDialog({
    title: locale.value === 'ar' ? `تغيير حالة العرض إلى "${newStatus.value}"؟` : `Change quote status to "${newStatus.value}"?`,
    confirmLabel: locale.value === 'ar' ? 'تغيير' : 'Change',
    danger: false,
  })
  if (!okStatus) {
    newStatus.value = data.value!.quote.status
    return
  }
  updating.value = true
  updateMessage.value = ''
  try {
    await $fetch(`/api/admin/quotes/${id}/status`, {
      method: 'PUT',
      body: { status: newStatus.value },
    })
    updateMessage.value = locale.value === 'ar' ? 'تم تحديث الحالة بنجاح' : 'Status updated successfully'
    await refresh()
    toast.success(
      locale.value === 'ar' ? 'تم تحديث حالة العرض' : 'Quote Status Updated',
      locale.value === 'ar' ? `تم تغيير حالة عرض السعر إلى "${newStatus.value}".` : `Status changed to "${newStatus.value}".`,
    )
  }
  catch (e: any) {
    const msg = e?.data?.message || 'Update failed'
    toast.error(
      locale.value === 'ar' ? 'فشل تحديث الحالة' : 'Update Failed',
      msg,
    )
    newStatus.value = data.value!.quote.status
  }
  finally {
    updating.value = false
    setTimeout(() => { updateMessage.value = '' }, 3000)
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(locale.value === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const convertingInvoice = ref(false)
const invoiceModalId = ref<string | null>(null)
const invoiceModalLabel = ref<string | null>(null)

async function convertToInvoice() {
  convertingInvoice.value = true
  try {
    // Reuse an existing linked invoice if present, otherwise create one.
    const linked = await $fetch<{ invoice: { id: string } | null }>(`/api/admin/invoices/by-quote/${id}`)
    let invoiceId = linked.invoice?.id || null
    if (!invoiceId) {
      const created = await $fetch<{ invoice: { id: string } }>(`/api/admin/invoices/from-quote/${id}`, { method: 'POST' })
      invoiceId = created.invoice.id
    }
    invoiceModalLabel.value = locale.value === 'ar'
      ? `فاتورة — محوّلة من عرض سعر ${data.value?.quote.quoteNumber || ''}`
      : `Invoice — converted from quote ${data.value?.quote.quoteNumber || ''}`
    invoiceModalId.value = invoiceId
  }
  catch (e: any) {
    toast.error(
      locale.value === 'ar' ? 'تعذر إنشاء الفاتورة' : 'Failed to create invoice',
      e?.data?.message || 'Create failed',
    )
  }
  finally {
    convertingInvoice.value = false
  }
}
</script>

<template>
  <div>
    <!-- Error State -->
    <div
      v-if="error"
      class="rounded-md border border-rose-200 bg-rose-50 p-6 text-center text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
    >
      {{ locale === 'ar' ? 'عرض السعر غير موجود أو تعذر تحميل بياناته.' : 'Quote not found or failed to load.' }}
    </div>

    <!-- Quote Detail View -->
    <div v-else-if="data?.quote">
      <!-- Header -->
      <AdminPageHeader
        :title="`${locale === 'ar' ? 'عرض سعر' : 'Quote'} #${data.quote.quoteNumber}`"
        :description="formatDate(data.quote.createdAt)"
        back-to="/admin/quotes"
        :back-label="locale === 'ar' ? 'العودة لعروض الأسعار' : 'Back to Quotes'"
      >
        <template #badge>
          <AdminStatusBadge :status="data.quote.status" size="md" />
        </template>
        <template #actions>
          <div class="flex flex-wrap items-center gap-2">
            <NuxtLink
              v-if="canQuotesManage"
              :to="localePath(`/admin/quotes/new?edit=${data.quote.id}`)"
              class="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#2B71AE] px-3.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#285E8E]"
            >
              <Pencil class="h-3.5 w-3.5" aria-hidden="true" />
              <span>{{ locale === 'ar' ? 'تحديث العرض' : 'Update Quote' }}</span>
            </NuxtLink>
            <a
              :href="`/api/quotes/${data.quote.id}/pdf?locale=en`"
              target="_blank"
              download
              class="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#2B71AE] px-3 text-xs font-semibold text-[#2B71AE] hover:bg-[#2B71AE]/10 dark:text-blue-400 dark:border-blue-400 transition-colors"
            >
              <Download class="h-3.5 w-3.5" />
              <span>PDF (EN)</span>
            </a>
            <a
              :href="`/api/quotes/${data.quote.id}/pdf?locale=ar`"
              target="_blank"
              download
              class="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#2B71AE] px-3.5 text-xs font-bold text-white shadow-xs hover:bg-[#285E8E] transition-colors"
            >
              <Download class="h-3.5 w-3.5" />
              <span>تحميل PDF (عربي)</span>
            </a>
            <button
              type="button"
              :disabled="convertingInvoice"
              class="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#F5CC07] px-3.5 text-xs font-bold text-slate-950 shadow-xs transition-colors hover:bg-yellow-400 disabled:opacity-50"
              @click="convertToInvoice"
            >
              <FileText class="h-3.5 w-3.5" aria-hidden="true" />
              <span>{{ convertingInvoice ? (locale === 'ar' ? 'جاري التحويل…' : 'Converting…') : (locale === 'ar' ? 'تحويل لفاتورة' : 'Convert to Invoice') }}</span>
            </button>
          </div>
        </template>
      </AdminPageHeader>

      <div class="grid gap-6 lg:grid-cols-3">
        <!-- Main Column: Products Items (2 cols) -->
        <div class="space-y-6 lg:col-span-2">
          <div class="rounded-md border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
            <div class="mb-4 flex items-center justify-between border-b pb-3" :style="{ borderColor: 'var(--color-border)' }">
              <h2 class="font-heading text-base font-bold text-slate-900 dark:text-slate-100">
                {{ locale === 'ar' ? 'المنتجات والمواصفات في العرض' : 'Quotation Line Items' }}
              </h2>
              <span class="text-xs text-slate-500">
                {{ data.quote.items.length }} {{ locale === 'ar' ? 'منتجات' : 'items' }}
              </span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-start text-sm">
                <thead>
                  <tr class="border-b text-[11px] font-semibold uppercase tracking-wider text-slate-400" :style="{ borderColor: 'var(--color-border)' }">
                    <th scope="col" class="pb-2.5 text-start">{{ locale === 'ar' ? 'المنتج' : 'Product' }}</th>
                    <th scope="col" class="pb-2.5 text-end">{{ locale === 'ar' ? 'سعر الوحدة' : 'Unit Price' }}</th>
                    <th scope="col" class="pb-2.5 text-center">{{ locale === 'ar' ? 'الكمية' : 'Qty' }}</th>
                    <th scope="col" class="pb-2.5 text-end">{{ locale === 'ar' ? 'الإجمالي' : 'Subtotal' }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
                  <tr v-for="item in data.quote.items" :key="item.id" class="text-xs">
                    <td class="py-3 text-start">
                      <div class="flex items-start gap-3">
                        <div class="h-10 w-10 shrink-0 overflow-hidden rounded border bg-slate-50 dark:bg-slate-800">
                          <img 
                            v-if="item.imagePath || item.product?.images?.[0]?.path" 
                            :src="item.imagePath || item.product?.images?.[0]?.path" 
                            :alt="item.productNameSnapshot" 
                            class="h-full w-full object-cover" 
                          />
                          <div v-else class="flex h-full w-full items-center justify-center text-slate-400 text-[9px]">
                            <FileText class="h-4 w-4" />
                          </div>
                        </div>
                        <div>
                          <div class="flex items-center gap-1.5 flex-wrap">
                            <p class="font-bold text-slate-900 dark:text-slate-100">{{ item.productNameSnapshot }}</p>
                            <span v-if="item.isCustom" class="rounded bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 px-1.5 py-0.2 text-[9px] font-bold">
                              {{ locale === 'ar' ? 'مخصص' : 'Custom' }}
                            </span>
                          </div>
                          <p v-if="item.notes" class="text-[11px] text-slate-500 mt-0.5">
                            {{ locale === 'ar' ? 'ملاحظة: ' : 'Note: ' }}{{ item.notes }}
                          </p>
                          <NuxtLink v-if="item.product?.slug" :to="localePath(`/p/${item.product.slug}`)" target="_blank" class="text-[11px] text-[#2B71AE] hover:underline dark:text-blue-400">
                            {{ locale === 'ar' ? 'معاينة المنتج في المتجر' : 'View on Storefront' }}
                          </NuxtLink>
                        </div>
                      </div>
                    </td>
                    <td class="py-3 text-end font-mono text-slate-700 dark:text-slate-300">
                      {{ Number(item.priceSnapshot).toLocaleString() }} EGP
                    </td>
                    <td class="py-3 text-center font-bold text-slate-900 dark:text-slate-100">
                      {{ item.quantity }}
                    </td>
                    <td class="py-3 text-end font-mono font-bold text-[#2B71AE] dark:text-[#F5CC07]">
                      {{ (Number(item.priceSnapshot) * item.quantity).toLocaleString() }} EGP
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Grand Total & Discount Bar -->
            <div class="mt-4 space-y-1.5 border-t pt-3 text-xs" :style="{ borderColor: 'var(--color-border)' }">
              <div v-if="Number(data.quote.discountAmount) > 0" class="flex items-center justify-between text-slate-500">
                <span>{{ locale === 'ar' ? 'المجموع الفرعي:' : 'Subtotal:' }}</span>
                <span class="font-mono font-semibold">{{ Number(data.quote.subtotalAmount || data.quote.totalAmount).toLocaleString() }} EGP</span>
              </div>

              <div v-if="Number(data.quote.discountAmount) > 0" class="flex items-center justify-between text-amber-600 dark:text-amber-400 font-semibold">
                <span>
                  {{ locale === 'ar' ? 'الخصم المطبق:' : 'Applied Discount:' }}
                  <span v-if="data.quote.discountType === 'percentage'">({{ Number(data.quote.discountValue) }}%)</span>
                </span>
                <span class="font-mono">-{{ Number(data.quote.discountAmount).toLocaleString() }} EGP</span>
              </div>

              <div class="flex items-center justify-between pt-2 border-t font-heading" :style="{ borderColor: 'var(--color-border)' }">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  {{ locale === 'ar' ? 'الإجمالي الكلي النهائي:' : 'Final Grand Total:' }}
                </span>
                <span class="font-mono text-xl font-black text-[#2B71AE] dark:text-[#F5CC07]">
                  {{ Number(data.quote.totalAmount).toLocaleString() }} EGP
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar Column: Company & Lifecycle (1 col) -->
        <div class="space-y-6">
          <!-- Company & Contact Card -->
          <div class="rounded-md border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
            <h2 class="mb-3 font-heading text-base font-bold text-slate-900 dark:text-slate-100 border-b pb-2">
              {{ locale === 'ar' ? 'بيانات العميل والشركة' : 'Customer & Company' }}
            </h2>

            <div class="space-y-3 text-xs">
              <div class="flex items-start gap-2.5">
                <Building2 class="h-4 w-4 text-[#2B71AE] shrink-0 mt-0.5" />
                <div>
                  <span class="text-slate-400 block">{{ locale === 'ar' ? 'اسم المنشأة / الشركة' : 'Company' }}</span>
                  <span class="font-bold text-slate-800 dark:text-slate-200 text-sm">{{ data.quote.companyName }}</span>
                </div>
              </div>

              <div class="flex items-start gap-2.5">
                <User class="h-4 w-4 text-[#2B71AE] shrink-0 mt-0.5" />
                <div>
                  <span class="text-slate-400 block">{{ locale === 'ar' ? 'المسؤول' : 'Contact Person' }}</span>
                  <span class="font-semibold text-slate-800 dark:text-slate-200">{{ data.quote.contactName }}</span>
                  <span v-if="data.quote.contactTitle" class="text-slate-500 dark:text-slate-400 block">{{ data.quote.contactTitle }}</span>
                </div>
              </div>

              <div class="flex items-start gap-2.5">
                <Phone class="h-4 w-4 text-[#2B71AE] shrink-0 mt-0.5" />
                <div>
                  <span class="text-slate-400 block">{{ locale === 'ar' ? 'رقم الهاتف' : 'Phone' }}</span>
                  <a :href="`tel:${data.quote.phone}`" dir="ltr" class="font-mono font-semibold text-[#2B71AE] hover:underline dark:text-blue-400">{{ data.quote.phone }}</a>
                </div>
              </div>

              <div v-if="data.quote.email" class="flex items-start gap-2.5">
                <Mail class="h-4 w-4 text-[#2B71AE] shrink-0 mt-0.5" />
                <div>
                  <span class="text-slate-400 block">{{ locale === 'ar' ? 'البريد الإلكتروني' : 'Email' }}</span>
                  <a :href="`mailto:${data.quote.email}`" class="text-slate-800 hover:underline dark:text-slate-200">{{ data.quote.email }}</a>
                </div>
              </div>

              <div v-if="data.quote.governorate" class="flex items-start gap-2.5">
                <MapPin class="h-4 w-4 text-[#2B71AE] shrink-0 mt-0.5" />
                <div>
                  <span class="text-slate-400 block">{{ locale === 'ar' ? 'المحافظة' : 'Governorate' }}</span>
                  <span class="font-semibold text-slate-800 dark:text-slate-200">{{ data.quote.governorate }}</span>
                </div>
              </div>

              <div v-if="data.quote.expiresAt" class="flex items-start gap-2.5">
                <Calendar class="h-4 w-4 text-[#2B71AE] shrink-0 mt-0.5" />
                <div>
                  <span class="text-slate-400 block">{{ locale === 'ar' ? 'ينتهي العرض في' : 'Expires' }}</span>
                  <span class="font-semibold text-slate-800 dark:text-slate-200">{{ formatExpiry(data.quote.expiresAt) }}</span>
                </div>
              </div>

              <div v-if="data.quote.notes" class="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span class="text-slate-400 block mb-1">{{ locale === 'ar' ? 'ملاحظات العميل' : 'Client Notes' }}</span>
                <p class="text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded text-xs whitespace-pre-wrap">
                  {{ data.quote.notes }}
                </p>
              </div>

              <div v-if="data.quote.adminNotes" class="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span class="text-slate-400 block mb-1">{{ locale === 'ar' ? 'ملاحظات الأدمن' : 'Admin Notes' }}</span>
                <p class="text-slate-700 dark:text-slate-300 leading-relaxed bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded text-xs whitespace-pre-wrap">
                  {{ data.quote.adminNotes }}
                </p>
              </div>
            </div>
          </div>

          <!-- Account Representative Card -->
          <div
            v-if="data.quote.accountRepEmail || data.quote.accountRepPhone"
            class="rounded-md border bg-white p-5 shadow-xs dark:bg-[#162032]"
            :style="{ borderColor: 'var(--color-border)' }"
          >
            <h2 class="mb-3 font-heading text-base font-bold text-slate-900 dark:text-slate-100 border-b pb-2">
              {{ locale === 'ar' ? 'المسؤول عن العرض' : 'Account Representative' }}
            </h2>

            <div class="space-y-3 text-xs">
              <div v-if="data.quote.accountRepEmail" class="flex items-start gap-2.5">
                <Mail class="h-4 w-4 text-[#2B71AE] shrink-0 mt-0.5" />
                <div>
                  <span class="text-slate-400 block">{{ locale === 'ar' ? 'البريد الإلكتروني' : 'Email' }}</span>
                  <a :href="`mailto:${data.quote.accountRepEmail}`" class="text-slate-800 hover:underline dark:text-slate-200">{{ data.quote.accountRepEmail }}</a>
                </div>
              </div>

              <div v-if="data.quote.accountRepPhone" class="flex items-start gap-2.5">
                <Phone class="h-4 w-4 text-[#2B71AE] shrink-0 mt-0.5" />
                <div>
                  <span class="text-slate-400 block">{{ locale === 'ar' ? 'رقم الهاتف' : 'Phone' }}</span>
                  <a :href="`tel:${data.quote.accountRepPhone}`" dir="ltr" class="font-mono font-semibold text-[#2B71AE] hover:underline dark:text-blue-400">{{ data.quote.accountRepPhone }}</a>
                </div>
              </div>
            </div>
          </div>

          <!-- Status Lifecycle Management Card -->
          <div class="rounded-md border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
            <h2 class="mb-1 font-heading text-base font-bold text-slate-900 dark:text-slate-100">
              {{ locale === 'ar' ? 'حالة المتابعة' : 'Quotation Status' }}
            </h2>
            <p class="mb-4 text-xs text-slate-500 dark:text-slate-400">
              {{ locale === 'ar' ? 'تحديث مرحلة التواصل والمراجعة لعرض السعر.' : 'Track the commercial follow-up stage for this quote.' }}
            </p>

            <div v-if="updateMessage" class="mb-3 rounded bg-emerald-50 p-2 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {{ updateMessage }}
            </div>

            <div class="flex items-center gap-2">
              <select
                v-model="newStatus"
                class="h-9 flex-1 rounded border bg-white px-2.5 text-xs text-slate-700 focus:border-[#2B71AE] focus:outline-none dark:bg-[#0B1520] dark:text-slate-300"
                :style="{ borderColor: 'var(--color-border)' }"
              >
                <option value="New">New (جديد)</option>
                <option value="Reviewed">Reviewed (تمت المراجعة)</option>
                <option value="Pending">Pending (معلق)</option>
                <option value="Accepted">Accepted (مقبول)</option>
                <option value="Rejected">Rejected (مرفوض)</option>
                <option value="Expired">Expired (منتهي)</option>
                <option value="Closed">Closed (مغلق)</option>
              </select>

              <button
                type="button"
                :disabled="updating || newStatus === data.quote.status"
                class="inline-flex h-9 items-center justify-center rounded bg-[#2B71AE] px-3.5 text-xs font-semibold text-white hover:bg-[#285E8E] disabled:opacity-50 transition-colors"
                @click="updateStatus"
              >
                <span>{{ updating ? (locale === 'ar' ? 'جاري الحفظ…' : 'Saving…') : (locale === 'ar' ? 'تحديث' : 'Update') }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Invoice Preview Modal (converted from this quote) -->
      <AdminInvoiceModal
        v-if="invoiceModalId"
        :invoice-id="invoiceModalId"
        :context-label="invoiceModalLabel"
        @close="invoiceModalId = null"
      />
    </div>
  </div>
</template>
