<script setup lang="ts">
import { 
  Check, 
  CheckCircle2, 
  Copy, 
  Cpu, 
  Download, 
  FileText, 
  MessageCircle, 
  Minus, 
  Play, 
  Plus, 
  Share2, 
  ShieldCheck, 
  ShoppingCart, 
  Truck, 
  Video 
} from 'lucide-vue-next'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const slug = String(route.params.slug)

interface LandingProduct {
  id?: string
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
  video?: { id: string, type: string, url: string } | null
  documents?: { id: string, labelAr: string, labelEn: string, filePath: string, fileType: string, sortOrder: number }[]
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
const added = ref(false)
const quantity = ref(1)

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

// NOTE: Title/meta use useHead (not useSeoMeta) — useSeoMeta silently emitted
// no <title>/meta during SSR on this page. Same useHead pattern as products/[slug].vue.
useHead(() => {
  const title = name.value ? `${name.value} | ${t('brand.name')}` : t('brand.name')
  const description = desc.value || data.value?.product.seo?.metaDescriptionEn || undefined
  const image = cover.value || undefined
  return {
    title,
    meta: [
      ...(description ? [{ name: 'description', content: description }] : []),
      { property: 'og:title', content: title },
      ...(description ? [{ property: 'og:description', content: description }] : []),
      ...(image ? [{ property: 'og:image', content: image }] : []),
    ],
  }
})

const cart = useCartStore()

function handleAddToCart() {
  cart.addItem({
    productId: p.value.id || p.value.slug,
    slug: p.value.slug,
    nameAr: p.value.nameAr,
    nameEn: p.value.nameEn,
    price: Number(p.value.price),
    coverImage: cover.value,
    quantity: quantity.value,
  })
  added.value = true
  setTimeout(() => {
    added.value = false
  }, 2200)
}

function updateQty(delta: number) {
  quantity.value = Math.max(1, quantity.value + delta)
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(pageUrl.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  }
  catch { /* clipboard unavailable */ }
}

const waHref = computed(() => {
  const msg = `${name.value} - ${pageUrl.value}`
  return `https://wa.me/?text=${encodeURIComponent(msg)}`
})

function getEmbedUrl(url: string, type?: string): string {
  if (!url) return ''
  if (type === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`
    }
    return url
  }
  if (type === 'vimeo' || url.includes('vimeo.com')) {
    const regExp = /vimeo\.com\/(\d+)/
    const match = url.match(regExp)
    if (match && match[1]) {
      return `https://player.vimeo.com/video/${match[1]}`
    }
    return url
  }
  return url
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
    
    <!-- Breadcrumb Trail -->
    <nav class="mb-6 flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400" aria-label="Breadcrumb">
      <NuxtLink :to="localePath('/')" class="hover:text-[#2B71AE] transition-colors">{{ t('nav.home') }}</NuxtLink>
      <span class="text-slate-400">/</span>
      <NuxtLink :to="localePath('/products')" class="hover:text-[#2B71AE] transition-colors">{{ t('products.title') }}</NuxtLink>
      <span class="text-slate-400">/</span>
      <NuxtLink :to="localePath(`/products/${p.category.slug}`)" class="hover:text-[#2B71AE] transition-colors">
        {{ locale === 'ar' ? p.category.nameAr : p.category.nameEn }}
      </NuxtLink>
      <span class="text-slate-400">/</span>
      <span class="text-slate-900 dark:text-white font-semibold truncate max-w-xs">{{ name }}</span>
    </nav>

    <!-- Main Product Showcase Grid -->
    <div class="grid gap-10 lg:grid-cols-12 lg:gap-14">
      
      <!-- Gallery Column (5 cols) -->
      <div class="lg:col-span-5 space-y-4">
        <!-- Main Image Box -->
        <div 
          class="aspect-square w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-[#162032]"
          :style="{ borderColor: 'var(--color-border)' }"
        >
          <div class="relative h-full w-full overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-center">
            <img 
              v-if="p.images[activeImage]" 
              :src="p.images[activeImage]!.path" 
              :alt="name" 
              class="h-full w-full object-contain p-2" 
            />
            <div v-else class="text-xs text-slate-400">
              {{ t('common.noImage') }}
            </div>
          </div>
        </div>

