<script setup lang="ts">
import {
  ArrowRight,
  Headphones,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles
} from 'lucide-vue-next'

const { t, locale } = useI18n()
const localePath = useLocalePath()

const { data: contact } = await useAsyncData('contact-page', () => $fetch<any>('/api/settings/contact'))
const siteSeo = await useSiteSeo()

// No page-specific SEO exists for Contact → site-wide templates/descriptions apply.
useHead(() => {
  const pageName = locale.value === 'ar' ? 'اتصل بنا' : 'Contact Us'
  const fallbackTitle = `${pageName} | ${t('brand.name')}`
  const title = applySeoTitle(
    locale.value === 'ar' ? siteSeo.value?.titleTemplateAr : siteSeo.value?.titleTemplateEn,
    pageName,
    fallbackTitle,
  )
  const description = (locale.value === 'ar' ? siteSeo.value?.descriptionAr : siteSeo.value?.descriptionEn) || undefined
  return {
    title,
    meta: [
      ...(description ? [{ name: 'description', content: description }] : []),
      { property: 'og:title', content: title },
      ...(description ? [{ property: 'og:description', content: description }] : []),
      ...(siteSeo.value?.keywords ? [{ name: 'keywords', content: siteSeo.value.keywords }] : []),
    ],
  }
})

const whatsappUrl = computed(() => {
  const num = contact.value?.contactWhatsapp || contact.value?.contactPhone1 || '01000000000'
  return whatsappLink(num)
})
</script>

