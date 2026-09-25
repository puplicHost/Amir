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
  Phone, 
  RotateCcw, 
  ShieldCheck, 
  User 
} from 'lucide-vue-next'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const id = String(route.params.id)

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

async function updateStatus() {
  if (!confirm(locale.value === 'ar' ? `هل أنت متأكد من تغيير حالة العرض إلى "${newStatus.value}"؟` : `Change quote status to "${newStatus.value}"?`)) {
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
  }
  catch (e) {
    alert((e as any)?.data?.message || 'Update failed')
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
          <a
            v-if="data.quote.pdfPath"
            :href="data.quote.pdfPath"
            target="_blank"
            download
            class="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#2B71AE] px-4 text-xs font-semibold text-white shadow-xs hover:bg-[#285E8E] transition-colors"
          >
            <Download class="h-4 w-4" />
            <span>{{ locale === 'ar' ? 'تحميل ملف PDF' : 'Download PDF' }}</span>
          </a>
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
                      <div class="flex items-center gap-3">
                        <div class="h-10 w-10 shrink-0 overflow-hidden rounded border bg-slate-50 dark:bg-slate-800">
                          <img 
                            v-if="item.product?.images?.[0]?.path" 
                            :src="item.product.images[0].path" 
                            :alt="item.productNameSnapshot" 
                            class="h-full w-full object-cover" 
                          />
                          <div v-else class="flex h-full w-full items-center justify-center text-slate-400 text-[9px]">
                            <FileText class="h-4 w-4" />
                          </div>
                        </div>
                        <div>
                          <p class="font-bold text-slate-900 dark:text-slate-100">{{ item.productNameSnapshot }}</p>
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

            <!-- Grand Total Bar -->
            <div class="mt-4 flex items-center justify-between border-t pt-4" :style="{ borderColor: 'var(--color-border)' }">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-500">
                {{ locale === 'ar' ? 'الإجمالي الكلي' : 'Grand Total' }}
              </span>
              <span class="font-mono text-xl font-black text-[#2B71AE] dark:text-[#F5CC07]">
                {{ Number(data.quote.totalAmount).toLocaleString() }} EGP
              </span>
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

              <div v-if="data.quote.notes" class="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span class="text-slate-400 block mb-1">{{ locale === 'ar' ? 'ملاحظات العميل' : 'Client Notes' }}</span>
                <p class="text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded text-xs whitespace-pre-wrap">
                  {{ data.quote.notes }}
                </p>
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
    </div>
  </div>
</template>
