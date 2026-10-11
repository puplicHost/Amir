<script setup lang="ts">
import {
  Image as ImageIcon,
  Megaphone,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-vue-next'
import { BANNER_PLACEMENTS, BANNER_STATIC_LINKS, BANNER_WIDTHS } from '~~/shared/constants/banners'

definePageMeta({ layout: 'admin', middleware: 'admin-auth', requiredPermission: 'banners.manage' })

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const router = useRouter()
const toast = useAdminToast()
const fetch = useRequestFetch()

const activeTab = ref<'banners' | 'announcements' | 'ticker'>((route.query.tab as any) || 'banners')
function switchTab(tab: 'banners' | 'announcements' | 'ticker') {
  activeTab.value = tab
  router.replace({ query: { tab } })
}

// ── Banners list ────────────────────────────────────────────────
const { data: bannersData, refresh: refreshBanners } = await useAsyncData('admin-banners', () =>
  fetch<{ banners: any[] }>('/api/admin/banners'),
)
const banners = computed(() => bannersData.value?.banners || [])
const deleting = ref('')

// ── Live link-target options (products, categories, static) ──
const { data: catsData } = await useAsyncData('banner-form-categories', () =>
  fetch<{ categories: { slug: string, nameAr: string, nameEn: string }[] }>('/api/categories'),
)
const { data: productsData } = await useAsyncData('banner-form-products', () =>
  fetch<{ products: { id: string, slug: string, nameAr: string, nameEn: string }[] }>('/api/products?limit=100'),
)

const linkOptions = computed(() => [
  ...BANNER_STATIC_LINKS.map(l => ({ ...l })),
  ...(catsData.value?.categories || []).map(c => ({
    type: 'category',
    value: `/products/${c.slug}`,
    labelEn: `Category: ${c.nameEn}`,
    labelAr: `فئة: ${c.nameAr}`,
  })),
  ...(productsData.value?.products || []).map(p => ({
    type: 'product',
    value: `/p/${p.slug}`,
    labelEn: `Product: ${p.nameEn}`,
    labelAr: `منتج: ${p.nameAr}`,
  })),
])

// ── Banner form (modal) ─────────────────────────────────────────
const showModal = ref(false)
const editing = ref<any | null>(null)
const saving = ref(false)
const uploading = ref(false)
const formError = ref('')
const form = reactive({
  titleAr: '',
  titleEn: '',
  descriptionAr: '',
  descriptionEn: '',
  backgroundImagePath: '',
  buttonTextAr: '',
  buttonTextEn: '',
  buttonLinkValue: '',
  backgroundColor: '#0B1520',
  textColor: '#FFFFFF',
  placement: 'below_services' as string,
  widthPercent: 100,
  sortOrder: 0,
  isActive: true,
})

function openCreate() {
  editing.value = null
  Object.assign(form, {
    titleAr: '',
    titleEn: '',
    descriptionAr: '',
    descriptionEn: '',
    backgroundImagePath: '',
    buttonTextAr: '',
    buttonTextEn: '',
    buttonLinkValue: '',
    backgroundColor: '#0B1520',
    textColor: '#FFFFFF',
    placement: 'below_services',
    widthPercent: 100,
    sortOrder: (banners.value.length || 0) + 1,
    isActive: true,
  })
  formError.value = ''
  showModal.value = true
}

function openEdit(b: any) {
  editing.value = b
  Object.assign(form, {
    titleAr: b.titleAr || '',
    titleEn: b.titleEn || '',
    descriptionAr: b.descriptionAr || '',
    descriptionEn: b.descriptionEn || '',
    backgroundImagePath: b.backgroundImagePath || '',
    buttonTextAr: b.buttonTextAr || '',
    buttonTextEn: b.buttonTextEn || '',
    buttonLinkValue: b.buttonLinkValue || '',
    backgroundColor: b.backgroundColor || '#0B1520',
    textColor: b.textColor || '#FFFFFF',
    placement: b.placement || 'below_services',
    widthPercent: b.widthPercent || 100,
    sortOrder: b.sortOrder ?? 0,
    isActive: b.isActive !== false,
  })
  formError.value = ''
  showModal.value = true
}

async function onImageChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await $fetch<{ path: string }>('/api/admin/banners/upload', { method: 'POST', body: fd })
    form.backgroundImagePath = res.path
  }
  catch (err: any) {
    toast.error(
      locale.value === 'ar' ? 'فشل رفع الصورة' : 'Upload Failed',
      err?.data?.message || 'Upload failed',
    )
  }
  finally {
    uploading.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}

