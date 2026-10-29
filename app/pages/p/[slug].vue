<script setup lang="ts">
import { 
  Check, 
  CheckCircle2, 
  Copy, 
  Cpu, 
  Download, 
  FileText, 
  Play, 
  Share2, 
  ShieldCheck, 
  Truck, 
  Video 
} from 'lucide-vue-next'
import { localizedText } from '../../utils/content.ts'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { trackViewProduct } = useMetaEvents()
const route = useRoute()
const slug = String(route.params.slug)

interface LandingProduct {
  id?: string
  nameAr: string
  nameEn: string
  nameDe?: string | null
  slug: string
  descriptionAr: string | null
  descriptionEn: string | null
  descriptionDe?: string | null
  price: string | number
  category: { slug: string, nameAr: string, nameEn: string, nameDe?: string | null }
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
// AUDIT P2-11: German prefers nameDe/descriptionDe, then English.
const name = computed(() => localizedText(locale.value, { de: p.value.nameDe, en: p.value.nameEn, ar: p.value.nameAr }))
const desc = computed(() => localizedText(locale.value, { de: p.value.descriptionDe, en: p.value.descriptionEn, ar: p.value.descriptionAr }))
const categoryName = computed(() => localizedText(locale.value, {
  de: p.value.category.nameDe,
  en: p.value.category.nameEn,
  ar: p.value.category.nameAr,
}))
const cover = computed(() => p.value.images[0]?.path || null)
const activeImage = ref(0)
const copied = ref(false)
// AUDIT P3-02: canonical origin from runtime config, never hardcoded.
const siteUrl = useSiteUrl()

const pageUrl = computed(() => `${siteUrl}/p/${p.value.slug}`)

onMounted(() => {
  const product = p.value
  if (!product) return
  const price = Number(product.price)
  trackViewProduct({
    content_name: name.value,
    content_category: categoryName.value,
    content_ids: [product.slug],
    content_type: 'product',
    ...(Number.isFinite(price) ? { value: price, currency: 'EUR' } : {}),
  })
})

useHead(() => ({
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": name.value,
        "image": p.value.images.map(i => `${siteUrl}${i.path}`),
        "description": desc.value || "",
        "sku": p.value.slug,
        "offers": {
          "@type": "Offer",
          "url": `${siteUrl}/p/` + p.value.slug,
          "priceCurrency": "EUR",
          "price": String(p.value.price)
        }
      })
    }
  ]
}))

// NOTE: Title/meta use useHead (not useSeoMeta) — useSeoMeta silently emitted
// no <title>/meta during SSR on this page. Same useHead pattern as products/[slug].vue.
const siteSeo = await useSiteSeo()

