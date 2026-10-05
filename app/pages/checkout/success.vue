<script setup lang="ts">
import { 
  AlertCircle, 
  ArrowRight, 
  Check, 
  CheckCircle2, 
  Clock, 
  Copy, 
  CreditCard, 
  FileText, 
  Home, 
  MapPin, 
  PackageCheck, 
  Phone, 
  PhoneCall, 
  Printer, 
  ShieldCheck, 
  ShoppingBag, 
  Truck, 
  User 
} from 'lucide-vue-next'
import IconWhatsApp from '~/components/app/IconWhatsApp.vue'
import { GOVERNORATES } from '~~/shared/constants/governorates'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const orderNumber = String(route.query.id || '')

useHead(() => ({
  title: `${locale.value === 'ar' ? 'تم تأكيد الطلب' : 'Order Confirmed'} | ${t('brand.name')}`
}))

interface OrderItem {
  id: string
  productNameSnapshot: string
  productPriceSnapshot: string | number
  quantity: number
  subtotal: string | number
  product?: {
    slug: string
    images?: { path: string }[]
  } | null
}

interface OrderData {
  orderNumber: string
  customerName: string
  customerPhone: string
  customerGovernorat: string
  customerAddress?: string | null
  customerEmail?: string | null
  totalAmount?: string | number | null
  paymentMethod?: string | null
  status?: string | null
  createdAt?: string | null
  items?: OrderItem[]
}

const { data: order } = await useAsyncData(
  () => `order-success-${orderNumber}`,
  () => orderNumber
    ? $fetch<OrderData>(`/api/orders/${orderNumber}`)
    : Promise.resolve(null),
  { server: true, lazy: true },
)

const { data: contact } = await useAsyncData('success-contact', () =>
  $fetch<{ 
    contactPhone1: string | null
    contactPhone2: string | null
    contactWhatsapp: string | null 
  }>('/api/settings/contact'),
  { server: true, lazy: true },
)

const governorateLabel = computed(() => {
  const val = order.value?.customerGovernorat || ''
  const found = (GOVERNORATES as readonly { value: string, labelAr: string, labelEn: string }[]).find(g => g.value === val)
  if (found) return locale.value === 'ar' ? found.labelAr : found.labelEn
  return val
})

const phone1 = computed(() => contact.value?.contactPhone1 || '+20 100 000 0000')
const phone2 = computed(() => contact.value?.contactPhone2 || '+20 100 000 0001')
const whatsappNumber = computed(() => contact.value?.contactWhatsapp || phone1.value)

