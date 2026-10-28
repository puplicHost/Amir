<script setup lang="ts">
import {
  Loader2,
  Pencil,
  Plus,
  Star,
  Trash2,
  Wrench,
  X,
} from 'lucide-vue-next'
import { SERVICE_SECTIONS, centsToEur, eurToCents } from '~~/shared/booking'


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
  nameEn: '',
  description: '',
  descriptionEn: '',
  priceEur: '',
  durationMin: 30,
  needsDurationReview: true,
  sortOrder: 0,
  isActive: true,
  featuredOnHomepage: false,
})

const editingServiceId = ref<string | null>(null)

// Cover image staging (uploaded after the service is saved, like categories).
const coverFile = ref<File | null>(null)
const coverPreview = ref<string | null>(null)
const coverRemoved = ref(false)
const uploadingCover = ref(false)

function openCreateService() {
  editingServiceId.value = null
  const maxSort = Math.max(0, ...((services.value || []).map((s: any) => s.sortOrder ?? 0)))
  Object.assign(serviceForm, {
    section: 'DAMEN',
    slug: '',
    name: '',
    nameEn: '',
    description: '',
    descriptionEn: '',
    priceEur: '',
    durationMin: 30,
    needsDurationReview: true,
    sortOrder: maxSort + 1,
    isActive: true,
    featuredOnHomepage: false,
  })
  coverFile.value = null
  coverPreview.value = null
  coverRemoved.value = false
  serviceFormError.value = ''
  showServiceModal.value = true
}

function openEditService(s: any) {
  editingServiceId.value = s.id
  Object.assign(serviceForm, {
    section: s.section || 'DAMEN',
    slug: s.slug || '',
    name: s.name || '',
    nameEn: s.nameEn || '',
    description: s.description || '',
    descriptionEn: s.descriptionEn || '',
    priceEur: s.priceAbCents !== undefined && s.priceAbCents !== null ? (Number(s.priceAbCents) / 100).toFixed(2) : '',
    durationMin: s.durationMin ?? 30,
    needsDurationReview: s.needsDurationReview !== false,
    sortOrder: s.sortOrder ?? 0,
    isActive: s.isActive !== false,
    featuredOnHomepage: s.featuredOnHomepage === true,
  })
  coverFile.value = null
  coverPreview.value = s.coverImagePath || null
  coverRemoved.value = false
  serviceFormError.value = ''
  showServiceModal.value = true
}

function onCoverChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    const msg = locale.value === 'ar' ? 'حجم الصورة يجب ألا يتجاوز 5 ميجابايت' : 'Image size must be 5MB or less.'
    serviceFormError.value = msg
    toast.warning(
      locale.value === 'ar' ? 'ملف كبير' : 'File too large',
      msg,
    )
    return
  }
  coverFile.value = file
  coverPreview.value = URL.createObjectURL(file)
  coverRemoved.value = false
}

