<script setup lang="ts">
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Download,
  FileText,
  Loader2,
  Minus,
  Package,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  UploadCloud,
  User,
  X,
} from 'lucide-vue-next'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t, locale } = useI18n()
const localePath = useLocalePath()
const router = useRouter()
const toast = useAdminToast()

useHead(() => ({
  title: `${locale.value === 'ar' ? 'إنشاء عرض سعر جديد' : 'Create New Quote'} | ${t('brand.name')}`,
}))

// Company Information Form
const form = reactive({
  companyName: '',
  contactName: '',
  phone: '',
  email: '',
  notes: '',
})

interface SelectedItem {
  id: string
  productId?: string | null
  name: string
  nameEn: string
  nameAr: string
  categoryName?: string
  price: number
  coverImage: string | null
  quantity: number
  notes?: string
  isCustom?: boolean
}

const selectedItems = ref<SelectedItem[]>([])

// Item Selection Mode: 'catalog' | 'custom'
const activeItemMode = ref<'catalog' | 'custom'>('catalog')

// Catalog Product Search & Selection State
const productSearch = ref('')
const searchResults = ref<any[]>([])
const searching = ref(false)
let searchDebounceTimer: any = null

const fetch = useRequestFetch()
const { data: initialProductsData, pending: initialLoading } = await useAsyncData('admin-new-quote-init-products', () =>
  fetch<{ products: any[] }>('/api/products?limit=15'),
)

const availableProducts = computed(() => {
  if (productSearch.value.trim()) {
    return searchResults.value
  }
  return initialProductsData.value?.products || []
})

function onSearchInput() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  const q = productSearch.value.trim()
  if (!q) {
    searchResults.value = []
    searching.value = false
    return
  }

  searching.value = true
  searchDebounceTimer = setTimeout(async () => {
    try {
      const res = await $fetch<{ products: any[] }>(`/api/products?search=${encodeURIComponent(q)}&limit=15`)
      searchResults.value = res.products || []
    }
    catch {
      searchResults.value = []
    }
    finally {
      searching.value = false
    }
  }, 300)
}

function clearSearch() {
  productSearch.value = ''
  searchResults.value = []
  searching.value = false
}

function isProductSelected(id: string): boolean {
  return selectedItems.value.some(i => i.productId === id || i.id === id)
}

function toggleProduct(p: any) {
  const existingIndex = selectedItems.value.findIndex(i => i.productId === p.id || i.id === p.id)
  if (existingIndex >= 0) {
    selectedItems.value.splice(existingIndex, 1)
  }
  else {
    const nameEn = p.nameEn || p.nameAr || 'Product'
    const nameAr = p.nameAr || p.nameEn || nameEn
    const categoryName = p.category ? (locale.value === 'ar' ? p.category.nameAr : p.category.nameEn) : ''
    selectedItems.value.push({
      id: p.id,
      productId: p.id,
      name: locale.value === 'ar' ? nameAr : nameEn,
      nameEn,
      nameAr,
      categoryName,
      price: Number(p.price),
      coverImage: p.coverImage || null,
      quantity: 1,
      notes: '',
      isCustom: false,
    })
  }
}

// Custom / Manual Item Form
const customItemForm = reactive({
  nameEn: '',
  nameAr: '',
  price: '',
  quantity: 1,
  notes: '',
  imagePath: '',
})
const uploadingCustomImage = ref(false)

async function onCustomImageSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingCustomImage.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await $fetch<{ path: string }>('/api/admin/quotes/upload-image', {
      method: 'POST',
      body: fd,
    })
    customItemForm.imagePath = res.path
  }
  catch {
    toast.error(locale.value === 'ar' ? 'فشل رفع الصورة' : 'Image upload failed')
  }
  finally {
    uploadingCustomImage.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}

