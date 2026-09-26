<script setup lang="ts">
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  File,
  FileText,
  Globe,
  Image as ImageIcon,
  Layers,
  Play,
  Plus,
  Save,
  Tag,
  Trash2,
  UploadCloud,
  Video,
} from 'lucide-vue-next'

interface Category {
  id: string
  nameAr: string
  nameEn: string
  slug: string
}
interface Attr {
  keyAr: string
  keyEn: string
  valueAr: string
  valueEn: string
}
interface ProductImage {
  id?: string
  path: string
  file?: File
  sortOrder: number
  isCover: boolean
}
interface ProductVideo {
  id?: string
  type: string
  url: string
  file?: File
}
interface ProductDocument {
  id?: string
  labelAr: string
  labelEn: string
  filePath: string
  fileType: string
  sortOrder: number
  file?: File
}
interface Existing {
  id: string
  nameAr: string
  nameEn: string
  slug: string
  descriptionAr: string | null
  descriptionEn: string | null
  price: string | number
  compareAtPrice: string | number | null
  categoryId: string
  isActive: boolean
  attributes: Attr[]
  seo: Record<string, string | null> | null
  images: ProductImage[]
  video?: ProductVideo | null
  documents?: ProductDocument[]
}

const props = defineProps<{ existing?: Existing | null }>()

const { t, locale } = useI18n()
const localePath = useLocalePath()
const fetch = useRequestFetch()
const toast = useAdminToast()

const { data: catData } = await useAsyncData('product-form-categories', () =>
  fetch<{ categories: Category[] }>('/api/categories'),
)

const step = ref(1)
const error = ref('')
const stepErrors = ref<Record<number, string>>({})
const saving = ref(false)

const form = reactive({
  nameAr: props.existing?.nameAr || '',
  nameEn: props.existing?.nameEn || '',
  slug: props.existing?.slug || '',
  categoryId: props.existing?.categoryId || '',
  descriptionAr: props.existing?.descriptionAr || '',
  descriptionEn: props.existing?.descriptionEn || '',
  isActive: props.existing?.isActive ?? true,
  price: props.existing ? String(props.existing.price) : '',
  compareAtPrice: props.existing?.compareAtPrice ? String(props.existing.compareAtPrice) : '',
  attributes: (props.existing?.attributes || []).map(a => ({ ...a })),
  metaTitleAr: props.existing?.seo?.metaTitleAr || '',
  metaTitleEn: props.existing?.seo?.metaTitleEn || '',
  metaDescriptionAr: props.existing?.seo?.metaDescriptionAr || '',
  metaDescriptionEn: props.existing?.seo?.metaDescriptionEn || '',
  keywords: props.existing?.seo?.keywords || '',
  geoContent: props.existing?.seo?.geoContent || '',
})

// Local state for media (purely client-collected until single final save)
const localImages = ref<ProductImage[]>([
  ...(props.existing?.images || []).map((img, idx) => ({ ...img, isCover: idx === 0 })),
])
const deletedImageIds = ref<string[]>([])

const video = ref<ProductVideo | null>(props.existing?.video ? { ...props.existing.video } : null)
const videoMode = ref<'url' | 'upload'>('url')
const videoUrlInput = ref('')
const removeVideoOnSave = ref(false)

const localDocuments = ref<ProductDocument[]>([
  ...(props.existing?.documents || []).map(d => ({ ...d })),
])
const deletedDocIds = ref<string[]>([])
const docFile = ref<File | null>(null)
const docLabelEn = ref('')
const docLabelAr = ref('')

const isEditMode = computed(() => Boolean(props.existing?.id))

const steps = computed(() => [
  { id: 1, label: locale.value === 'ar' ? 'المعلومات الأساسية' : 'Basic info', icon: Layers },
  { id: 2, label: locale.value === 'ar' ? 'التسعير' : 'Pricing', icon: Tag },
  { id: 3, label: locale.value === 'ar' ? 'المواصفات' : 'Attributes', icon: Plus },
  { id: 4, label: locale.value === 'ar' ? 'الصور والوسائط' : 'Images & Media', icon: ImageIcon },
  { id: 5, label: locale.value === 'ar' ? 'السيو والذكاء الاصطناعي' : 'SEO & AI', icon: Globe },
])

