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
    <div class="mb-8 flex items-center justify-between border-b border-border pb-5">
      <div>
        <h1 class="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-text">
          {{ t('nav.cart') }}
        </h1>
        <p class="text-xs sm:text-sm text-muted mt-1">
          {{ locale === 'ar' ? 'راجع محتويات السلة قبل الانتقال لإتمام الدفع والشحن.' : 'Review your selected items before proceeding to shipping and payment.' }}
        </p>
      </div>

      <NuxtLink 
        :to="localePath('/products')" 
        class="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
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
          class="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border border-border bg-bg p-4 shadow-xs transition-colors"
          :style="{ borderColor: 'var(--color-border)' }"
        >
          <!-- Item Image -->
          <NuxtLink :to="localePath(`/p/${item.slug}`)" class="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-surface border border-border">
            <img v-if="item.coverImage" :src="item.coverImage" :alt="itemName(item)" class="h-full w-full object-cover" loading="lazy" />
            <div v-else class="flex h-full w-full items-center justify-center text-[10px] text-slate-400">{{ t('common.noImage') }}</div>
          </NuxtLink>
          
          <!-- Item Details -->
          <div class="flex flex-1 flex-col justify-between self-stretch min-w-0">
            <div class="flex items-start justify-between gap-3">
              <NuxtLink 
                :to="localePath(`/p/${item.slug}`)" 
                class="font-heading text-sm sm:text-base font-bold text-text hover:text-primary transition-colors line-clamp-2"
              >
                {{ itemName(item) }}
              </NuxtLink>

              <button 
                type="button" 
                class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                :title="locale === 'ar' ? 'حذف من السلة' : 'Remove item'"
                @click="cart.removeItem(item.productId)"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>

            <!-- Price and Quantity Controls -->
            <div class="mt-4 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
              <div class="flex items-baseline gap-1">
                <span class="text-base sm:text-lg font-black text-primary">{{ item.price }}</span>
                <span class="text-xs font-semibold text-muted">EGP</span>
              </div>

              <!-- Quantity Stepper -->
              <div class="flex h-9 items-center rounded-lg border border-border bg-surface px-1">
                <button 
                  type="button" 
                  class="flex h-7 w-7 items-center justify-center rounded text-muted hover:bg-border transition-colors"
                  :aria-label="locale === 'ar' ? 'تقليل' : 'Decrease'"
                  @click="cart.updateQuantity(item.productId, item.quantity - 1)"
                >
                  <Minus class="h-3 w-3" />
                </button>
                <span class="w-8 text-center font-mono text-xs font-bold text-text">{{ item.quantity }}</span>
                <button 
                  type="button" 
                  class="flex h-7 w-7 items-center justify-center rounded text-muted hover:bg-border transition-colors"
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
          class="sticky top-24 rounded-2xl border border-border bg-bg p-6 shadow-sm"
          :style="{ borderColor: 'var(--color-border)' }"
        >
          <h2 class="font-heading text-lg font-bold text-text mb-4 pb-3 border-b border-border">
            {{ locale === 'ar' ? 'ملخص الطلب' : 'Order Summary' }}
          </h2>

          <div class="space-y-3 text-sm">
            <div class="flex justify-between text-muted">
              <span>{{ locale === 'ar' ? 'المجموع الفرعي' : 'Subtotal' }}</span>
              <span class="font-bold text-text">{{ cart.totalAmount }} EGP</span>
            </div>

            <div class="flex justify-between text-muted">
              <span>{{ locale === 'ar' ? 'تكلفة الشحن' : 'Estimated Shipping' }}</span>
              <span class="text-xs text-muted font-medium">{{ locale === 'ar' ? 'تُحسب بالخطوة التالية' : 'Calculated at checkout' }}</span>
            </div>
          </div>

          <div class="my-4 border-t border-border" />

          <div class="flex items-baseline justify-between">
            <span class="font-bold text-text text-base">{{ locale === 'ar' ? 'الإجمالي التقديري' : 'Total' }}</span>
            <div class="text-end">
              <span class="text-2xl font-black text-primary">{{ cart.totalAmount }}</span>
              <span class="text-xs font-semibold text-muted ms-1">EGP</span>
            </div>
          </div>

          <!-- Checkout CTA -->
          <NuxtLink 
            :to="localePath('/checkout')" 
            class="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 text-sm font-bold text-on-accent shadow-lg shadow-accent/20 hover:bg-accent-hover active:scale-[0.98] transition-all"
          >
            <span>{{ locale === 'ar' ? 'متابعة الشراء وإتمام الطلب' : 'Proceed to Checkout' }}</span>
            <ArrowRight class="h-4 w-4 rtl:rotate-180" />
          </NuxtLink>

          <!-- Confidence badges -->
          <div class="mt-6 space-y-2 pt-4 border-t border-border text-xs text-muted">
            <div class="flex items-center gap-2">
              <ShieldCheck class="h-4 w-4 text-primary shrink-0" />
              <span>{{ locale === 'ar' ? 'الدفع عند الاستلام متاح لجميع المحافظات' : 'Cash on delivery available nationwide' }}</span>
            </div>
            <div class="flex items-center gap-2">
              <Truck class="h-4 w-4 text-primary shrink-0" />
              <span>{{ locale === 'ar' ? 'تغليف آمن ومحكم للمكونات الإلكترونية' : 'Secure packaging for electronics' }}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- Empty State -->
    <div 
      v-else 
      class="mt-8 rounded-2xl border border-border bg-bg py-16 sm:py-24 px-6 text-center shadow-xs" 
      :style="{ borderColor: 'var(--color-border)' }"
    >
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <ShoppingCart class="h-8 w-8" />
      </div>
      <h2 class="font-heading text-xl sm:text-2xl font-bold text-text mb-2">
        {{ locale === 'ar' ? 'سلة المشتريات فارغة' : 'Your cart is empty' }}
      </h2>
      <p class="text-sm text-muted max-w-sm mx-auto mb-8">
        {{ locale === 'ar' ? 'لم تقم بإضافة أي مكونات أو أدوات بعد. تصفح الكتالوج لاكتشاف أحدث المنتجات.' : 'You have not added any electronic components or tools yet. Browse our catalog to find what you need.' }}
      </p>
      <NuxtLink 
        :to="localePath('/products')" 
        class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-7 text-sm font-bold text-on-accent shadow-xs hover:bg-accent-hover active:scale-95 transition-all"
      >
        <span>{{ locale === 'ar' ? 'استعراض المنتجات' : 'Browse Catalog' }}</span>
        <ArrowRight class="h-4 w-4 rtl:rotate-180" />
      </NuxtLink>
    </div>

  </div>
</template>
