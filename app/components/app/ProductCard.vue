<script setup lang="ts">
import { Check, FileText, ShoppingCart } from 'lucide-vue-next'

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
const quoteStore = useQuoteStore()

const name = (p: Card) => (locale.value === 'ar' ? p.nameAr : p.nameEn)
const added = ref(false)

const isQuoteSelected = computed(() => {
  const pid = props.product.id || props.product.slug
  return quoteStore.isSelected(pid)
})

function onToggleQuote(e: Event) {
  e.preventDefault()
  e.stopPropagation()
  quoteStore.toggleItem({
    productId: props.product.id || props.product.slug,
    slug: props.product.slug,
    nameAr: props.product.nameAr,
    nameEn: props.product.nameEn,
    price: Number(props.product.price),
    coverImage: props.product.coverImage || null,
  })
}

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
    class="group flex h-full flex-col justify-between overflow-hidden rounded-xl border bg-white shadow-xs hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
    :class="[
      isQuoteSelected
        ? 'border-[#F5CC07] ring-1 ring-[#F5CC07]/40 dark:border-[#F5CC07] dark:bg-[#162032]'
        : 'border-slate-200/90 hover:border-[#2B71AE] dark:border-slate-800 dark:bg-[#162032] dark:hover:border-[#2B71AE]'
    ]"
  >
    <NuxtLink :to="localePath(`/p/${product.slug}`)" class="block flex-1 flex flex-col">
      <!-- Cover Image with Fixed 1:1 Aspect Ratio and Smooth Zoom -->
      <div class="relative aspect-square w-full shrink-0 overflow-hidden bg-slate-50 dark:bg-slate-800/60">
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
          class="absolute start-2 top-2 rounded-full bg-slate-900/80 px-2.5 py-0.5 text-[9px] sm:text-[10px] font-semibold text-white backdrop-blur-md dark:bg-slate-950/80"
        >
          {{ locale === 'ar' ? product.category.nameAr : product.category.nameEn }}
        </span>

        <!-- Select for Price Quote Toggle (Top End) -->
        <button
          type="button"
          class="absolute end-2 top-2 z-10 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold backdrop-blur-md transition-all active:scale-95 shadow-xs"
          :class="isQuoteSelected
            ? 'bg-[#F5CC07] text-slate-950 font-black shadow-md ring-1 ring-yellow-500'
            : 'bg-white/85 text-slate-700 hover:bg-white hover:text-[#2B71AE] border border-slate-200/80 dark:bg-[#0B1520]/80 dark:text-slate-300 dark:hover:bg-[#0B1520] dark:border-slate-700'"
          :title="locale === 'ar' ? 'تحديد لإضافته إلى عرض السعر الرسمي' : 'Select for official price quotation'"
          @click="onToggleQuote"
        >
          <Check v-if="isQuoteSelected" class="h-3 w-3 stroke-[3]" />
          <FileText v-else class="h-3 w-3" />
          <span>{{ isQuoteSelected ? (locale === 'ar' ? 'تم التحديد' : 'Selected') : (locale === 'ar' ? 'عرض سعر' : 'Quote') }}</span>
        </button>
      </div>

      <!-- Information & Pricing with Uniform Line Height & Baseline -->
      <div class="p-3 sm:p-3.5 flex flex-1 flex-col justify-between">
        <h3 class="font-heading text-xs sm:text-sm font-bold leading-snug text-slate-900 line-clamp-2 min-h-[2.4rem] sm:min-h-[2.5rem] group-hover:text-[#2B71AE] dark:text-white dark:group-hover:text-[#F5CC07] transition-colors mb-2">
          {{ name(product) }}
        </h3>

        <div class="mt-auto flex items-baseline gap-1.5 flex-wrap">
          <span class="text-sm sm:text-base font-black text-[#2B71AE] dark:text-[#F5CC07]">
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
        :class="added ? 'bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-[#F5CC07] text-slate-900 dark:bg-slate-800 dark:text-white dark:hover:bg-[#F5CC07] dark:hover:text-slate-950'"
        @click="onAddToCart"
      >
        <Check v-if="added" class="h-3.5 w-3.5" />
        <ShoppingCart v-else class="h-3.5 w-3.5" />
        <span>{{ added ? (locale === 'ar' ? 'تمت الإضافة للسلة' : 'Added to Cart') : (locale === 'ar' ? 'إضافة للسلة' : 'Add to Cart') }}</span>
      </button>
    </div>
  </div>
</template>
