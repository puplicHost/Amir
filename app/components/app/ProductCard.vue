<script setup lang="ts">
import { Boxes } from 'lucide-vue-next'
import { localizedText } from '../../utils/content.ts'

interface Card {
  id?: string
  slug: string
  nameAr: string
  nameEn: string
  nameDe?: string | null
  price: string | number | null
  coverImage: string | null
  brand?: string | null
  category: { slug: string, nameAr: string, nameEn: string, nameDe?: string | null }
}

defineProps<{ product: Card }>()

const { locale } = useI18n()
const localePath = useLocalePath()

// AUDIT P2-11: German UI prefers nameDe, then falls back to English.
const name = (p: Card) => localizedText(locale.value, { de: p.nameDe, en: p.nameEn, ar: p.nameAr })

/** Brand label only when a brand exists. */
const brandOf = (p: Card) => p.brand?.trim() || ''

/** No price line for missing/zero prices (never "0 €"). */
function hasPrice(price: Card['price']): boolean {
  if (price === null || price === undefined) return false
  const s = String(price).trim()
  if (!s) return false
  const n = Number(s.replace(',', '.'))
  if (Number.isFinite(n) && n === 0) return false
  return true
}
</script>

<template>
  <NuxtLink
    :to="localePath(`/p/${product.slug}`)"
    class="group flex h-full flex-col overflow-hidden rounded-sm border border-border bg-surface transition-[border-color] duration-150 motion-safe:transition-[border-color] hover:border-text"
  >
    <!-- Image tile (4:5, full card width) or neutral gray tile with centered line icon -->
    <div class="relative aspect-[4/5] w-full shrink-0 overflow-hidden rounded-sm bg-border/40">
      <img
        v-if="product.coverImage"
        :src="product.coverImage"
        :alt="name(product)"
        class="absolute inset-0 h-full w-full object-cover transition-transform duration-200 motion-safe:transition-transform group-hover:scale-[1.03]"
        loading="lazy"
        decoding="async"
        width="800"
        height="1000"
      />
      <div v-else class="absolute inset-0 flex items-center justify-center text-muted">
        <Boxes class="h-8 w-8" :stroke-width="1.5" aria-hidden="true" />
      </div>
    </div>

    <!-- Text below the image, never overlapping -->
    <div class="flex min-w-0 flex-1 flex-col p-3 md:p-4">
      <p v-if="brandOf(product)" class="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted truncate">
        {{ brandOf(product) }}
      </p>
      <h3 class="font-sans text-[15px] font-semibold leading-[1.3] text-text line-clamp-2 hyphens-auto [overflow-wrap:anywhere] text-balance">
        {{ name(product) }}
      </h3>
      <p v-if="hasPrice(product.price)" class="mt-auto pt-2 font-sans text-base font-semibold tabular-nums text-text whitespace-nowrap">
        {{ product.price }} <span class="text-xs font-semibold">€</span>
      </p>
    </div>
  </NuxtLink>
</template>
