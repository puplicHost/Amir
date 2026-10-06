<script setup lang="ts">
import { CheckCircle2, Clock, Facebook, Instagram, Linkedin, Mail, MapPin, MessageCircle, Phone, Send, Youtube } from 'lucide-vue-next'
import IconWhatsApp from '~/components/app/IconWhatsApp.vue'

const { t, locale } = useI18n()
const localePath = useLocalePath()

useHead(() => ({
  title: `${t('contact.title')} | ${t('brand.name')}`,
}))

interface ContactInfo {
  contactPhone1: string | null
  contactPhone2: string | null
  contactWhatsapp: string | null
  contactEmail: string | null
  contactAddressAr: string | null
  contactAddressEn: string | null
  socialFacebook: string | null
  socialInstagram: string | null
  socialYoutube: string | null
  socialLinkedin: string | null
  googleMapsEmbedUrl: string | null
}

const { data: contact } = await useAsyncData('contact-info', () =>
  $fetch<ContactInfo>('/api/settings/contact'),
  { server: true, lazy: true },
)

const address = computed(() => locale.value === 'ar' ? contact.value?.contactAddressAr : contact.value?.contactAddressEn)
const whatsappNum = computed(() => (contact.value?.contactWhatsapp || contact.value?.contactPhone1 || '').replace(/[^0-9]/g, ''))
const whatsappUrl = computed(() => `https://wa.me/${whatsappNum.value}`)

const socials = computed(() => [
  { key: 'facebook', url: contact.value?.socialFacebook, icon: Facebook },
  { key: 'instagram', url: contact.value?.socialInstagram, icon: Instagram },
  { key: 'youtube', url: contact.value?.socialYoutube, icon: Youtube },
  { key: 'linkedin', url: contact.value?.socialLinkedin, icon: Linkedin },
].filter(s => !!s.url))

const form = reactive({ name: '', phone: '', message: '' })
const loading = ref(false)
const formError = ref('')
const sent = ref(false)

async function submitMessage() {
  if (loading.value || sent.value) return
  formError.value = ''

  if (!form.name.trim() || !form.phone.trim() || !form.message.trim()) {
    formError.value = t('contact.errorRequired')
    return
  }
  if (!/^01[0125][0-9]{8}$/.test(form.phone.trim())) {
    formError.value = t('contact.errorPhone')
    return
  }

  loading.value = true
  try {
    // Route the message through the first available general service form.
    const list = await $fetch<{ services: { id: string }[] }>('/api/services')
    const serviceId = list.services?.[0]?.id
    if (!serviceId) throw new Error('no-service')
    const detail = await $fetch<{ service?: { formFields?: { id: string, fieldType: string, labelEn: string, labelAr: string }[] } }>(`/api/services/${serviceId}`)
    const fields = detail.service?.formFields || []
    const pick = (pred: (f: { fieldType: string, labelEn: string, labelAr: string }) => boolean) => fields.find(pred)?.id
    const phoneField = pick(f => f.fieldType === 'phone') || fields[0]?.id
    const nameField = pick(f => /name|اسم/.test(`${f.labelEn} ${f.labelAr}`) && f.fieldType !== 'phone')
      || fields.find(f => f.id !== phoneField)?.id
    const msgField = pick(f => f.fieldType === 'textarea')
      || [...fields].reverse().find(f => f.id !== phoneField && f.id !== nameField)?.id

    const fd = new FormData()
    if (phoneField) fd.append(phoneField, form.phone.trim())
    if (nameField) fd.append(nameField, form.name.trim())
    if (msgField) fd.append(msgField, form.message.trim())

    await $fetch(`/api/services/${serviceId}/requests`, { method: 'POST', body: fd })
    sent.value = true
  }
  catch {
    formError.value = t('contact.errorFailed')
  }
  finally {
    loading.value = false
  }
}

