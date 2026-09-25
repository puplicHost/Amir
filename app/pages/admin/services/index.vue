<script setup lang="ts">
import {
  Eye,
  FileText,
  Filter,
  FolderTree,
  Inbox,
  Layers,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  Trash2,
  Wrench,
  X,
} from 'lucide-vue-next'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const router = useRouter()

const activeTab = ref<'services' | 'requests'>((route.query.tab as 'services' | 'requests') || 'services')

// Filters for Requests
const reqStatus = ref(String(route.query.status || ''))
const reqServiceId = ref(String(route.query.serviceId || ''))
const requestsPage = ref(Number(route.query.page) || 1)
const requestsLimit = 20
const fetch = useRequestFetch()

// Data fetching
const { data: services, refresh: refreshServices } = await useAsyncData('admin-services', () =>
  fetch<any[]>('/api/admin/services'),
)

const { data: requestsData, refresh: refreshRequests } = await useAsyncData('admin-requests', () =>
  fetch<any>('/api/admin/services/requests', {
    params: {
      page: requestsPage.value,
      limit: requestsLimit,
      status: reqStatus.value || undefined,
      serviceId: reqServiceId.value || undefined,
    },
  }),
  { watch: [requestsPage, reqStatus, reqServiceId] },
)

const hasReqFilters = computed(() => !!(reqStatus.value || reqServiceId.value))

async function applyReqFilters() {
  requestsPage.value = 1
  await router.replace({
    query: {
      tab: 'requests',
      status: reqStatus.value || undefined,
      serviceId: reqServiceId.value || undefined,
    },
  })
  await refreshRequests()
}

async function resetReqFilters() {
  reqStatus.value = ''
  reqServiceId.value = ''
  requestsPage.value = 1
  await router.replace({ query: { tab: 'requests' } })
  await refreshRequests()
}

async function gotoRequestsPage(p: number) {
  requestsPage.value = p
  await router.replace({
    query: {
      tab: 'requests',
      status: reqStatus.value || undefined,
      serviceId: reqServiceId.value || undefined,
      page: p > 1 ? String(p) : undefined,
    },
  })
}

function switchTab(tab: 'services' | 'requests') {
  activeTab.value = tab
  router.replace({ query: { tab } })
}

// Service Actions
const deleting = ref('')

// Create-service modal state
const showServiceModal = ref(false)
const savingService = ref(false)
const serviceFormError = ref('')
const serviceForm = reactive({
  nameAr: '',
  nameEn: '',
  descriptionAr: '',
  descriptionEn: '',
  iconPath: '',
  sortOrder: 0,
  isActive: true,
})

function openCreateService() {
  Object.assign(serviceForm, {
    nameAr: '',
    nameEn: '',
    descriptionAr: '',
    descriptionEn: '',
    iconPath: '',
    sortOrder: (services.value?.length || 0) + 1,
    isActive: true,
  })
  serviceFormError.value = ''
  showServiceModal.value = true
}

async function saveService() {
  if (!serviceForm.nameAr.trim() || !serviceForm.nameEn.trim()) {
    serviceFormError.value = locale.value === 'ar' ? 'الاسم باللغتين العربية والإنجليزية مطلوب' : 'Name in both Arabic and English is required.'
    return
  }
  savingService.value = true
  serviceFormError.value = ''
  try {
    await $fetch('/api/admin/services', {
      method: 'POST',
      body: { ...serviceForm, iconPath: serviceForm.iconPath || undefined },
    })
    showServiceModal.value = false
    await refreshServices()
  }
  catch (e: any) {
    serviceFormError.value = e?.data?.message || 'Save failed'
  }
  finally {
    savingService.value = false
  }
}

async function deleteService(s: any) {
  if (!confirm(locale.value === 'ar' ? `هل أنت متأكد من حذف خدمة "${s.nameEn}"؟` : `Are you sure you want to delete service "${s.nameEn}"?`)) return
  deleting.value = s.id
  try {
    await $fetch(`/api/admin/services/${s.id}`, { method: 'DELETE' })
    await refreshServices()
  }
  catch (e: any) {
    alert(e.data?.message || 'Error deleting service')
  }
  finally {
    deleting.value = ''
  }
}

