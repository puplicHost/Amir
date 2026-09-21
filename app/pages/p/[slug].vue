<script setup lang="ts">
import { Check, Share2 } from 'lucide-vue-next'

const { t, locale } = useI18n()
const route = useRoute()
const slug = String(route.params.slug)

interface LandingProduct {
  nameAr: string
  nameEn: string
  slug: string
  descriptionAr: string | null
  descriptionEn: string | null
  price: string | number
  compareAtPrice: string | number | null
  category: { slug: string, nameAr: string, nameEn: string }
  images: { path: string, altAr: string | null, altEn: string | null }[]
  attributes: { keyAr: string, keyEn: string, valueAr: string, valueEn: string }[]
  seo: { metaTitleEn: string | null, metaDescriptionEn: string | null } | null
}

const { data, error } = await useAsyncData(`product-${slug}`, () =>
  $fetch<{ product: LandingProduct }>(`/api/products/${slug}`),
)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Product not found', fatal: true })
}

const p = computed(() => data.value!.product)
const name = computed(() => (locale.value === 'ar' ? p.value.nameAr : p.value.nameEn))
const desc = computed(() => (locale.value === 'ar' ? p.value.descriptionAr : p.value.descriptionEn))
const cover = computed(() => p.value.images[0]?.path || null)
const activeImage = ref(0)
const copied = ref(false)

const pageUrl = computed(() => `https://mango-electronics.com/p/${p.value.slug}`)


useHead(() => ({
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": name.value,
        "image": p.value.images.map(i => "https://mango-electronics.com" + i.path),
        "description": desc.value || "",
        "sku": p.value.slug,
        "offers": {
          "@type": "Offer",
          "url": "https://mango-electronics.com/p/" + p.value.slug,
          "priceCurrency": "EGP",
          "price": String(p.value.price),
          "availability": "https://schema.org/InStock"
        }
      })
    }
  ]
}))

useSeoMeta(() => ({
  title: `${name.value} | ${t('brand.name')}`,
  description: desc.value || undefined,
  ogTitle: `${name.value} | ${t('brand.name')}`,
  ogDescription: desc.value || undefined,
  ogImage: cover.value || undefined,
}))

const cart = useCartStore()

function addToCart() {
  cart.addItem({
    productId: p.value.id,
    slug: p.value.slug,
    nameAr: p.value.nameAr,
    nameEn: p.value.nameEn,
    price: Number(p.value.price),
    coverImage: cover.value,
  })
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(pageUrl.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  }
  catch { /* clipboard unavailable */ }
}

const waHref = computed(() => `https://wa.me/?text=${encodeURIComponent(`${name.value} ${pageUrl.value}`)}`)
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8">
    <nav class="text-sm text-slate-500" aria-label="Breadcrumb">
      <NuxtLink to="/" class="hover:underline">{{ t('nav.home') }}</NuxtLink>
      <span class="mx-1">/</span>
      <NuxtLink to="/products" class="hover:underline">{{ t('products.title') }}</NuxtLink>
      <span class="mx-1">/</span>
      <NuxtLink :to="`/products/${p.category.slug}`" class="hover:underline">{{ locale === 'ar' ? p.category.nameAr : p.category.nameEn }}</NuxtLink>
      <span class="mx-1">/</span>
      <span>{{ name }}</span>
    </nav>

    <div class="mt-4 grid gap-8 md:grid-cols-2">
      <div>
        <div class="aspect-square w-full overflow-hidden rounded-md border bg-slate-100 dark:bg-slate-800" :style="{ borderColor: 'var(--color-border)' }">
          <img v-if="p.images[activeImage]" :src="p.images[activeImage]!.path" :alt="name" class="h-full w-full object-cover" />
          <div v-else class="flex h-full items-center justify-center text-sm text-slate-400">{{ t('common.noImage') }}</div>
        </div>
        <div v-if="p.images.length > 1" class="mt-2 grid grid-cols-5 gap-2">
          <button
            v-for="(img, i) in p.images"
            :key="img.path"
            type="button"
            class="aspect-square overflow-hidden rounded border"
            :style="{ borderColor: i === activeImage ? 'var(--color-primary)' : 'var(--color-border)' }"
            @click="activeImage = i"
          >
            <img :src="img.path" :alt="`${name} ${i + 1}`" class="h-full w-full object-cover" loading="lazy" />
          </button>
        </div>
      </div>

      <div>
        <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {{ locale === 'ar' ? p.category.nameAr : p.category.nameEn }}
        </span>
        <h1 class="mt-2 font-heading text-3xl font-bold">{{ name }}</h1>
        <p class="mt-2">
          <span class="text-2xl font-bold text-[#2B71AE]">{{ p.price }} EGP</span>
          <span v-if="p.compareAtPrice" class="ml-2 text-lg text-slate-400 line-through">{{ p.compareAtPrice }}</span>
        </p>
        <p v-if="desc" class="mt-4 leading-relaxed text-slate-600 dark:text-slate-300">{{ desc }}</p>

        <div class="mt-6 flex flex-wrap gap-2">
          <button type="button" class="flex h-12 items-center rounded bg-[#2B71AE] px-8 font-semibold text-white hover:bg-[#285E8E]" @click="addToCart">
            {{ t('products.addToCart') }}
          </button>
          <button type="button" class="flex h-12 items-center gap-2 rounded border px-4 text-sm font-medium" :style="{ borderColor: 'var(--color-border)' }" @click="copyLink">
            <Check v-if="copied" class="h-4 w-4" />
            <Share2 v-else class="h-4 w-4" />
            {{ copied ? t('products.copied') : t('products.copyLink') }}
          </button>
          <a :href="waHref" target="_blank" rel="noopener" class="flex h-12 items-center rounded border px-4 text-sm font-medium" :style="{ borderColor: 'var(--color-border)' }">
            {{ t('products.shareWhatsApp') }}
          </a>
        </div>

        <div v-if="p.attributes.length" class="mt-8">
          <h2 class="font-heading text-xl font-bold">{{ t('products.specs') }}</h2>
          <table class="mt-2 w-full text-sm">
            <tbody>
              <tr v-for="a in p.attributes" :key="a.keyEn" class="border-b" :style="{ borderColor: 'var(--color-border)' }">
                <td class="py-2 pr-4 font-medium text-slate-500">{{ locale === 'ar' ? a.keyAr : a.keyEn }}</td>
                <td class="py-2">{{ locale === 'ar' ? a.valueAr : a.valueEn }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
