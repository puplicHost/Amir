<script setup lang="ts">
import {
  Activity,
  AlertTriangle,
  Battery,
  Check,
  CheckCircle,
  Cpu,
  Database,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Flame,
  FolderTree,
  GitBranch,
  Hammer,
  Inbox,
  Layers,
  Loader2,
  Monitor,
  Package,
  Pencil,
  Plus,
  Radio,
  RotateCcw,
  Search,
  Server,
  Settings,
  Settings2,
  Shield,
  Trash2,
  Wifi,
  Wind,
  Wrench,
  X,
  Zap,
} from 'lucide-vue-next'

// Visual icon picker options for the service card icon
const serviceIconOptions = [
  { name: 'Wrench', icon: Wrench },
  { name: 'Settings', icon: Settings },
  { name: 'Zap', icon: Zap },
  { name: 'Cpu', icon: Cpu },
  { name: 'Radio', icon: Radio },
  { name: 'Wind', icon: Wind },
  { name: 'Flame', icon: Flame },
  { name: 'Shield', icon: Shield },
  { name: 'Hammer', icon: Hammer },
  { name: 'Monitor', icon: Monitor },
  { name: 'Server', icon: Server },
  { name: 'Database', icon: Database },
  { name: 'Wifi', icon: Wifi },
  { name: 'Battery', icon: Battery },
  { name: 'GitBranch', icon: GitBranch },
  { name: 'Layers', icon: Layers },
  { name: 'Package', icon: Package },
  { name: 'Activity', icon: Activity },
  { name: 'AlertTriangle', icon: AlertTriangle },
  { name: 'CheckCircle', icon: CheckCircle },
]

// Card background color swatches (default: White)
const serviceCardColors = [
  { value: '#FFFFFF', labelAr: 'أبيض', labelEn: 'White' },
  { value: '#1e3a5f', labelAr: 'كحلي داكن', labelEn: 'Dark Blue' },
  { value: '#2B71AE', labelAr: 'أزرق', labelEn: 'Blue' },
  { value: '#1A1D2E', labelAr: 'رمادي داكن', labelEn: 'Slate' },
  { value: '#F8FAFC', labelAr: 'فاتح', labelEn: 'Light' },
  { value: '#FFFBEB', labelAr: 'أصفر فاتح', labelEn: 'Yellow tint' },
]

definePageMeta({ layout: 'admin', middleware: 'admin-auth', requiredPermission: ['services.view', 'services.config'] })

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const router = useRouter()
const toast = useAdminToast()

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

const canServicesManage = useAdminCan('services.manage')
const updatingReqId = ref<string | null>(null)

async function updateReqStatus(req: any, newStatus: string) {
  if (!canServicesManage.value || updatingReqId.value === req.id || req.status === newStatus) return
  updatingReqId.value = req.id
  try {
    await $fetch(`/api/admin/services/requests/${req.id}/status`, {
      method: 'PUT',
      body: { status: newStatus },
    })
    req.status = newStatus
    toast.success(
      locale.value === 'ar' ? 'تم تحديث الحالة' : 'Status Updated',
      locale.value === 'ar' ? `حالة الطلب #${req.id.slice(-6).toUpperCase()} أصبحت "${newStatus}".` : `Status updated to "${newStatus}".`,
    )
  }
  catch (e: any) {
    toast.error(
      locale.value === 'ar' ? 'فشل تحديث الحالة' : 'Update Failed',
      e?.data?.message || 'Failed to update status',
    )
  }
  finally {
    updatingReqId.value = null
  }
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
  iconName: '',
  cardColor: '#FFFFFF',
  tagAr: '',
  tagEn: '',
  sortOrder: 0,
  isActive: true,
  isFeatured: false,
})

const editingServiceId = ref<string | null>(null)

function openCreateService() {
  editingServiceId.value = null
  Object.assign(serviceForm, {
    nameAr: '',
    nameEn: '',
    descriptionAr: '',
    descriptionEn: '',
    iconName: '',
    cardColor: '#FFFFFF',
    tagAr: '',
    tagEn: '',
    sortOrder: (services.value?.length || 0) + 1,
    isActive: true,
  })
  serviceFormError.value = ''
  showServiceModal.value = true
}