const formattedDate = computed(() => {
  if (!order.value?.createdAt) return ''
  try {
    return new Date(order.value.createdAt).toLocaleDateString(locale.value === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  catch {
    return ''
  }
})

const copied = ref(false)
async function copyOrderNumber() {
  if (!orderNumber) return
  try {
    await navigator.clipboard.writeText(orderNumber)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
  catch { /* clipboard fallback */ }
}

function handlePrint() {
  if (typeof window !== 'undefined') {
    window.print()
  }
}

const whatsappUrl = computed(() => {
  const rawNum = whatsappNumber.value.replace(/[^0-9]/g, '')
  const msg = locale.value === 'ar'
    ? `مرحباً مانجو إلكترونيكس، بخصوص طلبي رقم ${orderNumber}`
    : `Hello Mango Electronics, regarding my order #${orderNumber}`
  return `https://wa.me/${rawNum}?text=${encodeURIComponent(msg)}`
})

onMounted(() => {
  if (!orderNumber) navigateTo(localePath('/'))
})
</script>

<template>
  <div class="relative min-h-[80vh] overflow-hidden py-8 sm:py-14 print:py-0 print:bg-white selection:bg-[#F5CC07] selection:text-slate-950">
    <!-- Ambient Background Lighting -->
    <div class="pointer-events-none absolute -top-40 start-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/15 print:hidden" />
    <div class="pointer-events-none absolute top-72 end-10 h-80 w-80 rounded-full bg-[#2B71AE]/10 blur-3xl dark:bg-[#2B71AE]/15 print:hidden" />

    <div class="relative mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
      
      <!-- Top Celebratory Hero Banner -->
      <div class="text-center pb-8 sm:pb-10">
        <!-- Animated Ring Badge -->
        <div class="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/25 ring-8 ring-emerald-500/15 dark:ring-emerald-500/20 transition-transform duration-300 hover:scale-105">
          <CheckCircle2 class="h-10 w-10 stroke-[2.5]" aria-hidden="true" />
          <span class="absolute -bottom-1 -end-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#F5CC07] text-slate-950 shadow-md">
            <PackageCheck class="h-3.5 w-3.5 stroke-[2.5]" />
          </span>
        </div>

        <!-- Pill Status Indicator -->
        <div class="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
          <span class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{{ locale === 'ar' ? 'تم استلام وتأكيد طلبك بنجاح' : 'Order Placed & Confirmed' }}</span>
        </div>

        <h1 class="font-heading text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2 leading-tight">
          {{ locale === 'ar' ? 'شكراً لثقتكم في مانجو إلكترونيكس!' : 'Thank you for your order!' }}
        </h1>
        
        <p class="mx-auto max-w-xl text-xs sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          {{ locale === 'ar' 
            ? 'تم تسجيل طلبك بنجاح في نظام التوريدات الصناعية. سنقوم بالتواصل معك هاتفياً لتأكيد الشحن وموعد الاستلام.' 
            : 'Your order is confirmed in our industrial procurement system. Our team will contact you shortly to coordinate delivery.' }}
        </p>
      </div>

      <!-- Quick Action Bar: Copy Order # + Print Receipt + WhatsApp Chat -->
      <div 
        class="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:px-5 sm:py-3.5 shadow-xs dark:border-slate-800 dark:bg-[#162032] print:border-none print:shadow-none"
        :style="{ borderColor: 'var(--color-border)' }"
      >
        <div class="flex items-center gap-2.5">
          <span class="text-xs font-bold text-slate-500 dark:text-slate-400">
            {{ locale === 'ar' ? 'رقم الطلب:' : 'Order #:' }}
          </span>
          <span class="font-mono text-base sm:text-lg font-black text-[#2B71AE] dark:text-[#F5CC07]">
            {{ orderNumber }}
          </span>
          <button
            type="button"
            class="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 text-[11px] font-bold text-slate-700 hover:bg-slate-100 active:scale-95 dark:border-slate-700 dark:bg-[#0B1520] dark:text-slate-300 dark:hover:bg-slate-800 transition-all print:hidden"
            :title="locale === 'ar' ? 'نسخ رقم الطلب' : 'Copy Order #'"
            @click="copyOrderNumber"
          >
            <Check v-if="copied" class="h-3 w-3 text-emerald-500 stroke-[3]" />
            <Copy v-else class="h-3 w-3 text-slate-400" />
            <span>{{ copied ? (locale === 'ar' ? 'تم النسخ' : 'Copied') : (locale === 'ar' ? 'نسخ' : 'Copy') }}</span>
          </button>
        </div>

        <div class="flex items-center gap-2 print:hidden">
          <a
            :href="whatsappUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-50 px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 transition-colors"
          >
            <IconWhatsApp class="h-3.5 w-3.5 fill-current text-emerald-600 dark:text-emerald-400" />
            <span class="hidden sm:inline">{{ locale === 'ar' ? 'تأكيد عبر واتساب' : 'WhatsApp' }}</span>
          </a>

          <button
            type="button"
            class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#0B1520] dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            @click="handlePrint"
          >
            <Printer class="h-3.5 w-3.5 text-slate-400" />
            <span class="hidden sm:inline">{{ locale === 'ar' ? 'طباعة الإيصال' : 'Print Receipt' }}</span>
          </button>
        </div>
      </div>

      <!-- Main Content Grid (2 Columns on Desktop) -->
      <div class="grid gap-6 lg:grid-cols-12 lg:gap-8 items-start">
        
        <!-- Left / Primary Column (7 cols): Timeline + Order Items Breakdown -->
        <div class="lg:col-span-7 space-y-6">
          
          <!-- 3-Step Delivery Progress Tracker Card -->
          <div 
            class="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-[#162032] transition-colors"
            :style="{ borderColor: 'var(--color-border)' }"
          >
            <h2 class="font-heading text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center justify-between">
              <span>{{ locale === 'ar' ? 'مراحل تنفيذ وتجهيز الطلب' : 'Fulfillment Status' }}</span>
              <span v-if="formattedDate" class="text-[11px] font-normal text-slate-400 font-mono">{{ formattedDate }}</span>
            </h2>

            <div class="grid grid-cols-3 gap-2 text-center pt-2">
              <!-- Step 1 -->
              <div class="flex flex-col items-center">
                <div class="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs">
                  <Check class="h-4 w-4 stroke-[3]" />
                </div>
                <span class="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {{ locale === 'ar' ? 'تم استلام الطلب' : 'Order Placed' }}
                </span>
                <span class="text-[10px] text-slate-400 hidden sm:block mt-0.5">
                  {{ locale === 'ar' ? 'مسجل ومؤكد' : 'Confirmed' }}
                </span>
              </div>

              <!-- Step 2 -->
              <div class="flex flex-col items-center">
                <div class="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#2B71AE] text-white shadow-xs dark:bg-[#F5CC07] dark:text-slate-950">
                  <PhoneCall class="h-4 w-4 animate-bounce" />
                  <span class="absolute -top-1 -end-1 flex h-2.5 w-2.5">
                    <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2B71AE] dark:bg-[#F5CC07] opacity-75" />
                    <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#2B71AE] dark:bg-[#F5CC07]" />
                  </span>
                </div>
                <span class="mt-2 text-xs font-bold text-[#2B71AE] dark:text-[#F5CC07]">
                  {{ locale === 'ar' ? 'التأكيد الهاتفي' : 'Phone Confirmation' }}
                </span>
                <span class="text-[10px] text-slate-400 hidden sm:block mt-0.5 font-semibold text-[#2B71AE] dark:text-[#F5CC07]">
                  {{ locale === 'ar' ? 'الخطوة الحالية' : 'Current Step' }}
                </span>
              </div>

              <!-- Step 3 -->
              <div class="flex flex-col items-center opacity-70">
                <div class="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800">
                  <Truck class="h-4 w-4" />
                </div>
                <span class="mt-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                  {{ locale === 'ar' ? 'التجهيز والشحن' : 'Dispatch & Delivery' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Order Items Itemized Receipt Card (if available) -->
          <div 
            v-if="order?.items && order.items.length"
            class="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-[#162032] transition-colors"
            :style="{ borderColor: 'var(--color-border)' }"
          >
            <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h2 class="font-heading text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PackageCheck class="h-4 w-4 text-[#2B71AE] dark:text-[#F5CC07]" />
                <span>{{ locale === 'ar' ? 'المنتجات المطلوبة' : 'Order Line Items' }}</span>
              </h2>
              <span class="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {{ order.items.length }} {{ locale === 'ar' ? 'عناصر' : 'items' }}
              </span>
            </div>

            <div class="divide-y divide-slate-100 dark:divide-slate-800/80">
              <div 
                v-for="item in order.items" 
                :key="item.id"
                class="py-3 flex items-center justify-between gap-3 text-xs sm:text-sm"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <div class="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 flex items-center justify-center">
                    <img 
                      v-if="item.product?.images?.[0]?.path"
                      :src="item.product.images[0].path"
                      :alt="item.productNameSnapshot"
                      class="h-full w-full object-cover"
                      loading="lazy"
                    />
                    <FileText v-else class="h-4 w-4 text-slate-400" />
                  </div>
                  <div class="min-w-0">
                    <NuxtLink 
                      v-if="item.product?.slug"
                      :to="localePath(`/p/${item.product.slug}`)"
                      class="font-semibold text-slate-900 dark:text-white hover:text-[#2B71AE] dark:hover:text-[#F5CC07] truncate block transition-colors"
                    >
                      {{ item.productNameSnapshot }}
                    </NuxtLink>
                    <span v-else class="font-semibold text-slate-900 dark:text-white truncate block">
                      {{ item.productNameSnapshot }}
                    </span>
                    <span class="text-[11px] text-slate-400 font-mono">
                      {{ item.quantity }} × {{ item.productPriceSnapshot }} EGP
                    </span>
                  </div>
                </div>

                <div class="text-end font-mono font-bold text-slate-900 dark:text-white shrink-0">
                  {{ item.subtotal }} <span class="text-[10px] text-slate-400 font-normal">EGP</span>
                </div>
              </div>
            </div>

            <!-- Price Breakdown Summary -->
            <div class="mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
              <div class="flex justify-between text-slate-500 dark:text-slate-400">
                <span>{{ locale === 'ar' ? 'المجموع الفرعي للمنتجات' : 'Products Subtotal' }}</span>
                <span class="font-mono font-semibold text-slate-800 dark:text-slate-200">{{ order.totalAmount }} EGP</span>
              </div>
              <div class="flex justify-between text-slate-500 dark:text-slate-400">
                <span>{{ locale === 'ar' ? 'مصاريف الشحن والتوصيل' : 'Shipping & Handling' }}</span>
                <span class="font-semibold text-emerald-600 dark:text-emerald-400">
                  {{ locale === 'ar' ? 'شحن قياسي سريع (يحدد هاتفياً)' : 'Calculated upon dispatch' }}
                </span>
              </div>
              <div class="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
                <span class="font-bold text-slate-900 dark:text-white text-sm">
                  {{ locale === 'ar' ? 'الإجمالي النهائي للطلب' : 'Final Total' }}
                </span>
                <div class="text-end">
                  <span class="text-xl sm:text-2xl font-black text-[#2B71AE] dark:text-[#F5CC07] font-mono">
                    {{ order.totalAmount }}
                  </span>
                  <span class="text-xs font-bold text-slate-500 ms-1">EGP</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Navigation Buttons (Desktop Secondary position) -->
          <div class="pt-2 hidden lg:flex items-center gap-3 print:hidden">
            <NuxtLink 
              :to="localePath('/products')" 
              class="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#2B71AE] px-7 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-[#285E8E] active:scale-[0.98] transition-all"
            >
              <ShoppingBag class="h-4 w-4" />
              <span>{{ locale === 'ar' ? 'متابعة تصفح الكتالوج' : 'Continue Shopping' }}</span>
              <ArrowRight class="h-4 w-4 rtl:rotate-180" />
            </NuxtLink>

            <NuxtLink 
              :to="localePath('/')" 
              class="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#162032] dark:text-slate-200 dark:hover:bg-slate-800/80 active:scale-[0.98] transition-all"
            >
              <Home class="h-4 w-4 text-slate-400" />
              <span>{{ locale === 'ar' ? 'الرئيسية' : 'Home' }}</span>
            </NuxtLink>
          </div>

        </div>

        <!-- Right Column (5 cols): CHANGE 3 + CHANGE 4 -->
        <div class="lg:col-span-5 space-y-6">
          
          <!-- CHANGE 3 — تفاصيل طلبك (Customer Details Card) -->
          <div>
            <div
              class="rounded-xl border bg-white shadow-xs dark:bg-[#162032] dark:border-slate-800 transition-colors"
              style="border-color: #E2E8F0; padding: 20px;"
              :dir="locale === 'ar' ? 'rtl' : 'ltr'"
            >
              <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <div class="flex items-center gap-2">
                  <User class="h-4 w-4 text-[#2B71AE] dark:text-[#F5CC07]" />
                  <h2 class="text-[16px] font-semibold text-slate-900 dark:text-white">
                    {{ locale === 'ar' ? 'تفاصيل طلبك' : 'Your Order Details' }}
                  </h2>
                </div>
                <span v-if="order?.paymentMethod" class="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <CreditCard class="h-3 w-3 text-slate-500" />
                  <span>{{ order.paymentMethod === 'COD' ? (locale === 'ar' ? 'الدفع عند الاستلام' : 'Cash on Delivery') : order.paymentMethod }}</span>
                </span>
              </div>

              <!-- Clean label + value rows -->
              <dl class="space-y-3.5 text-sm">
                <div class="flex items-center justify-between gap-3">
                  <dt class="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">
                    {{ locale === 'ar' ? 'الاسم:' : 'Name:' }}
                  </dt>
                  <dd class="font-semibold text-slate-900 dark:text-white text-end">
                    {{ order?.customerName || '—' }}
                  </dd>
                </div>

                <div class="flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                  <dt class="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">
                    {{ locale === 'ar' ? 'رقم الهاتف:' : 'Phone:' }}
                  </dt>
                  <dd class="font-mono font-bold text-slate-900 dark:text-white text-end" dir="ltr">
                    {{ order?.customerPhone || '—' }}
                  </dd>
                </div>

                <div class="flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                  <dt class="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">
                    {{ locale === 'ar' ? 'المحافظة:' : 'Governorate:' }}
                  </dt>
                  <dd class="font-semibold text-slate-900 dark:text-white text-end">
                    {{ governorateLabel || '—' }}
                  </dd>
                </div>

                <div v-if="order?.customerAddress" class="flex items-start justify-between gap-3 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                  <dt class="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium shrink-0">
                    {{ locale === 'ar' ? 'العنوان:' : 'Address:' }}
                  </dt>
                  <dd class="text-xs sm:text-sm text-slate-700 dark:text-slate-300 text-end max-w-xs leading-relaxed">
                    {{ order.customerAddress }}
                  </dd>
                </div>
              </dl>
            </div>

            <!-- Below the card: muted note (13px) -->
            <div class="mt-2.5 flex items-center justify-center gap-1.5 text-center px-1" :dir="locale === 'ar' ? 'rtl' : 'ltr'">
              <AlertCircle class="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
              <p class="text-[13px] text-slate-500 dark:text-slate-400 leading-normal">
                {{ locale === 'ar' 
                  ? 'في حال وجود أي خطأ في البيانات، يرجى التواصل معنا فوراً' 
                  : 'If there is any error in your details, please contact us immediately' }}
              </p>
            </div>
          </div>

          <!-- CHANGE 4 — رسالة التواصل بعد تأكيد الطلب (Contact Assurance Banner) -->
          <div
            class="rounded-xl bg-[#EFF6FF] text-center dark:bg-[#1e3a5f] shadow-xs border border-blue-100 dark:border-blue-900/40 transition-colors"
            style="padding: 20px;"
            :dir="locale === 'ar' ? 'rtl' : 'ltr'"
          >
            <!-- Icon: 📞 (large, 32px) -->
            <div class="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-white/90 dark:bg-slate-900/60 shadow-xs ring-4 ring-[#2B71AE]/10 dark:ring-white/5">
              <Phone 
                class="text-[#2B71AE] dark:text-[#F5CC07]" 
                style="width: 32px; height: 32px;" 
                aria-hidden="true" 
              />
            </div>

            <!-- Heading (18px semibold, #2B71AE) -->
            <h2 class="text-[18px] font-semibold text-[#2B71AE] dark:text-[#F5CC07] leading-snug">
              {{ locale === 'ar' ? 'سنتواصل معك في أقرب وقت لتأكيد طلبك' : 'We will contact you shortly to confirm your order' }}
            </h2>

            <!-- Subtext (14px muted) -->
            <p class="mt-1 text-[14px] text-slate-600 dark:text-slate-300">
              {{ locale === 'ar' ? 'فريق Mango Electronics — خدمة العملاء' : 'Mango Electronics team — Customer Service' }}
            </p>

            <!-- Contact row (flex, gap 24px, centered, margin-top 12px) -->
            <div class="flex flex-wrap items-center justify-center gap-6" style="gap: 24px; margin-top: 12px;">
              <a 
                :href="`tel:${phone1.replace(/\s/g, '')}`" 
                dir="ltr" 
                class="inline-flex items-center gap-1.5 font-mono text-sm sm:text-base font-bold text-[#2B71AE] hover:text-[#285E8E] dark:text-[#F5CC07] dark:hover:underline transition-colors active:scale-95"
              >
                <Phone class="h-4 w-4" />
                <span>{{ phone1 }}</span>
              </a>
              <a 
                :href="`tel:${phone2.replace(/\s/g, '')}`" 
                dir="ltr" 
                class="inline-flex items-center gap-1.5 font-mono text-sm sm:text-base font-bold text-[#2B71AE] hover:text-[#285E8E] dark:text-[#F5CC07] dark:hover:underline transition-colors active:scale-95"
              >
                <Phone class="h-4 w-4" />
                <span>{{ phone2 }}</span>
              </a>
            </div>

            <!-- Quick WhatsApp Action -->
            <div class="mt-4 pt-3 border-t border-blue-200/50 dark:border-blue-900/50 flex justify-center">
              <a
                :href="whatsappUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 text-xs font-bold shadow-xs active:scale-95 transition-all"
              >
                <IconWhatsApp class="h-4 w-4 fill-current" />
                <span>{{ locale === 'ar' ? 'محادثة مباشرة عبر واتساب' : 'Chat via WhatsApp' }}</span>
              </a>
            </div>
          </div>

          <!-- Mobile Action Buttons -->
          <div class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 lg:hidden print:hidden">
            <NuxtLink 
              :to="localePath('/products')" 
              class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2B71AE] px-7 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:bg-[#285E8E] active:scale-[0.98] transition-all"
            >
              <ShoppingBag class="h-4 w-4" />
              <span>{{ locale === 'ar' ? 'متابعة تصفح الكتالوج' : 'Continue Shopping' }}</span>
              <ArrowRight class="h-4 w-4 rtl:rotate-180" />
            </NuxtLink>

            <NuxtLink 
              :to="localePath('/')" 
              class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#162032] dark:text-slate-200 dark:hover:bg-slate-800/80 active:scale-[0.98] transition-all"
            >
              <Home class="h-4 w-4 text-slate-400" />
              <span>{{ locale === 'ar' ? 'الصفحة الرئيسية' : 'Home' }}</span>
            </NuxtLink>
          </div>

        </div>

      </div>

      <!-- Trust Badges Strip (Footer of receipt) -->
      <div class="mt-12 grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-slate-200/80 pt-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 print:hidden">
        <div class="flex items-center justify-center gap-1.5">
          <ShieldCheck class="h-4 w-4 text-emerald-500 shrink-0" />
          <span>{{ locale === 'ar' ? 'قطع أصلية ومضمونة 100%' : '100% Genuine Components' }}</span>
        </div>
        <div class="flex items-center justify-center gap-1.5">
          <Truck class="h-4 w-4 text-[#2B71AE] dark:text-[#F5CC07] shrink-0" />
          <span>{{ locale === 'ar' ? 'تغليف آمن ومحكم للشحن' : 'Safe Industrial Packaging' }}</span>
        </div>
        <div class="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5">
          <Clock class="h-4 w-4 text-amber-500 shrink-0" />
          <span>{{ locale === 'ar' ? 'فريق دعم فني معتمد' : 'Certified Technical Support' }}</span>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
@media print {
  header, footer, nav, button, a[href^="https://wa.me"] {
    display: none !important;
  }
}
</style>
