<script setup lang="ts">
import {
  Calendar,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Inbox,
  Paperclip,
  Wrench,
  XCircle,
} from 'lucide-vue-next'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const reqId = route.params.id as string

useHead(() => ({ title: `Request Detail — Admin — ${t('brand.name')}` }))

const { data: request, refresh } = await useAsyncData(`service-request-${reqId}`, () =>
  $fetch<any>(`/api/admin/services/requests/${reqId}`),
)

const updating = ref(false)
const updateMessage = ref('')

async function updateStatus(newStatus: string) {
  updating.value = true
  updateMessage.value = ''
  try {
    await $fetch(`/api/admin/services/requests/${reqId}/status`, {
      method: 'PUT',
      body: { status: newStatus },
    })
    updateMessage.value = locale.value === 'ar' ? 'تم تحديث الحالة بنجاح' : 'Status updated successfully'
    await refresh()
  }
  catch (e) {
    alert('Error updating status')
  }
  finally {
    updating.value = false
    setTimeout(() => { updateMessage.value = '' }, 3000)
  }
}

function getFieldInfo(fieldId: string) {
  if (!request.value?.service?.formFields) return { label: fieldId, type: 'text' }
  const f = request.value.service.formFields.find((field: any) => field.id === fieldId)
  if (!f) return { label: fieldId, type: 'text' }
  return {
    label: locale.value === 'ar' ? f.labelAr : f.labelEn,
    subLabel: locale.value === 'ar' ? f.labelEn : f.labelAr,
    type: f.fieldType,
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
  <div v-if="request">
    <!-- Header with Back to Requests -->
    <AdminPageHeader
      :title="`${locale === 'ar' ? 'طلب خدمة' : 'Request'} #${request.id.slice(-6).toUpperCase()}`"
      :description="`${locale === 'ar' ? 'تاريخ التقديم:' : 'Submitted on:'} ${formatDate(request.submittedAt)}`"
      back-to="/admin/services"
      :back-label="locale === 'ar' ? 'العودة لطلبات الخدمات' : 'Back to Services'"
    >
      <template #badge>
        <AdminStatusBadge :status="request.status" size="md" />
      </template>
    </AdminPageHeader>

    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Main Content Column: Form Field Values -->
      <div class="space-y-6 lg:col-span-2">
        <!-- Submitted Field Responses Card -->
        <div class="rounded-md border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
          <div class="mb-4 flex items-center justify-between border-b pb-3" :style="{ borderColor: 'var(--color-border)' }">
            <h2 class="font-heading text-base font-bold text-slate-900 dark:text-slate-100">
              {{ locale === 'ar' ? 'البيانات المدخلة من العميل' : 'Submitted Form Values' }}
            </h2>
            <span class="rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-[#2B71AE] dark:bg-blue-950/40 dark:text-blue-300">
              {{ locale === 'ar' ? (request.service?.nameAr || request.service?.nameEn) : request.service?.nameEn }}
            </span>
          </div>

          <div v-if="request.values?.length" class="grid gap-4 sm:grid-cols-2">
            <div
              v-for="val in request.values"
              :key="val.id"
              class="rounded-md border bg-slate-50/50 p-3 dark:bg-[#0B1520]/60"
              :class="{ 'sm:col-span-2': val.value && val.value.length > 60 }"
              :style="{ borderColor: 'var(--color-border)' }"
            >
              <div class="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>{{ getFieldInfo(val.fieldId).label }}</span>
                <span class="text-[10px] text-slate-400">({{ getFieldInfo(val.fieldId).subLabel }})</span>
              </div>
              <p class="mt-1 text-sm font-semibold text-slate-900 whitespace-pre-wrap dark:text-slate-100" :dir="getFieldInfo(val.fieldId).type === 'phone' ? 'ltr' : undefined">
                {{ val.value || '—' }}
              </p>
            </div>
          </div>
          <div v-else class="text-xs text-slate-400 py-4 text-center">
            {{ locale === 'ar' ? 'لا توجد حقول مسجلة لهذا الطلب.' : 'No custom fields submitted.' }}
          </div>
        </div>

        <!-- Attached Files Card -->
        <div class="rounded-md border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
          <div class="mb-3 flex items-center justify-between border-b pb-3" :style="{ borderColor: 'var(--color-border)' }">
            <h2 class="font-heading text-base font-bold text-slate-900 dark:text-slate-100">
              {{ locale === 'ar' ? 'المرفقات والملفات' : 'Uploaded Attachments' }}
            </h2>
            <span class="text-xs text-slate-500">
              {{ request.attachments?.length || 0 }} {{ locale === 'ar' ? 'ملفات' : 'files' }}
            </span>
          </div>

          <div v-if="request.attachments?.length" class="grid gap-3 sm:grid-cols-2">
            <a
              v-for="att in request.attachments"
              :key="att.id"
              :href="`/api/admin/services/requests/${request.id}/attachments/${att.id}`"
              target="_blank"
              rel="noopener noreferrer"
              class="group flex items-center justify-between rounded-md border p-3 transition-colors hover:border-[#2B71AE] hover:bg-[#2B71AE]/5 dark:hover:bg-slate-800/50"
              :style="{ borderColor: 'var(--color-border)' }"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-500 group-hover:bg-[#2B71AE]/10 group-hover:text-[#2B71AE] dark:bg-slate-800">
                  <FileText class="h-4 w-4" aria-hidden="true" />
                </div>
                <span class="truncate text-xs font-semibold text-slate-800 group-hover:text-[#2B71AE] dark:text-slate-200">
                  {{ att.originalName }}
                </span>
              </div>
              <Download class="h-4 w-4 shrink-0 text-slate-400 group-hover:text-[#2B71AE]" aria-hidden="true" />
            </a>
          </div>
          <div v-else class="text-xs text-slate-400 py-3">
            {{ locale === 'ar' ? 'لم يقم العميل بإرفاق أي ملفات في هذا الطلب.' : 'No files attached with this submission.' }}
          </div>
        </div>
      </div>

      <!-- Sidebar Status Management Column -->
      <div class="space-y-6">
        <!-- Status Lifecycle Control Card -->
        <AdminPermissionGate permission="services.manage">
          <div class="rounded-md border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
            <h2 class="mb-2 font-heading text-base font-bold text-slate-900 dark:text-slate-100">
              {{ locale === 'ar' ? 'تحديث حالة الطلب' : 'Lifecycle Status' }}
            </h2>
            <p class="mb-4 text-xs text-slate-500 dark:text-slate-400">
              {{ locale === 'ar' ? 'حدد المرحلة الحالية للتعامل مع هذا الطلب الهندسي.' : 'Transition this request through engineering review stages.' }}
            </p>

            <div class="space-y-2">
              <button
                type="button"
                :disabled="updating || request.status === 'New'"
                class="flex w-full items-center justify-between rounded-md border p-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                :class="request.status === 'New' ? 'border-blue-500 bg-blue-50 text-[#2B71AE] dark:bg-blue-950/50 dark:text-blue-300' : 'hover:bg-slate-50 dark:hover:bg-slate-800'"
                :style="{ borderColor: request.status === 'New' ? undefined : 'var(--color-border)' }"
                @click="updateStatus('New')"
              >
                <span>New (جديد)</span>
                <CheckCircle v-if="request.status === 'New'" class="h-4 w-4 text-[#2B71AE]" aria-hidden="true" />
              </button>

              <button
                type="button"
                :disabled="updating || request.status === 'In Review'"
                class="flex w-full items-center justify-between rounded-md border p-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                :class="request.status === 'In Review' ? 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' : 'hover:bg-slate-50 dark:hover:bg-slate-800'"
                :style="{ borderColor: request.status === 'In Review' ? undefined : 'var(--color-border)' }"
                @click="updateStatus('In Review')"
              >
                <span>In Review (قيد المراجعة الفنية)</span>
                <CheckCircle v-if="request.status === 'In Review'" class="h-4 w-4 text-amber-600" aria-hidden="true" />
              </button>

              <button
                type="button"
                :disabled="updating || request.status === 'Done'"
                class="flex w-full items-center justify-between rounded-md border p-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                :class="request.status === 'Done' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'hover:bg-slate-50 dark:hover:bg-slate-800'"
                :style="{ borderColor: request.status === 'Done' ? undefined : 'var(--color-border)' }"
                @click="updateStatus('Done')"
              >
                <span>Done (تم الإنجاز)</span>
                <CheckCircle v-if="request.status === 'Done'" class="h-4 w-4 text-emerald-600" aria-hidden="true" />
              </button>

              <button
                type="button"
                :disabled="updating || request.status === 'Closed'"
                class="flex w-full items-center justify-between rounded-md border p-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                :class="request.status === 'Closed' ? 'border-slate-500 bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200' : 'hover:bg-slate-50 dark:hover:bg-slate-800'"
                :style="{ borderColor: request.status === 'Closed' ? undefined : 'var(--color-border)' }"
                @click="updateStatus('Closed')"
              >
                <span>Closed (مغلق)</span>
                <CheckCircle v-if="request.status === 'Closed'" class="h-4 w-4 text-slate-600" aria-hidden="true" />
              </button>
            </div>

            <p v-if="updateMessage" class="mt-3 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {{ updateMessage }}
            </p>
          </div>
        </AdminPermissionGate>

        <!-- Service Info Metadata Card -->
        <div class="rounded-md border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
          <h3 class="mb-3 font-heading text-sm font-bold text-slate-900 dark:text-slate-100">
            {{ locale === 'ar' ? 'بيانات الخدمة' : 'Service Info' }}
          </h3>
          <div class="space-y-2.5 text-xs">
            <div>
              <span class="text-slate-400 block text-[11px]">{{ locale === 'ar' ? 'اسم الخدمة' : 'Service Name' }}</span>
              <span class="font-semibold text-slate-800 dark:text-slate-200">{{ request.service?.nameEn }}</span>
            </div>
            <div>
              <span class="text-slate-400 block text-[11px]">{{ locale === 'ar' ? 'الاسم بالعربية' : 'Arabic Name' }}</span>
              <span class="font-medium text-slate-700 dark:text-slate-300">{{ request.service?.nameAr }}</span>
            </div>
            <div class="border-t pt-2" :style="{ borderColor: 'var(--color-border)' }">
              <span class="text-slate-400 block text-[11px]">{{ locale === 'ar' ? 'آخر تحديث' : 'Last Updated' }}</span>
              <span class="text-slate-600 dark:text-slate-400">{{ formatDate(request.updatedAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
