<script setup lang="ts">
import { 
  AlertCircle, 
  ArrowRight, 
  Check, 
  CreditCard, 
  Lock, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  Truck, 
  User 
} from 'lucide-vue-next'
import { GOVERNORATES } from '~~/shared/constants/governorates'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const cart = useCartStore()

useHead(() => ({ 
  title: `${locale.value === 'ar' ? 'إتمام الطلب' : 'Checkout'} | ${t('brand.name')}` 
}))

const form = reactive({
  name: '',
  phone: '',
  email: '',
  governorate: '',
  address: '',
})
const paymentMethod = ref('COD')
const error = ref('')
const loading = ref(false)

const { data: settings } = await useAsyncData('payment-settings', () =>
  $fetch<{ methods: { cod: boolean, online: boolean } }>('/api/settings/payment'),
)

onMounted(() => {
  if (!cart.items.length) {
    navigateTo(localePath('/cart'))
  }
})

async function placeOrder() {
  if (loading.value || !cart.items.length) return
  error.value = ''
  
  if (!/^01[0125][0-9]{8}$/.test(form.phone)) {
    error.value = locale.value === 'ar' 
      ? 'يرجى إدخال رقم هاتف مصري صحيح (مثال: 01012345678)' 
      : 'Please enter a valid Egyptian mobile number (e.g. 01012345678)'
    return
  }

  loading.value = true
  try {
    const res = await $fetch<{ orderNumber: string }>('/api/orders', {
      method: 'POST',
      body: {
        customer: { ...form },
        items: cart.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
        paymentMethod: paymentMethod.value,
      },
    })
    cart.clearCart()
    await navigateTo(localePath({ name: 'checkout-success', query: { id: res.orderNumber } }))
  }
  catch (e) {
    error.value = (e as { data?: { message?: string } })?.data?.message || 
      (locale.value === 'ar' ? 'حدث خطأ أثناء تنفيذ الطلب. يرجى المحاولة مرة أخرى.' : 'Order failed. Please try again.')
  }
  finally {
    loading.value = false
  }
}