async function saveBanner() {
  if (!form.titleAr.trim() || !form.titleEn.trim()) {
    formError.value = locale.value === 'ar' ? 'عنوان البانر باللغتين مطلوب.' : 'Banner title (AR/EN) is required.'
    return
  }
  const link = linkOptions.value.find(o => o.value === form.buttonLinkValue)
  saving.value = true
  formError.value = ''
  try {
    const body = {
      titleAr: form.titleAr.trim(),
      titleEn: form.titleEn.trim(),
      descriptionAr: form.descriptionAr.trim() || undefined,
      descriptionEn: form.descriptionEn.trim() || undefined,
      backgroundImagePath: form.backgroundImagePath || undefined,
      buttonTextAr: form.buttonTextAr.trim() || undefined,
      buttonTextEn: form.buttonTextEn.trim() || undefined,
      buttonLinkType: link ? link.type : undefined,
      buttonLinkValue: form.buttonLinkValue || undefined,
      backgroundColor: form.backgroundColor || undefined,
      textColor: form.textColor || undefined,
      placement: form.placement,
      widthPercent: form.widthPercent,
      sortOrder: form.sortOrder,
      isActive: form.isActive,
    }
    if (editing.value) {
      await $fetch(`/api/admin/banners/${editing.value.id}`, { method: 'PUT', body })
    }
    else {
      await $fetch('/api/admin/banners', { method: 'POST', body })
    }
    showModal.value = false
    await refreshBanners()
    toast.success(locale.value === 'ar' ? 'تم حفظ البانر' : 'Banner Saved')
  }
  catch (e: any) {
    formError.value = e?.data?.message || 'Save failed'
  }
  finally {
    saving.value = false
  }
}

const { confirm: confirmDialog } = useAdminConfirm()

async function deleteBanner(b: any) {
  const label = locale.value === 'ar' ? (b.titleAr || b.titleEn) : (b.titleEn || b.titleAr)
  const ok = await confirmDialog({
    title: locale.value === 'ar' ? `حذف البانر "${label}"؟` : `Delete banner "${label}"?`,
    message: locale.value === 'ar' ? 'لا يمكن التراجع عن هذا الإجراء.' : 'This action cannot be undone.',
  })
  if (!ok) return
  deleting.value = b.id
  try {
    await $fetch(`/api/admin/banners/${b.id}`, { method: 'DELETE' })
    await refreshBanners()
    toast.success(locale.value === 'ar' ? 'تم حذف البانر' : 'Banner Deleted')
  }
  catch (e: any) {
    toast.error(locale.value === 'ar' ? 'فشل الحذف' : 'Delete Failed', e?.data?.message)
  }
  finally {
    deleting.value = ''
  }
}

async function toggleActive(b: any) {
  try {
    await $fetch(`/api/admin/banners/${b.id}`, { method: 'PUT', body: { isActive: !b.isActive } })
    await refreshBanners()
  }
  catch (e: any) {
    toast.error(locale.value === 'ar' ? 'فشل التحديث' : 'Update Failed', e?.data?.message)
  }
}

function placementLabel(v: string) {
  const p = BANNER_PLACEMENTS.find(x => x.value === v)
  if (!p) return v
  return locale.value === 'ar' ? p.labelAr : p.labelEn
}

