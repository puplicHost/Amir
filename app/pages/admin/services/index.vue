<script setup lang="ts">
import {
  Pencil,
  Plus,
  Trash2,
  Wrench,
  X,
} from 'lucide-vue-next'
import { SERVICE_SECTIONS, centsToEur, eurToCents } from '~~/shared/booking'

definePageMeta({ layout: 'admin', middleware: 'admin-auth', requiredPermission: ['services.view', 'services.config'] })

const { t, locale } = useI18n()
const toast = useAdminToast()

const fetch = useRequestFetch()

// Data fetching
const { data: services, refresh: refreshServices } = await useAsyncData('admin-services', () =>
  fetch<any[]>('/api/admin/services'),
)

const grouped = computed(() => SERVICE_SECTIONS.map(section => ({
  section,
  items: (services.value || [])
    .filter((s: any) => s.section === section)
    .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
})))

// Service Actions
const deleting = ref('')

// Create-service modal state
const showServiceModal = ref(false)
const savingService = ref(false)
const serviceFormError = ref('')
const serviceForm = reactive({
  section: 'DAMEN',
  slug: '',
  name: '',
  description: '',
  priceEur: '',
  durationMin: 30,
  needsDurationReview: true,
  sortOrder: 0,
  isActive: true,
})

const editingServiceId = ref<string | null>(null)

function openCreateService() {
  editingServiceId.value = null
  const maxSort = Math.max(0, ...((services.value || []).map((s: any) => s.sortOrder ?? 0)))
  Object.assign(serviceForm, {
    section: 'DAMEN',
    slug: '',
    name: '',
    description: '',
    priceEur: '',
    durationMin: 30,
    needsDurationReview: true,
    sortOrder: maxSort + 1,
    isActive: true,
  })
  serviceFormError.value = ''
  showServiceModal.value = true
}

function openEditService(s: any) {
  editingServiceId.value = s.id
  Object.assign(serviceForm, {
    section: s.section || 'DAMEN',
    slug: s.slug || '',
    name: s.name || '',
    description: s.description || '',
    priceEur: s.priceAbCents !== undefined && s.priceAbCents !== null ? (Number(s.priceAbCents) / 100).toFixed(2) : '',
    durationMin: s.durationMin ?? 30,
    needsDurationReview: s.needsDurationReview !== false,
    sortOrder: s.sortOrder ?? 0,
    isActive: s.isActive !== false,
  })
  serviceFormError.value = ''
  showServiceModal.value = true
}

async function saveService() {
  if (!serviceForm.name.trim()) {
    serviceFormError.value = locale.value === 'ar' ? 'اسم الخدمة مطلوب' : 'Service name is required.'
    return
  }
  const cents = eurToCents(serviceForm.priceEur)
  if (!Number.isFinite(cents)) {
    serviceFormError.value = locale.value === 'ar' ? 'يرجى إدخال سعر صحيح باليورو.' : 'Valid EUR price is required.'
    return
  }
  savingService.value = true
  serviceFormError.value = ''
  try {
    const body = {
      section: serviceForm.section,
      slug: serviceForm.slug.trim() || undefined,
      name: serviceForm.name.trim(),
      description: serviceForm.description.trim() || undefined,
      priceAbCents: cents,
      durationMin: serviceForm.durationMin,
      needsDurationReview: serviceForm.needsDurationReview,
      sortOrder: serviceForm.sortOrder,
      isActive: serviceForm.isActive,
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
      locale.value === 'ar' ? `تم حفظ خدمة "${serviceForm.name}".` : `Service "${serviceForm.name}" saved successfully.`,
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
    title: locale.value === 'ar' ? `حذف خدمة "${s.name}"؟` : `Delete service "${s.name}"?`,
    message: locale.value === 'ar' ? 'لا يمكن التراجع عن هذا الإجراء.' : 'This action cannot be undone.',
  })
  if (!ok) return
  deleting.value = s.id
  try {
    await $fetch(`/api/admin/services/${s.id}`, { method: 'DELETE' })
    await refreshServices()
    toast.success(
      locale.value === 'ar' ? 'تم حذف الخدمة' : 'Service Deleted',
      locale.value === 'ar' ? `تم حذف خدمة "${s.name}".` : `Service "${s.name}" deleted.`,
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
      body: { isActive: nextState },
    })
    await refreshServices()
    toast.success(
      locale.value === 'ar' ? 'تم تحديث الحالة' : 'Status Updated',
      locale.value === 'ar' ? `خدمة "${service.name}" الآن ${nextState ? 'نشطة' : 'معطلة'}.` : `Service "${service.name}" is now ${nextState ? 'active' : 'inactive'}.`,
    )
  }
  catch (e: any) {
    toast.error(
      locale.value === 'ar' ? 'فشل تحديث الحالة' : 'Update Failed',
      e?.data?.message || 'Error toggling service active state',
    )
  }
}

