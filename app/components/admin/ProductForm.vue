<script setup lang="ts">
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Globe,
  Image as ImageIcon,
  Layers,
  Plus,
  Tag,
  Trash2,
  UploadCloud,
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
  id: string
  path: string
  sortOrder: number
  isCover: boolean
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
}

const props = defineProps<{ existing?: Existing | null }>()

const { t, locale } = useI18n()
const localePath = useLocalePath()
const fetch = useRequestFetch()

const { data: catData } = await useAsyncData('product-form-categories', () =>
  fetch<{ categories: Category[] }>('/api/categories'),
)

const step = ref(1)
const error = ref('')
const saving = ref(false)
const uploading = ref(false)

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

const images = ref<ProductImage[]>([...(props.existing?.images || [])])
const savedId = ref<string | null>(props.existing?.id || null)

const steps = computed(() => [
  { id: 1, label: locale.value === 'ar' ? 'المعلومات الأساسية' : 'Basic info', icon: Layers },
  { id: 2, label: locale.value === 'ar' ? 'التسعير' : 'Pricing', icon: Tag },
  { id: 3, label: locale.value === 'ar' ? 'المواصفات' : 'Attributes', icon: Plus },
  { id: 4, label: locale.value === 'ar' ? 'الصور والوسائط' : 'Images', icon: ImageIcon },
  { id: 5, label: locale.value === 'ar' ? 'السيو ومحركات البحث' : 'SEO & Discovery', icon: Globe },
])

function validateStep(s: number): boolean {
  error.value = ''
  if (s === 1 && (!form.nameAr.trim() || !form.nameEn.trim() || !form.categoryId)) {
    error.value = locale.value === 'ar' ? 'الاسم باللغتين واختيار الفئة حقول مطلوبة.' : 'Name (AR/EN) and category are required.'
    return false
  }
  if (s === 2) {
    const price = Number(form.price)
    if (!Number.isFinite(price) || price < 0) {
      error.value = locale.value === 'ar' ? 'يرجى إدخال سعر صحيح للمنتج.' : 'Valid price is required.'
      return false
    }
    if (form.compareAtPrice !== '') {
      const c = Number(form.compareAtPrice)
      if (!Number.isFinite(c) || c <= price) {
        error.value = locale.value === 'ar' ? 'سعر المقارنة (قبل الخصم) يجب أن يكون أكبر من السعر الفعلي.' : 'Compare-at price must be greater than active price.'
        return false
      }
    }
  }
  return true
}

function next() {
  if (validateStep(step.value)) step.value = Math.min(5, step.value + 1)
}

function goToStep(s: number) {
  if (s < step.value || validateStep(step.value)) {
    step.value = s
  }
}

function addAttr() {
  form.attributes.push({ keyAr: '', keyEn: '', valueAr: '', valueEn: '' })
}

async function saveCore(): Promise<string | null> {
  error.value = ''
  saving.value = true
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
      attributes: form.attributes,
      seo: {
        metaTitleAr: form.metaTitleAr || null,
        metaTitleEn: form.metaTitleEn || null,
        metaDescriptionAr: form.metaDescriptionAr || null,
        metaDescriptionEn: form.metaDescriptionEn || null,
        keywords: form.keywords || null,
        geoContent: form.geoContent || null,
      },
    }
    if (savedId.value) {
      await $fetch(`/api/admin/products/${savedId.value}`, { method: 'PUT', body: payload })
      return savedId.value
    }
    const res = await $fetch<{ product: { id: string } }>('/api/admin/products', { method: 'POST', body: payload })
    savedId.value = res.product.id
    return res.product.id
  }
  catch (e) {
    error.value = (e as { data?: { message?: string } })?.data?.message || 'Save failed'
    return null
  }
  finally {
    saving.value = false
  }
}

async function publish() {
  if (!validateStep(1) || !validateStep(2)) {
    step.value = 1
    return
  }
  const id = await saveCore()
  if (id) await navigateTo(localePath('/admin/products'))
}

async function onFiles(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files || [])
  if (!files.length) return
  error.value = ''
  // Persist core data first so images have a product to attach to.
  const id = savedId.value || await saveCore()
  if (!id) return
  const oversized = files.filter(f => f.size > 5 * 1024 * 1024)
  if (oversized.length) {
    error.value = locale.value === 'ar' ? 'حجم كل صورة يجب ألا يتجاوز 5 ميجابايت.' : 'Each image must be 5MB or less.'
    return
  }
  uploading.value = true
  try {
    const fd = new FormData()
    for (const f of files) fd.append('images', f)
    const res = await $fetch<{ images: ProductImage[] }>(`/api/admin/products/${id}/images`, { method: 'POST', body: fd })
    images.value = res.images
  }
  catch (e) {
    error.value = (e as { data?: { message?: string } })?.data?.message || 'Upload failed'
  }
  finally {
    uploading.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}

