<script setup lang="ts">
import { Download, Printer, X } from 'lucide-vue-next'

const props = defineProps<{
  invoiceId: string | null
  contextLabel?: string | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { locale } = useI18n()
const fetch = useRequestFetch()

const { data, pending, error, refresh } = await useAsyncData(
  () => `admin-invoice-modal-${props.invoiceId}`,
  () => fetch<{ invoice: any }>(`/api/admin/invoices/${props.invoiceId}`),
  { immediate: !!props.invoiceId },
)
watch(() => props.invoiceId, (id) => {
  if (id) refresh()
})

const { data: general } = await useAsyncData('invoice-modal-general', () => fetch<any>('/api/settings/general'))
const { data: contact } = await useAsyncData('invoice-modal-contact', () => fetch<any>('/api/settings/contact'))

function handlePrint() {
  if (typeof document === 'undefined') return
  document.body.classList.add('invoice-modal-print')
  const cleanup = () => {
    document.body.classList.remove('invoice-modal-print')
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)
  // Fallback in case afterprint never fires (e.g. dialog cancelled silently).
  setTimeout(cleanup, 2000)
  window.print()
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => {
  if (typeof window !== 'undefined') window.addEventListener('keydown', handleKeydown)
})
onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeydown)
    document.body.classList.remove('invoice-modal-print')
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      data-invoice-print-root
      class="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm print:p-0"
      role="dialog"
      aria-modal="true"
      @click.self="$emit('close')"
    >
      <div class="my-6 w-full max-w-[860px] print:my-0 print:max-w-none">
        <!-- Modal toolbar (hidden in print) -->
        <div class="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div class="flex items-center gap-2">
            <a
              v-if="data?.invoice"
              :href="`/api/invoices/${data.invoice.id}/pdf`"
              target="_blank"
              download
              class="inline-flex h-10 items-center gap-1.5 rounded-md bg-[#2B71AE] px-4 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#285E8E]"
            >
              <Download class="h-4 w-4" aria-hidden="true" />
              <span>{{ locale === 'ar' ? 'تحميل PDF' : 'Download PDF' }}</span>
            </a>
            <button
              type="button"
              class="inline-flex h-10 items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-4 text-xs font-bold text-white backdrop-blur transition-colors hover:bg-white/20"
              @click="handlePrint"
            >
              <Printer class="h-4 w-4" aria-hidden="true" />
              <span>{{ locale === 'ar' ? 'طباعة' : 'Print' }}</span>
            </button>
          </div>
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/20 bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
            :aria-label="locale === 'ar' ? 'إغلاق' : 'Close'"
            @click="$emit('close')"
          >
            <X class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <!-- Loading / error states -->
        <div v-if="pending" class="space-y-3 rounded-xl bg-white p-6 dark:bg-[#162032]">
          <div v-for="i in 6" :key="i" class="h-10 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
        </div>
        <div
          v-else-if="error || !data?.invoice"
          class="rounded-xl bg-white p-8 text-center text-xs font-medium text-rose-600 dark:bg-[#162032] dark:text-rose-400 print:hidden"
        >
          {{ locale === 'ar' ? 'تعذر تحميل بيانات الفاتورة.' : 'Failed to load invoice data.' }}
        </div>

        <!-- A4 invoice preview -->
        <AdminInvoicePreview
          v-else
          :invoice="data.invoice"
          :general="general"
          :contact="contact"
          :context-label="props.contextLabel"
        />
      </div>
    </div>
  </Teleport>
</template>