// ── Ticker sub-tab ──────────────────────────────────────────────
const tickerForm = reactive({ textAr: '', textEn: '', active: false, speed: 30 })
const tickerLoading = ref(false)
const { data: tickerData, refresh: refreshTicker } = await useAsyncData('admin-ticker', () =>
  fetch<{ tickerTextAr: string | null, tickerTextEn: string | null, tickerActive: boolean, tickerSpeed: number }>('/api/admin/settings'),
)
watch(tickerData, (d) => {
  if (!d) return
  tickerForm.textAr = d.tickerTextAr || ''
  tickerForm.textEn = d.tickerTextEn || ''
  tickerForm.active = !!d.tickerActive
  tickerForm.speed = d.tickerSpeed || 30
}, { immediate: true })

async function saveTicker() {
  tickerLoading.value = true
  try {
    await $fetch('/api/admin/settings/ticker', {
      method: 'PUT',
      body: { tickerTextAr: tickerForm.textAr, tickerTextEn: tickerForm.textEn, tickerActive: tickerForm.active, tickerSpeed: tickerForm.speed },
    })
    await refreshTicker()
    toast.success(locale.value === 'ar' ? 'تم حفظ الشريط الإعلاني' : 'Ticker Saved')
  }
  catch (e: any) {
    toast.error(locale.value === 'ar' ? 'فشل الحفظ' : 'Save Failed', e?.data?.message)
  }
  finally {
    tickerLoading.value = false
  }
}

const inputCls = 'h-10 w-full rounded-md border bg-white px-3 text-xs transition-colors focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520]'
</script>

