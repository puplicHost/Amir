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

const siteDisplayName = computed(() => {
  if (locale.value === 'ar') {
    return general.value?.siteNameAr || t('brand.name')
  }
  const name = general.value?.siteNameEn || t('brand.name')
  return name === 'Mango' ? 'Mango Electronics' : name
})

const tagline = computed(() => {
  return (locale.value === 'ar' ? general.value?.taglineAr : general.value?.taglineEn) || t('brand.tagline')
})

</script>

<template>
  <footer class="border-t border-slate-800 bg-[#0B1520] text-slate-300 pt-16 pb-12 transition-colors">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      
      <!-- Upper Footer Grid -->
      <div class="grid grid-cols-1 gap-10 md:grid-cols-12 lg:gap-12 pb-12 border-b border-slate-800/80">
        
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
              <img src="/logo.png" alt="Mango Electronics" class="h-9 w-9 rounded object-contain shadow-xs" />
              <span class="font-heading text-xl font-bold tracking-tight text-white group-hover:text-[#F5CC07] transition-colors">
                {{ siteDisplayName }}
              </span>
            </div>
          </NuxtLink>

          <p class="text-sm leading-relaxed text-slate-400 max-w-sm">
            {{ tagline }}. {{ locale === 'ar' ? 'حلول هندسية متطورة، توريد قطع أصلية معتمدة، وبرمجة وصيانة خطوط الإنتاج والأنظمة الذكية في مصر.' : 'Specialized engineering automation, genuine industrial components, and rapid diagnostic support across Egypt.' }}
          </p>

          <!-- Social Links (only configured platforms render; empty = hidden) -->
          <div class="pt-2">
            <AppSocialLinks variant="footer" />
          </div>
        </div>

        <!-- Col 2: Navigation Links (3 cols) -->
        <div class="md:col-span-3 space-y-4">
          <h3 class="font-heading text-sm font-bold uppercase tracking-wider text-white">
            {{ locale === 'ar' ? 'روابط المنصة' : 'Platform Navigation' }}
          </h3>
          <ul class="space-y-2.5 text-sm">
            <li>
              <NuxtLink :to="localePath('/')" class="text-slate-400 hover:text-[#F5CC07] transition-colors inline-flex items-center gap-1.5">
                <span>{{ t('nav.home') }}</span>
              </NuxtLink>
            </li>
            <li>
              <NuxtLink :to="localePath('/products')" class="text-slate-400 hover:text-[#F5CC07] transition-colors inline-flex items-center gap-1.5">
                <span>{{ t('nav.products') }}</span>
              </NuxtLink>
            </li>
            <li>
              <NuxtLink :to="localePath('/services')" class="text-slate-400 hover:text-[#F5CC07] transition-colors inline-flex items-center gap-1.5">
                <span>{{ t('nav.services') }}</span>
              </NuxtLink>
            </li>
            <li>
              <NuxtLink :to="localePath('/cart')" class="text-slate-400 hover:text-[#F5CC07] transition-colors inline-flex items-center gap-1.5">
                <span>{{ t('nav.cart') }}</span>
              </NuxtLink>
            </li>
            <li>
              <NuxtLink :to="localePath('/contact')" class="text-slate-400 hover:text-[#F5CC07] transition-colors inline-flex items-center gap-1.5">
                <span>{{ t('nav.contact') }}</span>
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Col 3: Direct Technical Contact (4 cols) -->
        <div class="md:col-span-4 space-y-4">
          <h3 class="font-heading text-sm font-bold uppercase tracking-wider text-white">
            {{ locale === 'ar' ? 'الدعم الهندسي والاستفسارات' : 'Technical Support & Inquiries' }}
          </h3>
          <ul class="space-y-3 text-sm">
            <li v-if="contact?.contactPhone1" class="flex items-start gap-3">
              <div class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#2B71AE]/20 text-[#F5CC07]">
                <Phone class="w-3.5 h-3.5" />
              </div>
              <div>
                <span class="block text-[11px] text-slate-500 font-medium">{{ locale === 'ar' ? 'الهاتف المباشر' : 'Direct Line' }}</span>
                <a :href="`tel:${contact.contactPhone1}`" dir="ltr" class="font-mono text-sm text-slate-200 hover:text-white transition-colors">{{ contact.contactPhone1 }}</a>
              </div>
            </li>

            <li v-if="contact?.contactEmail" class="flex items-start gap-3">
              <div class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#2B71AE]/20 text-[#F5CC07]">
                <Mail class="w-3.5 h-3.5" />
              </div>
              <div>
                <span class="block text-[11px] text-slate-500 font-medium">{{ locale === 'ar' ? 'البريد الإلكتروني' : 'Official Email' }}</span>
                <a :href="`mailto:${contact.contactEmail}`" class="text-sm text-slate-200 hover:text-white transition-colors">{{ contact.contactEmail }}</a>
              </div>
            </li>

            <li v-if="contact?.contactAddressEn || contact?.contactAddressAr" class="flex items-start gap-3">
              <div class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#2B71AE]/20 text-[#F5CC07]">
                <MapPin class="w-3.5 h-3.5" />
              </div>
              <div>
                <span class="block text-[11px] text-slate-500 font-medium">{{ locale === 'ar' ? 'الموقع الفعلي' : 'Location' }}</span>
                <span class="text-xs text-slate-300 leading-relaxed">{{ locale === 'ar' ? contact.contactAddressAr : contact.contactAddressEn }}</span>
              </div>
            </li>
          </ul>
        </div>

      </div>

      <!-- Lower Footer: Copyright & Locale -->
      <div class="mt-8 flex flex-col items-center justify-between gap-4 text-xs text-slate-500 sm:flex-row">
        <p>&copy; {{ year }} {{ siteDisplayName }}. {{ locale === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.' }}</p>
        <div class="flex items-center gap-4">
          <NuxtLink :to="localePath('/contact')" class="hover:text-slate-300 transition-colors">
            {{ locale === 'ar' ? 'خدمة العملاء' : 'Customer Service' }}
          </NuxtLink>
          <span class="text-slate-700">|</span>
          <NuxtLink :to="localePath('/admin')" class="hover:text-slate-300 transition-colors">
            {{ t('nav.admin') }}
          </NuxtLink>
        </div>
      </div>

    </div>
  </footer>
</template>
