<script setup lang="ts">
import { Globe, Mail, MapPin, Phone, ShieldCheck, Zap } from 'lucide-vue-next'

const { t, locale } = useI18n()
const localePath = useLocalePath()

const { data: general } = await useAsyncData('footer-general', () =>
  $fetch<any>('/api/settings/general'),
  { server: true, lazy: true }
)

const { data: contact } = await useAsyncData('footer-contact', () =>
  $fetch<any>('/api/settings/contact'),
  { server: true, lazy: true }
)

const year = new Date().getFullYear()
const { openBanner: openConsentBanner } = useCookieConsent()

const siteDisplayName = computed(() => {
  if (locale.value === 'ar') {
    return general.value?.siteNameAr || t('brand.name')
  }
  const name = general.value?.siteNameEn || t('brand.name')
  return name
})

const tagline = computed(() => {
  return (locale.value === 'ar' ? general.value?.taglineAr : general.value?.taglineEn) || t('brand.tagline')
})

</script>

<template>
  <footer class="border-t border-white/10 bg-navy text-slate-300 pt-16 pb-12 transition-colors">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      
      <!-- Upper Footer Grid -->
      <div class="grid grid-cols-1 gap-10 md:grid-cols-12 lg:gap-14 pb-12">
        
        <!-- Col 1: Brand & Identity (5 cols) -->
        <div class="md:col-span-5 space-y-4">
          <NuxtLink :to="localePath('/')" class="inline-flex items-center gap-2.5 text-white group">
            <img 
              v-if="general?.logoPath" 
              :src="general.logoPath" 
              :alt="siteDisplayName" 
              class="h-10 w-auto max-w-[150px] rounded object-contain bg-white p-1" 
            />
            <div v-else class="flex items-center gap-2.5">
              <img src="/logo.png" alt="Amir" class="h-9 w-9 rounded object-contain shadow-xs" loading="lazy" />
              <span class="font-heading text-xl font-bold tracking-tight text-white group-hover:text-cream transition-colors">
                {{ siteDisplayName }}
              </span>
            </div>
          </NuxtLink>

          <p class="text-[22px] font-bold leading-snug text-cream max-w-sm">
            {{ tagline }}
          </p>

          <p class="text-sm leading-relaxed text-muted max-w-sm">
            Schloßstr. 2c, 86405 Meitingen. {{ locale === 'de' ? 'Ihr Friseur- und Kosmetikstudio für meisterhafte Haarpflege, brillante Colorationen und verwöhnende Kosmetik.' : 'Your salon for hair styling, luminous color, and relaxing cosmetic treatments.' }}
          </p>

          <!-- Social Links (only configured platforms render; empty = hidden) -->
          <div class="pt-2">
            <AppSocialLinks variant="footer" />
          </div>
        </div>

        <!-- Col 2: Navigation Links (3 cols) -->
        <div class="md:col-span-3 space-y-4">
          <h3 class="font-heading text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <span class="h-1.5 w-1.5 rounded-full bg-cream" aria-hidden="true"></span>
            <span>{{ locale === 'ar' ? 'روابط المنصة' : 'Platform Navigation' }}</span>
          </h3>
          <ul class="space-y-2.5 text-sm">
            <li>
              <NuxtLink :to="localePath('/')" class="text-slate-400 hover:text-cream hover:translate-x-1 rtl:hover:-translate-x-1 transition-all duration-200 inline-flex items-center gap-1.5">
                <span>{{ t('nav.home') }}</span>
              </NuxtLink>
            </li>
            <li>
              <NuxtLink :to="localePath('/products')" class="text-slate-400 hover:text-cream hover:translate-x-1 rtl:hover:-translate-x-1 transition-all duration-200 inline-flex items-center gap-1.5">
                <span>{{ t('nav.products') }}</span>
              </NuxtLink>
            </li>
            <li>
              <NuxtLink :to="localePath('/services')" class="text-slate-400 hover:text-cream hover:translate-x-1 rtl:hover:-translate-x-1 transition-all duration-200 inline-flex items-center gap-1.5">
                <span>{{ t('nav.services') }}</span>
              </NuxtLink>
            </li>
            <li>
              <NuxtLink :to="localePath('/contact')" class="text-slate-400 hover:text-cream hover:translate-x-1 rtl:hover:-translate-x-1 transition-all duration-200 inline-flex items-center gap-1.5">
                <span>{{ t('nav.contact') }}</span>
              </NuxtLink>
            </li>
            <li>
              <button
                type="button"
                class="text-slate-400 hover:text-cream hover:translate-x-1 rtl:hover:-translate-x-1 transition-all duration-200 inline-flex items-center gap-1.5 cursor-pointer"
                @click="openConsentBanner"
              >
                <span>{{ t('consent.cookieSettings') }}</span>
              </button>
            </li>
          </ul>
        </div>

        <!-- Col 3: Direct Technical Contact (4 cols) -->
        <div class="md:col-span-4 space-y-4">
          <h3 class="font-heading text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <span class="h-1.5 w-1.5 rounded-full bg-cream" aria-hidden="true"></span>
            <span>{{ locale === 'ar' ? 'الدعم الهندسي والاستفسارات' : 'Technical Support & Inquiries' }}</span>
          </h3>
          <ul class="space-y-3.5 text-sm">
            <li v-if="contact?.contactPhone1" class="flex items-start gap-3 group">
              <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-cream shadow-xs group-hover:bg-white/10 group-hover:border-white/20 transition-colors">
                <Phone class="w-4 h-4" />
              </div>
              <div>
                <span class="block text-[11px] text-slate-400 font-medium">{{ locale === 'ar' ? 'الهاتف المباشر' : 'Direct Line' }}</span>
                <a :href="`tel:${contact.contactPhone1}`" dir="ltr" class="font-mono text-sm text-slate-200 hover:text-cream transition-colors">{{ contact.contactPhone1 }}</a>
              </div>
            </li>

            <li v-if="contact?.contactEmail" class="flex items-start gap-3 group">
              <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-cream shadow-xs group-hover:bg-white/10 group-hover:border-white/20 transition-colors">
                <Mail class="w-4 h-4" />
              </div>
              <div>
                <span class="block text-[11px] text-slate-400 font-medium">{{ locale === 'ar' ? 'البريد الإلكتروني' : 'Official Email' }}</span>
                <a :href="`mailto:${contact.contactEmail}`" class="text-sm text-slate-200 hover:text-cream transition-colors">{{ contact.contactEmail }}</a>
              </div>
            </li>

            <li v-if="contact?.contactAddressEn || contact?.contactAddressAr" class="flex items-start gap-3 group">
              <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-cream shadow-xs group-hover:bg-white/10 group-hover:border-white/20 transition-colors">
                <MapPin class="w-4 h-4" />
              </div>
              <div>
                <span class="block text-[11px] text-slate-400 font-medium">{{ locale === 'ar' ? 'الموقع الفعلي' : 'Location' }}</span>
                <span class="text-xs text-slate-300 leading-relaxed">{{ locale === 'ar' ? contact.contactAddressAr : contact.contactAddressEn }}</span>
              </div>
            </li>
          </ul>
        </div>

      </div>

      <!-- Lower Footer: Centered Vertically Stacked Content -->
      <div class="pt-8 border-t border-white/10 flex flex-col items-center justify-center gap-2 text-center text-xs text-slate-400">
        <!-- Line 1: Copyright -->
        <p>&copy; {{ year }} {{ siteDisplayName }}. {{ locale === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.' }}</p>

        <!-- Line 2: Developer Credit -->
        <div class="text-slate-400">
          <span>{{ locale === 'ar' ? 'تم التطوير بواسطة ' : 'Developed by ' }}</span>
          <a
            href="https://abdelrhmanisc.site/"
            target="_blank"
            rel="noopener noreferrer"
            class="font-semibold text-slate-200 hover:text-cream underline-offset-4 hover:underline transition-colors"
          >
            Abdelrhman
          </a>
        </div>
      </div>

    </div>
  </footer>
</template>