<template>
  <div>
    <AdminPageHeader
      :title="locale === 'ar' ? 'البنرات الإعلانية' : 'Banners'"
      :description="locale === 'ar' ? 'إدارة البنرات الترويجية في الصفحة الرئيسية والشريط الإعلاني المتحرك.' : 'Manage homepage promotional banners and the scrolling announcement ticker.'"
    >
      <template #actions>
        <button
          v-if="activeTab === 'banners'"
          type="button"
          class="inline-flex h-10 items-center gap-1.5 rounded-md bg-[#F5CC07] px-4 text-xs font-semibold text-slate-950 shadow-xs transition-colors hover:bg-yellow-400"
          @click="openCreate"
        >
          <Plus class="h-4 w-4" aria-hidden="true" />
          <span>{{ locale === 'ar' ? 'إضافة بانر' : 'Add Banner' }}</span>
        </button>
      </template>
    </AdminPageHeader>

    <!-- Tabs -->
    <div class="mb-6 flex border-b" :style="{ borderColor: 'var(--color-border)' }">
      <button
        type="button"
        class="inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors"
        :class="activeTab === 'banners' ? 'border-[#2B71AE] text-[#2B71AE] dark:border-[#F5CC07] dark:text-[#F5CC07]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
        @click="switchTab('banners')"
      >
        <ImageIcon class="h-4 w-4" aria-hidden="true" />
        <span>{{ locale === 'ar' ? 'البنرات الترويجية' : 'Banners' }}</span>
        <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">{{ banners.length }}</span>
      </button>

      <button
        type="button"
        class="inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors"
        :class="activeTab === 'announcements' ? 'border-[#2B71AE] text-[#2B71AE] dark:border-[#F5CC07] dark:text-[#F5CC07]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
        @click="switchTab('announcements')"
      >
        <Megaphone class="h-4 w-4" aria-hidden="true" />
        <span>{{ locale === 'ar' ? 'شريط الإشعارات المتتابعة (العلوي)' : 'Top Announcement Bar' }}</span>
      </button>

      <button
        type="button"
        class="inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors"
        :class="activeTab === 'ticker' ? 'border-[#2B71AE] text-[#2B71AE] dark:border-[#F5CC07] dark:text-[#F5CC07]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'"
        @click="switchTab('ticker')"
      >
        <Megaphone class="h-4 w-4" aria-hidden="true" />
        <span>{{ locale === 'ar' ? 'الشريط الإعلاني المتحرك' : 'Announcement Ticker' }}</span>
      </button>
    </div>

    <!-- Banners list -->
    <div v-if="activeTab === 'banners'">
      <div class="overflow-hidden rounded-md border bg-white shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[720px] text-start text-sm">
            <thead class="sticky top-0 z-10">
              <tr class="border-b bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/40 dark:text-slate-400" :style="{ borderColor: 'var(--color-border)' }">
                <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'البانر' : 'Banner' }}</th>
                <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'الموضع' : 'Placement' }}</th>
                <th scope="col" class="px-4 py-3 text-center">{{ locale === 'ar' ? 'العرض' : 'Width' }}</th>
                <th scope="col" class="px-4 py-3 text-center">{{ locale === 'ar' ? 'الحالة' : 'Status' }}</th>
                <th scope="col" class="px-4 py-3 text-end">{{ locale === 'ar' ? 'الإجراءات' : 'Actions' }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
              <tr v-for="bn in banners" :key="bn.id" class="transition-colors even:bg-slate-50/50 even:dark:bg-slate-800/30 hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <div class="h-10 w-16 shrink-0 overflow-hidden rounded border bg-slate-100 dark:bg-slate-800" :style="{ borderColor: 'var(--color-border)' }">
                      <img v-if="bn.backgroundImagePath" :src="bn.backgroundImagePath" alt="" class="h-full w-full object-cover" loading="lazy" />
                      <ImageIcon v-else class="mx-auto mt-2 h-5 w-5 text-slate-400" />
                    </div>
                    <div>
                      <p class="font-semibold text-slate-900 dark:text-slate-100">{{ locale === 'ar' ? (bn.titleAr || bn.titleEn) : (bn.titleEn || bn.titleAr) }}</p>
                      <p class="text-[11px] text-slate-500">#{{ bn.sortOrder }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{{ placementLabel(bn.placement) }}</td>
                <td class="px-4 py-3 text-center font-mono text-xs">{{ bn.widthPercent }}%</td>
                <td class="px-4 py-3 text-center">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors"
                    :class="bn.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'"
                    @click="toggleActive(bn)"
                  >
                    <span class="h-1.5 w-1.5 rounded-full" :class="bn.isActive ? 'bg-emerald-500' : 'bg-slate-400'" />
                    <span>{{ bn.isActive ? (locale === 'ar' ? 'نشط' : 'Active') : (locale === 'ar' ? 'معطل' : 'Inactive') }}</span>
                  </button>
                </td>
                <td class="px-4 py-3 text-end">
                  <div class="flex items-center justify-end gap-1">
                    <button type="button" :title="locale === 'ar' ? 'تعديل' : 'Edit'" :aria-label="locale === 'ar' ? 'تعديل' : 'Edit'" class="inline-flex h-8 w-8 items-center justify-center rounded text-[#2B71AE] transition-colors hover:bg-[#2B71AE]/10 dark:text-blue-400 dark:hover:bg-blue-950/50" @click="openEdit(bn)">
                      <Pencil class="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button type="button" :disabled="deleting === bn.id" :title="locale === 'ar' ? 'حذف' : 'Delete'" :aria-label="locale === 'ar' ? 'حذف' : 'Delete'" class="inline-flex h-8 w-8 items-center justify-center rounded text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-40 dark:text-rose-400 dark:hover:bg-rose-950/40" @click="deleteBanner(bn)">
                      <Trash2 class="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="!banners.length" class="p-8 text-center text-xs text-slate-500">
          {{ locale === 'ar' ? 'لا توجد بنرات بعد. أضف أول بانر.' : 'No banners yet. Add your first banner.' }}
        </div>
      </div>
    </div>

    <!-- Tab 2: Top Announcement Bar Carousel (Change 11 & 12) -->
    <div v-else-if="activeTab === 'announcements'">
      <AdminSettingsAnnouncements />
    </div>

    <!-- Tab 3: Ticker sub-tab -->
    <div v-else-if="activeTab === 'ticker'">
      <form class="max-w-2xl space-y-4 rounded-md border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }" @submit.prevent="saveTicker">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Ticker Text (EN)</span>
            <input v-model="tickerForm.textEn" type="text" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" placeholder="Willkommen im AMIR Studio" />
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Ticker Text (AR)</span>
            <input v-model="tickerForm.textAr" type="text" dir="rtl" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" placeholder="شحن مجاني للطلبات فوق 1000 جنيه" />
          </label>
        </div>
        <div class="flex flex-wrap items-center gap-6">
          <label class="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
            <input v-model="tickerForm.active" type="checkbox" class="h-4 w-4 rounded accent-[#2B71AE]" />
            <span>{{ locale === 'ar' ? 'تفعيل الشريط' : 'Ticker active' }}</span>
          </label>
          <label class="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
            <span>{{ locale === 'ar' ? 'سرعة التمرير (ثانية):' : 'Scroll duration (s):' }}</span>
            <input v-model.number="tickerForm.speed" type="number" min="5" max="120" class="h-8 w-20 rounded border bg-transparent px-2 text-center text-xs" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
        </div>
        <button type="submit" :disabled="tickerLoading" class="inline-flex h-10 items-center gap-2 rounded-md bg-[#F5CC07] px-6 text-xs font-semibold text-slate-950 hover:bg-yellow-400 disabled:opacity-50">
          <span>{{ tickerLoading ? (locale === 'ar' ? 'جاري الحفظ…' : 'Saving…') : (locale === 'ar' ? 'حفظ الشريط' : 'Save Ticker') }}</span>
        </button>
      </form>
    </div>

    <!-- Banner modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs" role="dialog" aria-modal="true" @click.self="showModal = false">
      <div class="my-8 max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-lg border bg-white p-6 shadow-xl dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
        <div class="mb-5 flex items-center justify-between border-b pb-4" :style="{ borderColor: 'var(--color-border)' }">
          <h2 class="font-heading text-lg font-bold text-slate-900 dark:text-slate-100">
            {{ editing ? (locale === 'ar' ? 'تعديل البانر' : 'Edit Banner') : (locale === 'ar' ? 'إضافة بانر' : 'Add Banner') }}
          </h2>
          <button type="button" class="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" @click="showModal = false">
            <X class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div v-if="formError" role="alert" class="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          {{ formError }}
        </div>
        <div class="space-y-4">
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Title (EN) *</span>
              <input v-model="form.titleEn" type="text" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Title (AR) *</span>
              <input v-model="form.titleAr" type="text" dir="rtl" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
            </label>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Description (EN)</span>
              <textarea v-model="form.descriptionEn" rows="2" :class="inputCls" class="h-auto py-2" :style="{ borderColor: 'var(--color-border)' }" />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Description (AR)</span>
              <textarea v-model="form.descriptionAr" rows="2" dir="rtl" :class="inputCls" class="h-auto py-2" :style="{ borderColor: 'var(--color-border)' }" />
            </label>
          </div>
          <div>
            <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ locale === 'ar' ? 'صورة الخلفية' : 'Background Image' }}</span>
            <div class="flex items-center gap-3">
              <div class="h-14 w-24 shrink-0 overflow-hidden rounded-md border bg-slate-50 dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }">
                <img v-if="form.backgroundImagePath" :src="form.backgroundImagePath" alt="" class="h-full w-full object-cover" loading="lazy" />
                <ImageIcon v-else class="mx-auto mt-4 h-5 w-5 text-slate-400" />
              </div>
              <label class="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                <UploadCloud class="h-3.5 w-3.5" aria-hidden="true" />
                <span>{{ uploading ? '…' : (locale === 'ar' ? 'رفع صورة' : 'Upload') }}</span>
                <input type="file" accept="image/*" class="hidden" @change="onImageChange" />
              </label>
            </div>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ locale === 'ar' ? 'نص الزر (EN، اختياري)' : 'Button Text (EN, optional)' }}</span>
              <input v-model="form.buttonTextEn" type="text" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ locale === 'ar' ? 'نص الزر (AR، اختياري)' : 'Button Text (AR, optional)' }}</span>
              <input v-model="form.buttonTextAr" type="text" dir="rtl" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
            </label>
          </div>
          <label class="block">
            <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ locale === 'ar' ? 'رابط الزر (يُبنى تلقائياً من صفحات الموقع)' : 'Button Link (auto-built from live site pages)' }}</span>
            <select v-model="form.buttonLinkValue" class="h-10 w-full rounded-md border bg-transparent px-3 text-sm focus:border-[#2B71AE] focus:outline-none" :style="{ borderColor: 'var(--color-border)' }">
              <option value="">{{ locale === 'ar' ? 'بدون زر' : 'No button' }}</option>
              <option v-for="o in linkOptions" :key="o.type + o.value" :value="o.value">
                {{ locale === 'ar' ? o.labelAr : o.labelEn }}
              </option>
            </select>
          </label>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ locale === 'ar' ? 'لون خلفية البانر (اختياري)' : 'Banner Background Color' }}</span>
              <div class="flex items-center gap-2">
                <input v-model="form.backgroundColor" type="color" class="h-9 w-9 cursor-pointer rounded border border-slate-300 p-0.5" />
                <input v-model="form.backgroundColor" type="text" placeholder="#0B1520" dir="ltr" :class="inputCls" />
              </div>
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ locale === 'ar' ? 'لون نصوص البانر (اختياري)' : 'Banner Text Color' }}</span>
              <div class="flex items-center gap-2">
                <input v-model="form.textColor" type="color" class="h-9 w-9 cursor-pointer rounded border border-slate-300 p-0.5" />
                <input v-model="form.textColor" type="text" placeholder="#FFFFFF" dir="ltr" :class="inputCls" />
              </div>
            </label>
          </div>
          <div class="grid gap-3 sm:grid-cols-3">
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ locale === 'ar' ? 'موضع العرض' : 'Placement' }}</span>
              <select v-model="form.placement" class="h-10 w-full rounded-md border bg-transparent px-3 text-sm focus:border-[#2B71AE] focus:outline-none" :style="{ borderColor: 'var(--color-border)' }">
                <option v-for="pl in BANNER_PLACEMENTS" :key="pl.value" :value="pl.value">
                  {{ locale === 'ar' ? pl.labelAr : pl.labelEn }}
                </option>
              </select>
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ locale === 'ar' ? 'العرض' : 'Width' }}</span>
              <select v-model.number="form.widthPercent" class="h-10 w-full rounded-md border bg-transparent px-3 text-sm focus:border-[#2B71AE] focus:outline-none" :style="{ borderColor: 'var(--color-border)' }">
                <option v-for="w in BANNER_WIDTHS" :key="w" :value="w">{{ w }}%</option>
              </select>
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ locale === 'ar' ? 'الترتيب' : 'Order' }}</span>
              <input v-model.number="form.sortOrder" type="number" class="h-10 w-full rounded-md border bg-transparent px-3 text-sm" :style="{ borderColor: 'var(--color-border)' }" />
            </label>
          </div>
          <label class="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
            <input v-model="form.isActive" type="checkbox" class="h-4 w-4 rounded accent-[#2B71AE]" />
            <span>{{ locale === 'ar' ? 'بانر نشط وظاهر' : 'Active and visible' }}</span>
          </label>
        </div>
        <div class="mt-6 flex items-center justify-end gap-2.5 border-t pt-4" :style="{ borderColor: 'var(--color-border)' }">
          <button type="button" class="h-9 rounded-md border px-4 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" @click="showModal = false">
            {{ locale === 'ar' ? 'إلغاء' : 'Cancel' }}
          </button>
          <button type="button" :disabled="saving" class="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#F5CC07] px-5 text-xs font-semibold text-slate-950 hover:bg-yellow-400 disabled:opacity-50" @click="saveBanner">
            <span>{{ saving ? (locale === 'ar' ? 'جاري الحفظ…' : 'Saving…') : (locale === 'ar' ? 'حفظ البانر' : 'Save Banner') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