async function toggleActive(service: any) {
  try {
    await $fetch(`/api/admin/services/${service.id}`, {
      method: 'PUT',
      body: { ...service, isActive: !service.isActive },
    })
    await refreshServices()
  }
  catch (e) {
    alert('Error toggling service active state')
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(locale.value === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
</script>

<template>
  <div>
    <!-- Page Header -->
    <AdminPageHeader
      :title="locale === 'ar' ? 'إدارة الخدمات والطلبات' : 'Engineering Services'"
      :description="locale === 'ar' ? 'تكوين خدمات الصيانة والأنظمة الهندسية ومتابعة طلبات العملاء الواردة.' : 'Configure engineering services, custom dynamic form fields, and client requests.'"
    >
      <template #actions>
        <button
          v-if="activeTab === 'services'"
          type="button"
          class="inline-flex h-10 items-center gap-1.5 rounded-md bg-[#2B71AE] px-4 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#285E8E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B71AE]"
          @click="openCreateService"
        >
          <Plus class="h-4 w-4" aria-hidden="true" />
          <span>{{ locale === 'ar' ? 'إضافة خدمة' : 'Add Service' }}</span>
        </button>
      </template>
    </AdminPageHeader>

    <!-- Navigation Tabs -->
    <div class="mb-6 flex border-b" :style="{ borderColor: 'var(--color-border)' }">
      <button
        type="button"
        class="inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors"
        :class="[
          activeTab === 'services'
            ? 'border-[#2B71AE] text-[#2B71AE] dark:border-[#F5CC07] dark:text-[#F5CC07]'
            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:hover:text-slate-300'
        ]"
        @click="switchTab('services')"
      >
        <Wrench class="h-4 w-4" aria-hidden="true" />
        <span>{{ locale === 'ar' ? 'الخدمات المتاحة' : 'Services Catalog' }}</span>
        <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {{ services?.length || 0 }}
        </span>
      </button>

      <button
        type="button"
        class="inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors"
        :class="[
          activeTab === 'requests'
            ? 'border-[#2B71AE] text-[#2B71AE] dark:border-[#F5CC07] dark:text-[#F5CC07]'
            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:hover:text-slate-300'
        ]"
        @click="switchTab('requests')"
      >
        <Inbox class="h-4 w-4" aria-hidden="true" />
        <span>{{ locale === 'ar' ? 'طلبات العملاء' : 'Service Requests' }}</span>
        <span class="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
          {{ requestsData?.total || 0 }}
        </span>
      </button>
    </div>

    <!-- TAB 1: Services List -->
    <div v-if="activeTab === 'services'">
      <div class="overflow-hidden rounded-md border bg-white shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[760px] text-start text-sm">
            <thead>
              <tr class="border-b bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/40 dark:text-slate-400" :style="{ borderColor: 'var(--color-border)' }">
                <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'اسم الخدمة' : 'Service' }}</th>
                <th scope="col" class="px-4 py-3 text-center">{{ locale === 'ar' ? 'الحالة' : 'Status' }}</th>
                <th scope="col" class="px-4 py-3 text-center">{{ locale === 'ar' ? 'حقول النموذج' : 'Form Fields' }}</th>
                <th scope="col" class="px-4 py-3 text-center">{{ locale === 'ar' ? 'الطلبات' : 'Requests' }}</th>
                <th scope="col" class="px-4 py-3 text-end">{{ locale === 'ar' ? 'الإجراءات' : 'Actions' }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
              <tr
                v-for="s in services"
                :key="s.id"
                class="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
              >
                <!-- Service Name -->
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#2B71AE]/10 text-[#2B71AE] dark:bg-blue-950/50 dark:text-blue-400">
                      <Wrench class="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <p class="font-semibold text-slate-900 dark:text-slate-100">{{ s.nameEn }}</p>
                      <p class="text-xs text-slate-500 dark:text-slate-400">{{ s.nameAr }}</p>
                    </div>
                  </div>
                </td>

                <!-- Active Toggle -->
                <td class="px-4 py-3 text-center">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors"
                    :class="s.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'"
                    :title="locale === 'ar' ? 'اضغط لتبديل حالة التفعيل' : 'Click to toggle visibility'"
                    @click="toggleActive(s)"
                  >
                    <span class="h-1.5 w-1.5 rounded-full" :class="s.isActive ? 'bg-emerald-500' : 'bg-slate-400'" />
                    <span>{{ s.isActive ? (locale === 'ar' ? 'نشط' : 'Active') : (locale === 'ar' ? 'معطل' : 'Inactive') }}</span>
                  </button>
                </td>

                <!-- Fields Count -->
                <td class="px-4 py-3 text-center">
                  <span class="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <Layers class="h-3 w-3 text-slate-400" aria-hidden="true" />
                    <span>{{ s._count?.formFields || 0 }}</span>
                  </span>
                </td>

                <!-- Requests Count -->
                <td class="px-4 py-3 text-center">
                  <span class="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-[#2B71AE] dark:bg-blue-950/40 dark:text-blue-300">
                    <Inbox class="h-3 w-3" aria-hidden="true" />
                    <span>{{ s._count?.requests || 0 }}</span>
                  </span>
                </td>

                <!-- Actions -->
                <td class="px-4 py-3 text-end">
                  <div class="flex items-center justify-end gap-1.5">
                    <NuxtLink
                      :to="localePath(`/admin/services/${s.id}/form`)"
                      class="inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-semibold text-[#2B71AE] transition-colors hover:bg-[#2B71AE]/10 dark:text-blue-400 dark:hover:bg-blue-950/50"
                    >
                      <Settings2 class="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{{ locale === 'ar' ? 'تعديل النموذج' : 'Form Builder' }}</span>
                    </NuxtLink>

                    <button
                      type="button"
                      :disabled="deleting === s.id || (s._count?.requests || 0) > 0"
                      class="inline-flex h-8 items-center gap-1 rounded px-2 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-rose-400 dark:hover:bg-rose-950/40"
                      :title="(s._count?.requests || 0) > 0 ? (locale === 'ar' ? 'لا يمكن الحذف: توجد طلبات مرتبطة بهذه الخدمة' : 'Cannot delete: this service has submitted requests') : (locale === 'ar' ? 'حذف الخدمة' : 'Delete service')"
                      @click="deleteService(s)"
                    >
                      <Trash2 class="h-3.5 w-3.5" aria-hidden="true" />
                      <span class="hidden sm:inline">{{ locale === 'ar' ? 'حذف' : 'Delete' }}</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="!services?.length" class="p-8">
          <AdminEmptyState
            :title="locale === 'ar' ? 'لا توجد خدمات مسجلة' : 'No services available'"
            :description="locale === 'ar' ? 'ستظهر الخدمات الهندسية السبعة هنا بعد تشغيل البذر.' : 'Engineering services will appear here after seeding.'"
            :icon="Wrench"
          />
        </div>
      </div>
    </div>

    <!-- TAB 2: Service Requests -->
    <div v-else>
      <!-- Filter Toolbar -->
      <div
        class="mb-4 rounded-md border bg-white p-3.5 shadow-xs dark:bg-[#162032]"
        :style="{ borderColor: 'var(--color-border)' }"
      >
        <form class="flex flex-wrap items-center gap-2.5" @submit.prevent="applyReqFilters">
          <!-- Status Filter -->
          <select
            v-model="reqStatus"
            class="h-9 rounded-md border bg-white px-3 text-xs text-slate-700 focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520] dark:text-slate-300"
            :style="{ borderColor: 'var(--color-border)' }"
            @change="applyReqFilters"
          >
            <option value="">{{ locale === 'ar' ? 'جميع الحالات' : 'All Request Statuses' }}</option>
            <option value="New">New (جديد)</option>
            <option value="In Review">In Review (قيد المراجعة)</option>
            <option value="Done">Done (تم الإنجاز)</option>
            <option value="Closed">Closed (مغلق)</option>
          </select>

          <!-- Service Filter -->
          <select
            v-model="reqServiceId"
            class="h-9 rounded-md border bg-white px-3 text-xs text-slate-700 focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520] dark:text-slate-300"
            :style="{ borderColor: 'var(--color-border)' }"
            @change="applyReqFilters"
          >
            <option value="">{{ locale === 'ar' ? 'جميع الخدمات' : 'All Services' }}</option>
            <option v-for="s in services || []" :key="s.id" :value="s.id">
              {{ s.nameEn }}
            </option>
          </select>

          <button
            type="submit"
            class="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            <Filter class="h-3.5 w-3.5" aria-hidden="true" />
            <span>{{ locale === 'ar' ? 'تصفية' : 'Filter' }}</span>
          </button>

          <button
            v-if="hasReqFilters"
            type="button"
            class="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            @click="resetReqFilters"
          >
            <RotateCcw class="h-3.5 w-3.5" aria-hidden="true" />
            <span>{{ locale === 'ar' ? 'إلغاء' : 'Reset' }}</span>
          </button>
        </form>
      </div>

      <!-- Requests Table -->
      <div class="overflow-hidden rounded-md border bg-white shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[760px] text-start text-sm">
            <thead>
              <tr class="border-b bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/40 dark:text-slate-400" :style="{ borderColor: 'var(--color-border)' }">
                <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'الطلب #' : 'Request #' }}</th>
                <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'الخدمة' : 'Service' }}</th>
                <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'تاريخ التقديم' : 'Date' }}</th>
                <th scope="col" class="px-4 py-3 text-center">{{ locale === 'ar' ? 'الحالة' : 'Status' }}</th>
                <th scope="col" class="px-4 py-3 text-end">{{ locale === 'ar' ? 'الإجراءات' : 'Actions' }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
              <tr
                v-for="req in requestsData?.requests"
                :key="req.id"
                class="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
              >
                <!-- Request ID -->
                <td class="px-4 py-3">
                  <NuxtLink
                    :to="localePath(`/admin/services/requests/${req.id}`)"
                    class="font-mono text-xs font-bold text-[#2B71AE] hover:underline dark:text-blue-400"
                  >
                    #{{ req.id.slice(-6).toUpperCase() }}
                  </NuxtLink>
                </td>

                <!-- Service Name -->
                <td class="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                  {{ locale === 'ar' ? (req.service?.nameAr || req.service?.nameEn) : req.service?.nameEn }}
                </td>

                <!-- Date -->
                <td class="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                  {{ formatDate(req.submittedAt) }}
                </td>

                <!-- Status Badge -->
                <td class="px-4 py-3 text-center">
                  <AdminStatusBadge :status="req.status" size="sm" />
                </td>

                <!-- Action Button -->
                <td class="px-4 py-3 text-end">
                  <NuxtLink
                    :to="localePath(`/admin/services/requests/${req.id}`)"
                    class="inline-flex h-8 items-center gap-1 rounded px-2.5 text-xs font-semibold text-[#2B71AE] transition-colors hover:bg-[#2B71AE]/10 dark:text-blue-400 dark:hover:bg-blue-950/50"
                  >
                    <Eye class="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{{ locale === 'ar' ? 'عرض الطلب' : 'Review' }}</span>
                  </NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty State -->
        <div v-if="!requestsData?.requests?.length" class="p-8">
          <AdminEmptyState
            :title="hasReqFilters ? (locale === 'ar' ? 'لا توجد طلبات مطابقة للفلاتر' : 'No requests matching filters') : (locale === 'ar' ? 'لا توجد طلبات خدمات بعد' : 'No service requests yet')"
            :description="hasReqFilters ? (locale === 'ar' ? 'جرب تغيير معايير التصفية.' : 'Try changing your status filter.') : (locale === 'ar' ? 'طلبات الصيانة والاستفسارات المقدمة من العملاء ستظهر هنا.' : 'Client engineering inquiries submitted from the public site will arrive here.')"
            :icon="Inbox"
          >
            <template #action>
              <button
                v-if="hasReqFilters"
                type="button"
                class="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                @click="resetReqFilters"
              >
                <RotateCcw class="h-3.5 w-3.5" aria-hidden="true" />
                <span>{{ locale === 'ar' ? 'إلغاء الفلاتر' : 'Reset filters' }}</span>
              </button>
            </template>
          </AdminEmptyState>
        </div>

        <AdminPagination
          :page="requestsPage"
          :pages="requestsData?.pages || 1"
          :total="requestsData?.total || 0"
          :item-name="locale === 'ar' ? 'طلب' : 'requests'"
          @change="gotoRequestsPage"
        />
      </div>
    </div>

    <!-- Create Service Modal Dialog -->
    <div
      v-if="showServiceModal"
      class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      @click.self="showServiceModal = false"
    >
      <div
        class="my-8 max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-lg border bg-white p-6 shadow-xl transition-all dark:bg-[#162032]"
        :style="{ borderColor: 'var(--color-border)' }"
      >
        <!-- Modal Header -->
        <div class="mb-5 flex items-center justify-between border-b pb-4" :style="{ borderColor: 'var(--color-border)' }">
          <div>
            <h2 class="font-heading text-lg font-bold text-slate-900 dark:text-slate-100">
              {{ locale === 'ar' ? 'إضافة خدمة جديدة' : 'Add Service' }}
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              {{ locale === 'ar' ? 'تحديد الاسم والوصف وحالة التفعيل' : 'Configure names, description, and visibility' }}
            </p>
          </div>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            :aria-label="locale === 'ar' ? 'إغلاق النافذة' : 'Close modal'"
            @click="showServiceModal = false"
          >
            <X class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <!-- Form Error Banner -->
        <div
          v-if="serviceFormError"
          role="alert"
          class="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
        >
          {{ serviceFormError }}
        </div>

        <!-- Form Body -->
        <div class="space-y-4">
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Name (EN) *</span>
              <input v-model="serviceForm.nameEn" type="text" required placeholder="e.g. PLC Systems" class="h-10 w-full rounded-md border bg-transparent px-3 text-sm transition-colors focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20" :style="{ borderColor: 'var(--color-border)' }" />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Name (AR) *</span>
              <input v-model="serviceForm.nameAr" type="text" required placeholder="مثال: أنظمة PLC" dir="rtl" class="h-10 w-full rounded-md border bg-transparent px-3 text-sm transition-colors focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20" :style="{ borderColor: 'var(--color-border)' }" />
            </label>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Description (EN)</span>
              <textarea v-model="serviceForm.descriptionEn" rows="3" class="w-full rounded-md border bg-transparent p-2.5 text-xs transition-colors focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20" :style="{ borderColor: 'var(--color-border)' }" />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Description (AR)</span>
              <textarea v-model="serviceForm.descriptionAr" rows="3" dir="rtl" class="w-full rounded-md border bg-transparent p-2.5 text-xs transition-colors focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20" :style="{ borderColor: 'var(--color-border)' }" />
            </label>
          </div>

          <label class="block">
            <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ locale === 'ar' ? 'مسار الأيقونة (اختياري)' : 'Icon Path (Optional)' }}</span>
            <input v-model="serviceForm.iconPath" type="text" placeholder="/icons/plc.svg" class="h-10 w-full rounded-md border bg-transparent px-3 text-sm transition-colors focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20" :style="{ borderColor: 'var(--color-border)' }" />
          </label>

          <div class="flex flex-wrap items-center justify-between gap-4 border-t pt-4" :style="{ borderColor: 'var(--color-border)' }">
            <label class="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              <input v-model="serviceForm.isActive" type="checkbox" class="h-4 w-4 rounded accent-[#2B71AE]" />
              <span>{{ locale === 'ar' ? 'خدمة نشطة وظاهرة للعملاء' : 'Active and visible to clients' }}</span>
            </label>

            <label class="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              <span>{{ locale === 'ar' ? 'الترتيب:' : 'Sort order:' }}</span>
              <input v-model.number="serviceForm.sortOrder" type="number" class="h-8 w-20 rounded border bg-transparent px-2 text-center text-xs" :style="{ borderColor: 'var(--color-border)' }" />
            </label>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="mt-6 flex items-center justify-end gap-2.5 border-t pt-4" :style="{ borderColor: 'var(--color-border)' }">
          <button
            type="button"
            class="h-9 rounded-md border px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            @click="showServiceModal = false"
          >
            {{ locale === 'ar' ? 'إلغاء' : 'Cancel' }}
          </button>
          <button
            type="button"
            :disabled="savingService"
            class="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#2B71AE] px-5 text-xs font-semibold text-white shadow-xs hover:bg-[#285E8E] disabled:opacity-50"
            @click="saveService"
          >
            <span>{{ savingService ? (locale === 'ar' ? 'جاري الحفظ…' : 'Saving…') : (locale === 'ar' ? 'حفظ الخدمة' : 'Save Service') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
