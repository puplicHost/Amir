<script setup lang="ts">
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

const { data: catData } = await useAsyncData('product-form-categories', () =>
  $fetch<{ categories: Category[] }>('/api/categories'),
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

const steps = ['Basic info', 'Pricing', 'Attributes', 'Images', 'SEO']

function validateStep(s: number): boolean {
  error.value = ''
  if (s === 1 && (!form.nameAr.trim() || !form.nameEn.trim() || !form.categoryId)) {
    error.value = 'Name (AR/EN) and category are required.'
    return false
  }
  if (s === 2) {
    const price = Number(form.price)
    if (!Number.isFinite(price) || price < 0) {
      error.value = 'Valid price is required.'
      return false
    }
    if (form.compareAtPrice !== '') {
      const c = Number(form.compareAtPrice)
      if (!Number.isFinite(c) || c <= price) {
        error.value = 'Compare-at price must be greater than price.'
        return false
      }
    }
  }
  return true
}

function next() {
  if (validateStep(step.value)) step.value = Math.min(5, step.value + 1)
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
  if (id) await navigateTo('/admin/products')
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
    error.value = 'Each image must be 5MB or less.'
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

const inputCls = 'h-10 w-full rounded border bg-transparent px-3'
const border = { borderColor: 'var(--color-border)' }
</script>

<template>
  <div>
    <ol class="mb-6 flex flex-wrap gap-2" aria-label="Form steps">
      <li v-for="(label, i) in steps" :key="label" class="flex items-center gap-2">
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold"
          :class="step === i + 1 ? 'bg-[#2B71AE] text-white' : 'text-slate-500'"
          :style="step === i + 1 ? {} : border"
          @click="step = i + 1"
        >
          {{ i + 1 }}
        </button>
        <span class="text-sm font-medium" :class="{ 'font-bold': step === i + 1 }">{{ label }}</span>
      </li>
    </ol>

    <div v-if="error" role="alert" class="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{{ error }}</div>

    <div v-show="step === 1" class="grid gap-3">
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="block"><span class="mb-1 block text-sm font-medium">Name (AR) *</span><input v-model="form.nameAr" :class="inputCls" :style="border" /></label>
        <label class="block"><span class="mb-1 block text-sm font-medium">Name (EN) *</span><input v-model="form.nameEn" :class="inputCls" :style="border" /></label>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="block"><span class="mb-1 block text-sm font-medium">Slug (auto if empty)</span><input v-model="form.slug" :class="inputCls" :style="border" /></label>
        <label class="block"><span class="mb-1 block text-sm font-medium">Category *</span>
          <select v-model="form.categoryId" :class="inputCls" :style="border">
            <option value="">Select…</option>
            <option v-for="c in catData?.categories || []" :key="c.id" :value="c.id">{{ c.nameEn }}</option>
          </select>
        </label>
      </div>
      <label class="block"><span class="mb-1 block text-sm font-medium">Description (AR)</span><textarea v-model="form.descriptionAr" rows="3" class="w-full rounded border bg-transparent px-3 py-2" :style="border" /></label>
      <label class="block"><span class="mb-1 block text-sm font-medium">Description (EN)</span><textarea v-model="form.descriptionEn" rows="3" class="w-full rounded border bg-transparent px-3 py-2" :style="border" /></label>
      <label class="inline-flex items-center gap-2 text-sm"><input v-model="form.isActive" type="checkbox" class="h-4 w-4" /> Active (visible on public site)</label>
    </div>

    <div v-show="step === 2" class="grid gap-3 sm:grid-cols-2">
      <label class="block"><span class="mb-1 block text-sm font-medium">Price (EGP) *</span><input v-model="form.price" type="number" min="0" step="0.01" :class="inputCls" :style="border" /></label>
      <label class="block"><span class="mb-1 block text-sm font-medium">Compare-at price (optional)</span><input v-model="form.compareAtPrice" type="number" min="0" step="0.01" :class="inputCls" :style="border" /></label>
    </div>

    <div v-show="step === 3">
      <div v-for="(a, i) in form.attributes" :key="i" class="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <input v-model="a.keyAr" placeholder="Key (AR)" :class="inputCls" :style="border" />
        <input v-model="a.keyEn" placeholder="Key (EN)" :class="inputCls" :style="border" />
        <input v-model="a.valueAr" placeholder="Value (AR)" :class="inputCls" :style="border" />
        <input v-model="a.valueEn" placeholder="Value (EN)" :class="inputCls" :style="border" />
        <button type="button" class="h-10 rounded border border-red-300 px-3 text-red-600" @click="form.attributes.splice(i, 1)">Remove</button>
      </div>
      <button type="button" class="mt-1 h-10 rounded border px-4" :style="border" @click="addAttr">Add attribute</button>
    </div>

    <div v-show="step === 4">
      <label class="block rounded-md border border-dashed p-6 text-center text-sm" :style="border">
        <span class="font-medium">Drop images or click to browse</span>
        <span class="block text-xs text-slate-500">JPG / PNG / WEBP, max 5MB each. First image is the cover.</span>
        <input type="file" multiple accept="image/jpeg,image/png,image/webp" class="mt-2 text-sm" @change="onFiles" />
      </label>
      <p v-if="uploading" class="mt-2 text-sm text-slate-500">Uploading…</p>
      <div class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div v-for="(img, i) in images" :key="img.id" class="relative rounded-md border p-1" :style="border">
          <img :src="img.path" :alt="`Image ${i + 1}`" class="aspect-square w-full rounded object-cover" loading="lazy" />
          <span v-if="img.isCover" class="absolute left-2 top-2 rounded-full bg-[#F5CC07] px-2 py-0.5 text-xs font-bold text-slate-900">cover</span>
          <div class="mt-1 flex justify-between">
            <button type="button" class="rounded px-2 py-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800" :disabled="i === 0" @click="moveImage(i, -1)">←</button>
            <button type="button" class="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50" @click="removeImage(img)">Remove</button>
            <button type="button" class="rounded px-2 py-1 text-xs hover:bg-slate-100 dark:hover:bg-slate-800" :disabled="i === images.length - 1" @click="moveImage(i, 1)">→</button>
          </div>
        </div>
      </div>
    </div>

    <div v-show="step === 5" class="grid gap-3">
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="block"><span class="mb-1 block text-sm font-medium">Meta title (AR)</span><input v-model="form.metaTitleAr" :class="inputCls" :style="border" /></label>
        <label class="block"><span class="mb-1 block text-sm font-medium">Meta title (EN)</span><input v-model="form.metaTitleEn" :class="inputCls" :style="border" /></label>
      </div>
      <label class="block"><span class="mb-1 block text-sm font-medium">Meta description (AR)</span><textarea v-model="form.metaDescriptionAr" rows="2" class="w-full rounded border bg-transparent px-3 py-2" :style="border" /></label>
      <label class="block"><span class="mb-1 block text-sm font-medium">Meta description (EN)</span><textarea v-model="form.metaDescriptionEn" rows="2" class="w-full rounded border bg-transparent px-3 py-2" :style="border" /></label>
      <label class="block"><span class="mb-1 block text-sm font-medium">Keywords (comma-separated)</span><input v-model="form.keywords" :class="inputCls" :style="border" /></label>
      <label class="block">
        <span class="mb-1 block text-sm font-medium">GEO content</span>
        <textarea v-model="form.geoContent" rows="3" class="w-full rounded border bg-transparent px-3 py-2" :style="border" placeholder="Describe this product in 2–3 sentences for AI search engines: what it is, who uses it, and what problem it solves." />
      </label>
    </div>

    <div class="mt-6 flex items-center justify-between">
      <button type="button" class="h-10 rounded border px-4" :style="border" :disabled="step === 1" @click="step--">Back</button>
      <div class="flex gap-2">
        <button v-if="step < 5" type="button" class="h-10 rounded bg-[#2B71AE] px-6 font-semibold text-white hover:bg-[#285E8E]" @click="next">Next</button>
        <button v-else type="button" :disabled="saving" class="h-10 rounded bg-[#2B71AE] px-6 font-semibold text-white hover:bg-[#285E8E] disabled:opacity-50" @click="publish">
          {{ saving ? '…' : (savedId ? 'Save & finish' : 'Publish') }}
        </button>
      </div>
    </div>
  </div>
</template>