const inputCls = 'h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-xs sm:text-sm text-text placeholder:text-muted focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors'
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
    <nav class="mb-4 flex items-center gap-1.5 text-xs font-medium text-slate-400" aria-label="Breadcrumb">
      <NuxtLink :to="localePath('/')" class="hover:text-muted transition-colors">{{ t('nav.home') }}</NuxtLink>
      <span class="text-muted">/</span>
      <span class="text-primary font-semibold">{{ t('contact.title') }}</span>
    </nav>

    <h1 class="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-text">
      {{ t('contact.title') }}
    </h1>
    <p class="mt-1 text-xs sm:text-sm text-muted">
      {{ t('contact.subtitle') }}
    </p>

    <div class="mt-8 grid gap-6 lg:grid-cols-12 lg:items-start">
      <!-- Info cards -->
      <div class="space-y-4 lg:col-span-5">
        <div class="rounded-2xl border border-border bg-bg p-6 shadow-xs">
          <div class="space-y-4 text-sm">
            <a v-if="contact?.contactPhone1" :href="`tel:${contact.contactPhone1.replace(/\s/g, '')}`" dir="ltr" class="flex items-center gap-3 font-mono font-bold text-primary">
              <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><Phone class="h-4 w-4 text-primary" /></span>
              <span>{{ t('contact.callUs') }}: {{ contact.contactPhone1 }}</span>
            </a>
            <a v-if="contact?.contactPhone2" :href="`tel:${contact.contactPhone2.replace(/\s/g, '')}`" dir="ltr" class="flex items-center gap-3 font-mono font-bold text-muted">
              <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-border/40"><Phone class="h-4 w-4 text-muted" /></span>
              <span>{{ contact.contactPhone2 }}</span>
            </a>
            <a v-if="whatsappNum" :href="whatsappUrl" target="_blank" rel="noopener" class="flex items-center gap-3 font-bold text-emerald-700">
              <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50"><IconWhatsApp class="h-4 w-4 fill-current" /></span>
              <span>{{ t('contact.whatsapp') }}</span>
            </a>
            <a v-if="contact?.contactEmail" :href="`mailto:${contact.contactEmail}`" dir="ltr" class="flex items-center gap-3 font-semibold text-muted">
              <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-border/40"><Mail class="h-4 w-4 text-muted" /></span>
              <span>{{ contact.contactEmail }}</span>
            </a>
            <p v-if="address" class="flex items-start gap-3 text-muted">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-border/40"><MapPin class="h-4 w-4 text-muted" /></span>
              <span><span class="block text-xs font-semibold text-muted">{{ t('contact.address') }}</span>{{ address }}</span>
            </p>
            <p class="flex items-center gap-3 text-muted">
              <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-border/40"><Clock class="h-4 w-4 text-muted" /></span>
              <span><span class="block text-xs font-semibold text-muted">{{ t('contact.workingHours') }}</span>{{ t('contact.workingHoursValue') }}</span>
            </p>
          </div>

          <div v-if="socials.length" class="mt-5 border-t border-border pt-4">
            <p class="mb-2 text-xs font-bold text-muted">{{ t('contact.followUs') }}</p>
            <div class="flex items-center gap-2">
              <a v-for="s in socials" :key="s.key" :href="s.url!" target="_blank" rel="noopener" :aria-label="s.key"
                class="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted hover:bg-border/40 transition-colors">
                <component :is="s.icon" class="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <iframe v-if="contact?.googleMapsEmbedUrl" :src="contact.googleMapsEmbedUrl" class="h-56 w-full rounded-2xl border border-border" loading="lazy" title="map" />
      </div>

      <!-- Message form -->
      <div class="lg:col-span-7">
        <div class="rounded-2xl border border-border bg-bg p-6 shadow-xs">
          <h2 class="font-heading text-base font-bold text-text flex items-center gap-2">
            <MessageCircle class="h-4 w-4 text-primary" />
            {{ t('contact.sendMessage') }}
          </h2>
          <p class="mt-1 text-xs text-muted">{{ t('contact.sendMessageSub') }}</p>

          <div v-if="sent" class="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs sm:text-sm font-medium text-emerald-700">
            <CheckCircle2 class="h-4 w-4 shrink-0" />
            <span>{{ t('contact.success') }}</span>
          </div>

          <form v-else @submit.prevent="submitMessage" class="mt-5 space-y-4">
            <div v-if="formError" role="alert" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
              {{ formError }}
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="block">
                <span class="mb-1.5 block text-xs font-semibold text-muted">{{ t('contact.fullName') }} *</span>
                <input v-model="form.name" type="text" :placeholder="t('contact.fullNamePh')" :class="inputCls" />
              </label>
              <label class="block">
                <span class="mb-1.5 block text-xs font-semibold text-muted">{{ t('contact.phone') }} *</span>
                <input v-model="form.phone" type="tel" placeholder="01xxxxxxxxx" :class="inputCls" dir="ltr" />
              </label>
            </div>
            <label class="block">
              <span class="mb-1.5 block text-xs font-semibold text-muted">{{ t('contact.message') }} *</span>
              <textarea v-model="form.message" rows="4" :placeholder="t('contact.messagePh')" class="w-full rounded-xl border bg-surface p-3 text-xs sm:text-sm" />
            </label>
            <button type="submit" :disabled="loading"
              class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-7 text-sm font-bold text-on-accent hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50 transition-all">
              <Send class="h-4 w-4" />
              <span>{{ loading ? t('contact.sending') : t('contact.send') }}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
