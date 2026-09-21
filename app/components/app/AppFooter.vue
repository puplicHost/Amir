<script setup lang="ts">
import { Facebook, Instagram, Mail, MapPin, Phone } from 'lucide-vue-next'

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
</script>

<template>
  <footer class="bg-[#0B1520] text-slate-300 py-12 border-t border-slate-800">
    <div class="mx-auto max-w-7xl px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
      
      <!-- Brand & About -->
      <div>
        <NuxtLink :to="localePath('/')" class="flex items-center gap-2 mb-4 text-white">
          <img v-if="general?.logoPath" :src="general.logoPath" :alt="general?.siteNameEn || t('brand.name')" class="h-10 w-auto max-w-[150px] rounded object-contain bg-white p-1" />
          <span v-else class="font-heading text-xl font-bold">{{ general ? (locale === 'ar' ? general.siteNameAr : general.siteNameEn) : t('brand.name') }}</span>
        </NuxtLink>
        <p v-if="general" class="text-sm text-slate-400 mb-6">
          {{ locale === 'ar' ? general.taglineAr : general.taglineEn }}
        </p>
        <div class="flex gap-4">
          <a v-if="contact?.socialFacebook" :href="contact.socialFacebook" target="_blank" rel="noopener noreferrer" class="text-slate-400 hover:text-white transition-colors">
            <Facebook class="w-5 h-5" />
          </a>
          <a v-if="contact?.socialInstagram" :href="contact.socialInstagram" target="_blank" rel="noopener noreferrer" class="text-slate-400 hover:text-white transition-colors">
            <Instagram class="w-5 h-5" />
          </a>
        </div>
      </div>

      <!-- Quick Links -->
      <div>
        <h3 class="text-white font-bold mb-4 font-heading text-lg">{{ locale === 'ar' ? 'روابط سريعة' : 'Quick Links' }}</h3>
        <ul class="space-y-2 text-sm">
          <li><NuxtLink :to="localePath('/')" class="hover:text-white transition-colors">{{ t('nav.home') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('/products')" class="hover:text-white transition-colors">{{ t('nav.products') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('/services')" class="hover:text-white transition-colors">{{ t('nav.services') }}</NuxtLink></li>
          <li><NuxtLink :to="localePath('/contact')" class="hover:text-white transition-colors">{{ t('nav.contact') }}</NuxtLink></li>
        </ul>
      </div>

      <!-- Contact Info -->
      <div>
        <h3 class="text-white font-bold mb-4 font-heading text-lg">{{ locale === 'ar' ? 'تواصل معنا' : 'Contact Us' }}</h3>
        <ul class="space-y-3 text-sm">
          <li v-if="contact?.contactPhone1" class="flex items-start gap-3">
            <Phone class="w-5 h-5 text-[#2B71AE] shrink-0" />
            <a :href="`tel:${contact.contactPhone1}`" dir="ltr" class="hover:text-white transition-colors">{{ contact.contactPhone1 }}</a>
          </li>
          <li v-if="contact?.contactEmail" class="flex items-start gap-3">
            <Mail class="w-5 h-5 text-[#2B71AE] shrink-0" />
            <a :href="`mailto:${contact.contactEmail}`" class="hover:text-white transition-colors">{{ contact.contactEmail }}</a>
          </li>
          <li v-if="contact?.contactAddressEn || contact?.contactAddressAr" class="flex items-start gap-3">
            <MapPin class="w-5 h-5 text-[#2B71AE] shrink-0" />
            <span class="whitespace-pre-wrap">{{ locale === 'ar' ? contact.contactAddressAr : contact.contactAddressEn }}</span>
          </li>
        </ul>
      </div>

    </div>
    
    <div class="mx-auto max-w-7xl px-4 mt-12 pt-8 border-t border-slate-800 text-sm text-slate-500 flex flex-col md:flex-row justify-between items-center gap-4">
      <p>&copy; {{ year }} {{ general ? (locale === 'ar' ? general.siteNameAr : general.siteNameEn) : t('brand.name') }}. {{ locale === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.' }}</p>
      <div class="flex items-center gap-2">
        <Globe class="w-4 h-4" />
        <span>{{ locale === 'ar' ? 'العربية' : 'English' }}</span>
      </div>
    </div>
  </footer>
</template>