function validateStep(s: number, silent = false): boolean {
  delete stepErrors.value[s]
  if (!silent) error.value = ''

  if (s === 1) {
    if (!form.nameAr.trim() || !form.nameEn.trim() || !form.categoryId) {
      const msg = locale.value === 'ar' ? 'الاسم باللغتين واختيار الفئة حقول مطلوبة.' : 'Name (AR/EN) and category are required.'
      stepErrors.value[1] = msg
      if (!silent) error.value = msg
      return false
    }
  }

  if (s === 2) {
    const price = Number(form.price)
    if (!form.price || !Number.isFinite(price) || price < 0) {
      const msg = locale.value === 'ar' ? 'يرجى إدخال سعر صحيح للمنتج.' : 'Valid price is required.'
      stepErrors.value[2] = msg
      if (!silent) error.value = msg
      return false
    }
    if (form.compareAtPrice !== '') {
      const c = Number(form.compareAtPrice)
      if (!Number.isFinite(c) || c <= price) {
        const msg = locale.value === 'ar' ? 'سعر المقارنة (قبل الخصم) يجب أن يكون أكبر من السعر الفعلي.' : 'Compare-at price must be greater than active price.'
        stepErrors.value[2] = msg
        if (!silent) error.value = msg
        return false
      }
    }
  }

  if (s === 3) {
    for (const a of form.attributes) {
      const hasAny = a.keyEn.trim() || a.keyAr.trim() || a.valueEn.trim() || a.valueAr.trim()
      if (hasAny) {
        if ((!a.keyEn.trim() && !a.keyAr.trim()) || (!a.valueEn.trim() && !a.valueAr.trim())) {
          const msg = locale.value === 'ar' ? 'يرجى إكمال اسم وقيمة المواصفة المدخلة.' : 'Please enter both attribute name and value.'
          stepErrors.value[3] = msg
          if (!silent) error.value = msg
          return false
        }
      }
    }
  }

  return true
}

function validateAll(): boolean {
  stepErrors.value = {}
  error.value = ''

  for (let s = 1; s <= 5; s++) {
    validateStep(s, true)
  }

  const invalidSteps = Object.keys(stepErrors.value).map(Number).sort((a, b) => a - b)
  if (invalidSteps.length > 0) {
    const firstInvalid = invalidSteps[0]
    step.value = firstInvalid
    error.value = stepErrors.value[firstInvalid]
    toast.error(
      locale.value === 'ar' ? `خطأ في بيانات الخطوة ${firstInvalid}` : `Validation Error in Step ${firstInvalid}`,
      error.value,
    )
    return false
  }

  return true
}

function next() {
  if (validateStep(step.value)) {
    step.value = Math.min(5, step.value + 1)
    error.value = ''
  }
}

function goToStep(s: number) {
  // Free movement between steps, clearing current error
  step.value = s
  error.value = stepErrors.value[s] || ''
}

function addAttr() {
  form.attributes.push({ keyAr: '', keyEn: '', valueAr: '', valueEn: '' })
}

// Media: Images
function onFiles(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files || [])
  if (!files.length) return
  error.value = ''

  const oversized = files.filter(f => f.size > 5 * 1024 * 1024)
  if (oversized.length) {
    const msg = locale.value === 'ar' ? 'حجم كل صورة يجب ألا يتجاوز 5 ميجابايت.' : 'Each image must be 5MB or less.'
    error.value = msg
    toast.warning(msg)
    return
  }

  for (const f of files) {
    const url = URL.createObjectURL(f)
    localImages.value.push({
      path: url,
      file: f,
      sortOrder: localImages.value.length + 1,
      isCover: localImages.value.length === 0,
    })
  }

  ;(e.target as HTMLInputElement).value = ''
}

function removeImage(index: number) {
  const item = localImages.value[index]
  if (item.id) {
    deletedImageIds.value.push(item.id)
  }
  localImages.value.splice(index, 1)
  // Ensure first image is cover
  localImages.value.forEach((img, i) => {
    img.isCover = i === 0
    img.sortOrder = i + 1
  })
}

function moveImage(index: number, dir: -1 | 1) {
  const j = index + dir
  if (j < 0 || j >= localImages.value.length) return
  const temp = localImages.value[index]
  localImages.value[index] = localImages.value[j]
  localImages.value[j] = temp
  localImages.value.forEach((img, i) => {
    img.isCover = i === 0
    img.sortOrder = i + 1
  })
}

// Media: Video
function getEmbedUrl(url: string, type: string): string {
  if (type === 'youtube') {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`
    }
    return url
  }
  if (type === 'vimeo') {
    const regExp = /vimeo\.com\/(\d+)/
    const match = url.match(regExp)
    if (match && match[1]) {
      return `https://player.vimeo.com/video/${match[1]}`
    }
    return url
  }
  return url
}

function attachVideoUrl() {
  const url = videoUrlInput.value.trim()
  if (!url) return
  const isVimeo = /vimeo\.com/.test(url)
  video.value = {
    type: isVimeo ? 'vimeo' : 'youtube',
    url,
  }
  removeVideoOnSave.value = false
  videoUrlInput.value = ''
}

function onVideoFileUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.size > 50 * 1024 * 1024) {
    const msg = locale.value === 'ar' ? 'حجم ملف الفيديو يجب ألا يتجاوز 50 ميجابايت.' : 'Video file must be 50MB or less.'
    error.value = msg
    toast.warning(msg)
    return
  }
  const previewUrl = URL.createObjectURL(file)
  video.value = {
    type: 'upload',
    url: previewUrl,
    file,
  }
  removeVideoOnSave.value = false
  ;(e.target as HTMLInputElement).value = ''
}