const inputCls = 'h-11 w-full rounded-xl border bg-slate-50 px-3.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2B71AE] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520] dark:text-slate-100 dark:focus:bg-[#0B1520] transition-colors'
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
    
    <!-- Page Title -->
    <div class="mb-8 border-b border-slate-200/80 dark:border-slate-800 pb-5">
      <h1 class="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        {{ locale === 'ar' ? 'إتمام الشراء والطلب' : 'Checkout & Delivery' }}
      </h1>
      <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
        {{ locale === 'ar' ? 'أدخل بيانات التوصيل واختر طريقة الدفع المناسبة.' : 'Enter your shipping address and choose your preferred payment method.' }}
      </p>
    </div>

    <div class="gap-10 lg:flex lg:flex-row-reverse lg:items-start">
      
      <!-- Order Summary Aside (Right) -->
      <aside class="mb-8 w-full shrink-0 lg:mb-0 lg:w-96">
        <div 
          class="sticky top-24 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#162032]"
          :style="{ borderColor: 'var(--color-border)' }"
        >
          <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
            <h2 class="font-heading text-base font-bold text-slate-900 dark:text-white">
              {{ locale === 'ar' ? 'ملخص المنتجات' : 'Order Items' }}
            </h2>
            <span class="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {{ cart.itemCount }}
            </span>
          </div>

          <!-- Items list -->
          <div class="max-h-72 overflow-y-auto space-y-3.5 pr-1 mb-4">
            <div 
              v-for="item in cart.items" 
              :key="item.productId" 
              class="flex items-center gap-3"
            >
              <div class="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-800">
                <img v-if="item.coverImage" :src="item.coverImage" :alt="locale === 'ar' ? item.nameAr : item.nameEn" class="h-full w-full object-cover rounded" />
                <span class="absolute -end-1.5 -top-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[#2B71AE] px-1 text-[10px] font-bold text-white shadow-xs">
                  {{ item.quantity }}
                </span>
              </div>
              <div class="flex-1 min-w-0 text-xs">
                <p class="font-bold text-slate-900 dark:text-white truncate">
                  {{ locale === 'ar' ? item.nameAr : item.nameEn }}
                </p>
                <p class="text-slate-500 font-mono mt-0.5">{{ item.price }} EGP</p>
              </div>
            </div>
          </div>

          <div class="border-t border-slate-200/80 dark:border-slate-800 pt-4 space-y-2 text-xs">
            <div class="flex justify-between text-slate-600 dark:text-slate-400">
              <span>{{ locale === 'ar' ? 'المجموع الفرعي' : 'Subtotal' }}</span>
              <span class="font-bold text-slate-900 dark:text-white">{{ cart.totalAmount }} EGP</span>
            </div>
            <div class="flex justify-between text-slate-600 dark:text-slate-400">
              <span>{{ locale === 'ar' ? 'الشحن' : 'Shipping' }}</span>
              <span class="text-emerald-600 dark:text-emerald-400 font-bold">{{ locale === 'ar' ? 'شحن قياسي سريع' : 'Standard Delivery' }}</span>
            </div>
          </div>

          <div class="my-4 border-t border-slate-200/80 dark:border-slate-800" />

          <div class="flex items-baseline justify-between">
            <span class="font-bold text-slate-900 dark:text-white text-sm">{{ locale === 'ar' ? 'الإجمالي النهائي' : 'Total Amount' }}</span>
            <div>
              <span class="text-2xl font-black text-[#2B71AE] dark:text-[#F5CC07]">{{ cart.totalAmount }}</span>
              <span class="text-xs font-semibold text-slate-500 ms-1">EGP</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Form (Left) -->
      <div class="flex-1">
        <!-- Error Alert -->
        <div 
          v-if="error" 
          role="alert" 
          class="mb-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
        >
          <AlertCircle class="h-4 w-4 shrink-0" />
          <span>{{ error }}</span>
        </div>

        <form @submit.prevent="placeOrder" class="space-y-8">
          
          <!-- Section 1: Customer Contact & Delivery Details -->
          <div 
            class="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-[#162032] space-y-4"
            :style="{ borderColor: 'var(--color-border)' }"
          >
            <div class="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-2">
              <User class="h-4 w-4 text-[#2B71AE] dark:text-[#F5CC07]" />
              <h2 class="font-heading text-base font-bold text-slate-900 dark:text-white">
                {{ locale === 'ar' ? 'بيانات المستلم والتوصيل' : 'Customer & Delivery Info' }}
              </h2>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <label class="block">
                <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {{ locale === 'ar' ? 'الاسم بالكامل *' : 'Full Name *' }}
                </span>
                <input 
                  v-model="form.name" 
                  type="text" 
                  required 
                  :placeholder="locale === 'ar' ? 'الاسم ثلاثي أو اسم المهندس/الشركة' : 'Full name or company representative'"
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
                  :class="inputCls" 
                  :style="{ borderColor: 'var(--color-border)' }" 
                  dir="ltr" 
                />
              </label>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <label class="block">
                <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {{ locale === 'ar' ? 'البريد الإلكتروني (اختياري)' : 'Email (Optional)' }}
                </span>
                <input 
                  v-model="form.email" 
                  type="email" 
                  placeholder="name@example.com"
                  :class="inputCls" 
                  :style="{ borderColor: 'var(--color-border)' }" 
                  dir="ltr"
                />
              </label>

              <label class="block">
                <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {{ locale === 'ar' ? 'المحافظة *' : 'Governorate *' }}
                </span>
                <select 
                  v-model="form.governorate" 
                  required 
                  :class="inputCls" 
                  :style="{ borderColor: 'var(--color-border)' }"
                >
                  <option value="">{{ locale === 'ar' ? 'اختر المحافظة...' : 'Select governorate...' }}</option>
                  <option v-for="gov in GOVERNORATES" :key="gov.value" :value="gov.value">
                    {{ locale === 'ar' ? gov.labelAr : gov.labelEn }}
                  </option>
                </select>
              </label>
            </div>

            <label class="block">
              <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {{ locale === 'ar' ? 'العنوان التفصيلي وملاحظات التوصيل' : 'Detailed Address & Delivery Notes' }}
              </span>
              <textarea 
                v-model="form.address" 
                rows="3" 
                class="w-full rounded-xl border bg-slate-50 p-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2B71AE] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520] dark:text-slate-100" 
                :style="{ borderColor: 'var(--color-border)' }" 
                :placeholder="locale === 'ar' ? 'المدينة، اسم الشارع، رقم العمارة أو المصنع، أي علامة مميزة...' : 'City, street, building or factory number, landmark...'"
              ></textarea>
            </label>
          </div>

          <!-- Section 2: Payment Method Selection -->
          <div 
            class="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-[#162032] space-y-4"
            :style="{ borderColor: 'var(--color-border)' }"
          >
            <div class="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-2">
              <CreditCard class="h-4 w-4 text-[#2B71AE] dark:text-[#F5CC07]" />
              <h2 class="font-heading text-base font-bold text-slate-900 dark:text-white">
                {{ locale === 'ar' ? 'طريقة الدفع' : 'Payment Method' }}
              </h2>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <!-- Cash on Delivery Option -->
              <label 
                v-if="settings?.methods.cod !== false" 
                class="flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition-all"
                :class="paymentMethod === 'COD' 
                  ? 'border-[#2B71AE] bg-blue-50/40 ring-2 ring-[#2B71AE]/10 dark:border-[#F5CC07] dark:bg-yellow-950/15 dark:ring-[#F5CC07]/20' 
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40'"
              >
                <input v-model="paymentMethod" type="radio" value="COD" class="mt-1 h-4 w-4 accent-[#2B71AE]" />
                <div>
                  <p class="font-heading text-sm font-bold text-slate-900 dark:text-white">
                    {{ locale === 'ar' ? 'الدفع عند الاستلام (COD)' : 'Cash on Delivery' }}
                  </p>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {{ locale === 'ar' ? 'ادفع نقداً لمندوب الشحن عند استلام وفحص الطرد.' : 'Pay in cash when your parcel is delivered and inspected.' }}
                  </p>
                </div>
              </label>

              <!-- Online Payment Option -->
              <label 
                v-if="settings?.methods.online" 
                class="flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition-all"
                :class="paymentMethod === 'ONLINE' 
                  ? 'border-[#2B71AE] bg-blue-50/40 ring-2 ring-[#2B71AE]/10 dark:border-[#F5CC07] dark:bg-yellow-950/15 dark:ring-[#F5CC07]/20' 
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40'"
              >
                <input v-model="paymentMethod" type="radio" value="ONLINE" class="mt-1 h-4 w-4 accent-[#2B71AE]" />
                <div>
                  <p class="font-heading text-sm font-bold text-slate-900 dark:text-white">
                    {{ locale === 'ar' ? 'دفع إلكتروني آمن' : 'Online Payment' }}
                  </p>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {{ locale === 'ar' ? 'بطاقات فيزا، ماستركارد، ومحافظ إلكترونية.' : 'Visa, Mastercard, and Egyptian mobile wallets.' }}
                  </p>
                </div>
              </label>
            </div>
          </div>

          <!-- Submit Order CTA -->
          <div class="pt-2">
            <button 
              type="submit" 
              :disabled="loading || !cart.items.length" 
              class="inline-flex h-12 w-full sm:w-auto sm:min-w-64 items-center justify-center gap-2 rounded-xl bg-[#2B71AE] px-8 text-base font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-[#285E8E] active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              <Lock class="h-4 w-4" />
              <span>{{ loading ? (locale === 'ar' ? 'جاري تأكيد الطلب...' : 'Placing Order...') : (locale === 'ar' ? 'تأكيد الطلب الآن' : 'Place Order Now') }}</span>
              <ArrowRight class="h-4 w-4 rtl:rotate-180" />
            </button>
          </div>
        </form>
      </div>

    </div>
  </div>
</template>