function addCustomItem() {
  if (!customItemForm.nameEn.trim()) {
    toast.warning(locale.value === 'ar' ? 'يرجى إدخال اسم المنتج بالإنجليزية' : 'Product name (EN) is required')
    return
  }
  const price = Number(customItemForm.price)
  if (!Number.isFinite(price) || price < 0) {
    toast.warning(locale.value === 'ar' ? 'يرجى إدخال سعر صحيح' : 'Valid unit price is required')
    return
  }
  const nameEn = customItemForm.nameEn.trim()
  const nameAr = customItemForm.nameAr.trim() || nameEn
  const qty = Math.max(1, Number(customItemForm.quantity) || 1)

  selectedItems.value.push({
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    productId: null,
    name: locale.value === 'ar' ? nameAr : nameEn,
    nameEn,
    nameAr,
    price,
    quantity: qty,
    coverImage: customItemForm.imagePath || null,
    notes: customItemForm.notes.trim() || undefined,
    isCustom: true,
  })

  // Reset custom form
  customItemForm.nameEn = ''
  customItemForm.nameAr = ''
  customItemForm.price = ''
  customItemForm.quantity = 1
  customItemForm.notes = ''
  customItemForm.imagePath = ''

  toast.success(locale.value === 'ar' ? 'تمت إضافة المنتج المخصص' : 'Custom Item Added')
}

// Line Item Controls
function updateQuantity(id: string, delta: number) {
  const item = selectedItems.value.find(i => i.id === id)
  if (!item) return
  const next = item.quantity + delta
  if (next <= 0) {
    selectedItems.value = selectedItems.value.filter(i => i.id !== id)
  }
  else {
    item.quantity = next
  }
}

function setQuantityDirect(id: string, event: Event) {
  const item = selectedItems.value.find(i => i.id === id)
  if (!item) return
  const val = Number((event.target as HTMLInputElement).value)
  if (Number.isFinite(val) && val > 0) {
    item.quantity = Math.floor(val)
  }
}

function removeItem(id: string) {
  selectedItems.value = selectedItems.value.filter(i => i.id !== id)
}

// Discount State & Calculations
const discountType = ref<'none' | 'percentage' | 'fixed'>('none')
const discountValue = ref<number | ''>('')

const subtotalAmount = computed(() => {
  return selectedItems.value.reduce((sum, item) => sum + (item.price * item.quantity), 0)
})

const discountAmount = computed(() => {
  const val = Number(discountValue.value) || 0
  if (discountType.value === 'percentage' && val > 0) {
    return Math.round(((subtotalAmount.value * val) / 100) * 100) / 100
  }
  if (discountType.value === 'fixed' && val > 0) {
    return Math.min(subtotalAmount.value, val)
  }
  return 0
})

const grandTotal = computed(() => {
  return Math.max(0, subtotalAmount.value - discountAmount.value)
})

const submitting = ref(false)
const errorMessage = ref('')

async function submitQuote() {
  if (submitting.value) return
  errorMessage.value = ''

  if (!form.companyName.trim() || !form.contactName.trim() || !form.phone.trim()) {
    errorMessage.value = locale.value === 'ar'
      ? 'يرجى إدخال اسم الشركة، اسم المسؤول، ورقم الهاتف.'
      : 'Company name, contact name, and phone number are required.'
    return
  }

  if (!/^01[0125][0-9]{8}$/.test(form.phone.trim())) {
    errorMessage.value = locale.value === 'ar'
      ? 'يرجى إدخال رقم هاتف مصري صحيح (مثال: 01012345678).'
      : 'Please enter a valid Egyptian mobile number (e.g. 01012345678).'
    return
  }

  if (selectedItems.value.length === 0) {
    errorMessage.value = locale.value === 'ar'
      ? 'يرجى إضافة منتج واحد على الأقل إلى عرض السعر.'
      : 'Please add at least one product to the quote.'
    return
  }

  submitting.value = true
  try {
    const res = await $fetch<{
      quoteId: string
      quoteNumber: string
      downloadUrl: string
      downloadUrlEn: string
      downloadUrlAr: string
    }>('/api/admin/quotes', {
      method: 'POST',
      body: {
        companyName: form.companyName.trim(),
        contactName: form.contactName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        notes: form.notes.trim() || undefined,
        discountType: discountType.value,
        discountValue: Number(discountValue.value) || 0,
        items: selectedItems.value.map(i => ({
          productId: i.isCustom ? null : i.productId || i.id,
          isCustom: !!i.isCustom,
          nameEn: i.nameEn,
          nameAr: i.nameAr,
          price: i.price,
          quantity: i.quantity,
          imagePath: i.coverImage,
          notes: i.notes || undefined,
        })),
      },
    })

    // Auto-trigger download for active locale
    const downloadTarget = locale.value === 'ar'
      ? (res.downloadUrlAr || res.downloadUrl)
      : (res.downloadUrlEn || res.downloadUrl)

    if (downloadTarget && typeof window !== 'undefined') {
      const a = document.createElement('a')
      a.href = downloadTarget
      a.download = `Quotation-${res.quoteNumber}-${locale.value.toUpperCase()}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }

    toast.success(
      locale.value === 'ar' ? 'تم إنشاء عرض السعر بنجاح' : 'Quote Created Successfully',
      locale.value === 'ar' ? `رقم العرض: ${res.quoteNumber}` : `Quotation #${res.quoteNumber}`,
    )

    // Redirect to quote detail view where both English and Arabic PDFs can be downloaded
    await router.push(localePath(`/admin/quotes/${res.quoteId}`))
  }
  catch (e: any) {
    errorMessage.value = e?.data?.message || (locale.value === 'ar' ? 'فشل إنشاء عرض السعر.' : 'Failed to create quote.')
  }
  finally {
    submitting.value = false
  }
}

