<script setup lang="ts">
import { GOVERNORATES } from '~~/shared/constants/governorates'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const cart = useCartStore()

useHead(() => ({ title: `Checkout — ${t('brand.name')}` }))

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
    error.value = 'Please enter a valid Egyptian mobile number (e.g. 01012345678)'
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
    error.value = (e as { data?: { message?: string } })?.data?.message || 'Order failed. Please try again.'
  }
  finally {
    loading.value = false
  }
}

const inputCls = 'h-11 w-full rounded border bg-transparent px-3'
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8">
    <div class="gap-8 lg:flex lg:flex-row-reverse">
      <aside class="mb-8 w-full shrink-0 lg:mb-0 lg:w-96">
        <div class="rounded-md border bg-slate-50 p-6 dark:bg-slate-800/50" :style="{ borderColor: 'var(--color-border)' }">
          <h2 class="mb-4 font-heading text-xl font-bold">Order summary</h2>
          <div class="space-y-4">
            <div v-for="item in cart.items" :key="item.productId" class="flex items-center gap-3">
              <div class="relative flex h-16 w-16 items-center justify-center rounded border bg-white dark:bg-slate-800" :style="{ borderColor: 'var(--color-border)' }">
                <img v-if="item.coverImage" :src="item.coverImage" :alt="locale === 'ar' ? item.nameAr : item.nameEn" class="h-full w-full object-cover" />
                <span class="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-500 text-xs font-bold text-white">{{ item.quantity }}</span>
              </div>
              <div class="flex-1 text-sm">
                <p class="font-medium line-clamp-2">{{ locale === 'ar' ? item.nameAr : item.nameEn }}</p>
                <p class="text-slate-500">{{ item.price }} EGP</p>
              </div>
            </div>
          </div>
          <hr class="my-4" :style="{ borderColor: 'var(--color-border)' }" />
          <div class="flex justify-between font-bold">
            <span>Total</span>
            <span class="text-xl text-[#2B71AE]">{{ cart.totalAmount }} EGP</span>
          </div>
        </div>
      </aside>

      <div class="flex-1">
        <h1 class="mb-6 font-heading text-3xl font-bold">Checkout</h1>
        <div v-if="error" role="alert" class="mb-6 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{{ error }}</div>

        <form @submit.prevent="placeOrder">
          <div class="mb-8 space-y-4">
            <h2 class="font-heading text-xl font-semibold">Contact & Delivery</h2>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="block">
                <span class="mb-1 block text-sm font-medium">Full Name *</span>
                <input v-model="form.name" type="text" required :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
              </label>
              <label class="block">
                <span class="mb-1 block text-sm font-medium">Phone Number *</span>
                <input v-model="form.phone" type="tel" required placeholder="01xxxxxxxxx" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" dir="ltr" />
              </label>
            </div>
            <label class="block">
              <span class="mb-1 block text-sm font-medium">Email (optional)</span>
              <input v-model="form.email" type="email" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
            </label>
            <label class="block">
              <span class="mb-1 block text-sm font-medium">Governorate *</span>
              <select v-model="form.governorate" required :class="inputCls" :style="{ borderColor: 'var(--color-border)' }">
                <option value="">Select...</option>
                <option v-for="gov in GOVERNORATES" :key="gov.value" :value="gov.value">{{ locale === 'ar' ? gov.labelAr : gov.labelEn }}</option>
              </select>
            </label>
            <label class="block">
              <span class="mb-1 block text-sm font-medium">Address / More Details</span>
              <textarea v-model="form.address" rows="3" class="w-full rounded border bg-transparent p-3" :style="{ borderColor: 'var(--color-border)' }" placeholder="Street, Building, Apartment..."></textarea>
            </label>
          </div>

          <div class="mb-8 space-y-4">
            <h2 class="font-heading text-xl font-semibold">Payment</h2>
            <label v-if="settings?.methods.cod" class="flex cursor-pointer items-center gap-3 rounded-md border p-4 hover:bg-slate-50 dark:hover:bg-slate-800" :style="{ borderColor: 'var(--color-border)' }">
              <input v-model="paymentMethod" type="radio" value="COD" class="h-4 w-4" />
              <div>
                <p class="font-medium">Cash on Delivery</p>
                <p class="text-sm text-slate-500">Pay when your order arrives.</p>
              </div>
            </label>
            <label v-if="settings?.methods.online" class="flex cursor-pointer items-center gap-3 rounded-md border p-4 hover:bg-slate-50 dark:hover:bg-slate-800" :style="{ borderColor: 'var(--color-border)' }">
              <input v-model="paymentMethod" type="radio" value="ONLINE" class="h-4 w-4" />
              <div>
                <p class="font-medium">Online Payment</p>
                <p class="text-sm text-slate-500">Pay securely with your credit card.</p>
              </div>
            </label>
          </div>

          <button type="submit" :disabled="loading || !cart.items.length" class="h-12 w-full rounded bg-[#2B71AE] font-bold text-white hover:bg-[#285E8E] disabled:opacity-50 sm:w-auto sm:min-w-64 sm:px-8">
            {{ loading ? 'Placing order...' : 'Place Order' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
