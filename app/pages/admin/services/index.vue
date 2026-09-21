<script setup lang="ts">
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Filter,
  FolderTree,
  Inbox,
  Layers,
  RotateCcw,
  Search,
  Settings2,
  Trash2,
  Wrench,
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

// Data fetching
const { data: services, refresh: refreshServices } = await useAsyncData('admin-services', () =>
  $fetch<any[]>('/api/admin/services'),
)

const { data: requestsData, refresh: refreshRequests } = await useAsyncData('admin-requests', () =>
  $fetch<any>('/api/admin/services/requests', {
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

function switchTab(tab: 'services' | 'requests') {
  activeTab.value = tab
  router.replace({ query: { tab } })
}

// Service Actions
const deleting = ref('')
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
    />

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
                      v-if="s._count?.requests === 0"
                      type="button"
                      :disabled="deleting === s.id"
                      class="inline-flex h-8 items-center gap-1 rounded px-2 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
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

        <!-- Pagination -->
        <div
          v-if="(requestsData?.total || 0) > requestsLimit"
          class="flex items-center justify-between border-t px-4 py-3 text-xs"
          :style="{ borderColor: 'var(--color-border)' }"
        >
          <span class="text-slate-500">
            {{ locale === 'ar' ? `الصفحة ${requestsPage} (إجمالي الطلبات: ${requestsData?.total})` : `Page ${requestsPage} (${requestsData?.total} total requests)` }}
          </span>
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              class="inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
              :disabled="requestsPage <= 1"
              @click="requestsPage--"
            >
              <ChevronRight v-if="locale === 'ar'" class="h-3.5 w-3.5" aria-hidden="true" />
              <ChevronLeft v-else class="h-3.5 w-3.5" aria-hidden="true" />
              <span>{{ locale === 'ar' ? 'السابق' : 'Previous' }}</span>
            </button>
            <button
              type="button"
              class="inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
              :disabled="requestsPage * requestsLimit >= requestsData?.total"
              @click="requestsPage++"
            >
              <span>{{ locale === 'ar' ? 'التالي' : 'Next' }}</span>
              <ChevronLeft v-if="locale === 'ar'" class="h-3.5 w-3.5" aria-hidden="true" />
              <ChevronRight v-else class="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
