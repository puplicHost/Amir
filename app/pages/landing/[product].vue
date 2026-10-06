<script setup lang="ts">
import { AlertCircle, Minus, Plus, Send, ShoppingBag } from 'lucide-vue-next'
import { GOVERNORATES } from '~~/shared/constants/governorates'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const productSlug = String(route.params.product)

const { data, error } = await useAsyncData(`product-landing-${productSlug}`, () =>
  $fetch<{ product: any }>(`/api/products/${productSlug}`)
)

if (error.value || !data.value?.product) {
  throw createError({ statusCode: 404, statusMessage: 'Product not found', fatal: true })
}

const p = computed(() => data.value!.product)

useHead(() => ({
  title: `${p.value.nameAr} - ${p.value.nameEn} | ${t('brand.name')}`,
}))

const form = reactive({
  name: '',
  phone: '',
  governorate: '',
  address: '',
  notes: '',
})
const quantity = ref(1)
const loading = ref(false)
const formError = ref('')

function updateQty(delta: number) {
  quantity.value = Math.max(1, quantity.value + delta)
}

const totalPrice = computed(() => {
  const price = Number(p.value.price) || 0
  return (price * quantity.value).toLocaleString()
})

async function submitOrder() {
  formError.value = ''

  if (!form.name.trim() || !form.phone.trim() || !form.governorate) {
    formError.value = 'يرجى ملء جميع الحقول المطلوبة / Please fill all required fields'
    return
  }

  if (!/^01[0125][0-9]{8}$/.test(form.phone.trim())) {
    formError.value = 'يرجى إدخال رقم هاتف مصري صحيح (مثال: 01012345678) / Invalid Egyptian phone number'
    return
  }

  loading.value = true
  try {
    const res = await $fetch<{ orderNumber: string, accessToken: string }>('/api/orders', {
      method: 'POST',
      body: {
        customer: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          governorate: form.governorate,
          address: form.address ? `${form.address.trim()}${form.notes ? ` - ملاحظات: ${form.notes.trim()}` : ''}` : (form.notes ? `ملاحظات: ${form.notes.trim()}` : null),
        },
        items: [
          { productId: p.value.id, quantity: quantity.value },
        ],
        paymentMethod: 'COD',
      },
    })

    await navigateTo(localePath({ name: 'checkout-success', query: { id: res.orderNumber, token: res.accessToken } }))
  }
  catch (e: any) {
    formError.value = e?.data?.message || 'فشل إرسال الطلب، يرجى المحاولة مرة أخرى / Order submission failed'
  }
  finally {
    loading.value = false
  }
}

const inputCls = 'h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-xs sm:text-sm text-text placeholder:text-muted focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors'
</script>

<template>
  <div class="py-12 sm:py-16 px-4 sm:px-6">
    <div class="mx-auto w-full max-w-[600px]">
      
      <!-- Bilingual Page Title Directly Above Card -->
      <div class="mb-6 text-center">
        <h1 class="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-text leading-tight">
          {{ p.nameAr }}
        </h1>
        <p class="font-mono text-sm sm:text-base font-semibold text-primary mt-1" dir="ltr">
          {{ p.nameEn }}
        </p>
        <div class="mt-2 inline-flex items-baseline gap-1.5 rounded-full bg-border/40 px-3 py-1">
          <span class="text-xs font-semibold text-muted">{{ locale === 'ar' ? 'السعر:' : 'Price:' }}</span>
          <span class="font-mono font-black text-text">{{ p.price }} EGP</span>
        </div>
      </div>

      <!-- Centered Card with Form (max-width 600px) -->
      <div 
        class="rounded-2xl border border-border bg-bg p-6 sm:p-8 shadow-sm transition-colors"
        :style="{ borderColor: 'var(--color-border)' }"
        dir="rtl"
      >
        <!-- Error Alert -->
        <div 
          v-if="formError" 
          role="alert" 
          class="mb-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm font-medium text-rose-700"
        >
          <AlertCircle class="h-4 w-4 shrink-0" />
          <span>{{ formError }}</span>
        </div>

        <form @submit.prevent="submitOrder" class="space-y-4">
          <!-- Full Name -->
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-muted">
              الاسم بالكامل (Full Name) *
            </span>
            <input
              v-model="form.name"
              type="text"
              required
              placeholder="Enter your full name..."
              :class="inputCls"
              :style="{ borderColor: 'var(--color-border)' }"
            />
          </label>

          <!-- Phone Number -->
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-muted">
              رقم الهاتف للتواصل (Phone Number) *
            </span>
            <input
              v-model="form.phone"
              type="tel"
              required
              dir="ltr"
              placeholder="01xxxxxxxxx"
              :class="inputCls"
              :style="{ borderColor: 'var(--color-border)' }"
            />
          </label>

          <!-- Governorate -->
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-muted">
              المحافظة (Governorate) *
            </span>
            <select
              v-model="form.governorate"
              required
              :class="inputCls"
              :style="{ borderColor: 'var(--color-border)' }"
            >
              <option value="">Select governorate...</option>
              <option v-for="gov in GOVERNORATES" :key="gov.value" :value="gov.value">
                {{ gov.labelAr }} ({{ gov.labelEn }})
              </option>
            </select>
          </label>

          <!-- Detailed Address -->
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-muted">
              العنوان بالتفصيل (Detailed Address)
            </span>
            <textarea
              v-model="form.address"
              rows="2"
              placeholder="Street name, building, apartment, landmark..."
                class="w-full rounded-xl border border-border bg-surface p-3 text-xs sm:text-sm text-text placeholder:text-muted focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
              :style="{ borderColor: 'var(--color-border)' }"
            ></textarea>
          </label>

          <!-- Quantity Stepper -->
          <div>
            <span class="mb-1.5 block text-xs font-semibold text-muted">
              الكمية المطلوبة (Quantity)
            </span>
            <div class="flex items-center justify-between rounded-xl border border-border bg-surface p-2">
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-muted shadow-xs hover:bg-border/40"
                  @click="updateQty(-1)"
                >
                  <Minus class="h-4 w-4" />
                </button>
                <span class="w-10 text-center font-mono font-bold text-text">
                  {{ quantity }}
                </span>
                <button
                  type="button"
                  class="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-muted shadow-xs hover:bg-border/40"
                  @click="updateQty(1)"
                >
                  <Plus class="h-4 w-4" />
                </button>
              </div>

              <!-- Live Total Indicator -->
              <div class="text-end ps-4 font-mono text-xs">
                <span class="text-slate-400 block text-[10px]">الإجمالي / Total</span>
                <span class="font-bold text-primary text-sm sm:text-base">{{ totalPrice }} EGP</span>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-muted">
              ملاحظات إضافية (Order Notes)
            </span>
            <input
              v-model="form.notes"
              type="text"
              placeholder="Any special instructions..."
              :class="inputCls"
              :style="{ borderColor: 'var(--color-border)' }"
            />
          </label>

          <!-- Bilingual Submit Button: "إرسال الطلب / Submit Request" -->
          <div class="pt-4">
            <button 
              type="submit" 
              :disabled="loading" 
              class="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 text-sm font-bold text-on-accent shadow-md shadow-accent/20 hover:bg-accent-hover active:scale-[0.99] disabled:opacity-50 transition-all cursor-pointer"
            >
              <ShoppingBag class="h-4 w-4" />
              <span>{{ loading ? 'جاري إرسال الطلب… / Submitting…' : 'إرسال الطلب / Submit Request' }}</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  </div>
</template>
