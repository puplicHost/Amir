<script setup lang="ts">
import { Check, ShoppingCart } from 'lucide-vue-next'

interface Card {
  id?: string
  slug: string
  nameAr: string
  nameEn: string
  price: string | number
  compareAtPrice: string | number | null
  coverImage: string | null
  category: { slug: string, nameAr: string, nameEn: string }
}

const props = defineProps<{ product: Card }>()

const { locale, t } = useI18n()
const localePath = useLocalePath()
const cartStore = useCartStore()

const name = (p: Card) => (locale.value === 'ar' ? p.nameAr : p.nameEn)
const added = ref(false)

const discountPercent = computed(() => {
  const price = Number(props.product.price)
  const compare = Number(props.product.compareAtPrice)
  if (!compare || !Number.isFinite(price) || !Number.isFinite(compare)) return 0
  if (!(compare > price)) return 0
  return Math.round(((compare - price) / compare) * 100)
})

function onAddToCart(e: Event) {
  e.preventDefault()
  e.stopPropagation()
  cartStore.addItem({
    productId: props.product.id || props.product.slug,
    slug: props.product.slug,
    nameAr: props.product.nameAr,
    nameEn: props.product.nameEn,
    price: Number(props.product.price),
    coverImage: props.product.coverImage || null,
    quantity: 1,
  })
  added.value = true
  setTimeout(() => {
    added.value = false
  }, 2000)
}
</script>

<template>
  <div
    class="group flex h-full flex-col justify-between overflow-hidden rounded-xl border border-border bg-bg shadow-xs hover:-translate-y-1 hover:border-primary hover:shadow-lg transition-all duration-300"
  >
    <NuxtLink :to="localePath(`/p/${product.slug}`)" class="block flex-1 flex flex-col">
      <!-- Cover Image with Fixed 1:1 Aspect Ratio and Smooth Zoom -->
      <div class="relative aspect-square w-full shrink-0 overflow-hidden bg-surface">
        <img
          v-if="product.coverImage"
          :src="product.coverImage"
          :alt="name(product)"
          class="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          loading="lazy"
        />
        <div v-else class="flex h-full w-full items-center justify-center text-xs font-medium text-slate-400">
          {{ t('common.noImage') }}
        </div>

        <!-- Category Chip (Top Start) -->
        <span 
          v-if="product.category" 
          class="absolute start-2 top-2 rounded-full bg-navy/80 px-2.5 py-0.5 text-[9px] sm:text-[10px] font-semibold text-white backdrop-blur-md"
        >
          {{ locale === 'ar' ? product.category.nameAr : product.category.nameEn }}
        </span>

        <!-- Discount Badge (Top-Left corner, only when discounted) -->
        <span
          v-if="discountPercent > 0"
          class="absolute left-[10px] top-[10px] z-[5] inline-flex items-center rounded-full bg-error px-[10px] py-[4px] text-[12px] font-bold text-white shadow-xs"
          style="border-radius: 20px;"
        >
          {{ locale === 'ar' ? `خصم ${discountPercent}%` : `${discountPercent}% OFF` }}
        </span>

      </div>

      <!-- Information & Pricing with Uniform Line Height & Baseline -->
      <div class="p-3 sm:p-3.5 flex flex-1 flex-col justify-between">
        <h3 class="font-heading text-xs sm:text-sm font-bold leading-snug text-text line-clamp-2 min-h-[2.4rem] sm:min-h-[2.5rem] group-hover:text-primary transition-colors mb-2">
          {{ name(product) }}
        </h3>

        <div class="mt-auto flex items-baseline gap-1.5 flex-wrap">
          <span class="text-sm sm:text-base font-black text-primary">
            {{ product.price }} <span class="text-[10px] sm:text-xs font-semibold">EGP</span>
          </span>
          <span 
            v-if="product.compareAtPrice" 
            class="text-[11px] sm:text-xs text-slate-400 line-through"
          >
            {{ product.compareAtPrice }} EGP
          </span>
        </div>
      </div>
    </NuxtLink>

    <!-- Card Action Button: Add to Cart -->
    <div class="p-3 sm:p-3.5 pt-0">
      <button
        type="button"
        class="inline-flex h-8.5 sm:h-9 w-full items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition-all active:scale-[0.98]"
        :class="added ? 'bg-emerald-600 text-white' : 'bg-border/40 hover:bg-accent text-text hover:text-on-accent'"
        @click="onAddToCart"
      >
        <Check v-if="added" class="h-3.5 w-3.5" />
        <ShoppingCart v-else class="h-3.5 w-3.5" />
        <span>{{ added ? (locale === 'ar' ? 'تمت الإضافة للسلة' : 'Added to Cart') : (locale === 'ar' ? 'إضافة للسلة' : 'Add to Cart') }}</span>
      </button>
    </div>
  </div>
</template>