function clearCover() {
  coverFile.value = null
  coverPreview.value = null
  coverRemoved.value = true
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
      nameEn: serviceForm.nameEn.trim() || undefined,
      description: serviceForm.description.trim() || undefined,
      descriptionEn: serviceForm.descriptionEn.trim() || undefined,
      priceAbCents: cents,
      durationMin: serviceForm.durationMin,
      needsDurationReview: serviceForm.needsDurationReview,
      sortOrder: serviceForm.sortOrder,
      isActive: serviceForm.isActive,
      featuredOnHomepage: serviceForm.featuredOnHomepage,
    }
    let id = editingServiceId.value
    if (id) {
      await $fetch(`/api/admin/services/${id}`, {
        method: 'PUT',
        body,
      })
    }
    else {
      const created = await $fetch<any>('/api/admin/services', {
        method: 'POST',
        body,
      })
      id = created?.id
    }
    if (id && coverFile.value) {
      const fd = new FormData()
      fd.append('cover', coverFile.value)
      await $fetch(`/api/admin/services/${id}/cover`, {
        method: 'POST',
        body: fd,
      })
    }
    else if (id && coverRemoved.value && editingServiceId.value) {
      await $fetch(`/api/admin/services/${id}/cover`, { method: 'DELETE' })
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
const canConfigServices = useAdminCan('services.manage')

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

const togglingFeaturedId = ref<string | null>(null)
async function toggleFeatured(service: any) {
  if (togglingFeaturedId.value === service.id) return
  togglingFeaturedId.value = service.id
  const next = !(service.featuredOnHomepage === true)
  try {
    await $fetch(`/api/admin/services/${service.id}`, {
      method: 'PUT',
      body: { showOnHome: next, featuredOnHomepage: next },
    })
    service.featuredOnHomepage = next
    toast.success(
      locale.value === 'ar' ? 'تم تحديث التمييز' : 'Featured Status Updated',
      locale.value === 'ar' ? `خدمة "${service.name}" أصبحت ${next ? 'مميزة بالرئيسية' : 'غير مميزة'}.` : `Service is now ${next ? 'featured' : 'not featured'}.`,
    )
  }
  catch (e: any) {
    toast.error(
      locale.value === 'ar' ? 'فشل التحديث' : 'Update Failed',
      e?.data?.message || 'Failed to update service',
    )
  }
  finally {
    togglingFeaturedId.value = null
  }
}

</script>

<template>
  <div>
    <!-- Page Header -->
<div class="mb-4 flex flex-wrap items-center justify-end gap-2">
      <button
          v-if="canConfigServices"
          type="button"
          class="inline-flex h-11 items-center gap-1.5 rounded-md bg-primary px-4 text-xs font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          @click="openCreateService"
        >
          <Plus class="h-4 w-4" aria-hidden="true" />
          <span>{{ locale === 'ar' ? 'إضافة خدمة' : 'Add Service' }}</span>
        </button>
    </div>

    <!-- Services grouped by section -->
    <div class="space-y-6">
      <section v-for="group in grouped" :key="group.section" :aria-label="group.section">
        <h2 class="mb-2 font-heading text-sm font-bold tracking-wide text-neutral-900 dark:text-neutral-100 sm:text-base">
          {{ group.section }}
          <span class="ms-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            {{ group.items.length }}
          </span>
        </h2>

        <div class="overflow-hidden rounded-md border bg-white shadow-xs dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
          <div class="overflow-x-auto">
            <table class="w-full min-w-[760px] text-start text-sm">
              <thead class="sticky top-0 z-10">
                <tr class="border-b bg-neutral-50/75 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:bg-neutral-800/40 dark:text-neutral-400" :style="{ borderColor: 'var(--color-border)' }">
                  <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'اسم الخدمة' : 'Service' }}</th>
                  <th scope="col" class="px-4 py-3 text-center">{{ t('services.priceAb') }}</th>
                  <th scope="col" class="px-4 py-3 text-center">{{ t('services.duration') }}</th>
                  <th scope="col" class="px-4 py-3 text-center">{{ locale === 'ar' ? 'الحالة' : 'Status' }}</th>
                  <th scope="col" class="px-4 py-3 text-center">{{ locale === 'ar' ? 'مميز بالرئيسية' : 'Featured' }}</th>
                  <th scope="col" class="px-4 py-3 text-center">{{ t('services.sortOrder') }}</th>
                  <th scope="col" class="px-4 py-3 text-end">{{ locale === 'ar' ? 'الإجراءات' : 'Actions' }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                <tr
                  v-for="s in group.items"
                  :key="s.id"
                  class="transition-colors even:bg-neutral-50/50 even:dark:bg-neutral-800/30 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40"
                >
                  <!-- Service Name -->
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <img
                        v-if="s.coverImagePath"
                        :src="s.coverImagePath"
                        :alt="s.name"
                        class="h-11 w-10 shrink-0 rounded-md border object-cover"
                        :style="{ borderColor: 'var(--color-border)' }"
                      />
                      <div v-else class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary dark:bg-neutral-950/50 dark:text-neutral-400">
                        <ServiceSectionIcon :section="s.section" class="h-5 w-5" />
                      </div>
                      <div>
                        <p class="font-semibold text-neutral-900 dark:text-neutral-100">{{ s.name }}</p>
                        <p class="font-mono text-[11px] text-neutral-400 dark:text-neutral-500">{{ s.slug }}</p>
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
                  <td class="px-4 py-3 text-center font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    {{ centsToEur(Number(s.priceAbCents || 0)) }}
                  </td>

                  <!-- Duration -->
                  <td class="px-4 py-3 text-center text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    {{ s.durationMin }} {{ t('services.minutes') }}
                  </td>

                  <!-- Active Toggle -->
                  <td class="px-4 py-3 text-center">
                    <span
                      v-if="!canConfigServices"
                      class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      :class="s.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-neutral-100 text-neutral-600 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400'"
                    >
                      <span class="h-1.5 w-1.5 rounded-full" :class="s.isActive ? 'bg-emerald-500' : 'bg-neutral-400'" />
                      <span>{{ s.isActive ? (locale === 'ar' ? 'نشط' : 'Active') : (locale === 'ar' ? 'معطل' : 'Inactive') }}</span>
                    </span>
                    <button
                      v-else
                      type="button"
                      class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors"
                      :class="s.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-neutral-100 text-neutral-600 border border-neutral-200 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400'"
                      :title="locale === 'ar' ? 'اضغط لتبديل حالة التفعيل' : 'Click to toggle visibility'"
                      @click="toggleActive(s)" :aria-label="locale === 'ar' ? 'اضغط لتبديل حالة التفعيل' : 'Click to toggle visibility'">
                      <span class="h-1.5 w-1.5 rounded-full" :class="s.isActive ? 'bg-emerald-500' : 'bg-neutral-400'" />
                      <span>{{ s.isActive ? (locale === 'ar' ? 'نشط' : 'Active') : (locale === 'ar' ? 'معطل' : 'Inactive') }}</span>
                    </button>
                  </td>

                  <!-- Featured Toggle -->
                  <td class="px-4 py-3 text-center">
                    <button
                      v-if="canConfigServices"
                      type="button"
                      :disabled="togglingFeaturedId === s.id"
                      class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition hover:scale-105 active:scale-95 disabled:opacity-50"
                      :class="s.featuredOnHomepage
                        ? 'bg-primary/10 text-primary border border-primary/30 dark:bg-primary/15 dark:text-primary'
                        : 'bg-neutral-100 text-neutral-400 border border-neutral-200 hover:text-primary hover:border-primary/30 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700'"
                      :title="locale === 'ar' ? (s.featuredOnHomepage ? 'مميز بالرئيسية (اضغط للإلغاء)' : 'غير مميز (اضغط للتمييز بالرئيسية)') : (s.featuredOnHomepage ? 'Featured on home (click to toggle)' : 'Not featured (click to feature)')"
                      @click="toggleFeatured(s)" :aria-label="locale === 'ar' ? (s.featuredOnHomepage ? 'مميز بالرئيسية (اضغط للإلغاء)' : 'غير مميز (اضغط للتمييز بالرئيسية)') : (s.featuredOnHomepage ? 'Featured on home (click to toggle)' : 'Not featured (click to feature)')">
                      <Loader2 v-if="togglingFeaturedId === s.id" class="h-3 w-3 animate-spin text-primary" aria-hidden="true" />
                      <Star v-else class="h-3 w-3" :class="s.featuredOnHomepage ? 'fill-primary text-primary' : 'text-neutral-400'" aria-hidden="true" />
                      <span>{{ s.featuredOnHomepage ? (locale === 'ar' ? 'مميز' : 'Featured') : (locale === 'ar' ? 'غير مميز' : 'Standard') }}</span>
                    </button>
                    <span
                      v-else
                      class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                      :class="s.featuredOnHomepage
                        ? 'bg-primary/10 text-primary border border-primary/30 dark:bg-primary/15 dark:text-primary'
                        : 'bg-neutral-100 text-neutral-400 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700'"
                    >
                      <Star class="h-3 w-3" :class="s.featuredOnHomepage ? 'fill-primary text-primary' : 'text-neutral-400'" aria-hidden="true" />
                      <span>{{ s.featuredOnHomepage ? (locale === 'ar' ? 'مميز' : 'Featured') : (locale === 'ar' ? 'غير مميز' : 'Standard') }}</span>
                    </span>
                  </td>

                  <!-- Sort -->
                  <td class="px-4 py-3 text-center font-mono text-xs text-neutral-500 dark:text-neutral-400">
                    {{ s.sortOrder }}
                  </td>

                  <!-- Actions -->
                  <td class="px-4 py-3 text-end">
                    <div class="flex items-center justify-end gap-1">
                      <button
                        v-if="canConfigServices"
                        type="button"
                        class="inline-flex h-11 w-8 items-center justify-center rounded text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
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
                        class="inline-flex h-11 w-8 items-center justify-center rounded text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-rose-400 dark:hover:bg-rose-950/40"
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
@keydown.escape="showServiceModal = false"
    >
      <div
        class="my-8 max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-lg border bg-white p-6 shadow-xl transition dark:bg-neutral-900"
        :style="{ borderColor: 'var(--color-border)' }"
      >
        <!-- Modal Header -->
        <div class="mb-5 flex items-center justify-between border-b pb-4" :style="{ borderColor: 'var(--color-border)' }">
          <div>
            <h2 class="font-heading text-lg font-bold text-neutral-900 dark:text-neutral-100">
              {{ editingServiceId ? (locale === 'ar' ? 'تعديل الخدمة' : 'Edit Service') : (locale === 'ar' ? 'إضافة خدمة جديدة' : 'Add Service') }}
            </h2>
            <p class="text-xs text-neutral-500 dark:text-neutral-400">
              {{ locale === 'ar' ? 'تحديد الاسم والوصف وحالة التفعيل' : 'Configure names, description, and visibility' }}
            </p>
          </div>
          <button
            type="button"
            class="flex h-11 w-8 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
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
              <span class="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('services.section') }} *</span>
              <select v-model="serviceForm.section" class="h-11 w-full rounded-md border bg-transparent px-3 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" :style="{ borderColor: 'var(--color-border)' }">
                <option v-for="sec in SERVICE_SECTIONS" :key="sec" :value="sec">{{ sec }}</option>
              </select>
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('services.slugOpt') }}</span>
              <input v-model="serviceForm.slug" type="text" placeholder="damen-waschen-foehnen-kurz" dir="ltr" class="h-11 w-full rounded-md border bg-transparent px-3 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" :style="{ borderColor: 'var(--color-border)' }" />
            </label>
          </div>

          <label class="block">
            <span class="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">Name (DE) *</span>
            <input v-model="serviceForm.name" type="text" required placeholder="Waschen, Schneiden, Föhnen, kurz" class="h-11 w-full rounded-md border bg-transparent px-3 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" :style="{ borderColor: 'var(--color-border)' }" />
          </label>

          <label class="block">
            <span class="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">Description (DE)</span>
            <textarea v-model="serviceForm.description" rows="3" class="w-full rounded-md border bg-transparent p-2.5 text-xs transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" :style="{ borderColor: 'var(--color-border)' }" />
          </label>

          <!-- AUDIT P2-11: optional English copy; blank falls back to German. -->
          <label class="block">
            <span class="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">Name (EN) — optional</span>
            <input v-model="serviceForm.nameEn" type="text" dir="ltr" placeholder="Wash, cut, blow-dry, short" class="h-11 w-full rounded-md border bg-transparent px-3 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" :style="{ borderColor: 'var(--color-border)' }" />
          </label>

          <label class="block">
            <span class="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">Description (EN) — optional</span>
            <textarea v-model="serviceForm.descriptionEn" rows="3" dir="ltr" class="w-full rounded-md border bg-transparent p-2.5 text-xs transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" :style="{ borderColor: 'var(--color-border)' }" />
          </label>

          <!-- Cover image (service card, like category covers) -->
          <div class="block">
            <span class="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ locale === 'ar' ? 'صورة الخدمة' : 'Cover image' }}</span>
            <div class="flex items-center gap-3">
              <img
                v-if="coverPreview"
                :src="coverPreview"
                alt=""
                class="h-16 w-16 rounded-md border object-cover"
                :style="{ borderColor: 'var(--color-border)' }"
              />
              <span
                v-else
                class="inline-flex h-16 w-16 items-center justify-center rounded-md border border-dashed text-neutral-400"
                :style="{ borderColor: 'var(--color-border)' }"
              >
                <Wrench class="h-5 w-5" aria-hidden="true" />
              </span>
              <div class="flex flex-col gap-2">
                <label class="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">
                  <span>{{ locale === 'ar' ? 'اختيار صورة' : 'Choose image' }}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    class="sr-only"
                    @change="onCoverChange"
                  />
                </label>
                <button
                  v-if="coverPreview"
                  type="button"
                  class="inline-flex h-11 items-center justify-center gap-1 rounded-md text-[11px] font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                  @click="clearCover"
                >
                  <Trash2 class="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{{ locale === 'ar' ? 'إزالة' : 'Remove' }}</span>
                </button>
              </div>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('services.priceAb') }} (EUR) *</span>
              <input v-model="serviceForm.priceEur" type="text" inputmode="decimal" required placeholder="46.00" dir="ltr" class="h-11 w-full rounded-md border bg-transparent px-3 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" :style="{ borderColor: 'var(--color-border)' }" />
              <span class="mt-1 block text-[11px] text-neutral-400 dark:text-neutral-500">{{ t('services.priceEurHint') }}</span>
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ t('services.duration') }} ({{ t('services.minutes') }}) *</span>
              <input v-model.number="serviceForm.durationMin" type="number" min="5" max="1440" step="5" class="h-11 w-full rounded-md border bg-transparent px-3 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" :style="{ borderColor: 'var(--color-border)' }" />
              <span class="mt-1 block text-[11px] text-neutral-400 dark:text-neutral-500">{{ t('services.durationHint') }}</span>
            </label>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-4 border-t pt-4" :style="{ borderColor: 'var(--color-border)' }">
            <div class="space-y-2">
              <label class="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                <input v-model="serviceForm.isActive" type="checkbox" class="h-4 w-4 rounded accent-primary" />
                <span>{{ locale === 'ar' ? 'خدمة نشطة وظاهرة للعملاء' : 'Active and visible to clients' }}</span>
              </label>

              <label class="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                <input v-model="serviceForm.featuredOnHomepage" type="checkbox" class="h-4 w-4 rounded accent-primary" />
                <span>{{ locale === 'ar' ? 'عرض كخدمة مميزة في الصفحة الرئيسية' : 'Feature on homepage' }}</span>
              </label>

              <label class="flex cursor-pointer items-center gap-2 text-xs font-bold text-primary">
                <input v-model="serviceForm.needsDurationReview" type="checkbox" class="h-4 w-4 rounded accent-primary" />
                <span>{{ t('services.needsReview') }}</span>
              </label>
            </div>

            <label class="inline-flex items-center gap-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">
              <span>{{ t('services.sortOrder') }}:</span>
              <input v-model.number="serviceForm.sortOrder" type="number" class="h-11 w-20 rounded border bg-transparent px-2 text-center text-xs" :style="{ borderColor: 'var(--color-border)' }" />
            </label>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="mt-6 flex items-center justify-end gap-2.5 border-t pt-4" :style="{ borderColor: 'var(--color-border)' }">
          <button
            type="button"
            class="h-11 rounded-md border px-4 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            @click="showServiceModal = false"
          >
            {{ locale === 'ar' ? 'إلغاء' : 'Cancel' }}
          </button>
          <button
            type="button"
            :disabled="savingService"
            class="inline-flex h-11 items-center gap-1.5 rounded-md bg-primary px-5 text-xs font-semibold text-on-primary shadow-xs hover:bg-primary/90 disabled:opacity-50"
            @click="saveService"
          >
            <span>{{ savingService ? (locale === 'ar' ? 'جاري الحفظ…' : 'Saving…') : (locale === 'ar' ? 'حفظ الخدمة' : 'Save Service') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
