<script setup lang="ts">
import { ArrowRight, CheckCircle2, Minus, Plus, ShieldCheck, ShoppingCart, Trash2, Truck } from 'lucide-vue-next'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const cart = useCartStore()

useHead(() => ({ title: `${t('nav.cart')} | ${t('brand.name')}` }))

const itemName = (item: { nameAr: string, nameEn: string }) => locale.value === 'ar' ? item.nameAr : item.nameEn
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
    
    <!-- Page Header -->
    <div class="mb-8 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-5">
      <div>
        <h1 class="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {{ t('nav.cart') }}
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          {{ locale === 'ar' ? 'راجع محتويات السلة قبل الانتقال لإتمام الدفع والشحن.' : 'Review your selected items before proceeding to shipping and payment.' }}
        </p>
      </div>

      <NuxtLink 
        :to="localePath('/products')" 
        class="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-[#2B71AE] hover:underline dark:text-[#F5CC07]"
      >
        <span>{{ locale === 'ar' ? 'متابعة التسوق' : 'Continue Shopping' }}</span>
        <ArrowRight class="h-3.5 w-3.5 rtl:rotate-180" />
      </NuxtLink>
    </div>

    <!-- Active Cart Layout -->
    <div v-if="cart.items.length" class="gap-10 lg:flex lg:items-start">
      
      <!-- Items List (Left/Main) -->
      <div class="flex-1 space-y-4">
        <div 
          v-for="item in cart.items" 
          :key="item.productId" 
          class="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#162032] transition-colors"
          :style="{ borderColor: 'var(--color-border)' }"
        >
          <!-- Item Image -->
          <NuxtLink :to="localePath(`/p/${item.slug}`)" class="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-800">
            <img v-if="item.coverImage" :src="item.coverImage" :alt="itemName(item)" class="h-full w-full object-cover" />
            <div v-else class="flex h-full w-full items-center justify-center text-[10px] text-slate-400">{{ t('common.noImage') }}</div>
          </NuxtLink>
          
          <!-- Item Details -->
          <div class="flex flex-1 flex-col justify-between self-stretch min-w-0">
            <div class="flex items-start justify-between gap-3">
              <NuxtLink 
                :to="localePath(`/p/${item.slug}`)" 
                class="font-heading text-sm sm:text-base font-bold text-slate-900 hover:text-[#2B71AE] dark:text-white dark:hover:text-[#F5CC07] transition-colors line-clamp-2"
              >
                {{ itemName(item) }}
              </NuxtLink>

              <button 
                type="button" 
                class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors"
                :title="locale === 'ar' ? 'حذف من السلة' : 'Remove item'"
                @click="cart.removeItem(item.productId)"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>

            <!-- Price and Quantity Controls -->
            <div class="mt-4 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div class="flex items-baseline gap-1">
                <span class="text-base sm:text-lg font-black text-[#2B71AE] dark:text-[#F5CC07]">{{ item.price }}</span>
                <span class="text-xs font-semibold text-slate-500">EGP</span>
              </div>

              <!-- Quantity Stepper -->
              <div class="flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-1 dark:border-slate-800 dark:bg-slate-800">
                <button 
                  type="button" 
                  class="flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                  :aria-label="locale === 'ar' ? 'تقليل' : 'Decrease'"
                  @click="cart.updateQuantity(item.productId, item.quantity - 1)"
                >
                  <Minus class="h-3 w-3" />
                </button>
                <span class="w-8 text-center font-mono text-xs font-bold text-slate-900 dark:text-white">{{ item.quantity }}</span>
                <button 
                  type="button" 
                  class="flex h-7 w-7 items-center justify-center rounded text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                  :aria-label="locale === 'ar' ? 'زيادة' : 'Increase'"
                  @click="cart.updateQuantity(item.productId, item.quantity + 1)"
                >
                  <Plus class="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Order Summary Card (Right / Aside) -->
      <aside class="mt-8 w-full shrink-0 lg:mt-0 lg:w-96">
        <div 
          class="sticky top-24 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#162032]"
          :style="{ borderColor: 'var(--color-border)' }"
        >
          <h2 class="font-heading text-lg font-bold text-slate-900 dark:text-white mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            {{ locale === 'ar' ? 'ملخص الطلب' : 'Order Summary' }}
          </h2>

          <div class="space-y-3 text-sm">
            <div class="flex justify-between text-slate-600 dark:text-slate-400">
              <span>{{ locale === 'ar' ? 'المجموع الفرعي' : 'Subtotal' }}</span>
              <span class="font-bold text-slate-900 dark:text-white">{{ cart.totalAmount }} EGP</span>
            </div>

            <div class="flex justify-between text-slate-600 dark:text-slate-400">
              <span>{{ locale === 'ar' ? 'تكلفة الشحن' : 'Estimated Shipping' }}</span>
              <span class="text-xs text-slate-500 font-medium">{{ locale === 'ar' ? 'تُحسب بالخطوة التالية' : 'Calculated at checkout' }}</span>
            </div>
          </div>

          <div class="my-4 border-t border-slate-200/80 dark:border-slate-800" />

          <div class="flex items-baseline justify-between">
            <span class="font-bold text-slate-900 dark:text-white text-base">{{ locale === 'ar' ? 'الإجمالي التقديري' : 'Total' }}</span>
            <div class="text-end">
              <span class="text-2xl font-black text-[#2B71AE] dark:text-[#F5CC07]">{{ cart.totalAmount }}</span>
              <span class="text-xs font-semibold text-slate-500 ms-1">EGP</span>
            </div>
          </div>

          <!-- Checkout CTA -->
          <NuxtLink 
            :to="localePath('/checkout')" 
            class="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2B71AE] px-6 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-[#285E8E] active:scale-[0.98] transition-all"
          >
            <span>{{ locale === 'ar' ? 'متابعة الشراء وإتمام الطلب' : 'Proceed to Checkout' }}</span>
            <ArrowRight class="h-4 w-4 rtl:rotate-180" />
          </NuxtLink>

          <!-- Confidence badges -->
          <div class="mt-6 space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
            <div class="flex items-center gap-2">
              <ShieldCheck class="h-4 w-4 text-[#F5CC07] shrink-0" />
              <span>{{ locale === 'ar' ? 'الدفع عند الاستلام متاح لجميع المحافظات' : 'Cash on delivery available nationwide' }}</span>
            </div>
            <div class="flex items-center gap-2">
              <Truck class="h-4 w-4 text-[#F5CC07] shrink-0" />
              <span>{{ locale === 'ar' ? 'تغليف آمن ومحكم للمكونات الإلكترونية' : 'Secure packaging for electronics' }}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- Empty State -->
    <div 
      v-else 
      class="mt-8 rounded-2xl border border-slate-200/80 bg-white py-16 sm:py-24 px-6 text-center shadow-xs dark:border-slate-800 dark:bg-[#162032]" 
      :style="{ borderColor: 'var(--color-border)' }"
    >
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#2B71AE]/10 text-[#2B71AE] dark:bg-[#F5CC07]/15 dark:text-[#F5CC07]">
        <ShoppingCart class="h-8 w-8" />
      </div>
      <h2 class="font-heading text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
        {{ locale === 'ar' ? 'سلة المشتريات فارغة' : 'Your cart is empty' }}
      </h2>
      <p class="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-8">
        {{ locale === 'ar' ? 'لم تقم بإضافة أي مكونات أو أدوات بعد. تصفح الكتالوج لاكتشاف أحدث المنتجات.' : 'You have not added any electronic components or tools yet. Browse our catalog to find what you need.' }}
      </p>
      <NuxtLink 
        :to="localePath('/products')" 
        class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2B71AE] px-7 text-sm font-bold text-white shadow-xs hover:bg-[#285E8E] active:scale-95 transition-all"
      >
        <span>{{ locale === 'ar' ? 'استعراض المنتجات' : 'Browse Catalog' }}</span>
        <ArrowRight class="h-4 w-4 rtl:rotate-180" />
      </NuxtLink>
    </div>

  </div>
</template>