const inputCls = 'h-10 w-full rounded-md border bg-white px-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520] dark:text-slate-100 transition-colors'
</script>

<template>
  <div>
    <!-- Page Header -->
    <AdminPageHeader
      :title="locale === 'ar' ? 'إنشاء عرض سعر جديد' : 'Create New Quote'"
      :description="locale === 'ar' ? 'إنشاء وتوثيق عرض أسعار رسمي معتمد نيابة عن العميل واستخراج ملفي PDF بالإنجليزية والعربية.' : 'Generate a formal price quotation and export official Arabic & English PDF documents.'"
      back-to="/admin/quotes"
      :back-label="locale === 'ar' ? 'العودة لعروض الأسعار' : 'Back to Quotes'"
    />

    <!-- Error Alert -->
    <div
      v-if="errorMessage"
      role="alert"
      class="mb-6 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
    >
      <AlertCircle class="h-4 w-4 shrink-0" />
      <span>{{ errorMessage }}</span>
    </div>

    <!-- 2-Column Form Layout -->
    <div class="grid gap-6 lg:grid-cols-12 items-start">
      
      <!-- Left Column: Product Selection & Line Items (7 cols) -->
      <div class="lg:col-span-7 space-y-6">
        
        <!-- Product Selection Card (Catalog Search or Custom Item) -->
        <div class="rounded-md border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
          <!-- Selection Mode Switcher -->
          <div class="mb-4 flex items-center justify-between border-b pb-3" :style="{ borderColor: 'var(--color-border)' }">
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors"
                :class="activeItemMode === 'catalog'
                  ? 'bg-[#2B71AE] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'"
                @click="activeItemMode = 'catalog'"
              >
                <Search class="h-3.5 w-3.5" />
                <span>{{ locale === 'ar' ? 'البحث في الكتالوج' : 'Catalog Products' }}</span>
              </button>

              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors"
                :class="activeItemMode === 'custom'
                  ? 'bg-[#2B71AE] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'"
                @click="activeItemMode = 'custom'"
              >
                <Plus class="h-3.5 w-3.5" />
                <span>{{ locale === 'ar' ? 'منتج مخصص / يدوي' : 'Custom Item' }}</span>
              </button>
            </div>

            <span class="text-[11px] font-mono text-slate-400">
              {{ activeItemMode === 'catalog' ? `${availableProducts.length} ${locale === 'ar' ? 'متاح' : 'available'}` : (locale === 'ar' ? 'إدخال يدوي' : 'Manual Entry') }}
            </span>
          </div>

          <!-- MODE 1: Catalog Search & Checklist -->
          <div v-if="activeItemMode === 'catalog'">
            <!-- Search Input Box -->
            <div class="relative mb-3.5">
              <Search class="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input
                v-model="productSearch"
                type="search"
                :placeholder="locale === 'ar' ? 'ابحث باسم المنتج أو الفئة (مثال: PLC، محرك، كابل)...' : 'Search products by name or category (e.g. PLC, motor, sensor)...'"
                class="h-10 w-full rounded-md border bg-slate-50 ps-9 pe-9 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#2B71AE] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520] dark:text-slate-100 dark:focus:bg-[#0B1520]"
                :style="{ borderColor: 'var(--color-border)' }"
                @input="onSearchInput"
              />
              <button
                v-if="productSearch"
                type="button"
                class="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                @click="clearSearch"
              >
                <X class="h-3.5 w-3.5" />
              </button>
            </div>

            <!-- Loading Indicator -->
            <div v-if="searching" class="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <Loader2 class="h-4 w-4 animate-spin text-[#2B71AE]" />
              <span>{{ locale === 'ar' ? 'جاري البحث في الكتالوج…' : 'Searching catalog…' }}</span>
            </div>

            <!-- Available Products Scrollable Checklist -->
            <div
              v-else-if="availableProducts.length > 0"
              class="max-h-72 overflow-y-auto space-y-1.5 pe-1 border rounded-md p-1.5 bg-slate-50/50 dark:bg-[#0B1520]/50"
              :style="{ borderColor: 'var(--color-border)' }"
            >
              <div
                v-for="p in availableProducts"
                :key="p.id"
                class="flex items-center justify-between gap-3 rounded-md p-2.5 transition-all cursor-pointer border"
                :class="isProductSelected(p.id)
                  ? 'bg-blue-50/70 border-[#2B71AE]/50 dark:bg-blue-950/40 dark:border-blue-700/60'
                  : 'bg-white border-slate-100 hover:bg-slate-100 dark:bg-[#162032] dark:border-slate-800 dark:hover:bg-slate-800/60'"
                @click="toggleProduct(p)"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    :checked="isProductSelected(p.id)"
                    class="h-4 w-4 rounded accent-[#2B71AE] pointer-events-none shrink-0"
                  />
                  <div class="h-10 w-10 shrink-0 overflow-hidden rounded border bg-slate-100 dark:bg-slate-800" :style="{ borderColor: 'var(--color-border)' }">
                    <img v-if="p.coverImage" :src="p.coverImage" alt="" class="h-full w-full object-cover" />
                    <div v-else class="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                      <Package class="h-4 w-4" />
                    </div>
                  </div>

                  <div class="min-w-0 text-xs">
                    <p class="font-bold text-slate-900 dark:text-slate-100 truncate">
                      {{ locale === 'ar' ? (p.nameAr || p.nameEn) : (p.nameEn || p.nameAr) }}
                    </p>
                    <div class="flex items-center gap-2 mt-0.5">
                      <span v-if="p.category" class="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {{ locale === 'ar' ? p.category.nameAr : p.category.nameEn }}
                      </span>
                      <span class="font-mono text-slate-500 font-semibold text-[11px]">{{ p.price }} EGP</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  class="inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2.5 text-xs font-semibold transition-all pointer-events-none"
                  :class="isProductSelected(p.id)
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'"
                >
                  <Check v-if="isProductSelected(p.id)" class="h-3 w-3" />
                  <Plus v-else class="h-3 w-3" />
                  <span>{{ isProductSelected(p.id) ? (locale === 'ar' ? 'مضاف' : 'Added') : (locale === 'ar' ? 'إضافة' : 'Add') }}</span>
                </button>
              </div>
            </div>

            <!-- Empty Search State -->
            <div v-else class="py-6 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed rounded-md p-4">
              <Package class="h-6 w-6 mx-auto mb-1.5 opacity-40" />
              <p>{{ locale === 'ar' ? 'لا توجد منتجات مطابقة لكلمات البحث.' : 'No products found matching your search.' }}</p>
              <button
                type="button"
                class="mt-2 text-xs font-semibold text-[#2B71AE] hover:underline dark:text-[#F5CC07]"
                @click="clearSearch"
              >
                {{ locale === 'ar' ? 'عرض الكتالوج الأساسي' : 'Reset to default list' }}
              </button>
            </div>
          </div>

          <!-- MODE 2: Custom / Manual Product Entry Form -->
          <div v-else class="space-y-3.5">
            <p class="text-xs text-slate-500 dark:text-slate-400 mb-2">
              {{ locale === 'ar' ? 'أدخل تفاصيل ومواصفات المنتج غير الموجود بالكتالوج وسيقوم النظام بتضمينه في ملف الـ PDF.' : 'Enter custom specifications for items not present in the catalog. They will be stamped in the PDF.' }}
            </p>

            <div class="grid gap-3 sm:grid-cols-2">
              <label class="block">
                <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Name (EN) *</span>
                <input v-model="customItemForm.nameEn" type="text" placeholder="e.g. Siemens S7-1200 Special Module" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
              </label>

              <label class="block">
                <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Name (AR)</span>
                <input v-model="customItemForm.nameAr" type="text" dir="rtl" placeholder="مثال: وحدة سيمنز S7-1200 مخصصة" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
              </label>
            </div>

            <div class="grid gap-3 sm:grid-cols-3">
              <label class="block">
                <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Unit Price (EGP) *</span>
                <input v-model="customItemForm.price" type="number" min="0" step="0.01" placeholder="0.00" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
              </label>

              <label class="block">
                <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Quantity</span>
                <input v-model.number="customItemForm.quantity" type="number" min="1" placeholder="1" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
              </label>

              <!-- Image Upload for Custom Item -->
              <div>
                <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ locale === 'ar' ? 'صورة المنتج' : 'Item Image' }}</span>
                <div class="flex items-center gap-2">
                  <div class="h-10 w-10 shrink-0 overflow-hidden rounded border bg-slate-100 dark:bg-slate-800" :style="{ borderColor: 'var(--color-border)' }">
                    <img v-if="customItemForm.imagePath" :src="customItemForm.imagePath" alt="" class="h-full w-full object-cover" />
                    <div v-else class="flex h-full w-full items-center justify-center text-slate-400">
                      <Package class="h-4 w-4" />
                    </div>
                  </div>
                  <label class="inline-flex cursor-pointer items-center justify-center gap-1 rounded-md border border-slate-300 px-2.5 h-10 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                    <UploadCloud class="h-3.5 w-3.5" />
                    <span>{{ uploadingCustomImage ? '…' : (locale === 'ar' ? 'رفع' : 'Upload') }}</span>
                    <input type="file" accept="image/*" class="hidden" @change="onCustomImageSelected" />
                  </label>
                </div>
              </div>
            </div>

            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ locale === 'ar' ? 'ملاحظات المواصفات الفنية للمنتج (تظهر في الـ PDF)' : 'Product Notes & Specs (appears in PDF)' }}</span>
              <input v-model="customItemForm.notes" type="text" :placeholder="locale === 'ar' ? 'مثال: شامل كابل التوصيل وبرمجة التهيئة الأولية' : 'e.g. Includes communication cables and pre-calibration'" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
            </label>

            <button
              type="button"
              class="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#2B71AE] px-4 text-xs font-bold text-white shadow-xs hover:bg-[#285E8E] transition-colors"
              @click="addCustomItem"
            >
              <Plus class="h-4 w-4" />
              <span>{{ locale === 'ar' ? 'إضافة المنتج المخصص إلى العرض' : 'Add Custom Item to Quote' }}</span>
            </button>
          </div>
        </div>

        <!-- Selected Items Table Card -->
        <div class="rounded-md border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
          <div class="mb-4 flex items-center justify-between border-b pb-3" :style="{ borderColor: 'var(--color-border)' }">
            <div class="flex items-center gap-2">
              <FileText class="h-4 w-4 text-[#2B71AE]" />
              <h2 class="font-heading text-base font-bold text-slate-900 dark:text-slate-100">
                {{ locale === 'ar' ? 'المنتجات المضافة لعرض السعر' : 'Quote Line Items' }}
              </h2>
            </div>
            <span class="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {{ selectedItems.length }} {{ locale === 'ar' ? 'منتجات' : 'items' }}
            </span>
          </div>

          <div v-if="selectedItems.length" class="space-y-3">
            <div class="overflow-x-auto">
              <table class="w-full text-start text-xs">
                <thead>
                  <tr class="border-b text-[11px] font-semibold uppercase tracking-wider text-slate-400" :style="{ borderColor: 'var(--color-border)' }">
                    <th scope="col" class="pb-2.5 text-start">{{ locale === 'ar' ? 'المنتج' : 'Product' }}</th>
                    <th scope="col" class="pb-2.5 text-end">{{ locale === 'ar' ? 'سعر الوحدة' : 'Unit Price' }}</th>
                    <th scope="col" class="pb-2.5 text-center">{{ locale === 'ar' ? 'الكمية' : 'Qty' }}</th>
                    <th scope="col" class="pb-2.5 text-end">{{ locale === 'ar' ? 'الإجمالي' : 'Subtotal' }}</th>
                    <th scope="col" class="pb-2.5 text-end"><span class="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
                  <tr v-for="item in selectedItems" :key="item.id" class="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td class="py-3 text-start">
                      <div class="flex items-start gap-2.5">
                        <div class="h-9 w-9 shrink-0 overflow-hidden rounded border bg-slate-100 dark:bg-slate-800" :style="{ borderColor: 'var(--color-border)' }">
                          <img v-if="item.coverImage" :src="item.coverImage" alt="" class="h-full w-full object-cover" />
                          <div v-else class="flex h-full w-full items-center justify-center text-slate-400">
                            <Package class="h-4 w-4" />
                          </div>
                        </div>
                        <div class="min-w-0 max-w-xs">
                          <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="font-bold text-slate-900 dark:text-slate-100 truncate">{{ item.name }}</span>
                            <span v-if="item.isCustom" class="rounded bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 px-1.5 py-0.2 text-[9px] font-bold">
                              {{ locale === 'ar' ? 'مخصص' : 'Custom' }}
                            </span>
                          </div>
                          <!-- Optional Notes input for this item -->
                          <input
                            v-model="item.notes"
                            type="text"
                            :placeholder="locale === 'ar' ? 'ملاحظة المنتج (اختياري)...' : 'Item note (optional)...'"
                            class="mt-1 h-6 w-full rounded border bg-transparent px-1.5 text-[10px] text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:border-[#2B71AE] focus:outline-none"
                            :style="{ borderColor: 'var(--color-border)' }"
                          />
                        </div>
                      </div>
                    </td>

                    <td class="py-3 text-end font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {{ item.price.toLocaleString() }} EGP
                    </td>

                    <td class="py-3 text-center whitespace-nowrap">
                      <div class="inline-flex h-7 items-center rounded border border-slate-200 bg-slate-50 px-1 dark:border-slate-700 dark:bg-slate-800">
                        <button
                          type="button"
                          class="flex h-5 w-5 items-center justify-center rounded text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
                          @click="updateQuantity(item.id, -1)"
                        >
                          <Minus class="h-3 w-3" />
                        </button>
                        <input
                          :value="item.quantity"
                          type="number"
                          min="1"
                          class="w-10 text-center font-mono text-xs font-bold text-slate-900 dark:text-white bg-transparent border-0 focus:outline-none"
                          @change="setQuantityDirect(item.id, $event)"
                        />
                        <button
                          type="button"
                          class="flex h-5 w-5 items-center justify-center rounded text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
                          @click="updateQuantity(item.id, 1)"
                        >
                          <Plus class="h-3 w-3" />
                        </button>
                      </div>
                    </td>

                    <td class="py-3 text-end font-mono font-bold text-[#2B71AE] dark:text-[#F5CC07] whitespace-nowrap">
                      {{ (item.price * item.quantity).toLocaleString() }} EGP
                    </td>

                    <td class="py-3 text-end">
                      <button
                        type="button"
                        class="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                        :title="locale === 'ar' ? 'حذف من العرض' : 'Remove item'"
                        @click="removeItem(item.id)"
                      >
                        <Trash2 class="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Discount Configuration Block -->
            <div class="rounded-md border p-3.5 bg-slate-50/70 dark:bg-slate-800/40" :style="{ borderColor: 'var(--color-border)' }">
              <div class="flex items-center gap-2 mb-2">
                <Tag class="h-3.5 w-3.5 text-[#D97706]" />
                <span class="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {{ locale === 'ar' ? 'تطبيق خصم على عرض السعر (اختياري)' : 'Apply Quote Discount (Optional)' }}
                </span>
              </div>

              <div class="grid gap-3 sm:grid-cols-3">
                <select
                  v-model="discountType"
                  class="h-9 rounded-md border bg-white px-2.5 text-xs text-slate-800 focus:border-[#2B71AE] focus:outline-none dark:bg-[#0B1520] dark:text-slate-100"
                  :style="{ borderColor: 'var(--color-border)' }"
                >
                  <option value="none">{{ locale === 'ar' ? 'بدون خصم' : 'No Discount' }}</option>
                  <option value="percentage">{{ locale === 'ar' ? 'نسبة مئوية (%)' : 'Percentage (%)' }}</option>
                  <option value="fixed">{{ locale === 'ar' ? 'مبلغ ثابت (EGP)' : 'Fixed Amount (EGP)' }}</option>
                </select>

                <div v-if="discountType !== 'none'" class="sm:col-span-2 flex items-center gap-2">
                  <input
                    v-model.number="discountValue"
                    type="number"
                    min="0"
                    :placeholder="discountType === 'percentage' ? 'e.g. 10 (%)' : 'e.g. 500 (EGP)'"
                    class="h-9 w-full rounded-md border bg-white px-3 text-xs text-slate-800 focus:border-[#2B71AE] focus:outline-none dark:bg-[#0B1520] dark:text-slate-100"
                    :style="{ borderColor: 'var(--color-border)' }"
                  />
                  <span v-if="discountAmount > 0" class="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                    -{{ discountAmount.toLocaleString() }} EGP
                  </span>
                </div>
              </div>
            </div>

            <!-- Totals Calculation Summary -->
            <div class="space-y-1.5 border-t pt-3 text-xs" :style="{ borderColor: 'var(--color-border)' }">
              <div v-if="discountAmount > 0" class="flex items-center justify-between text-slate-500">
                <span>{{ locale === 'ar' ? 'المجموع الفرعي:' : 'Subtotal:' }}</span>
                <span class="font-mono font-semibold">{{ subtotalAmount.toLocaleString() }} EGP</span>
              </div>

              <div v-if="discountAmount > 0" class="flex items-center justify-between text-amber-600 dark:text-amber-400 font-semibold">
                <span>{{ locale === 'ar' ? 'قيمة الخصم:' : 'Discount Amount:' }}</span>
                <span class="font-mono">-{{ discountAmount.toLocaleString() }} EGP</span>
              </div>

              <div class="flex items-center justify-between pt-2 border-t font-heading" :style="{ borderColor: 'var(--color-border)' }">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  {{ locale === 'ar' ? 'الإجمالي الكلي النهائي:' : 'Final Grand Total:' }}
                </span>
                <span class="font-mono text-xl font-black text-[#2B71AE] dark:text-[#F5CC07]">
                  {{ grandTotal.toLocaleString() }} EGP
                </span>
              </div>
            </div>
          </div>

          <!-- Empty Line Items State -->
          <div v-else class="py-8 text-center text-xs text-slate-400">
            <Package class="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>{{ locale === 'ar' ? 'لم يتم اختيار أي منتجات بعد.' : 'No products added to quote yet.' }}</p>
            <p class="text-[11px] text-slate-400 mt-0.5">{{ locale === 'ar' ? 'اختر منتجات من الكتالوج أو أضف منتجاً مخصصاً أعلاه.' : 'Select catalog products or add a custom item above.' }}</p>
          </div>
        </div>
      </div>

      <!-- Right Column: Customer & Company Details (5 cols) -->
      <div class="lg:col-span-5 space-y-6">
        <div class="rounded-md border bg-white p-5 sm:p-6 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
          <div class="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Building2 class="h-4 w-4 text-[#2B71AE]" />
            <h2 class="font-heading text-base font-bold text-slate-900 dark:text-slate-100">
              {{ locale === 'ar' ? 'بيانات العميل والمنشأة' : 'Customer & Company Info' }}
            </h2>
          </div>

          <form @submit.prevent="submitQuote" class="space-y-4">
            <label class="block">
              <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {{ locale === 'ar' ? 'اسم الشركة أو الجهة الطالبة *' : 'Company Name *' }}
              </span>
              <input
                v-model="form.companyName"
                type="text"
                required
                :placeholder="locale === 'ar' ? 'اسم المنشأة أو المصنع' : 'e.g. Nile Engineering Co.'"
                :class="inputCls"
                :style="{ borderColor: 'var(--color-border)' }"
              />
            </label>

            <label class="block">
              <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {{ locale === 'ar' ? 'اسم الشخص المسؤول *' : 'Contact Person *' }}
              </span>
              <input
                v-model="form.contactName"
                type="text"
                required
                :placeholder="locale === 'ar' ? 'اسم المهندس أو مسؤول المشتريات' : 'Contact name & title'"
                :class="inputCls"
                :style="{ borderColor: 'var(--color-border)' }"
              />
            </label>

            <label class="block">
              <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {{ locale === 'ar' ? 'رقم الهاتف للتواصل *' : 'Phone Number *' }}
              </span>
              <input
                v-model="form.phone"
                type="tel"
                required
                placeholder="01xxxxxxxxx"
                dir="ltr"
                :class="inputCls"
                :style="{ borderColor: 'var(--color-border)' }"
              />
            </label>

            <label class="block">
              <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {{ locale === 'ar' ? 'البريد الإلكتروني (اختياري)' : 'Email (Optional)' }}
              </span>
              <input
                v-model="form.email"
                type="email"
                placeholder="procurement@company.com"
                dir="ltr"
                :class="inputCls"
                :style="{ borderColor: 'var(--color-border)' }"
              />
            </label>

            <label class="block">
              <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {{ locale === 'ar' ? 'ملاحظات وشروط خاصة بالعرض (اختياري)' : 'Special Notes & Terms (Optional)' }}
              </span>
              <textarea
                v-model="form.notes"
                rows="3"
                class="w-full rounded-md border bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520] dark:text-slate-100"
                :style="{ borderColor: 'var(--color-border)' }"
                :placeholder="locale === 'ar' ? 'أي متطلبات فنية خاصة أو شروط توريد…' : 'Any specific delivery or technical requirements…'"
              ></textarea>
            </label>

            <!-- Bilingual Export Note -->
            <div class="rounded-md bg-blue-50/70 p-3 text-[11px] text-[#2B71AE] dark:bg-blue-950/40 dark:text-blue-300 leading-relaxed border border-blue-100 dark:border-blue-900/40">
              <span class="font-bold block mb-0.5">
                {{ locale === 'ar' ? '📄 استخراج نسختين منفصلتين (عربي + إنجليزي):' : '📄 Dual Document Generation (AR + EN):' }}
              </span>
              {{ locale === 'ar'
                ? 'يقوم النظام تلقائياً بتوليد وثيقتي PDF منفصلتين مطابقتين للنموذج المعتمد: وثيقة إنجليزية بنسق LTR وأخرى عربية باتجاه RTL مع تطبيق الخصم واسم المسؤول.'
                : 'The system automatically compiles two separate PDF files matching the approved template: one English (LTR) and one Arabic (RTL) with localized tables and discount lines.' }}
            </div>

            <div class="pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                :disabled="submitting || selectedItems.length === 0"
                class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#2B71AE] px-5 text-xs font-semibold text-white shadow-xs hover:bg-[#285E8E] active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
              >
                <Download v-if="!submitting" class="h-4 w-4" />
                <Loader2 v-else class="h-4 w-4 animate-spin" />
                <span>{{ submitting ? (locale === 'ar' ? 'جاري إنشاء العرض وتصدير PDF…' : 'Generating Quote & PDFs…') : (locale === 'ar' ? 'إنشاء وتصدير عرض السعر (PDF)' : 'Generate & Export Quote (PDF)') }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  </div>
</template>