function openEditService(s: any) {
  editingServiceId.value = s.id
  Object.assign(serviceForm, {
    nameAr: s.nameAr || '',
    nameEn: s.nameEn || '',
    descriptionAr: s.descriptionAr || '',
    descriptionEn: s.descriptionEn || '',
    iconName: s.iconName || '',
    cardColor: s.cardColor || '#FFFFFF',
    tagAr: s.tagAr || '',
    tagEn: s.tagEn || '',
    sortOrder: s.sortOrder ?? 0,
    isActive: s.isActive !== false,
    isFeatured: Boolean(s.isFeatured),
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
    const body = {
      nameAr: serviceForm.nameAr,
      nameEn: serviceForm.nameEn,
      descriptionAr: serviceForm.descriptionAr || undefined,
      descriptionEn: serviceForm.descriptionEn || undefined,
      iconName: serviceForm.iconName || undefined,
      cardColor: serviceForm.cardColor || undefined,
      tagAr: serviceForm.tagAr.trim() || undefined,
      tagEn: serviceForm.tagEn.trim() || undefined,
      sortOrder: serviceForm.sortOrder,
      isActive: serviceForm.isActive,
      isFeatured: serviceForm.isFeatured,
    }
    if (editingServiceId.value) {
      await $fetch(`/api/admin/services/${editingServiceId.value}`, {
        method: 'PUT',
        body,
      })
    }
    else {
      await $fetch('/api/admin/services', {
        method: 'POST',
        body,
      })
    }
    showServiceModal.value = false
    await refreshServices()
    toast.success(
      editingServiceId.value
        ? (locale.value === 'ar' ? 'تم تحديث الخدمة' : 'Service Updated')
        : (locale.value === 'ar' ? 'تمت إضافة الخدمة' : 'Service Added'),
      locale.value === 'ar' ? `تم حفظ خدمة "${serviceForm.nameAr || serviceForm.nameEn}".` : `Service "${serviceForm.nameEn}" saved successfully.`,
    )
  }
  catch (e: any) {
    serviceFormError.value = e?.data?.message || 'Save failed'
    toast.error(
      locale.value === 'ar' ? 'فشل حفظ الخدمة' : 'Save Failed',
      serviceFormError.value,
    )
  }
  finally {
    savingService.value = false
  }
}

const { confirm: confirmDialog } = useAdminConfirm()
const canConfigServices = useAdminCan('services.config')

async function deleteService(s: any) {
  const ok = await confirmDialog({
    title: locale.value === 'ar' ? `حذف خدمة "${s.nameAr || s.nameEn}"؟` : `Delete service "${s.nameEn}"?`,
    message: locale.value === 'ar' ? 'لا يمكن التراجع عن هذا الإجراء.' : 'This action cannot be undone.',
  })
  if (!ok) return
  deleting.value = s.id
  try {
    await $fetch(`/api/admin/services/${s.id}`, { method: 'DELETE' })
    await refreshServices()
    toast.success(
      locale.value === 'ar' ? 'تم حذف الخدمة' : 'Service Deleted',
      locale.value === 'ar' ? `تم حذف خدمة "${s.nameAr || s.nameEn}".` : `Service "${s.nameEn}" deleted.`,
    )
  }
  catch (e: any) {
    toast.error(
      locale.value === 'ar' ? 'فشل حذف الخدمة' : 'Delete Failed',
      e?.data?.message || 'Error deleting service',
    )
  }
  finally {
    deleting.value = ''
  }
}

async function toggleActive(service: any) {
  try {
    const nextState = !service.isActive
    await $fetch(`/api/admin/services/${service.id}`, {
      method: 'PUT',
      body: { ...service, isActive: nextState },
    })
    await refreshServices()
    toast.success(
      locale.value === 'ar' ? 'تم تحديث الحالة' : 'Status Updated',
      locale.value === 'ar' ? `خدمة "${service.nameAr || service.nameEn}" الآن ${nextState ? 'نشطة' : 'معطلة'}.` : `Service "${service.nameEn}" is now ${nextState ? 'active' : 'inactive'}.`,
    )
  }
  catch (e: any) {
    toast.error(
      locale.value === 'ar' ? 'فشل تحديث الحالة' : 'Update Failed',
      e?.data?.message || 'Error toggling service active state',
    )
  }
}

async function toggleFeatured(service: any) {
  if (!canConfigServices.value) return
  try {
    const nextState = !service.isFeatured
    await $fetch(`/api/admin/services/${service.id}`, {
      method: 'PUT',
      body: { ...service, isFeatured: nextState },
    })
    await refreshServices()
    toast.success(
      locale.value === 'ar' ? 'تم تحديث حالة التمييز' : 'Featured Status Updated',
      locale.value === 'ar' ? (nextState ? `تم تمييز خدمة "${service.nameAr || service.nameEn}" كإعلان ممول.` : `تم إلغاء تمييز خدمة "${service.nameAr || service.nameEn}".`) : `Service "${service.nameEn}" featured status updated.`,
    )
  }
  catch (e: any) {
    toast.error(
      locale.value === 'ar' ? 'فشل تحديث حالة التمييز' : 'Update Failed',
      e?.data?.message || 'Error toggling service featured state',
    )
  }
}

// Copy service landing page link for sharing (Change 13)
const copiedServiceId = ref<string | null>(null)
async function copyLandingLink(service: any) {
  if (typeof window === 'undefined') return
  const identifier = service.slug || service.id
  const landingUrl = `${window.location.origin}/services/${identifier}`
  try {
    await navigator.clipboard.writeText(landingUrl)
    copiedServiceId.value = service.id
    toast.success(
      locale.value === 'ar' ? 'تم نسخ رابط صفحة الهبوط' : 'Landing Page Link Copied',
      locale.value === 'ar' ? `رابط صفحة الخدمة جاهز للمشاركة: ${landingUrl}` : `Shareable link: ${landingUrl}`,
    )
    setTimeout(() => {
      if (copiedServiceId.value === service.id) copiedServiceId.value = null
    }, 2500)
  }
  catch {
    toast.error('Failed to copy link')
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
          v-if="activeTab === 'services' && canConfigServices"
          type="button"
          class="inline-flex h-10 items-center gap-1.5 rounded-md bg-[#F5CC07] px-4 text-xs font-semibold text-slate-950 shadow-xs transition-colors hover:bg-yellow-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5CC07]"
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
      <!-- Settings Note for Featured Services (Change 13) -->
      <div class="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-yellow-900/40 dark:bg-yellow-950/20 dark:text-yellow-200">
        <Sparkles class="h-4 w-4 text-[#F5CC07] shrink-0" />
        <span>{{ locale === 'ar' ? 'الخدمات الممولة تظهر في مقدمة القائمة وبإطار مميز على الصفحة الرئيسية وصفحة الخدمات.' : 'Featured services float to the front of the catalog with a distinctive highlighted badge and border.' }}</span>
      </div>

      <div class="overflow-hidden rounded-md border bg-white shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[760px] text-start text-sm">
            <thead class="sticky top-0 z-10">
              <tr class="border-b bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/40 dark:text-slate-400" :style="{ borderColor: 'var(--color-border)' }">
                <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'اسم الخدمة' : 'Service' }}</th>
                <th scope="col" class="px-4 py-3 text-center">{{ locale === 'ar' ? 'الحالة' : 'Status' }}</th>
                <th scope="col" class="px-4 py-3 text-center">{{ locale === 'ar' ? 'إعلان ممول' : 'Sponsored' }}</th>
                <th scope="col" class="px-4 py-3 text-center">{{ locale === 'ar' ? 'حقول النموذج' : 'Form Fields' }}</th>
                <th scope="col" class="px-4 py-3 text-center">{{ locale === 'ar' ? 'الطلبات' : 'Requests' }}</th>
                <th scope="col" class="px-4 py-3 text-end">{{ locale === 'ar' ? 'الإجراءات' : 'Actions' }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
              <tr
                v-for="s in services"
                :key="s.id"
                class="transition-colors even:bg-slate-50/50 even:dark:bg-slate-800/30 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
              >
                <!-- Service Name -->
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <div class="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#2B71AE]/10 text-[#2B71AE] dark:bg-blue-950/50 dark:text-blue-400">
                      <Wrench class="h-5 w-5" aria-hidden="true" />
                      <!-- Yellow dot indicator when featured (Change 13) -->
                      <span
                        v-if="s.isFeatured"
                        class="absolute -top-1 -end-1 flex h-3 w-3 items-center justify-center rounded-full bg-[#F5CC07] text-[8px] text-slate-950 font-bold shadow-xs ring-2 ring-white dark:ring-slate-900"
                        title="خدمة مميزة"
                      >
                        ★
                      </span>
                    </div>
                    <div>
                      <div class="flex items-center gap-1.5">
                        <p class="font-semibold text-slate-900 dark:text-slate-100">{{ s.nameEn }}</p>
                        <span v-if="s.isFeatured" class="h-2 w-2 rounded-full bg-[#F5CC07]" title="إعلان ممول" />
                      </div>
                      <p class="text-xs text-slate-500 dark:text-slate-400">{{ s.nameAr }}</p>
                    </div>
                  </div>
                </td>

                <!-- Active Toggle -->
                <td class="px-4 py-3 text-center">
                  <span
                    v-if="!canConfigServices"
                    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    :class="s.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400'"
                  >
                    <span class="h-1.5 w-1.5 rounded-full" :class="s.isActive ? 'bg-emerald-500' : 'bg-slate-400'" />
                    <span>{{ s.isActive ? (locale === 'ar' ? 'نشط' : 'Active') : (locale === 'ar' ? 'معطل' : 'Inactive') }}</span>
                  </span>
                  <button
                    v-else
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

                <!-- Featured Toggle & Share Link (Change 13) -->
                <td class="px-4 py-3 text-center">
                  <div class="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold transition-all active:scale-95"
                      :class="s.isFeatured ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-yellow-950/60 dark:text-yellow-300 dark:border-yellow-700' : 'bg-slate-100 text-slate-500 border border-slate-200 hover:border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'"
                      :title="locale === 'ar' ? 'اضغط لتبديل تمييز الخدمة (إعلان ممول)' : 'Toggle featured status'"
                      @click="toggleFeatured(s)"
                    >
                      <span>★</span>
                      <span>{{ s.isFeatured ? (locale === 'ar' ? 'مميز' : 'Featured') : (locale === 'ar' ? 'عادي' : 'Standard') }}</span>
                    </button>

                    <!-- Share Landing Link Button (↗) -->
                    <button
                      type="button"
                      class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-[#2B71AE] hover:text-[#2B71AE] dark:border-slate-700 dark:bg-[#162032] dark:text-slate-300 dark:hover:border-[#F5CC07] dark:hover:text-[#F5CC07] transition-all active:scale-90"
                      :title="locale === 'ar' ? 'نسخ رابط صفحة الهبوط الإعلانية (↗)' : 'Copy landing page link (↗)'"
                      @click="copyLandingLink(s)"
                    >
                      <Check v-if="copiedServiceId === s.id" class="h-3.5 w-3.5 text-emerald-500 stroke-[3]" />
                      <ExternalLink v-else class="h-3.5 w-3.5" />
                    </button>
                  </div>
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
                  <div class="flex items-center justify-end gap-1">
                    <!-- Share Landing Link in Actions -->
                    <button
                      type="button"
                      class="inline-flex h-8 w-8 items-center justify-center rounded text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                      :title="locale === 'ar' ? 'نسخ رابط صفحة الهبوط الإعلانية' : 'Copy landing page link'"
                      :aria-label="locale === 'ar' ? 'نسخ رابط صفحة الهبوط الإعلانية' : 'Copy landing page link'"
                      @click="copyLandingLink(s)"
                    >
                      <Check v-if="copiedServiceId === s.id" class="h-4 w-4 text-emerald-500 stroke-[3]" />
                      <ExternalLink v-else class="h-4 w-4" />
                    </button>

                    <button
                      v-if="canConfigServices"
                      type="button"
                      class="inline-flex h-8 w-8 items-center justify-center rounded text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                      :title="locale === 'ar' ? 'تعديل الخدمة' : 'Edit service'"
                      :aria-label="locale === 'ar' ? 'تعديل الخدمة' : 'Edit service'"
                      @click="openEditService(s)"
                    >
                      <Pencil class="h-4 w-4" aria-hidden="true" />
                    </button>

                    <NuxtLink
                      v-if="canConfigServices"
                      :to="localePath(`/admin/services/${s.id}/form`)"
                      :title="locale === 'ar' ? 'تعديل النموذج' : 'Form Builder'"
                      :aria-label="locale === 'ar' ? 'تعديل النموذج' : 'Form Builder'"
                      class="inline-flex h-8 w-8 items-center justify-center rounded text-[#2B71AE] transition-colors hover:bg-[#2B71AE]/10 dark:text-blue-400 dark:hover:bg-blue-950/50"
                    >
                      <Settings2 class="h-4 w-4" aria-hidden="true" />
                    </NuxtLink>

                    <button
                      v-if="canConfigServices"
                      type="button"
                      :disabled="deleting === s.id || (s._count?.requests || 0) > 0"
                      class="inline-flex h-8 w-8 items-center justify-center rounded text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-rose-400 dark:hover:bg-rose-950/40"
                      :title="(s._count?.requests || 0) > 0 ? (locale === 'ar' ? 'لا يمكن الحذف: توجد طلبات مرتبطة بهذه الخدمة' : 'Cannot delete: this service has submitted requests') : (locale === 'ar' ? 'حذف الخدمة' : 'Delete service')"
                      :aria-label="locale === 'ar' ? 'حذف الخدمة' : 'Delete service'"
                      @click="deleteService(s)"
                    >
                      <Trash2 class="h-4 w-4" aria-hidden="true" />
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
            <option value="pending">pending (جديد)</option>
            <option value="reviewed">reviewed (قيد المراجعة)</option>
            <option value="contacted">contacted (تم التواصل)</option>
            <option value="closed">closed (مغلق)</option>
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
            <thead class="sticky top-0 z-10">
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
                class="transition-colors even:bg-slate-50/50 even:dark:bg-slate-800/30 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
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

                <!-- Status Select (1-click quick update) -->
                <td class="px-4 py-3 text-center">
                  <div v-if="canServicesManage" class="inline-flex items-center justify-center gap-1.5">
                    <Loader2 v-if="updatingReqId === req.id" class="h-3.5 w-3.5 animate-spin text-[#2B71AE]" />
                    <select
                      :value="req.status.toLowerCase()"
                      :disabled="updatingReqId === req.id"
                      class="h-8 rounded-md border bg-white px-2 text-xs font-semibold focus:border-[#2B71AE] focus:outline-none dark:bg-[#162032] transition-colors disabled:opacity-50"
                      :style="{ borderColor: 'var(--color-border)' }"
                      @change="updateReqStatus(req, ($event.target as HTMLSelectElement).value)"
                    >
                      <option value="pending">{{ locale === 'ar' ? 'جديد (Pending)' : 'Pending' }}</option>
                      <option value="reviewed">{{ locale === 'ar' ? 'تمت المراجعة (Reviewed)' : 'Reviewed' }}</option>
                      <option value="contacted">{{ locale === 'ar' ? 'تم التواصل (Contacted)' : 'Contacted' }}</option>
                      <option value="closed">{{ locale === 'ar' ? 'مغلق (Closed)' : 'Closed' }}</option>
                    </select>
                  </div>
                  <AdminStatusBadge v-else :status="req.status" size="sm" />
                </td>

                <!-- Action Button -->
                <td class="px-4 py-3 text-end">
                  <NuxtLink
                    :to="localePath(`/admin/services/requests/${req.id}`)"
                    :title="locale === 'ar' ? 'عرض الطلب' : 'Review'"
                    :aria-label="locale === 'ar' ? 'عرض الطلب' : 'Review'"
                    class="inline-flex h-8 w-8 items-center justify-center rounded text-[#2B71AE] transition-colors hover:bg-[#2B71AE]/10 dark:text-blue-400 dark:hover:bg-blue-950/50"
                  >
                    <Eye class="h-4 w-4" aria-hidden="true" />
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
              {{ editingServiceId ? (locale === 'ar' ? 'تعديل الخدمة' : 'Edit Service') : (locale === 'ar' ? 'إضافة خدمة جديدة' : 'Add Service') }}
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

          <div>
            <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ locale === 'ar' ? 'الأيقونة' : 'Icon' }}</span>
            <div class="grid grid-cols-4 gap-2 overflow-y-auto rounded-md border p-2" style="max-height: 200px; border-color: var(--color-border)">
              <button
                v-for="opt in serviceIconOptions"
                :key="opt.name"
                type="button"
                :title="opt.name"
                :aria-label="opt.name"
                :aria-pressed="serviceForm.iconName === opt.name"
                class="flex h-12 w-12 items-center justify-center rounded-lg border transition-colors"
                :class="serviceForm.iconName === opt.name ? 'border-[#2B71AE] bg-[#2B71AE]/10 text-[#2B71AE]' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200'"
                @click="serviceForm.iconName = opt.name"
              >
                <component :is="opt.icon" class="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <p class="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{{ serviceForm.iconName || (locale === 'ar' ? 'لم تُختر أيقونة' : 'No icon selected') }}</p>
          </div>

          <div>
            <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ locale === 'ar' ? 'لون الكارت' : 'Card color' }}</span>
            <div class="flex items-center gap-2.5">
              <button
                v-for="c in serviceCardColors"
                :key="c.value"
                type="button"
                :title="locale === 'ar' ? c.labelAr : c.labelEn"
                :aria-label="locale === 'ar' ? c.labelAr : c.labelEn"
                :aria-pressed="serviceForm.cardColor === c.value"
                class="h-8 w-8 rounded-full border border-slate-300 transition-transform hover:scale-110 dark:border-slate-600"
                :style="{ backgroundColor: c.value }"
                :class="serviceForm.cardColor === c.value ? 'ring-2 ring-offset-2 ring-primary' : ''"
                @click="serviceForm.cardColor = c.value"
              />
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ locale === 'ar' ? 'تصنيف قصير (اختياري)' : 'Short tag (optional)' }}</span>
              <input v-model="serviceForm.tagAr" type="text" maxlength="20" placeholder="مثال: صيانة صناعية" dir="rtl" class="h-10 w-full rounded-md border bg-transparent px-3 text-sm transition-colors focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20" :style="{ borderColor: 'var(--color-border)' }" />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Short tag (optional)</span>
              <input v-model="serviceForm.tagEn" type="text" maxlength="20" placeholder="e.g. Industrial" class="h-10 w-full rounded-md border bg-transparent px-3 text-sm transition-colors focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20" :style="{ borderColor: 'var(--color-border)' }" />
            </label>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-4 border-t pt-4" :style="{ borderColor: 'var(--color-border)' }">
            <div class="space-y-2">
              <label class="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                <input v-model="serviceForm.isActive" type="checkbox" class="h-4 w-4 rounded accent-[#2B71AE]" />
                <span>{{ locale === 'ar' ? 'خدمة نشطة وظاهرة للعملاء' : 'Active and visible to clients' }}</span>
              </label>

              <label class="flex cursor-pointer items-center gap-2 text-xs font-bold text-amber-800 dark:text-yellow-300">
                <input v-model="serviceForm.isFeatured" type="checkbox" class="h-4 w-4 rounded accent-[#F5CC07]" />
                <span>★ {{ locale === 'ar' ? 'تمييز الخدمة (إعلان ممول)' : 'Feature service (Sponsored)' }}</span>
              </label>
            </div>

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
            class="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#F5CC07] px-5 text-xs font-semibold text-slate-950 shadow-xs hover:bg-yellow-400 disabled:opacity-50"
            @click="saveService"
          >
            <span>{{ savingService ? (locale === 'ar' ? 'جاري الحفظ…' : 'Saving…') : (locale === 'ar' ? 'حفظ الخدمة' : 'Save Service') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