useHead(() => {
  const title = name.value ? `${name.value} | ${t('brand.name')}` : t('brand.name')
  // Product-specific data first, site-wide description as fallback.
  const description = desc.value
    || data.value?.product.seo?.metaDescriptionEn
    || (locale.value === 'ar' ? siteSeo.value?.descriptionAr : siteSeo.value?.descriptionEn)
    || undefined
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
    <nav class="mb-6 flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted" aria-label="Breadcrumb">
      <NuxtLink :to="localePath('/')" class="hover:text-primary transition-colors">{{ t('nav.home') }}</NuxtLink>
      <span class="text-slate-400" aria-hidden="true">/</span>
      <NuxtLink :to="localePath('/products')" class="hover:text-primary transition-colors">{{ t('products.title') }}</NuxtLink>
      <span class="text-slate-400" aria-hidden="true">/</span>
      <NuxtLink :to="localePath(`/products/${p.category.slug}`)" class="hover:text-primary transition-colors">
        {{ categoryName }}
      </NuxtLink>
      <span class="text-slate-400" aria-hidden="true">/</span>
      <span class="text-text font-semibold truncate max-w-xs">{{ name }}</span>
    </nav>

    <!-- Main Product Showcase Grid -->
    <div class="grid gap-10 lg:grid-cols-12 lg:gap-14">
      
      <!-- Gallery Column (5 cols) -->
      <div class="lg:col-span-5 space-y-4">
        <!-- Main Image Box -->
        <div 
          class="aspect-square w-full overflow-hidden rounded-2xl border border-border bg-bg p-3 shadow-xs"
          :style="{ borderColor: 'var(--color-border)' }"
        >
          <div class="relative h-full w-full overflow-hidden rounded-xl bg-surface flex items-center justify-center">
            <img 
              v-if="p.images[activeImage]" 
              :src="p.images[activeImage]!.path" 
              :alt="name" 
              class="h-full w-full object-contain p-2" 
              decoding="async"
              width="1000"
              height="1000"
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
            class="aspect-square overflow-hidden rounded-xl border p-1 transition-colors active:scale-95"
            :class="i === activeImage ? 'border-primary ring-2 ring-primary/20 bg-surface' : 'border-border bg-surface'"
            :aria-label="`${name} ${i + 1}`"
            :aria-pressed="i === activeImage"
            @click="activeImage = i"
          >
            <img :src="img.path" :alt="`${name} ${i + 1}`" class="h-full w-full object-cover rounded-lg" loading="lazy" />
          </button>
        </div>

        <!-- Product Video Section (if attached) -->
        <div v-if="p.video" class="mt-5 rounded-2xl border border-border overflow-hidden bg-bg shadow-xs">
          <div class="px-3.5 py-2.5 bg-surface border-b border-border flex items-center gap-2 text-xs font-bold text-text">
            <Play class="h-3.5 w-3.5 text-cream fill-current" aria-hidden="true" />
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
            class="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary hover:bg-primary/20 transition-colors mb-3"
          >
            {{ categoryName }}
          </NuxtLink>

          <!-- Product Title -->
          <h1 class="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-text leading-tight mb-4">
            {{ name }}
          </h1>

          <!-- Price Display -->
          <div class="flex flex-wrap items-center gap-3 mb-6 pb-6 border-b border-border">
            <span class="text-3xl sm:text-4xl font-black text-primary">
              {{ p.price }} <span class="text-base font-bold">€</span>
            </span>
          </div>

          <!-- Description (Change 9: Rich content rendering) -->
          <div
            v-if="desc"
            class="flow-root text-sm sm:text-base leading-relaxed text-muted mb-8 max-w-2xl prose prose-slate [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-xl [&_figure]:my-4 [&_figcaption]:text-xs [&_figcaption]:text-slate-400 [&_figcaption]:italic [&_figcaption]:text-center"
            v-html="desc"
          />

          <!-- Sharing Actions -->
          <div class="space-y-4 mb-8">
            <!-- Secondary Sharing Actions -->
            <div class="flex flex-wrap items-center gap-2.5 pt-2">
              <a 
                :href="waHref" 
                target="_blank" 
                rel="noopener" 
                class="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-xs font-semibold text-muted hover:border-emerald-500 hover:text-emerald-600 transition-colors"
              >
                <IconWhatsApp class="h-3.5 w-3.5 text-emerald-500" />
                <span>{{ t('products.shareWhatsApp') }}</span>
              </a>

              <button 
                type="button" 
                class="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-xs font-semibold text-muted hover:bg-border/40 transition-colors" 
                @click="copyLink"
              >
                <Check v-if="copied" class="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                <Copy v-else class="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                <span>{{ copied ? (locale === 'ar' ? 'تم نسخ الرابط' : 'Link Copied') : (locale === 'ar' ? 'نسخ الرابط' : 'Copy Link') }}</span>
              </button>
            </div>
          </div>

          <!-- Product Confidence Strip -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-xl border border-border bg-surface/70 p-4 text-xs text-muted mb-8">
            <div class="flex items-center gap-2">
              <ShieldCheck class="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
              <span>{{ locale === 'ar' ? 'أصلي ومضمون 100%' : '100% Genuine Part' }}</span>
            </div>
            <div class="flex items-center gap-2">
              <Truck class="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
              <span>{{ locale === 'ar' ? 'شحن سريع بالمحافظات' : 'Fast Regional Dispatch' }}</span>
            </div>
            <div class="flex items-center gap-2 col-span-2 sm:col-span-1">
              <FileText class="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
              <span>{{ locale === 'ar' ? 'كتيب بيانات معتمد' : 'Verified Datasheet' }}</span>
            </div>
          </div>
        </div>

        <!-- Technical Specifications Cards -->
        <div v-if="p.attributes?.length" class="border-t border-border pt-8">
          <h2 class="font-heading text-lg font-bold text-text mb-4">
            {{ t('products.specs') }}
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div 
              v-for="a in p.attributes" 
              :key="a.keyEn"
              class="rounded-xl border border-border bg-bg p-3.5 shadow-xs"
            >
              <span class="block text-[11px] font-semibold text-muted mb-1">
                {{ locale === 'ar' ? a.keyAr : a.keyEn }}
              </span>
              <span class="font-mono text-xs font-bold text-text">
                {{ locale === 'ar' ? a.valueAr : a.valueEn }}
              </span>
            </div>
          </div>
        </div>

        <!-- Product Documents & Datasheets (PDF) Section -->
        <div v-if="p.documents?.length" class="border-t border-border pt-8 mt-8">
          <div class="flex items-center gap-2 mb-4">
              <FileText class="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 class="font-heading text-lg font-bold text-text">
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
              class="group flex items-center justify-between rounded-xl border border-border bg-bg p-3.5 shadow-xs hover:border-primary hover:shadow-md transition"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 font-bold text-xs uppercase dark:bg-rose-950/40 dark:text-rose-300">
                  PDF
                </div>
                <div class="min-w-0">
                  <p class="font-bold text-xs sm:text-sm text-text truncate group-hover:text-primary transition-colors">
                    {{ locale === 'ar' ? doc.labelAr : doc.labelEn }}
                  </p>
                  <span class="text-[10px] text-slate-400 font-mono block">
                    {{ locale === 'ar' ? 'تحميل المستند' : 'Download Document' }}
                  </span>
                </div>
              </div>

              <Download class="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors shrink-0" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
