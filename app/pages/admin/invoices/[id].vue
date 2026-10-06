<script setup lang="ts">
import { ArrowRight, Download, Printer } from 'lucide-vue-next'

definePageMeta({ layout: 'admin', middleware: 'admin-auth', requiredPermission: 'invoices.view' })

const { locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const id = String(route.params.id)
const fetch = useRequestFetch()
const toast = useAdminToast()

const { data, refresh, error } = await useAsyncData(`admin-invoice-${id}`, () =>
  fetch<{ invoice: any }>(`/api/admin/invoices/${id}`),
)
const { data: general } = await useAsyncData('invoice-general', () => fetch<any>('/api/settings/general'))
const { data: contact } = await useAsyncData('invoice-contact', () => fetch<any>('/api/settings/contact'))

const invoice = computed(() => data.value?.invoice)
const newStatus = ref('')
const updating = ref(false)
watch(() => invoice.value?.status, s => { if (s) newStatus.value = s }, { immediate: true })

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

async function saveStatus() {
  if (!invoice.value || newStatus.value === invoice.value.status) return
  updating.value = true
  try {
    await $fetch(`/api/admin/invoices/${id}/status`, { method: 'PUT', body: { status: newStatus.value } })
    await refresh()
    toast.success(locale.value === 'ar' ? 'تم تحديث حالة الفاتورة' : 'Invoice Status Updated')
  }
  catch (e: any) {
    toast.error(locale.value === 'ar' ? 'فشل التحديث' : 'Update Failed', e?.data?.message)
  }
  finally {
    updating.value = false
  }
}

function handlePrint() {
  window.print()
}
</script>

<template>
  <div>
    <div v-if="error" class="rounded-md border border-rose-200 bg-rose-50 p-6 text-center text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
      {{ locale === 'ar' ? 'الفاتورة غير موجودة أو تعذر تحميلها.' : 'Invoice not found or failed to load.' }}
    </div>

    <div v-else-if="invoice">
      <AdminPageHeader
        :title="`${locale === 'ar' ? 'فاتورة' : 'Invoice'} #${invoice.invoiceNumber}`"
        :description="formatDate(invoice.createdAt)"
        back-to="/admin/invoices"
        :back-label="locale === 'ar' ? 'العودة للفواتير' : 'Back to Invoices'"
      >
        <template #badge>
          <AdminStatusBadge :status="statusAr(invoice.status)" size="md" />
        </template>
        <template #actions>
          <div class="flex items-center gap-2 print:hidden">
            <select
              v-model="newStatus"
              class="h-9 rounded-md border bg-white px-2 text-xs font-semibold dark:bg-[#0B1520]"
              :style="{ borderColor: 'var(--color-border)' }"
              :disabled="updating"
              @change="saveStatus"
            >
              <option value="Pending">{{ locale === 'ar' ? 'معلقة' : 'Pending' }}</option>
              <option value="Paid">{{ locale === 'ar' ? 'مدفوعة' : 'Paid' }}</option>
              <option value="Cancelled">{{ locale === 'ar' ? 'ملغية' : 'Cancelled' }}</option>
            </select>
            <a
              :href="`/api/invoices/${invoice.id}/pdf`"
              target="_blank" download
              class="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#2B71AE] px-3.5 text-xs font-bold text-white shadow-xs hover:bg-[#285E8E]"
            >
              <Download class="h-3.5 w-3.5" aria-hidden="true" />
              <span>{{ locale === 'ar' ? 'تحميل PDF' : 'Download PDF' }}</span>
            </a>
            <button
              type="button"
              class="inline-flex h-9 items-center gap-1.5 rounded-md border bg-white px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#162032] dark:text-slate-200"
              :style="{ borderColor: 'var(--color-border)' }"
              @click="handlePrint"
            >
              <Printer class="h-3.5 w-3.5" aria-hidden="true" />
              <span>{{ locale === 'ar' ? 'طباعة' : 'Print' }}</span>
            </button>
          </div>
        </template>
      </AdminPageHeader>

      <!-- A4 Preview Card (shared component) -->
      <AdminInvoicePreview :invoice="invoice" :general="general" :contact="contact" />

      <div class="mt-4 flex items-center justify-center gap-2 print:hidden">
        <NuxtLink
          :to="localePath('/admin/invoices')"
          class="inline-flex h-10 items-center gap-1.5 rounded-md border bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#162032] dark:text-slate-300"
          :style="{ borderColor: 'var(--color-border)' }"
        >
          <ArrowRight class="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          <span>{{ locale === 'ar' ? 'العودة للفواتير' : 'Back to Invoices' }}</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style>
@media print {
  aside, header, nav, .print\:hidden {
    display: none !important;
  }
}
</style>
