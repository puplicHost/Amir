<script setup lang="ts">
import { 
  AlertCircle, 
  ArrowLeft, 
  ArrowRight, 
  Building2, 
  CheckCircle2, 
  Download, 
  FileText, 
  Mail, 
  Minus, 
  Phone, 
  Plus, 
  ShieldCheck, 
  Trash2, 
  User 
} from 'lucide-vue-next'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const quoteStore = useQuoteStore()

useHead(() => ({ 
  title: `${locale.value === 'ar' ? 'طلب عرض سعر' : 'Price Quotation'} | ${t('brand.name')}` 
}))

const form = reactive({
  companyName: '',
  contactName: '',
  contactTitle: '',
  phone: '',
  email: '',
  notes: '',
})

const loading = ref(false)
const error = ref('')
const generatedQuote = ref<{
  quoteNumber: string
  downloadUrl: string
  downloadUrlEn?: string
  downloadUrlAr?: string
  quoteId: string
} | null>(null)

function updateQty(productId: string, qty: number) {
  quoteStore.updateQuantity(productId, qty)
}

function removeItem(productId: string) {
  quoteStore.removeItem(productId)
}

async function submitQuote() {
  if (loading.value || !quoteStore.items.length) return
  error.value = ''

  if (!form.companyName.trim() || !form.contactName.trim() || !form.phone.trim()) {
    error.value = locale.value === 'ar' 
      ? 'يرجى إدخال اسم الشركة، اسم المسؤول، ورقم الهاتف.' 
      : 'Company name, contact person name, and phone are required.'
    return
  }

  if (!/^01[0125][0-9]{8}$/.test(form.phone.trim())) {
    error.value = locale.value === 'ar' 
      ? 'يرجى إدخال رقم هاتف مصري صحيح (مثال: 01012345678)' 
      : 'Please enter a valid Egyptian mobile number (e.g. 01012345678)'
    return
  }

  loading.value = true
  try {
    const res = await $fetch<{ quoteNumber: string, downloadUrl: string, downloadUrlEn?: string, downloadUrlAr?: string, quoteId: string }>('/api/quotes', {
      method: 'POST',
      body: {
        companyName: form.companyName.trim(),
        contactName: form.contactName.trim(),
        contactTitle: form.contactTitle.trim() || undefined,
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        notes: form.notes.trim() || undefined,
        locale: locale.value,
        items: quoteStore.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
      },
    })

    generatedQuote.value = res
    quoteStore.clearQuote()

    // Automatically trigger PDF download in active language
    const autoDownloadUrl = locale.value === 'ar' ? (res.downloadUrlAr || res.downloadUrl) : (res.downloadUrlEn || res.downloadUrl)
    if (autoDownloadUrl && typeof window !== 'undefined') {
      const a = document.createElement('a')
      a.href = autoDownloadUrl
      a.download = `Quotation-${res.quoteNumber}-${locale.value.toUpperCase()}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }
  catch (e: any) {
    error.value = e?.data?.message || (locale.value === 'ar' ? 'فشل إنشاء عرض السعر. يرجى المحاولة مرة أخرى.' : 'Failed to generate quote. Please try again.')
  }
  finally {
    loading.value = false
  }
}

const inputCls = 'h-11 w-full rounded-xl border bg-slate-50 px-3.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2B71AE] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520] dark:text-slate-100 dark:focus:bg-[#0B1520] transition-colors'
</script>

<template>
  <div class="space-y-0">
    <!-- Header Banner -->
    <div class="relative overflow-hidden bg-[#0B1520] text-white border-b border-slate-800">
      <div class="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#2B71AE]/20 blur-3xl"></div>
      <div 
        class="pointer-events-none absolute inset-0 opacity-[0.06]" 
        style="background-image: radial-gradient(#2B71AE 1px, transparent 1px); background-size: 24px 24px;"
      ></div>

      <div class="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <nav class="mb-4 flex items-center gap-1.5 text-xs font-medium text-slate-400" aria-label="Breadcrumb">
          <NuxtLink :to="localePath('/')" class="hover:text-white transition-colors">{{ t('nav.home') }}</NuxtLink>
          <span class="text-slate-600">/</span>
          <NuxtLink :to="localePath('/products')" class="hover:text-white transition-colors">{{ t('products.title') }}</NuxtLink>
          <span class="text-slate-600">/</span>
          <span class="text-[#F5CC07] font-semibold">{{ locale === 'ar' ? 'طلب عرض سعر' : 'Price Quotation' }}</span>
        </nav>

        <div class="max-w-3xl">
          <div class="inline-flex items-center gap-1.5 rounded-full bg-[#F5CC07]/20 border border-[#F5CC07]/30 px-3.5 py-1 text-xs font-bold text-[#F5CC07] uppercase tracking-wider mb-3">
            <FileText class="h-3.5 w-3.5" />
            <span>{{ locale === 'ar' ? 'عروض أسعار فورية للشركات والمهندسين' : 'B2B & Engineering Price Quotes' }}</span>
          </div>
          <h1 class="font-heading text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
            {{ locale === 'ar' ? 'إنشاء وتحميل عرض سعر رسمي معتمد' : 'Generate Official Price Quotation (PDF)' }}
          </h1>
          <p class="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            {{ locale === 'ar' 
              ? 'راجع المنتجات والمكونات المختارة، وأدخل بيانات منشأتك لاستخراج مستند PDF رسمي بأسعار وضمان مانجو إلكترونيكس.' 
              : 'Review your selected industrial items and enter your company credentials to download a formal, verified PDF quotation.' }}
          </p>
        </div>
      </div>
    </div>

    <!-- Main Container -->
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      
      <!-- SUCCESS STATE: Quote Generated -->
      <div 
        v-if="generatedQuote"
        class="mx-auto max-w-2xl rounded-2xl border border-slate-200/90 bg-white p-8 sm:p-10 text-center shadow-xs dark:border-slate-800 dark:bg-[#162032]"
      >
        <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 ring-8 ring-emerald-50 dark:ring-emerald-950/20">
          <CheckCircle2 class="h-10 w-10" />
        </div>

        <h2 class="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-2">
          {{ locale === 'ar' ? 'تم إنشاء وحفظ عرض السعر بنجاح!' : 'Quotation Generated Successfully!' }}
        </h2>
        
        <p class="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-6">
          {{ locale === 'ar' 
            ? 'تم تجهيز ملف الـ PDF وحفظ الطلب في سجلاتنا. يمكنك تحميل الملف مجدداً في أي وقت.' 
            : 'Your official quotation document has been compiled and saved. You can re-download the file below.' }}
        </p>

        <!-- Quote Details Chip -->
        <div class="mx-auto mb-8 max-w-xs rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
          <span class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            {{ locale === 'ar' ? 'رقم العرض المرجعي' : 'Quotation Number' }}
          </span>
          <p class="font-mono text-xl font-black text-[#2B71AE] dark:text-[#F5CC07]">
            {{ generatedQuote.quoteNumber }}
          </p>
        </div>

        <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            :href="`/api/quotes/${generatedQuote.quoteId}/pdf?locale=ar`"
            target="_blank"
            download
            class="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#2B71AE] px-6 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-[#285E8E] active:scale-95 transition-all"
          >
            <Download class="h-4 w-4" />
            <span>تحميل PDF (عربي)</span>
          </a>

          <a
            :href="`/api/quotes/${generatedQuote.quoteId}/pdf?locale=en`"
            target="_blank"
            download
            class="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#162032] dark:text-slate-200 dark:hover:bg-slate-800 active:scale-95 transition-all"
          >
            <Download class="h-4 w-4" />
            <span>Download PDF (English)</span>
          </a>

          <NuxtLink
            :to="localePath('/products')"
            class="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#162032] dark:text-slate-200 dark:hover:bg-slate-800 active:scale-95 transition-all"
          >
            <span>{{ locale === 'ar' ? 'تصفح المزيد من المنتجات' : 'Browse More Products' }}</span>
          </NuxtLink>
        </div>
      </div>

      <!-- ACTIVE QUOTE VIEW -->
      <div v-else-if="quoteStore.items.length" class="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        <!-- Left Column: Selected Products Review (7 cols) -->
        <div class="lg:col-span-7 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
            <h2 class="font-heading text-lg font-bold text-slate-900 dark:text-white">
              {{ locale === 'ar' ? 'المنتجات المحددة لعرض السعر' : 'Selected Products for Quote' }}
            </h2>
            <button
              type="button"
              class="text-xs font-semibold text-rose-600 hover:underline dark:text-rose-400"
              @click="quoteStore.clearQuote()"
            >
              {{ locale === 'ar' ? 'إلغاء الكل' : 'Clear All' }}
            </button>
          </div>

          <!-- Items List -->
          <div class="space-y-3.5">
            <div
              v-for="item in quoteStore.items"
              :key="item.productId"
              class="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#162032]"
            >
              <!-- Thumbnail -->
              <div class="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800">
                <img v-if="item.coverImage" :src="item.coverImage" :alt="locale === 'ar' ? item.nameAr : item.nameEn" class="h-full w-full object-cover" />
                <div v-else class="flex h-full w-full items-center justify-center text-[10px] text-slate-400">{{ t('common.noImage') }}</div>
              </div>

              <!-- Product Info -->
              <div class="flex-1 min-w-0">
                <NuxtLink :to="localePath(`/p/${item.slug}`)" class="font-heading text-sm font-bold text-slate-900 hover:text-[#2B71AE] dark:text-white dark:hover:text-[#F5CC07] transition-colors line-clamp-1">
                  {{ locale === 'ar' ? item.nameAr : item.nameEn }}
                </NuxtLink>
                <p class="font-mono text-xs text-slate-500 mt-0.5">
                  {{ item.price }} EGP
                </p>
              </div>

              <!-- Controls: Quantity Stepper & Subtotal & Remove -->
              <div class="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                <!-- Stepper -->
                <div class="flex h-8 items-center rounded-lg border border-slate-200 bg-slate-50 px-1 dark:border-slate-800 dark:bg-slate-800">
                  <button 
                    type="button" 
                    class="flex h-6 w-6 items-center justify-center rounded text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700" 
                    @click="updateQty(item.productId, item.quantity - 1)"
                  >
                    <Minus class="h-3 w-3" />
                  </button>
                  <span class="w-7 text-center font-mono text-xs font-bold text-slate-900 dark:text-white">{{ item.quantity }}</span>
                  <button 
                    type="button" 
                    class="flex h-6 w-6 items-center justify-center rounded text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700" 
                    @click="updateQty(item.productId, item.quantity + 1)"
                  >
                    <Plus class="h-3 w-3" />
                  </button>
                </div>

                <!-- Subtotal -->
                <span class="font-mono text-xs font-bold text-[#2B71AE] dark:text-[#F5CC07]">
                  {{ (item.price * item.quantity).toLocaleString() }} EGP
                </span>

                <!-- Delete -->
                <button
                  type="button"
                  class="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1"
                  @click="removeItem(item.productId)"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- Total Calculation Bar -->
          <div class="flex items-center justify-between rounded-xl bg-slate-50 p-4 border border-slate-200/80 dark:border-slate-800 dark:bg-slate-800/40">
            <span class="font-heading text-sm font-bold text-slate-900 dark:text-white">
              {{ locale === 'ar' ? 'إجمالي قيمة العرض التقديرية' : 'Estimated Quotation Total' }}
            </span>
            <span class="font-mono text-lg font-black text-[#2B71AE] dark:text-[#F5CC07]">
              {{ quoteStore.totalAmount.toLocaleString() }} EGP
            </span>
          </div>
        </div>

        <!-- Right Column: Company & Contact Information Form (5 cols) -->
        <div class="lg:col-span-5">
          <div class="sticky top-24 rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs dark:border-slate-800 dark:bg-[#162032]">
            <div class="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Building2 class="h-4 w-4 text-[#2B71AE] dark:text-[#F5CC07]" />
              <h2 class="font-heading text-base font-bold text-slate-900 dark:text-white">
                {{ locale === 'ar' ? 'بيانات الشركة والاتصال' : 'Company & Contact Details' }}
              </h2>
            </div>

            <!-- Error Banner -->
            <div 
              v-if="error" 
              role="alert" 
              class="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
            >
              <AlertCircle class="h-4 w-4 shrink-0" />
              <span>{{ error }}</span>
            </div>

            <form @submit.prevent="submitQuote" class="space-y-4">
              <label class="block">
                <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {{ locale === 'ar' ? 'اسم الشركة أو الجهة *' : 'Company / Entity Name *' }}
                </span>
                <input
                  v-model="form.companyName"
                  type="text"
                  required
                  :placeholder="locale === 'ar' ? 'مثال: شركة الأمل للصناعات الهندسية' : 'e.g. Acme Automation Ltd.'"
                  :class="inputCls"
                  :style="{ borderColor: 'var(--color-border)' }"
                />
              </label>

              <label class="block">
                <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {{ locale === 'ar' ? 'اسم الشخص المسؤول *' : 'Contact Person Name *' }}
                </span>
                <input
                  v-model="form.contactName"
                  type="text"
                  required
                  :placeholder="locale === 'ar' ? 'اسم المهندس أو المشتريات' : 'Name of contact engineer or buyer'"
                  :class="inputCls"
                  :style="{ borderColor: 'var(--color-border)' }"
                />
              </label>

              <label class="block">
                <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {{ locale === 'ar' ? 'المسمى الوظيفي (اختياري)' : 'Job Title (Optional)' }}
                </span>
                <input
                  v-model="form.contactTitle"
                  type="text"
                  maxlength="120"
                  :placeholder="locale === 'ar' ? 'مثال: مدير المشتريات' : 'e.g. Purchasing Manager'"
                  :class="inputCls"
                  :style="{ borderColor: 'var(--color-border)' }"
                />
              </label>

              <label class="block">
                <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
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
                <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
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
                <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {{ locale === 'ar' ? 'ملاحظات أو متطلبات خاصة (اختياري)' : 'Notes / Special Requirements' }}
                </span>
                <textarea
                  v-model="form.notes"
                  rows="2"
                  class="w-full rounded-xl border bg-slate-50 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#2B71AE] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520] dark:text-slate-100"
                  :style="{ borderColor: 'var(--color-border)' }"
                  :placeholder="locale === 'ar' ? 'أي شروط توريد، تاريخ مطلوب، أو متطلبات فنية...' : 'Any delivery schedule or technical requirements...'"
                ></textarea>
              </label>

              <div class="pt-2">
                <button
                  type="submit"
                  :disabled="loading"
                  class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2B71AE] px-6 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-[#285E8E] active:scale-[0.98] disabled:opacity-50 transition-all"
                >
                  <Download v-if="!loading" class="h-4 w-4" />
                  <span>{{ loading ? (locale === 'ar' ? 'جاري تجهيز وتحميل الـ PDF...' : 'Generating PDF...') : (locale === 'ar' ? 'استخراج وتحميل عرض السعر (PDF)' : 'Generate & Download PDF Quote') }}</span>
                </button>
              </div>

              <!-- Guarantee strip -->
              <div class="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <div class="flex items-center gap-1.5">
                  <ShieldCheck class="h-3.5 w-3.5 text-[#F5CC07] shrink-0" />
                  <span>{{ locale === 'ar' ? 'عروض الأسعار معتمدة رسمياً ومختومة من مانجو إلكترونيكس' : 'Official stamped quotation document valid for 30 days' }}</span>
                </div>
              </div>
            </form>
          </div>
        </div>

      </div>

      <!-- EMPTY STATE: No Products Selected -->
      <div 
        v-else 
        class="rounded-2xl border border-slate-200/90 bg-white p-12 sm:p-16 text-center shadow-xs dark:border-slate-800 dark:bg-[#162032]"
      >
        <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#2B71AE]/10 text-[#2B71AE] dark:bg-[#F5CC07]/15 dark:text-[#F5CC07]">
          <FileText class="h-8 w-8" />
        </div>
        <h2 class="font-heading text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {{ locale === 'ar' ? 'لم تقم بتحديد أي منتجات لعرض السعر' : 'No Products Selected for Quotation' }}
        </h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
          {{ locale === 'ar' 
            ? 'تصفح كتالوج المنتجات واضغط على "عرض سعر" على أي منتج ترغب في إضافته إلى مقايسة الأسعار.' 
            : 'Explore the product catalog and click "Quote" on any item to add it to your price quotation.' }}
        </p>
        <NuxtLink 
          :to="localePath('/products')" 
          class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2B71AE] px-7 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#285E8E] active:scale-95 transition-all"
        >
          <span>{{ locale === 'ar' ? 'تصفح الكتالوج والمنتجات' : 'Browse Product Catalog' }}</span>
          <ArrowRight class="h-4 w-4 rtl:rotate-180" />
        </NuxtLink>
      </div>

    </div>
  </div>
</template>
