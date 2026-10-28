<script setup lang="ts">
import {
  ArrowRight,
  Clock,
  MapPin,
  Phone,
  Sparkles,
} from 'lucide-vue-next'
import { waLink } from '~~/shared/booking'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const siteSeo = await useSiteSeo()

useHead(() => {
  const pageName = locale.value === 'de' ? 'Über uns' : 'About Us'
  const title = `${pageName} | ${t('brand.name')}`
  const description = locale.value === 'de'
    ? 'AMIR Frisur & Kosmetik Studio in Meitingen. Ihr Salon für exklusive Haarpflege und professionelle Kosmetik.'
    : 'AMIR Frisur & Kosmetik Studio in Meitingen, Germany. Professional hair styling and beauty care.'
  return {
    title,
    meta: [
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
    ],
  }
})

const { data: contact } = await useAsyncData('about-contact', () => $fetch<any>('/api/settings/contact'))
const { data: heroGeneral } = await useAsyncData('hero-general', () => $fetch<any>('/api/settings/general'))

const whatsappUrl = computed(() => {
  const num = contact.value?.contactWhatsapp || contact.value?.contactPhone1 || ''
  return num ? waLink(num) : ''
})

const studioAddress = computed(() => {
  return contact.value?.contactAddressEn || 'Schloßstr. 2c, 86405 Meitingen, Germany'
})

const studioPhone = computed(() => {
  return contact.value?.contactPhone1 || ''
})
</script>

<template>
  <div class="space-y-0 selection:bg-accent selection:text-on-accent">
    <!-- 1. Hero Band -->
    <section class="relative overflow-hidden bg-black text-white py-16 sm:py-24 border-b border-border">
      <div class="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <nav class="mb-4 flex items-center justify-center gap-1.5 text-xs font-medium text-white/60" aria-label="Breadcrumb">
          <NuxtLink :to="localePath('/')" class="hover:text-white transition-colors">{{ t('nav.home') }}</NuxtLink>
          <span class="text-white/40" aria-hidden="true">/</span>
          <span class="text-white font-semibold" aria-current="page">{{ locale === 'de' ? 'Über uns' : 'About' }}</span>
        </nav>

        <p class="subline-label text-white/70 mb-3">
          {{ locale === 'de' ? 'Frisur & Kosmetik Studio Meitingen' : 'Hair & Beauty Studio Meitingen' }}
        </p>

        <h1 class="font-heading text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
          AMIR
        </h1>

        <p class="text-sm sm:text-base text-white/80 max-w-xl mx-auto leading-relaxed">
          {{ locale === 'de'
            ? 'Herzlich willkommen in unserem Salon in Meitingen. Wir bieten präzise Haarschnitte, brillante Colorationen und verwöhnende Kosmetikbehandlungen.'
            : 'Welcome to our studio in Meitingen, Germany. Providing precision haircuts, luminous colorations, and personalized beauty treatments.' }}
        </p>
      </div>
    </section>

    <!-- 2. Studio Facts & Address -->
    <section class="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div class="grid gap-8 sm:grid-cols-2">
        <!-- Location Card -->
        <div class="rounded-xl border border-border bg-surface p-6 shadow-xs">
          <div class="flex items-center gap-3 mb-4">
            <div class="flex h-11 w-10 items-center justify-center rounded-lg bg-primary text-on-primary">
              <MapPin class="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 class="font-heading text-lg font-bold text-text">
                {{ locale === 'de' ? 'Standort' : 'Location' }}
              </h2>
              <p class="text-xs text-muted">Meitingen, Bayern</p>
            </div>
          </div>
          <p class="text-sm font-medium text-text leading-relaxed">
            {{ studioAddress }}
          </p>
          <p class="text-xs text-muted mt-2">
            AMIR Frisur & Kosmetik Studio
          </p>
        </div>

        <!-- Appointment & Hours Card -->
        <div class="rounded-xl border border-border bg-surface p-6 shadow-xs">
          <div class="flex items-center gap-3 mb-4">
            <div class="flex h-11 w-10 items-center justify-center rounded-lg bg-primary text-on-primary">
              <Clock class="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 class="font-heading text-lg font-bold text-text">
                {{ locale === 'de' ? 'Termine & Öffnungszeiten' : 'Appointments & Hours' }}
              </h2>
              <p class="text-xs text-muted">
                {{ locale === 'de' ? 'Nach Vereinbarung' : 'By Appointment' }}
              </p>
            </div>
          </div>
          <p class="text-sm text-text leading-relaxed">
            {{ locale === 'de'
              ? 'Buchen Sie Ihren Wunschtermin bequem online in unserem Buchungskalender.'
              : 'Reserve your desired appointment conveniently through our online booking calendar.' }}
          </p>
          <div class="mt-4">
            <NuxtLink
              :to="localePath('/services')"
              class="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-xs font-bold text-on-accent hover:bg-accent-hover transition-colors"
            >
              <span>{{ t('home.servicesCta') }}</span>
              <ArrowRight class="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Contact Options -->
      <div v-if="studioPhone || whatsappUrl" class="mt-8 rounded-xl border border-border bg-surface p-6 text-center">
        <h3 class="font-heading text-base font-bold text-text mb-2">
          {{ locale === 'de' ? 'Haben Sie Fragen vor Ihrem Besuch?' : 'Questions Before Your Visit?' }}
        </h3>
        <p class="text-xs text-muted max-w-md mx-auto mb-4">
          {{ locale === 'de'
            ? 'Kontaktieren Sie uns telefonisch oder direkt via WhatsApp.'
            : 'Reach out to us by phone or directly via WhatsApp.' }}
        </p>
        <div class="flex flex-wrap items-center justify-center gap-3">
          <a
            v-if="studioPhone"
            :href="`tel:${studioPhone}`"
            class="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-4 text-xs font-semibold text-text hover:bg-border/30 transition-colors"
          >
            <Phone class="h-4 w-4" aria-hidden="true" />
            <span dir="ltr">{{ studioPhone }}</span>
          </a>
          <a
            v-if="whatsappUrl"
            :href="whatsappUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-4 text-xs font-semibold text-text hover:bg-border/30 transition-colors"
          >
            <IconWhatsApp class="h-4 w-4 text-emerald-600" />
            <span>WhatsApp</span>
          </a>
        </div>
      </div>
    </section>
  </div>
</template>
