<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()
const cart = useCartStore()

useHead(() => ({ title: `${t('nav.cart')} — ${t('brand.name')}` }))

const itemName = (item: { nameAr: string, nameEn: string }) => locale.value === 'ar' ? item.nameAr : item.nameEn
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8">
    <h1 class="font-heading text-3xl font-bold">{{ t('nav.cart') }}</h1>

    <div v-if="cart.items.length" class="mt-8 gap-8 lg:flex">
      <div class="flex-1 space-y-4">
        <div v-for="item in cart.items" :key="item.productId" class="flex gap-4 rounded-md border p-4" :style="{ borderColor: 'var(--color-border)' }">
          <img v-if="item.coverImage" :src="item.coverImage" :alt="itemName(item)" class="h-24 w-24 rounded object-cover" />
          <div v-else class="flex h-24 w-24 items-center justify-center rounded bg-slate-100 text-xs text-slate-400 dark:bg-slate-800">{{ t('common.noImage') }}</div>
          
          <div class="flex flex-1 flex-col">
            <NuxtLink :to="localePath(`/p/${item.slug}`)" class="font-semibold hover:underline">{{ itemName(item) }}</NuxtLink>
            <p class="mt-1 font-bold text-[#2B71AE]">{{ item.price }} EGP</p>
            <div class="mt-auto flex items-center justify-between">
              <div class="flex items-center gap-2">
                <button type="button" class="flex h-8 w-8 items-center justify-center rounded border hover:bg-slate-100 dark:hover:bg-slate-800" :style="{ borderColor: 'var(--color-border)' }" @click="cart.updateQuantity(item.productId, item.quantity - 1)">-</button>
                <span class="w-8 text-center text-sm font-medium">{{ item.quantity }}</span>
                <button type="button" class="flex h-8 w-8 items-center justify-center rounded border hover:bg-slate-100 dark:hover:bg-slate-800" :style="{ borderColor: 'var(--color-border)' }" @click="cart.updateQuantity(item.productId, item.quantity + 1)">+</button>
              </div>
              <button type="button" class="text-sm font-medium text-red-600 hover:underline" @click="cart.removeItem(item.productId)">Remove</button>
            </div>
          </div>
        </div>
      </div>

      <aside class="mt-8 w-full shrink-0 lg:mt-0 lg:w-80">
        <div class="rounded-md border p-6" :style="{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }">
          <h2 class="font-heading text-xl font-bold">Order summary</h2>
          <div class="mt-4 flex justify-between text-sm">
            <span>Subtotal</span>
            <span class="font-bold">{{ cart.totalAmount }} EGP</span>
          </div>
          <div class="mt-2 flex justify-between text-sm">
            <span>Shipping</span>
            <span class="text-slate-500">Calculated at checkout</span>
          </div>
          <hr class="my-4" :style="{ borderColor: 'var(--color-border)' }" />
          <div class="flex justify-between font-bold">
            <span>Total</span>
            <span class="text-[#2B71AE]">{{ cart.totalAmount }} EGP</span>
          </div>
          <NuxtLink :to="localePath('/checkout')" class="mt-6 flex h-12 w-full items-center justify-center rounded bg-[#2B71AE] font-semibold text-white hover:bg-[#285E8E]">
            Proceed to checkout
          </NuxtLink>
        </div>
      </aside>
    </div>

    <div v-else class="mt-8 rounded-md border py-16 text-center" :style="{ borderColor: 'var(--color-border)' }">
      <p class="font-heading text-xl font-bold">Your cart is empty</p>
      <NuxtLink :to="localePath('/products')" class="mt-4 inline-flex h-10 items-center justify-center rounded bg-[#2B71AE] px-6 font-semibold text-white hover:bg-[#285E8E]">
        Browse products
      </NuxtLink>
    </div>
  </div>
</template>