function removeVideo() {
  video.value = null
  removeVideoOnSave.value = true
}

// Media: Documents
function onDocFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    docFile.value = file
    if (!docLabelEn.value) {
      docLabelEn.value = file.name.replace(/\.pdf$/i, '')
    }
  }
}

function addDocument() {
  const file = docFile.value
  if (!file) return
  if (file.size > 10 * 1024 * 1024) {
    const msg = locale.value === 'ar' ? 'حجم ملف الـ PDF يجب ألا يتجاوز 10 ميجابايت.' : 'PDF file must be 10MB or less.'
    error.value = msg
    toast.warning(msg)
    return
  }

  localDocuments.value.push({
    labelEn: docLabelEn.value.trim() || file.name,
    labelAr: docLabelAr.value.trim() || docLabelEn.value.trim() || file.name,
    filePath: file.name,
    fileType: 'pdf',
    sortOrder: localDocuments.value.length + 1,
    file,
  })

  docFile.value = null
  docLabelEn.value = ''
  docLabelAr.value = ''
}

function removeDocument(index: number) {
  const item = localDocuments.value[index]
  if (item.id) {
    deletedDocIds.value.push(item.id)
  }
  localDocuments.value.splice(index, 1)
}

// Single Save Handler: Submits Core Product + Uploads Media in One Unified Flow
async function saveAll() {
  if (saving.value) return
  if (!validateAll()) return

  saving.value = true
  error.value = ''

  try {
    const payload = {
      nameAr: form.nameAr.trim(),
      nameEn: form.nameEn.trim(),
      slug: form.slug.trim() || undefined,
      categoryId: form.categoryId,
      descriptionAr: form.descriptionAr || null,
      descriptionEn: form.descriptionEn || null,
      isActive: form.isActive,
      price: Number(form.price),
      compareAtPrice: form.compareAtPrice === '' ? null : Number(form.compareAtPrice),
      attributes: form.attributes.filter(a => (a.keyEn.trim() || a.keyAr.trim()) && (a.valueEn.trim() || a.valueAr.trim())),
      seo: {
        metaTitleAr: form.metaTitleAr || null,
        metaTitleEn: form.metaTitleEn || null,
        metaDescriptionAr: form.metaDescriptionAr || null,
        metaDescriptionEn: form.metaDescriptionEn || null,
        keywords: form.keywords || null,
        geoContent: form.geoContent || null,
      },
    }

    let productId = props.existing?.id

    if (productId) {
      await $fetch(`/api/admin/products/${productId}`, { method: 'PUT', body: payload })
    }
    else {
      const res = await $fetch<{ product: { id: string } }>('/api/admin/products', {
        method: 'POST',
        body: payload,
      })
      productId = res.product.id
    }

    // Process deleted images
    for (const imgId of deletedImageIds.value) {
      await $fetch(`/api/admin/products/${productId}/images/${imgId}`, { method: 'DELETE' }).catch(() => null)
    }

    // Upload new image files
    const newFiles = localImages.value.filter(i => i.file).map(i => i.file!)
    if (newFiles.length > 0) {
      const fd = new FormData()
      for (const f of newFiles) fd.append('images', f)
      await $fetch(`/api/admin/products/${productId}/images`, { method: 'POST', body: fd })
    }

    // Process video changes
    if (removeVideoOnSave.value) {
      await $fetch(`/api/admin/products/${productId}/video`, { method: 'DELETE' }).catch(() => null)
    }
    else if (video.value?.file) {
      const fd = new FormData()
      fd.append('video', video.value.file)
      await $fetch(`/api/admin/products/${productId}/video`, { method: 'POST', body: fd })
    }
    else if (video.value?.url && video.value.url !== props.existing?.video?.url && !video.value.file) {
      await $fetch(`/api/admin/products/${productId}/video`, {
        method: 'POST',
        body: { url: video.value.url },
      })
    }

    // Process deleted documents
    for (const docId of deletedDocIds.value) {
      await $fetch(`/api/admin/products/${productId}/documents/${docId}`, { method: 'DELETE' }).catch(() => null)
    }

    // Upload new documents
    const newDocs = localDocuments.value.filter(d => d.file)
    for (const d of newDocs) {
      const fd = new FormData()
      fd.append('document', d.file!)
      fd.append('labelEn', d.labelEn)
      fd.append('labelAr', d.labelAr)
      await $fetch(`/api/admin/products/${productId}/documents`, { method: 'POST', body: fd })
    }

    toast.success(
      isEditMode.value
        ? (locale.value === 'ar' ? 'تم حفظ التعديلات بنجاح' : 'Changes Saved Successfully')
        : (locale.value === 'ar' ? 'تم إنشاء المنتج بنجاح' : 'Product Created Successfully'),
      locale.value === 'ar' ? `تم حفظ كافة بيانات ومواصفات المنتج "${form.nameAr || form.nameEn}".` : `All data and media for "${form.nameEn || form.nameAr}" have been saved.`,
    )

    await navigateTo(localePath('/admin/products'))
  }
  catch (e: any) {
    const msg = e?.data?.message || (locale.value === 'ar' ? 'حدث خطأ أثناء حفظ المنتج.' : 'Failed to save product.')
    error.value = msg
    toast.error(
      locale.value === 'ar' ? 'فشل حفظ المنتج' : 'Save Failed',
      msg,
    )
  }
  finally {
    saving.value = false
  }
}