        <!-- Thumbnails Strip -->
        <div v-if="p.images.length > 1" class="grid grid-cols-5 gap-2.5">
          <button
            v-for="(img, i) in p.images"
            :key="img.path"
            type="button"
            class="aspect-square overflow-hidden rounded-xl border p-1 transition-all active:scale-95"
            :class="i === activeImage ? 'border-[#2B71AE] ring-2 ring-[#2B71AE]/20 dark:border-[#F5CC07] dark:ring-[#F5CC07]/20 bg-white dark:bg-[#162032]' : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40'"
            @click="activeImage = i"
          >
            <img :src="img.path" :alt="`${name} ${i + 1}`" class="h-full w-full object-cover rounded-lg" loading="lazy" />
          </button>
        </div>

        <!-- Product Video Section (if attached) -->
        <div v-if="p.video" class="mt-5 rounded-2xl border border-slate-200/90 overflow-hidden bg-white shadow-xs dark:border-slate-800 dark:bg-[#162032]">
          <div class="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Play class="h-3.5 w-3.5 text-[#F5CC07] fill-current" />
            <span>{{ locale === 'ar' ? 'فيديو توضيحي للمنتج' : 'Product Demonstration Video' }}</span>
          </div>
          <div class="relative aspect-video w-full bg-black">
            <iframe
              v-if="p.video.type === 'youtube' || p.video.type === 'vimeo'"
              :src="getEmbedUrl(p.video.url, p.video.type)"
              class="h-full w-full"
              allowfullscreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            ></iframe>
            <video
              v-else
              controls
              :src="p.video.url"
              class="h-full w-full object-cover"
            ></video>
          </div>
        </div>
      </div>

      <!-- Details Column (7 cols) -->
      <div class="lg:col-span-7 flex flex-col justify-between">
        <div>
          <!-- Category Chip -->
          <NuxtLink 
            :to="localePath(`/products/${p.category.slug}`)"
            class="inline-block rounded-full bg-[#2B71AE]/10 px-3 py-1 text-xs font-bold text-[#2B71AE] hover:bg-[#2B71AE]/20 dark:bg-[#F5CC07]/15 dark:text-[#F5CC07] transition-colors mb-3"
          >
            {{ locale === 'ar' ? p.category.nameAr : p.category.nameEn }}
          </NuxtLink>

          <!-- Product Title -->
          <h1 class="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight mb-4">
            {{ name }}
          </h1>

          <!-- Price Display -->
          <div class="flex items-baseline gap-3 mb-6 pb-6 border-b border-slate-200/80 dark:border-slate-800">
            <span class="text-3xl sm:text-4xl font-black text-[#2B71AE] dark:text-[#F5CC07]">
              {{ p.price }} <span class="text-base font-bold">EGP</span>
            </span>
            <span 
              v-if="p.compareAtPrice" 
              class="text-base sm:text-lg text-slate-400 line-through"
            >
              {{ p.compareAtPrice }} EGP
            </span>
          </div>

          <!-- Description -->
          <p v-if="desc" class="text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300 mb-8 max-w-2xl">
            {{ desc }}
          </p>

          <!-- Purchasing Actions -->
          <div class="space-y-4 mb-8">
            <div class="flex flex-wrap items-center gap-3">
              <!-- Quantity Stepper -->
              <div class="flex h-12 items-center rounded-xl border border-slate-200 bg-slate-50 px-2 dark:border-slate-800 dark:bg-slate-800/80">
                <button
                  type="button"
                  class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                  :aria-label="locale === 'ar' ? 'تقليل الكمية' : 'Decrease quantity'"
                  @click="updateQty(-1)"
                >
                  <Minus class="h-3.5 w-3.5" />
                </button>
                <span class="w-10 text-center font-mono text-sm font-bold text-slate-900 dark:text-white">
                  {{ quantity }}
                </span>
                <button
                  type="button"
                  class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                  :aria-label="locale === 'ar' ? 'زيادة الكمية' : 'Increase quantity'"
                  @click="updateQty(1)"
                >
                  <Plus class="h-3.5 w-3.5" />
                </button>
              </div>

              <!-- Add to Cart Primary CTA -->
              <button 
                type="button" 
                class="flex-1 min-w-[200px] h-12 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/10 active:scale-[0.98] transition-all"
                :class="added ? 'bg-emerald-600 text-white' : 'bg-[#2B71AE] hover:bg-[#285E8E] text-white'"
                @click="handleAddToCart"
              >
                <Check v-if="added" class="h-4 w-4" />
                <ShoppingCart v-else class="h-4 w-4" />
                <span>{{ added ? (locale === 'ar' ? 'تمت الإضافة للسلة' : 'Added to Cart') : (locale === 'ar' ? 'إضافة إلى السلة' : 'Add to Cart') }}</span>
              </button>
            </div>

            <!-- Secondary Sharing Actions -->
            <div class="flex flex-wrap items-center gap-2.5 pt-2">
              <a 
                :href="waHref" 
                target="_blank" 
                rel="noopener" 
                class="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:border-emerald-500 hover:text-emerald-600 dark:border-slate-800 dark:bg-[#162032] dark:text-slate-300 dark:hover:border-emerald-500 dark:hover:text-emerald-400 transition-colors"
              >
                <MessageCircle class="h-3.5 w-3.5 text-emerald-500" />
                <span>{{ t('products.shareWhatsApp') }}</span>
              </a>

              <button 
                type="button" 
                class="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#162032] dark:text-slate-300 dark:hover:bg-slate-800 transition-colors" 
                @click="copyLink"
              >
                <Check v-if="copied" class="h-3.5 w-3.5 text-emerald-500" />
                <Copy v-else class="h-3.5 w-3.5 text-slate-400" />
                <span>{{ copied ? (locale === 'ar' ? 'تم نسخ الرابط' : 'Link Copied') : (locale === 'ar' ? 'نسخ الرابط' : 'Copy Link') }}</span>
              </button>
            </div>
          </div>

          <!-- Product Confidence Strip -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-300 mb-8">
            <div class="flex items-center gap-2">
              <ShieldCheck class="h-4 w-4 text-[#F5CC07] shrink-0" />
              <span>{{ locale === 'ar' ? 'أصلي ومضمون 100%' : '100% Genuine Part' }}</span>
            </div>
            <div class="flex items-center gap-2">
              <Truck class="h-4 w-4 text-[#F5CC07] shrink-0" />
              <span>{{ locale === 'ar' ? 'شحن سريع بالمحافظات' : 'Fast Regional Dispatch' }}</span>
            </div>
            <div class="flex items-center gap-2 col-span-2 sm:col-span-1">
              <FileText class="h-4 w-4 text-[#F5CC07] shrink-0" />
              <span>{{ locale === 'ar' ? 'كتيب بيانات معتمد' : 'Verified Datasheet' }}</span>
            </div>
          </div>
        </div>

        <!-- Technical Specifications Cards -->
        <div v-if="p.attributes?.length" class="border-t border-slate-200/80 dark:border-slate-800 pt-8">
          <h2 class="font-heading text-lg font-bold text-slate-900 dark:text-white mb-4">
            {{ t('products.specs') }}
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div 
              v-for="a in p.attributes" 
              :key="a.keyEn"
              class="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-[#162032]"
            >
              <span class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                {{ locale === 'ar' ? a.keyAr : a.keyEn }}
              </span>
              <span class="font-mono text-xs font-bold text-slate-900 dark:text-white">
                {{ locale === 'ar' ? a.valueAr : a.valueEn }}
              </span>
            </div>
          </div>
        </div>

        <!-- Product Documents & Datasheets (PDF) Section -->
        <div v-if="p.documents?.length" class="border-t border-slate-200/80 dark:border-slate-800 pt-8 mt-8">
          <div class="flex items-center gap-2 mb-4">
            <FileText class="h-5 w-5 text-[#2B71AE] dark:text-[#F5CC07]" />
            <h2 class="font-heading text-lg font-bold text-slate-900 dark:text-white">
              {{ locale === 'ar' ? 'كتيبات المواصفات والملفات الفنية (PDF)' : 'Technical Datasheets & Documentation (PDF)' }}
            </h2>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              v-for="doc in p.documents"
              :key="doc.id"
              :href="doc.filePath"
              target="_blank"
              download
              class="group flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs hover:border-[#2B71AE] hover:shadow-md dark:border-slate-800 dark:bg-[#162032] dark:hover:border-[#F5CC07] transition-all"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 font-bold text-xs uppercase">
                  PDF
                </div>
                <div class="min-w-0">
                  <p class="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate group-hover:text-[#2B71AE] dark:group-hover:text-[#F5CC07] transition-colors">
                    {{ locale === 'ar' ? doc.labelAr : doc.labelEn }}
                  </p>
                  <span class="text-[10px] text-slate-400 font-mono block">
                    {{ locale === 'ar' ? 'تحميل المستند' : 'Download Document' }}
                  </span>
                </div>
              </div>

              <Download class="h-4 w-4 text-slate-400 group-hover:text-[#2B71AE] dark:group-hover:text-[#F5CC07] transition-colors shrink-0" />
            </a>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