async function removeImage(img: ProductImage) {
  if (!savedId.value) return
  await $fetch(`/api/admin/products/${savedId.value}/images/${img.id}`, { method: 'DELETE' })
  images.value = images.value.filter(i => i.id !== img.id)
}

async function moveImage(index: number, dir: -1 | 1) {
  if (!savedId.value) return
  const next = [...images.value]
  const j = index + dir
  if (j < 0 || j >= next.length) return
  ;[next[index], next[j]] = [next[j]!, next[index]!]
  images.value = next
  await $fetch(`/api/admin/products/${savedId.value}/images/order`, {
    method: 'PUT',
    body: { order: next.map(i => i.id) },
  })
  // First image is cover.
  images.value = images.value.map((img, i) => ({ ...img, isCover: i === 0 }))
}

const inputCls = 'h-10 w-full rounded-md border bg-white px-3 text-sm transition-colors focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520] dark:focus:border-[#2B71AE]'
</script>

<template>
  <div class="space-y-6">
    <!-- Step Navigation Indicator -->
    <div class="rounded-md border bg-white p-3.5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <ol class="flex flex-wrap items-center justify-between gap-2 text-xs" aria-label="Product form wizard">
        <li
          v-for="(s, idx) in steps"
          :key="s.id"
          class="flex items-center gap-2"
        >
          <button
            type="button"
            class="flex items-center gap-2 rounded-md px-3 py-1.5 font-medium transition-colors"
            :class="[
              step === s.id
                ? 'bg-[#2B71AE] text-white shadow-xs font-semibold'
                : step > s.id
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            ]"
            @click="goToStep(s.id)"
          >
            <span
              class="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold"
              :class="[
                step === s.id
                  ? 'bg-white/20 text-white'
                  : step > s.id
                    ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
              ]"
            >
              <Check v-if="step > s.id" class="h-3 w-3" aria-hidden="true" />
              <span v-else>{{ s.id }}</span>
            </span>
            <span>{{ s.label }}</span>
          </button>
          <span v-if="idx < steps.length - 1" class="hidden text-slate-300 sm:inline dark:text-slate-700">›</span>
        </li>
      </ol>
    </div>

    <!-- Error Banner -->
    <div
      v-if="error"
      role="alert"
      class="rounded-md border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
    >
      {{ error }}
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
        {{ locale === 'ar' ? 'الصورة الأولى تعتبر صورة الغلاف الرئيسية للمنتج. يمكنك ترتيب الصور بالأسهم.' : 'The first image acts as the primary catalog cover. Reorder using directional controls.' }}
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

      <div v-if="uploading" class="mt-3 flex items-center justify-center gap-2 text-xs font-medium text-[#2B71AE]">
        <span>Uploading and optimizing images…</span>
      </div>

      <!-- Gallery Grid -->
      <div v-if="images.length" class="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <div
          v-for="(img, i) in images"
          :key="img.id"
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
              @click="removeImage(img)"
            >
              <Trash2 class="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-700"
              :disabled="i === images.length - 1"
              :title="locale === 'ar' ? 'تحريك للخلف' : 'Move right'"
              @click="moveImage(i, 1)"
            >
              <ChevronRight v-if="locale === 'en'" class="h-3.5 w-3.5" aria-hidden="true" />
              <ChevronLeft v-else class="h-3.5 w-3.5" aria-hidden="true" />
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
        <button
          v-if="step < 5"
          type="button"
          class="inline-flex h-10 items-center gap-2 rounded-md bg-[#2B71AE] px-6 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#285E8E]"
          @click="next"
        >
          <span>{{ locale === 'ar' ? 'المتابعة' : 'Next' }}</span>
          <ArrowLeft v-if="locale === 'ar'" class="h-3.5 w-3.5" aria-hidden="true" />
          <ArrowRight v-else class="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          v-else
          type="button"
          :disabled="saving"
          class="inline-flex h-10 items-center gap-2 rounded-md bg-[#2B71AE] px-7 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#285E8E] disabled:opacity-50"
          @click="publish"
        >
          <span>{{ saving ? (locale === 'ar' ? 'جاري النشر…' : 'Saving…') : (savedId ? (locale === 'ar' ? 'حفظ التعديلات' : 'Save & Finish') : (locale === 'ar' ? 'نشر المنتج' : 'Publish Product')) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