const inputCls = 'h-10 w-full rounded-md border bg-white px-3 text-sm transition-colors focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520] dark:focus:border-[#2B71AE]'
</script>

<template>
  <div class="space-y-6">
    <!-- Top Persistent Controls Header: Wizard Step Navigator + Save Button -->
    <div class="rounded-md border bg-white p-3.5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <!-- Step Navigation Indicator -->
        <ol class="flex flex-wrap items-center gap-1.5 text-xs" aria-label="Product form wizard">
          <li
            v-for="(s, idx) in steps"
            :key="s.id"
            class="flex items-center gap-1.5"
          >
            <button
              type="button"
              class="flex items-center gap-2 rounded-md px-3 py-1.5 font-medium transition-all"
              :class="[
                stepErrors[s.id]
                  ? 'border border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-500/50'
                  : step === s.id
                    ? 'bg-[#2B71AE] text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              ]"
              :title="stepErrors[s.id] || s.label"
              @click="goToStep(s.id)"
            >
              <span
                class="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold"
                :class="[
                  stepErrors[s.id]
                    ? 'bg-rose-600 text-white'
                    : step === s.id
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                ]"
              >
                <AlertCircle v-if="stepErrors[s.id]" class="h-3 w-3" aria-hidden="true" />
                <span v-else>{{ s.id }}</span>
              </span>
              <span>{{ s.label }}</span>
            </button>
            <span v-if="idx < steps.length - 1" class="hidden text-slate-300 sm:inline dark:text-slate-700">›</span>
          </li>
        </ol>

        <!-- Top Persistent Save Action Button -->
        <div class="flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            :disabled="saving"
            class="inline-flex h-9 items-center gap-2 rounded-md bg-[#2B71AE] px-5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#285E8E] active:scale-[0.98] disabled:opacity-50"
            @click="saveAll"
          >
            <Save class="h-4 w-4" aria-hidden="true" />
            <span>{{ saving ? (locale === 'ar' ? 'جاري الحفظ…' : 'Saving…') : (isEditMode ? (locale === 'ar' ? 'حفظ التعديلات' : 'Save Changes') : (locale === 'ar' ? 'حفظ المنتج' : 'Save Product')) }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Error Banner -->
    <div
      v-if="error"
      role="alert"
      class="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
    >
      <AlertCircle class="h-4 w-4 shrink-0" />
      <span>{{ error }}</span>
    </div>

    <!-- Step 1: Basic Information -->
    <div
      v-show="step === 1"
      class="rounded-md border bg-white p-6 shadow-xs dark:bg-[#162032]"
      :style="{ borderColor: 'var(--color-border)' }"
    >
      <h2 class="mb-1 font-heading text-lg font-bold text-slate-900 dark:text-slate-100">
        {{ locale === 'ar' ? 'البيانات الأساسية للمنتج' : 'Basic Product Information' }}
      </h2>
      <p class="mb-5 text-xs text-slate-500 dark:text-slate-400">
        {{ locale === 'ar' ? 'حدد اسم المنتج باللغتين العربية والإنجليزية وتصنيف الفئة المناسب.' : 'Provide dual-language titles and choose the appropriate category.' }}
      </p>

      <div class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Name (EN) *</span>
            <input v-model="form.nameEn" type="text" required placeholder="e.g. Arduino Uno R3" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Name (AR) *</span>
            <input v-model="form.nameAr" type="text" required placeholder="مثال: أردوينو أونو R3" dir="rtl" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Category *</span>
            <select v-model="form.categoryId" required :class="inputCls" :style="{ borderColor: 'var(--color-border)' }">
              <option value="">{{ locale === 'ar' ? 'اختر الفئة…' : 'Select a category…' }}</option>
              <option v-for="c in catData?.categories || []" :key="c.id" :value="c.id">
                {{ locale === 'ar' ? (c.nameAr || c.nameEn) : c.nameEn }}
              </option>
            </select>
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Slug (URL identifier)</span>
            <input v-model="form.slug" type="text" placeholder="Auto-generated if empty" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Description (EN)</span>
            <textarea v-model="form.descriptionEn" rows="4" class="w-full rounded-md border bg-white p-3 text-xs focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }" placeholder="Detailed English description..." />
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Description (AR)</span>
            <textarea v-model="form.descriptionAr" rows="4" dir="rtl" class="w-full rounded-md border bg-white p-3 text-xs focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }" placeholder="الوصف التفصيلي بالعربية..." />
          </label>
        </div>

        <div class="pt-2">
          <label class="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
            <input v-model="form.isActive" type="checkbox" class="h-4 w-4 rounded accent-[#2B71AE]" />
            <span>{{ locale === 'ar' ? 'المنتج نشط ومتاح للشراء في الموقع العام' : 'Active and visible on public storefront' }}</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Step 2: Pricing -->
    <div
      v-show="step === 2"
      class="rounded-md border bg-white p-6 shadow-xs dark:bg-[#162032]"
      :style="{ borderColor: 'var(--color-border)' }"
    >
      <h2 class="mb-1 font-heading text-lg font-bold text-slate-900 dark:text-slate-100">
        {{ locale === 'ar' ? 'التسعير والعروض' : 'Pricing & Discounts' }}
      </h2>
      <p class="mb-5 text-xs text-slate-500 dark:text-slate-400">
        {{ locale === 'ar' ? 'أدخل السعر الحالي بالجنيه المصري وسعر المقارنة في حال وجود تخفيض.' : 'Set current retail price in EGP and optional original compare-at price.' }}
      </p>

      <div class="grid max-w-xl gap-4 sm:grid-cols-2">
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Price (EGP) *</span>
          <div class="relative">
            <input v-model="form.price" type="number" min="0" step="0.01" required placeholder="0.00" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
            <span class="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">EGP</span>
          </div>
        </label>

        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Compare-at price (Optional strike-through)</span>
          <div class="relative">
            <input v-model="form.compareAtPrice" type="number" min="0" step="0.01" placeholder="0.00" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
            <span class="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">EGP</span>
          </div>
        </label>
      </div>
    </div>

    <!-- Step 3: Attributes & Specifications -->
    <div
      v-show="step === 3"
      class="rounded-md border bg-white p-6 shadow-xs dark:bg-[#162032]"
      :style="{ borderColor: 'var(--color-border)' }"
    >
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h2 class="font-heading text-lg font-bold text-slate-900 dark:text-slate-100">
            {{ locale === 'ar' ? 'المواصفات الفنية' : 'Technical Specifications' }}
          </h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            {{ locale === 'ar' ? 'أضف معايير ومواصفات المنتج كأزواج مفتاح وقيمة باللغتين.' : 'Add structured product specs like Voltage, Dimensions, Microcontroller model, etc.' }}
          </p>
        </div>
        <button
          type="button"
          class="inline-flex h-8 items-center gap-1 rounded-md border border-[#2B71AE] px-3 text-xs font-semibold text-[#2B71AE] transition-colors hover:bg-[#2B71AE]/10 dark:text-blue-400"
          @click="addAttr"
        >
          <Plus class="h-3.5 w-3.5" aria-hidden="true" />
          <span>{{ locale === 'ar' ? 'إضافة مواصفة' : 'Add Specification' }}</span>
        </button>
      </div>

      <div v-if="form.attributes.length" class="space-y-2.5">
        <div
          v-for="(a, i) in form.attributes"
          :key="i"
          class="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:gap-3"
          :style="{ borderColor: 'var(--color-border)' }"
        >
          <input v-model="a.keyEn" placeholder="Key (EN): e.g. Voltage" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
          <input v-model="a.valueEn" placeholder="Value (EN): e.g. 5V" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
          <input v-model="a.keyAr" placeholder="المفتاح (AR): مثال: الجهد" dir="rtl" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
          <input v-model="a.valueAr" placeholder="القيمة (AR): مثال: 5 فولت" dir="rtl" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
          <button
            type="button"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-rose-200 text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-950/40"
            :aria-label="locale === 'ar' ? 'حذف المواصفة' : 'Remove specification'"
            @click="form.attributes.splice(i, 1)"
          >
            <Trash2 class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div v-else class="rounded-md border border-dashed p-6 text-center text-xs text-slate-400" :style="{ borderColor: 'var(--color-border)' }">
        {{ locale === 'ar' ? 'لا توجد مواصفات فنية مسجلة. اضغط على "إضافة مواصفة" لإدراج واحدة.' : 'No technical specifications added yet. Click "Add Specification" to create one.' }}
      </div>
    </div>

    <!-- Step 4: Images & Media -->
    <div
      v-show="step === 4"
      class="rounded-md border bg-white p-6 shadow-xs dark:bg-[#162032]"
      :style="{ borderColor: 'var(--color-border)' }"
    >
      <h2 class="mb-1 font-heading text-lg font-bold text-slate-900 dark:text-slate-100">
        {{ locale === 'ar' ? 'معرض صور المنتج' : 'Product Image Gallery' }}
      </h2>
      <p class="mb-5 text-xs text-slate-500 dark:text-slate-400">
        {{ locale === 'ar' ? 'الصورة الأولى تعتبر صورة الغلاف الرئيسية للمنتج. يمكنك ترتيب الصور بالأسهم وحذف أي صورة.' : 'The first image acts as the primary catalog cover. Reorder using directional controls.' }}
      </p>

      <!-- Dropzone -->
      <label
        class="group block cursor-pointer rounded-md border-2 border-dashed p-8 text-center transition-colors hover:border-[#2B71AE] hover:bg-[#2B71AE]/5"
        :style="{ borderColor: 'var(--color-border)' }"
      >
        <div class="flex flex-col items-center">
          <UploadCloud class="h-8 w-8 text-slate-400 transition-colors group-hover:text-[#2B71AE]" aria-hidden="true" />
          <span class="mt-2 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {{ locale === 'ar' ? 'اضغط لاختيار الصور أو اسحبها هنا' : 'Click to browse images or drag & drop files here' }}
          </span>
          <span class="mt-1 block text-[11px] text-slate-400">JPG, PNG, or WEBP. Max 5MB each.</span>
        </div>
        <input type="file" multiple accept="image/jpeg,image/png,image/webp" class="hidden" @change="onFiles" />
      </label>

      <!-- Gallery Grid -->
      <div v-if="localImages.length" class="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <div
          v-for="(img, i) in localImages"
          :key="img.id || img.path"
          class="group relative overflow-hidden rounded-md border bg-slate-50 p-1.5 dark:bg-[#0B1520]"
          :class="{ 'ring-2 ring-[#2B71AE]': i === 0 }"
          :style="{ borderColor: 'var(--color-border)' }"
        >
          <div class="aspect-square w-full overflow-hidden rounded bg-slate-200 dark:bg-slate-800">
            <img :src="img.path" :alt="`Product photo ${i + 1}`" class="h-full w-full object-cover" loading="lazy" />
          </div>

          <span
            v-if="i === 0"
            class="absolute start-2.5 top-2.5 rounded-full bg-[#F5CC07] px-2 py-0.5 text-[10px] font-bold text-slate-900 shadow-xs"
          >
            Cover
          </span>

          <span
            v-if="img.file"
            class="absolute end-2.5 top-2.5 rounded-full bg-blue-600 text-white px-1.5 py-0.2 text-[9px] font-bold shadow-xs"
          >
            New
          </span>

          <div class="mt-1.5 flex items-center justify-between gap-1 pt-1 text-xs">
            <button
              type="button"
              class="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-700"
              :disabled="i === 0"
              :title="locale === 'ar' ? 'تحريك للأمام' : 'Move left'"
              @click="moveImage(i, -1)"
            >
              <ChevronLeft v-if="locale === 'en'" class="h-3.5 w-3.5" aria-hidden="true" />
              <ChevronRight v-else class="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="flex h-7 items-center justify-center rounded px-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              :title="locale === 'ar' ? 'حذف الصورة' : 'Delete photo'"
              @click="removeImage(i)"
            >
              <Trash2 class="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-700"
              :disabled="i === localImages.length - 1"
              :title="locale === 'ar' ? 'تحريك للخلف' : 'Move right'"
              @click="moveImage(i, 1)"
            >
              <ChevronRight v-if="locale === 'en'" class="h-3.5 w-3.5" aria-hidden="true" />
              <ChevronLeft v-else class="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <!-- Video Section -->
      <div class="mt-8 border-t border-slate-200/80 dark:border-slate-800 pt-6">
        <h3 class="font-heading text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
          {{ locale === 'ar' ? 'فيديو المنتج (اختياري)' : 'Product Demonstration Video (Optional)' }}
        </h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">
          {{ locale === 'ar' ? 'أضف رابط فيديو من يوتيوب أو فيميو أو ارفع ملف فيديو مباشر للمنتج.' : 'Attach a YouTube/Vimeo URL or select a direct video file.' }}
        </p>

        <!-- Current Video Preview -->
        <div v-if="video && !removeVideoOnSave" class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#0B1520] max-w-xl space-y-3">
          <div class="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
            <iframe
              v-if="video.type === 'youtube' || video.type === 'vimeo'"
              :src="getEmbedUrl(video.url, video.type)"
              class="h-full w-full"
              allowfullscreen
            ></iframe>
            <video
              v-else
              controls
              :src="video.url"
              class="h-full w-full object-cover"
            ></video>
          </div>

          <div class="flex items-center justify-between text-xs pt-1">
            <span class="font-mono text-slate-500 truncate max-w-xs">{{ video.url }}</span>
            <button
              type="button"
              class="inline-flex items-center gap-1 text-rose-600 hover:underline dark:text-rose-400 font-semibold"
              @click="removeVideo"
            >
              <Trash2 class="h-3.5 w-3.5" />
              <span>{{ locale === 'ar' ? 'إزالة الفيديو' : 'Remove Video' }}</span>
            </button>
          </div>
        </div>

        <!-- Add Video Form -->
        <div v-else class="space-y-3 max-w-xl">
          <div class="flex items-center gap-2 text-xs">
            <button
              type="button"
              class="rounded-lg px-3 py-1.5 font-semibold transition-colors"
              :class="videoMode === 'url' ? 'bg-[#2B71AE] text-white' : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'"
              @click="videoMode = 'url'"
            >
              {{ locale === 'ar' ? 'رابط فيديو (YouTube / Vimeo)' : 'Video URL (YouTube / Vimeo)' }}
            </button>
            <button
              type="button"
              class="rounded-lg px-3 py-1.5 font-semibold transition-colors"
              :class="videoMode === 'upload' ? 'bg-[#2B71AE] text-white' : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'"
              @click="videoMode = 'upload'"
            >
              {{ locale === 'ar' ? 'رفع ملف فيديو مباشر' : 'Upload Video File' }}
            </button>
          </div>

          <!-- URL Mode -->
          <div v-if="videoMode === 'url'" class="flex items-center gap-2">
            <input
              v-model="videoUrlInput"
              type="url"
              :placeholder="locale === 'ar' ? 'مثال: https://www.youtube.com/watch?v=...' : 'e.g. https://www.youtube.com/watch?v=...'"
              :class="inputCls"
              :style="{ borderColor: 'var(--color-border)' }"
            />
            <button
              type="button"
              :disabled="!videoUrlInput.trim()"
              class="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md bg-[#2B71AE] px-4 text-xs font-semibold text-white hover:bg-[#285E8E] disabled:opacity-50 transition-colors"
              @click="attachVideoUrl"
            >
              <span>{{ locale === 'ar' ? 'إرفاق الرابط' : 'Attach Video' }}</span>
            </button>
          </div>

          <!-- Upload Mode -->
          <div v-else>
            <label class="flex cursor-pointer items-center justify-between rounded-md border border-dashed p-4 hover:border-[#2B71AE] hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50 transition-colors">
              <div class="flex items-center gap-3">
                <Video class="h-6 w-6 text-slate-400" />
                <div>
                  <span class="text-xs font-semibold text-slate-700 dark:text-slate-200 block">
                    {{ locale === 'ar' ? 'اختر ملف فيديو (MP4, WebM)' : 'Choose a video file (MP4, WebM)' }}
                  </span>
                  <span class="text-[11px] text-slate-400 block">Max 50MB</span>
                </div>
              </div>
              <input type="file" accept="video/mp4,video/webm" class="hidden" @change="onVideoFileUpload" />
            </label>
          </div>
        </div>
      </div>

      <!-- Technical Documents Section -->
      <div class="mt-8 border-t border-slate-200/80 dark:border-slate-800 pt-6">
        <h3 class="font-heading text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
          {{ locale === 'ar' ? 'كتيبات المواصفات والملفات الفنية (PDF)' : 'Technical Documents & Datasheets (PDF)' }}
        </h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">
          {{ locale === 'ar' ? 'أرفق ملفات PDF مثل كتيبات المواصفات (Datasheets) أو مخططات التوصيل (Schematics).' : 'Attach PDF datasheets, schematics, or user guides for clients.' }}
        </p>

        <!-- Current Documents List -->
        <div v-if="localDocuments.length" class="space-y-2 mb-4 max-w-xl">
          <div
            v-for="(doc, i) in localDocuments"
            :key="doc.id || doc.labelEn + i"
            class="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[#0B1520]"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <FileText class="h-5 w-5 text-rose-500 shrink-0" />
              <div class="min-w-0">
                <span class="font-bold text-xs text-slate-900 dark:text-slate-100 block truncate">{{ doc.labelEn }}</span>
                <span v-if="doc.labelAr" class="text-[10px] text-slate-500 block truncate">{{ doc.labelAr }}</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span v-if="doc.file" class="rounded bg-blue-100 text-blue-700 px-1.5 py-0.2 text-[9px] font-bold">New</span>
              <button
                type="button"
                class="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-1.5 rounded transition-colors"
                :title="locale === 'ar' ? 'حذف المستند' : 'Remove document'"
                @click="removeDocument(i)"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <!-- Add Document Form -->
        <div class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0B1520] max-w-xl space-y-3">
          <span class="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
            {{ locale === 'ar' ? 'إرفاق ملف PDF جديد' : 'Attach New PDF Document' }}
          </span>

          <div class="grid gap-3 sm:grid-cols-2">
            <input
              v-model="docLabelEn"
              type="text"
              :placeholder="locale === 'ar' ? 'العنوان بالإنجليزية (مثال: Technical Datasheet)' : 'Label (EN) e.g. Technical Datasheet'"
              :class="inputCls"
              :style="{ borderColor: 'var(--color-border)' }"
            />
            <input
              v-model="docLabelAr"
              type="text"
              dir="rtl"
              :placeholder="locale === 'ar' ? 'العنوان بالعربية (مثال: كتيب المواصفات الفنية)' : 'Label (AR) e.g. كتيب المواصفات الفنية'"
              :class="inputCls"
              :style="{ borderColor: 'var(--color-border)' }"
            />
          </div>

          <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <input
              type="file"
              accept="application/pdf"
              class="block w-full text-xs text-slate-500 file:me-3 file:rounded-md file:border-0 file:bg-[#2B71AE]/10 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-[#2B71AE] hover:file:bg-[#2B71AE]/20 cursor-pointer"
              @change="onDocFileSelected"
            />
            <button
              type="button"
              :disabled="!docFile"
              class="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#2B71AE] px-4 text-xs font-semibold text-white hover:bg-[#285E8E] disabled:opacity-50 transition-colors w-full sm:w-auto"
              @click="addDocument"
            >
              <UploadCloud class="h-3.5 w-3.5" />
              <span>{{ locale === 'ar' ? 'إضافة المستند' : 'Add Document' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 5: SEO & Discovery -->
    <div
      v-show="step === 5"
      class="rounded-md border bg-white p-6 shadow-xs dark:bg-[#162032]"
      :style="{ borderColor: 'var(--color-border)' }"
    >
      <h2 class="mb-1 font-heading text-lg font-bold text-slate-900 dark:text-slate-100">
        {{ locale === 'ar' ? 'محركات البحث واكتشاف الذكاء الاصطناعي' : 'SEO & AI Search Discovery' }}
      </h2>
      <p class="mb-5 text-xs text-slate-500 dark:text-slate-400">
        {{ locale === 'ar' ? 'تحسين ظهور هذا المنتج في محركات البحث التقليدية ومحركات إجابات الذكاء الاصطناعي.' : 'Configure search metadata, canonical keywords, and structured text context.' }}
      </p>

      <div class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Meta Title (EN)</span>
            <input v-model="form.metaTitleEn" type="text" placeholder="e.g. Arduino Uno R3 | Mango Electronics" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Meta Title (AR)</span>
            <input v-model="form.metaTitleAr" type="text" placeholder="مثال: لوحة أردوينو أونو | مانجو إلكترونيكس" dir="rtl" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Meta Description (EN)</span>
            <textarea v-model="form.metaDescriptionEn" rows="2" class="w-full rounded-md border bg-white p-2.5 text-xs focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }" placeholder="Concise search result snippet..." />
          </label>
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Meta Description (AR)</span>
            <textarea v-model="form.metaDescriptionAr" rows="2" dir="rtl" class="w-full rounded-md border bg-white p-2.5 text-xs focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }" placeholder="وصف موجز يظهر في نتائج البحث..." />
          </label>
        </div>

        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Keywords (Comma-separated)</span>
          <input v-model="form.keywords" type="text" placeholder="arduino, microcontroller, iot, robotics, egypt" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
        </label>

        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">GEO & AI Search Content</span>
          <textarea
            v-model="form.geoContent"
            rows="3"
            class="w-full rounded-md border bg-white p-3 text-xs focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520]"
            :style="{ borderColor: 'var(--color-border)' }"
            placeholder="Describe this product in 2-3 clear sentences for AI search engines: what it is, who uses it, and what problem it solves in Egypt."
          />
          <span class="mt-1 block text-[11px] text-slate-400">Used in JSON-LD schema and AI search indexation.</span>
        </label>
      </div>
    </div>

    <!-- Wizard Navigation Footer Controls -->
    <div class="flex items-center justify-between border-t pt-5" :style="{ borderColor: 'var(--color-border)' }">
      <!-- Previous Step Button -->
      <button
        type="button"
        class="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        :disabled="step === 1"
        @click="step--"
      >
        <ArrowRight v-if="locale === 'ar'" class="h-3.5 w-3.5" aria-hidden="true" />
        <ArrowLeft v-else class="h-3.5 w-3.5" aria-hidden="true" />
        <span>{{ locale === 'ar' ? 'السابق' : 'Previous' }}</span>
      </button>

      <div class="flex items-center gap-2.5">
        <!-- Next Step Button (if not on final step) -->
        <button
          v-if="step < 5"
          type="button"
          class="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          @click="next"
        >
          <span>{{ locale === 'ar' ? 'الخطوة التالية' : 'Next Step' }}</span>
          <ArrowLeft v-if="locale === 'ar'" class="h-3.5 w-3.5" aria-hidden="true" />
          <ArrowRight v-else class="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        <!-- Primary Persistent Single-Save Action Button -->
        <button
          type="button"
          :disabled="saving"
          class="inline-flex h-10 items-center gap-2 rounded-md bg-[#2B71AE] px-7 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#285E8E] active:scale-[0.98] disabled:opacity-50"
          @click="saveAll"
        >
          <Save class="h-4 w-4" aria-hidden="true" />
          <span>{{ saving ? (locale === 'ar' ? 'جاري الحفظ…' : 'Saving…') : (isEditMode ? (locale === 'ar' ? 'حفظ التعديلات' : 'Save Changes') : (locale === 'ar' ? 'حفظ المنتج' : 'Save Product')) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