</script>

<template>
  <div>
    <!-- Page Header -->
    <AdminPageHeader
      :title="locale === 'ar' ? 'إدارة الخدمات' : 'Services'"
      :description="locale === 'ar' ? 'تكوين الخدمات المعروضة في الموقع.' : 'Configure showcased services.'"
    >
      <template #actions>
        <button
          v-if="canConfigServices"
          type="button"
          class="inline-flex h-10 items-center gap-1.5 rounded-md bg-[#F5CC07] px-4 text-xs font-semibold text-slate-950 shadow-xs transition-colors hover:bg-yellow-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5CC07]"
          @click="openCreateService"
        >
          <Plus class="h-4 w-4" aria-hidden="true" />
          <span>{{ locale === 'ar' ? 'إضافة خدمة' : 'Add Service' }}</span>
        </button>
      </template>
    </AdminPageHeader>

    <!-- Services grouped by section -->
    <div class="space-y-6">
      <section v-for="group in grouped" :key="group.section" :aria-label="group.section">
        <h2 class="mb-2 font-heading text-sm font-bold tracking-wide text-slate-900 dark:text-slate-100 sm:text-base">
          {{ group.section }}
          <span class="ms-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {{ group.items.length }}
          </span>
        </h2>

        <div class="overflow-hidden rounded-md border bg-white shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
          <div class="overflow-x-auto">
            <table class="w-full min-w-[760px] text-start text-sm">
              <thead class="sticky top-0 z-10">
                <tr class="border-b bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/40 dark:text-slate-400" :style="{ borderColor: 'var(--color-border)' }">
                  <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'اسم الخدمة' : 'Service' }}</th>
                  <th scope="col" class="px-4 py-3 text-center">{{ t('services.priceAb') }}</th>
                  <th scope="col" class="px-4 py-3 text-center">{{ t('services.duration') }}</th>
                  <th scope="col" class="px-4 py-3 text-center">{{ locale === 'ar' ? 'الحالة' : 'Status' }}</th>
                  <th scope="col" class="px-4 py-3 text-center">{{ t('services.sortOrder') }}</th>
                  <th scope="col" class="px-4 py-3 text-end">{{ locale === 'ar' ? 'الإجراءات' : 'Actions' }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
                <tr
                  v-for="s in group.items"
                  :key="s.id"
                  class="transition-colors even:bg-slate-50/50 even:dark:bg-slate-800/30 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                >
                  <!-- Service Name -->
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#2B71AE]/10 text-[#2B71AE] dark:bg-blue-950/50 dark:text-blue-400">
                        <Wrench class="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div>
                        <p class="font-semibold text-slate-900 dark:text-slate-100">{{ s.name }}</p>
                        <p class="font-mono text-[11px] text-slate-400 dark:text-slate-500">{{ s.slug }}</p>
                        <span
                          v-if="s.needsDurationReview"
                          class="mt-0.5 inline-block rounded-full bg-amber-100 px-2 py-px text-[10px] font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                        >
                          {{ t('services.needsReview') }}
                        </span>
                      </div>
                    </div>
                  </td>

                  <!-- Price ab -->
                  <td class="px-4 py-3 text-center font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                    {{ centsToEur(Number(s.priceAbCents || 0)) }}
                  </td>

                  <!-- Duration -->
                  <td class="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {{ s.durationMin }} {{ t('services.minutes') }}
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

                  <!-- Sort -->
                  <td class="px-4 py-3 text-center font-mono text-xs text-slate-500 dark:text-slate-400">
                    {{ s.sortOrder }}
                  </td>

                  <!-- Actions -->
                  <td class="px-4 py-3 text-end">
                    <div class="flex items-center justify-end gap-1">
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

                      <button
                        v-if="canConfigServices"
                        type="button"
                        :disabled="deleting === s.id"
                        class="inline-flex h-8 w-8 items-center justify-center rounded text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-rose-400 dark:hover:bg-rose-950/40"
                        :title="locale === 'ar' ? 'حذف الخدمة' : 'Delete service'"
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

          <div v-if="!group.items.length" class="p-8">
            <AdminEmptyState
              :title="locale === 'ar' ? 'لا توجد خدمات مسجلة' : 'No services available'"
              :description="t('services.groupEmpty')"
              :icon="Wrench"
            />
          </div>
        </div>
      </section>
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
              <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ t('services.section') }} *</span>
              <select v-model="serviceForm.section" class="h-10 w-full rounded-md border bg-transparent px-3 text-sm transition-colors focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20" :style="{ borderColor: 'var(--color-border)' }">
                <option v-for="sec in SERVICE_SECTIONS" :key="sec" :value="sec">{{ sec }}</option>
              </select>
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ t('services.slugOpt') }}</span>
              <input v-model="serviceForm.slug" type="text" placeholder="damen-waschen-foehnen-kurz" dir="ltr" class="h-10 w-full rounded-md border bg-transparent px-3 text-sm transition-colors focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20" :style="{ borderColor: 'var(--color-border)' }" />
            </label>
          </div>

          <label class="block">
            <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Name (DE) *</span>
            <input v-model="serviceForm.name" type="text" required placeholder="Waschen, Schneiden, Föhnen, kurz" class="h-10 w-full rounded-md border bg-transparent px-3 text-sm transition-colors focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20" :style="{ borderColor: 'var(--color-border)' }" />
          </label>

          <label class="block">
            <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Description (DE)</span>
            <textarea v-model="serviceForm.description" rows="3" class="w-full rounded-md border bg-transparent p-2.5 text-xs transition-colors focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20" :style="{ borderColor: 'var(--color-border)' }" />
          </label>

          <div class="grid gap-3 sm:grid-cols-2">
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ t('services.priceAb') }} (EUR) *</span>
              <input v-model="serviceForm.priceEur" type="text" inputmode="decimal" required placeholder="46.00" dir="ltr" class="h-10 w-full rounded-md border bg-transparent px-3 text-sm transition-colors focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20" :style="{ borderColor: 'var(--color-border)' }" />
              <span class="mt-1 block text-[11px] text-slate-400 dark:text-slate-500">{{ t('services.priceEurHint') }}</span>
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ t('services.duration') }} ({{ t('services.minutes') }}) *</span>
              <input v-model.number="serviceForm.durationMin" type="number" min="5" max="1440" step="5" class="h-10 w-full rounded-md border bg-transparent px-3 text-sm transition-colors focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20" :style="{ borderColor: 'var(--color-border)' }" />
              <span class="mt-1 block text-[11px] text-slate-400 dark:text-slate-500">{{ t('services.durationHint') }}</span>
            </label>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-4 border-t pt-4" :style="{ borderColor: 'var(--color-border)' }">
            <div class="space-y-2">
              <label class="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                <input v-model="serviceForm.isActive" type="checkbox" class="h-4 w-4 rounded accent-[#2B71AE]" />
                <span>{{ locale === 'ar' ? 'خدمة نشطة وظاهرة للعملاء' : 'Active and visible to clients' }}</span>
              </label>

              <label class="flex cursor-pointer items-center gap-2 text-xs font-bold text-amber-800 dark:text-yellow-300">
                <input v-model="serviceForm.needsDurationReview" type="checkbox" class="h-4 w-4 rounded accent-[#F5CC07]" />
                <span>{{ t('services.needsReview') }}</span>
              </label>
            </div>

            <label class="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              <span>{{ t('services.sortOrder') }}:</span>
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
