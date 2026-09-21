<script setup lang="ts">
import { Facebook, Instagram, Mail, MapPin, Phone } from 'lucide-vue-next'

const { t, locale } = useI18n()
useHead(() => ({ title: `Contact Us — ${t('brand.name')}` }))

const { data: contact } = await useAsyncData('contact-page', () => $fetch<any>('/api/settings/contact'))
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-12 md:py-20">
    <div class="mb-12 text-center">
      <h1 class="font-heading text-4xl font-bold mb-4">{{ locale === 'ar' ? 'تواصل معنا' : 'Contact Us' }}</h1>
      <p class="text-lg text-slate-500">
        {{ locale === 'ar' ? 'نحن هنا للإجابة على استفساراتكم وتقديم الدعم اللازم.' : 'We are here to answer your questions and provide support.' }}
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
      
      <!-- Contact Cards -->
      <div class="space-y-6">
        <a v-if="contact?.contactPhone1" :href="`tel:${contact.contactPhone1}`" class="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-[#2B71AE]/50 dark:bg-slate-900 dark:border-slate-800 transition-colors">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#2B71AE]/10 text-[#2B71AE]">
            <Phone class="w-6 h-6" />
          </div>
          <div>
            <h3 class="font-bold text-lg mb-1">{{ locale === 'ar' ? 'رقم الهاتف الموحد' : 'Primary Phone' }}</h3>
            <p class="text-slate-500 font-mono" dir="ltr">{{ contact.contactPhone1 }}</p>
          </div>
        </a>

        <a v-if="contact?.contactWhatsapp" :href="`https://wa.me/${contact.contactWhatsapp.replace(/[^0-9]/g, '')}`" target="_blank" rel="noopener noreferrer" class="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-green-500/50 dark:bg-slate-900 dark:border-slate-800 transition-colors">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
          </div>
          <div>
            <h3 class="font-bold text-lg mb-1">WhatsApp</h3>
            <p class="text-slate-500 font-mono" dir="ltr">{{ contact.contactWhatsapp }}</p>
          </div>
        </a>

        <a v-if="contact?.contactEmail" :href="`mailto:${contact.contactEmail}`" class="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-[#2B71AE]/50 dark:bg-slate-900 dark:border-slate-800 transition-colors">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#2B71AE]/10 text-[#2B71AE]">
            <Mail class="w-6 h-6" />
          </div>
          <div>
            <h3 class="font-bold text-lg mb-1">{{ locale === 'ar' ? 'البريد الإلكتروني' : 'Email Address' }}</h3>
            <p class="text-slate-500 font-mono" dir="ltr">{{ contact.contactEmail }}</p>
          </div>
        </a>
        
        <div v-if="contact?.contactAddressAr || contact?.contactAddressEn" class="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#2B71AE]/10 text-[#2B71AE]">
            <MapPin class="w-6 h-6" />
          </div>
          <div>
            <h3 class="font-bold text-lg mb-1">{{ locale === 'ar' ? 'العنوان' : 'Address' }}</h3>
            <p class="text-slate-500 whitespace-pre-wrap">{{ locale === 'ar' ? contact.contactAddressAr : contact.contactAddressEn }}</p>
          </div>
        </div>

        <div v-if="contact?.socialFacebook || contact?.socialInstagram" class="flex items-center gap-4 pt-4">
          <span class="font-medium">{{ locale === 'ar' ? 'تابعنا:' : 'Follow Us:' }}</span>
          <a v-if="contact.socialFacebook" :href="contact.socialFacebook" target="_blank" rel="noopener noreferrer" class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-[#1877F2] hover:bg-slate-200 transition-colors">
            <Facebook class="w-5 h-5" />
          </a>
          <a v-if="contact.socialInstagram" :href="contact.socialInstagram" target="_blank" rel="noopener noreferrer" class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-[#E4405F] hover:bg-slate-200 transition-colors">
            <Instagram class="w-5 h-5" />
          </a>
        </div>
      </div>

      <!-- Google Maps Embed -->
      <div v-if="contact?.googleMapsEmbedUrl" class="h-[400px] md:h-auto rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 bg-slate-100" v-html="contact.googleMapsEmbedUrl">
      </div>
      <div v-else class="h-[400px] md:h-auto rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400">
         <MapPin class="w-16 h-16 opacity-20" />
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
