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
  Trash2, 
  User, 
  X 
} from 'lucide-vue-next'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t, locale } = useI18n()
const localePath = useLocalePath()
const router = useRouter()

useHead(() => ({ 
  title: `${locale.value === 'ar' ? 'إنشاء عرض سعر جديد' : 'Create New Quote'} | ${t('brand.name')}` 
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
  name: string
  categoryName?: string
  price: number
  coverImage: string | null
  quantity: number
}

const selectedItems = ref<SelectedItem[]>([])

// Product Search & Selection State
const productSearch = ref('')
const searchResults = ref<any[]>([])
const searching = ref(false)
let searchDebounceTimer: any = null

// Initial catalog products (loaded on mount so list is never empty before typing)
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
  return selectedItems.value.some(i => i.id === id)
}

function toggleProduct(p: any) {
  const existingIndex = selectedItems.value.findIndex(i => i.id === p.id)
  if (existingIndex >= 0) {
    selectedItems.value.splice(existingIndex, 1)
  }
  else {
    const name = locale.value === 'ar' ? (p.nameAr || p.nameEn) : (p.nameEn || p.nameAr)
    const categoryName = p.category ? (locale.value === 'ar' ? p.category.nameAr : p.category.nameEn) : ''
    selectedItems.value.push({
      id: p.id,
      name,
      categoryName,
      price: Number(p.price),
      coverImage: p.coverImage || null,
      quantity: 1,
    })
  }
}

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

const grandTotal = computed(() => {
  return selectedItems.value.reduce((sum, item) => sum + (item.price * item.quantity), 0)
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
    const res = await $fetch<{ quoteId: string, quoteNumber: string, downloadUrl: string }>('/api/admin/quotes', {
      method: 'POST',
      body: {
        companyName: form.companyName.trim(),
        contactName: form.contactName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        notes: form.notes.trim() || undefined,
        locale: locale.value,
        items: selectedItems.value.map(i => ({ productId: i.id, quantity: i.quantity })),
      },
    })

    // Trigger instant PDF download for admin convenience
    if (res.downloadUrl && typeof window !== 'undefined') {
      const a = document.createElement('a')
      a.href = res.downloadUrl
      a.download = `Quotation-${res.quoteNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }

    // Redirect to the newly created quote detail view
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
      :description="locale === 'ar' ? 'إنشاء وتوثيق عرض أسعار رسمي معتمد نيابة عن العميل واستخراج ملف PDF فوراً.' : 'Generate a formal price quotation on behalf of a client and export an official PDF document.'"
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
      
      <!-- Left Column: Product Search & Line Items (7 cols) -->
      <div class="lg:col-span-7 space-y-6">
        
        <!-- Product Search & Live Checklist Selector Card -->
        <div class="rounded-md border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
          <div class="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div class="flex items-center gap-2">
              <Search class="h-4 w-4 text-[#2B71AE]" />
              <h2 class="font-heading text-base font-bold text-slate-900 dark:text-slate-100">
                {{ locale === 'ar' ? 'اختيار المنتجات وإضافتها' : 'Search & Select Products' }}
              </h2>
            </div>
            <span class="text-[11px] font-mono text-slate-400">
              {{ availableProducts.length }} {{ locale === 'ar' ? 'متاح' : 'available' }}
            </span>
          </div>

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
              <!-- Checkbox & Thumbnail & Name Info -->
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

              <!-- Selection Indicator Button -->
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

        <!-- Selected Items Table Card -->
        <div class="rounded-md border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
          <div class="mb-4 flex items-center justify-between border-b pb-3" :style="{ borderColor: 'var(--color-border)' }">
            <div class="flex items-center gap-2">
              <FileText class="h-4 w-4 text-[#2B71AE]" />
              <h2 class="font-heading text-base font-bold text-slate-900 dark:text-slate-100">
                {{ locale === 'ar' ? 'المنتجات المضافة للعرض' : 'Quote Line Items' }}
              </h2>
            </div>
            <span class="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {{ selectedItems.length }} {{ locale === 'ar' ? 'منتجات' : 'items' }}
            </span>
          </div>

          <div v-if="selectedItems.length" class="overflow-x-auto">
            <table class="w-full text-start text-xs">
              <thead>
                <tr class="border-b text-[11px] font-semibold uppercase tracking-wider text-slate-400" :style="{ borderColor: 'var(--color-border)' }">
                  <th scope="col" class="pb-2.5 text-start">{{ locale === 'ar' ? 'المنتج' : 'Product' }}</th>
                  <th scope="col" class="pb-2.5 text-end">{{ locale === 'ar' ? 'سعر الوحدة' : 'Price' }}</th>
                  <th scope="col" class="pb-2.5 text-center">{{ locale === 'ar' ? 'الكمية' : 'Qty' }}</th>
                  <th scope="col" class="pb-2.5 text-end">{{ locale === 'ar' ? 'الإجمالي' : 'Subtotal' }}</th>
                  <th scope="col" class="pb-2.5 text-end"><span class="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
                <tr v-for="item in selectedItems" :key="item.id" class="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td class="py-2.5 text-start">
                    <div class="flex items-center gap-2.5">
                      <div class="h-9 w-9 shrink-0 overflow-hidden rounded border bg-slate-100 dark:bg-slate-800" :style="{ borderColor: 'var(--color-border)' }">
                        <img v-if="item.coverImage" :src="item.coverImage" alt="" class="h-full w-full object-cover" />
                        <div v-else class="flex h-full w-full items-center justify-center text-slate-400">
                          <Package class="h-4 w-4" />
                        </div>
                      </div>
                      <span class="font-bold text-slate-900 dark:text-slate-100 line-clamp-1 max-w-xs">{{ item.name }}</span>
                    </div>
                  </td>

                  <td class="py-2.5 text-end font-mono text-slate-700 dark:text-slate-300">
                    {{ item.price }} EGP
                  </td>

                  <td class="py-2.5 text-center">
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

                  <td class="py-2.5 text-end font-mono font-bold text-[#2B71AE] dark:text-[#F5CC07]">
                    {{ (item.price * item.quantity).toLocaleString() }} EGP
                  </td>

                  <td class="py-2.5 text-end">
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

          <!-- Empty Line Items State -->
          <div v-else class="py-8 text-center text-xs text-slate-400">
            <Package class="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>{{ locale === 'ar' ? 'لم يتم اختيار أي منتجات بعد.' : 'No products added to quote yet.' }}</p>
            <p class="text-[11px] text-slate-400 mt-0.5">{{ locale === 'ar' ? 'اختر المنتجات من القائمة المتاحة أعلاه لتظهر هنا.' : 'Check products from the list above to add them to this quote.' }}</p>
          </div>

          <!-- Total Calculation Footer -->
          <div class="mt-4 flex items-center justify-between border-t pt-4" :style="{ borderColor: 'var(--color-border)' }">
            <span class="font-heading text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              {{ locale === 'ar' ? 'إجمالي قيمة العرض' : 'Total Quote Value' }}
            </span>
            <span class="font-mono text-xl font-black text-[#2B71AE] dark:text-[#F5CC07]">
              {{ grandTotal.toLocaleString() }} EGP
            </span>
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
                :placeholder="locale === 'ar' ? 'اسم المهندس أو مسؤول المشتريات' : 'Contact name'"
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

            <div class="pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                :disabled="submitting || selectedItems.length === 0"
                class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#2B71AE] px-5 text-xs font-semibold text-white shadow-xs hover:bg-[#285E8E] active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
              >
                <Download v-if="!submitting" class="h-4 w-4" />
                <Loader2 v-else class="h-4 w-4 animate-spin" />
                <span>{{ submitting ? (locale === 'ar' ? 'جاري إنشاء العرض وتصدير PDF…' : 'Generating Quote & PDF…') : (locale === 'ar' ? 'إنشاء وتصدير عرض السعر (PDF)' : 'Generate & Export Quote (PDF)') }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  </div>
</template>
