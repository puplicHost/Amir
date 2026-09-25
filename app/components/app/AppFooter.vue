<script setup lang="ts">
import { Facebook, Globe, Instagram, Linkedin, Mail, MapPin, MessageCircle, Phone } from 'lucide-vue-next'

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

const facebookUrl = computed(() => contact.value?.socialFacebook || 'https://facebook.com')
const instagramUrl = computed(() => contact.value?.socialInstagram || 'https://instagram.com')
const whatsappUrl = computed(() => {
  const num = contact.value?.contactWhatsapp || contact.value?.contactPhone1
  return num ? `https://wa.me/${num.replace(/[^0-9]/g, '')}` : 'https://wa.me'
})
</script>

<template>
  <footer class="bg-[#0B1520] text-slate-300 py-12 border-t border-slate-800">
    <div class="mx-auto max-w-7xl px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
      
      <!-- Brand & About -->
      <div>
        <NuxtLink :to="localePath('/')" class="flex items-center gap-2 mb-3 text-white">
          <img v-if="general?.logoPath" :src="general.logoPath" :alt="siteDisplayName" class="h-10 w-auto max-w-[150px] rounded object-contain bg-white p-1" />
          <div v-else class="flex items-center gap-2">
            <img src="/logo.png" alt="Mango Electronics" class="h-9 w-9 rounded object-contain" />
            <span class="font-heading text-xl font-bold text-white">{{ siteDisplayName }}</span>
          </div>
        </NuxtLink>
        <p class="text-sm font-medium text-slate-400 mb-6 tracking-wide">
          {{ tagline }}
        </p>
        <div class="flex items-center gap-3">
          <a :href="facebookUrl" target="_blank" rel="noopener noreferrer" class="h-9 w-9 rounded-lg bg-slate-800/80 hover:bg-[#2B71AE] text-slate-300 hover:text-white flex items-center justify-center transition-colors" aria-label="Facebook">
            <Facebook class="w-4 h-4" />
          </a>
          <a :href="instagramUrl" target="_blank" rel="noopener noreferrer" class="h-9 w-9 rounded-lg bg-slate-800/80 hover:bg-[#2B71AE] text-slate-300 hover:text-white flex items-center justify-center transition-colors" aria-label="Instagram">
            <Instagram class="w-4 h-4" />
          </a>
          <a :href="whatsappUrl" target="_blank" rel="noopener noreferrer" class="h-9 w-9 rounded-lg bg-slate-800/80 hover:bg-[#2B71AE] text-slate-300 hover:text-white flex items-center justify-center transition-colors" aria-label="WhatsApp">
            <MessageCircle class="w-4 h-4" />
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
      <p>&copy; {{ year }} {{ siteDisplayName }}. {{ locale === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.' }}</p>
      <div class="flex items-center gap-2">
        <Globe class="w-4 h-4" />
        <span>{{ locale === 'ar' ? 'العربية' : 'English' }}</span>
      </div>
    </div>
  </footer>
</template>