<template>
  <div class="space-y-0">
    
    <!-- Hero Header Banner with Technical Styling -->
    <div class="relative overflow-hidden bg-[#0B1520] text-white border-b border-slate-800">
      <!-- Ambient Lighting -->
      <div class="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#2B71AE]/20 blur-3xl"></div>
      <div 
        class="pointer-events-none absolute inset-0 opacity-[0.06]" 
        style="background-image: radial-gradient(#2B71AE 1px, transparent 1px); background-size: 24px 24px;"
      ></div>

      <div class="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <!-- Breadcrumb Navigation -->
        <nav class="mb-4 flex items-center gap-1.5 text-xs font-medium text-slate-400" aria-label="Breadcrumb">
          <NuxtLink :to="localePath('/')" class="hover:text-white transition-colors">{{ t('nav.home') }}</NuxtLink>
          <span class="text-slate-600">/</span>
          <span class="text-[#F5CC07] font-semibold">{{ locale === 'ar' ? 'اتصل بنا' : 'Contact Us' }}</span>
        </nav>

        <div class="max-w-3xl">
          <div class="inline-flex items-center gap-1.5 rounded-full bg-[#2B71AE]/20 border border-[#2B71AE]/40 px-3 py-1 text-[11px] font-bold text-blue-300 uppercase tracking-wider mb-3">
            <Headphones class="h-3.5 w-3.5 text-[#F5CC07]" />
            <span>{{ locale === 'ar' ? 'الدعم الهندسي المباشر' : 'Direct Engineering Support' }}</span>
          </div>

          <h1 class="font-heading text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-3">
            {{ locale === 'ar' ? 'تواصل مع فريقنا الهندسي' : 'Contact Our Technical Team' }}
          </h1>

          <p class="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            {{ locale === 'ar' 
              ? 'نحن هنا للإجابة على استفساراتكم الفنية، وتقديم عروض أسعار التوريدات، وتنسيق زيارات الصيانة الميدانية للمصانع والورش.' 
              : 'Our engineering specialists are ready to assist with component inquiries, enterprise volume quotes, and on-site factory diagnostic visits.' }}
          </p>
        </div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        <!-- Channels & Details Column (7 cols) -->
        <div class="lg:col-span-7 space-y-5">
          
          <!-- Unified Phone Card -->
          <a 
            v-if="contact?.contactPhone1" 
            :href="`tel:${contact.contactPhone1}`" 
            class="group flex items-start gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs hover:border-[#2B71AE] hover:shadow-lg dark:border-slate-800 dark:bg-[#162032] dark:hover:border-[#2B71AE] transition-all"
          >
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#2B71AE]/10 text-[#2B71AE] dark:bg-[#2B71AE]/25 dark:text-blue-300 group-hover:bg-[#2B71AE] group-hover:text-white transition-colors">
              <Phone class="w-6 h-6" />
            </div>
            <div class="flex-1">
              <h2 class="font-heading text-base font-bold text-slate-900 dark:text-white mb-1">
                {{ locale === 'ar' ? 'الخط الهاتفي المباشر' : 'Primary Phone' }}
              </h2>
              <p class="font-mono text-base font-bold text-[#2B71AE] dark:text-[#F5CC07]" dir="ltr">
                {{ contact.contactPhone1 }}
              </p>
              <span class="text-xs text-slate-400 mt-1 block">
                {{ locale === 'ar' ? 'متاح طوال ساعات العمل للمكالمات والاستشارات السريعة' : 'Available during operating hours for technical calls' }}
              </span>
            </div>
          </a>

          <!-- WhatsApp Business Card -->
          <a 
            v-if="contact?.contactWhatsapp" 
            :href="whatsappUrl" 
            target="_blank" 
            rel="noopener noreferrer" 
            class="group flex items-start gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs hover:border-emerald-500 hover:shadow-lg dark:border-slate-800 dark:bg-[#162032] dark:hover:border-emerald-500 transition-all"
          >
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <MessageCircle class="w-6 h-6" />
            </div>
            <div class="flex-1">
              <h2 class="font-heading text-base font-bold text-slate-900 dark:text-white mb-1">
                {{ locale === 'ar' ? 'محادثة فورية عبر واتساب' : 'WhatsApp Consultation' }}
              </h2>
              <p class="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400" dir="ltr">
                {{ contact.contactWhatsapp }}
              </p>
              <span class="text-xs text-slate-400 mt-1 block">
                {{ locale === 'ar' ? 'أرسل صور الأعطال، مواصفات القطع، أو ملفات المقايسات مباشرة' : 'Send fault photos, datasheets, or BOQ files directly' }}
              </span>
            </div>
          </a>

          <!-- Email Support Card -->
          <a 
            v-if="contact?.contactEmail" 
            :href="`mailto:${contact.contactEmail}`" 
            class="group flex items-start gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs hover:border-[#2B71AE] hover:shadow-lg dark:border-slate-800 dark:bg-[#162032] dark:hover:border-[#2B71AE] transition-all"
          >
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#2B71AE]/10 text-[#2B71AE] dark:bg-[#2B71AE]/25 dark:text-blue-300 group-hover:bg-[#2B71AE] group-hover:text-white transition-colors">
              <Mail class="w-6 h-6" />
            </div>
            <div class="flex-1">
              <h2 class="font-heading text-base font-bold text-slate-900 dark:text-white mb-1">
                {{ locale === 'ar' ? 'البريد الإلكتروني للشركات والتوريدات' : 'Corporate & Inquiries Email' }}
              </h2>
              <p class="font-mono text-base font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                {{ contact.contactEmail }}
              </p>
              <span class="text-xs text-slate-400 mt-1 block">
                {{ locale === 'ar' ? 'استقبال أوامر الشراء، طلبات عروض الأسعار، والمراسلات الرسمية' : 'For purchase orders, formal quotation requests, and tenders' }}
              </span>
            </div>
          </a>
          
          <!-- Physical Location Card -->
          <div 
            v-if="contact?.contactAddressAr || contact?.contactAddressEn" 
            class="flex items-start gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-[#162032]"
          >
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#2B71AE]/10 text-[#2B71AE] dark:bg-[#2B71AE]/25 dark:text-blue-300">
              <MapPin class="w-6 h-6" />
            </div>
            <div class="flex-1">
              <h2 class="font-heading text-base font-bold text-slate-900 dark:text-white mb-1">
                {{ locale === 'ar' ? 'المقر الإداري ونقطة الاستلام' : 'Facility & Pick-up Point' }}
              </h2>
              <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {{ locale === 'ar' ? contact.contactAddressAr : contact.contactAddressEn }}
              </p>
            </div>
          </div>

          <!-- Social Channels (only configured platforms render) -->
          <div
            class="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-[#162032]"
          >
            <span class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {{ locale === 'ar' ? 'تابعنا على المنصات الاجتماعية:' : 'Official Social Channels:' }}
            </span>
            <AppSocialLinks variant="card" />
          </div>
        </div>

        <!-- Map Column (5 cols) -->
        <div class="lg:col-span-5">
          <div class="sticky top-24 rounded-2xl overflow-hidden shadow-xs border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#162032] p-2">
            <!-- Google Maps Embed or Fallback -->
            <div 
              v-if="contact?.googleMapsEmbedUrl" 
              class="h-[380px] sm:h-[460px] w-full rounded-xl overflow-hidden bg-slate-100" 
              v-html="contact.googleMapsEmbedUrl"
            ></div>
            <div 
              v-else 
              class="h-[380px] sm:h-[460px] w-full rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex flex-col items-center justify-center text-slate-400 p-6 text-center"
            >
              <MapPin class="w-12 h-12 text-[#2B71AE] mb-3 opacity-60" />
              <p class="font-heading text-sm font-bold text-slate-700 dark:text-slate-300">
                {{ locale === 'ar' ? 'خريطة الموقع' : 'Location Map' }}
              </p>
              <p class="text-xs text-slate-500 mt-1 max-w-xs">
                {{ locale === 'ar' ? contact.contactAddressAr || 'القاهرة، جمهورية مصر العربية' : contact.contactAddressEn || 'Cairo, Egypt' }}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<style>
/* Ensure iframe takes full space */
iframe {
  width: 100% !important;
  height: 100% !important;
  border: 0;
}
</style>
