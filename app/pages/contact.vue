<script setup lang="ts">
import { CheckCircle2, MessageCircle, Send } from 'lucide-vue-next'

const { t, locale } = useI18n()
const localePath = useLocalePath()

useHead(() => ({
  title: `${t('contact.title')} | ${t('brand.name')}`,
}))

const { data: heroGeneral } = await useAsyncData('hero-general', () => $fetch<any>('/api/settings/general'))

const form = reactive({ name: '', phone: '', message: '' })
const loading = ref(false)
const formError = ref('')
const toastMsg = ref<{ type: 'success' | 'error', text: string } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(type: 'success' | 'error', text: string) {
  if (toastTimer) clearTimeout(toastTimer)
  toastMsg.value = { type, text }
  toastTimer = setTimeout(() => {
    toastMsg.value = null
    toastTimer = null
  }, 5000)
}

async function submitMessage() {
  if (loading.value) return
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
    await $fetch('/api/contact', {
      method: 'POST',
      body: {
        name: form.name.trim(),
        phone: form.phone.trim(),
        message: form.message.trim(),
      },
    })
    form.name = ''
    form.phone = ''
    form.message = ''
    showToast('success', locale.value === 'ar' ? 'تم إرسال رسالتك بنجاح — سنتواصل معك قريباً ✓' : 'Message sent successfully — we will contact you soon ✓')
  }
  catch {
    formError.value = t('contact.errorFailed')
    showToast('error', t('contact.errorFailed'))
  }
  finally {
    loading.value = false
  }
}

const inputCls = 'h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-xs sm:text-sm text-text placeholder:text-muted focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors'
</script>

<template>
  <div class="space-y-0">
    <!-- Contact Hero (matches homepage hero style) -->
    <div
      class="relative overflow-hidden bg-navy bg-cover bg-center text-center"
      :style="heroGeneral?.heroImagePath ? `background-image: url('${heroGeneral.heroImagePath}')` : ''"
    >
      <div class="absolute inset-0" style="background: linear-gradient(to bottom, rgba(13,27,46,0.85), rgba(13,27,46,0.95))"></div>

      <svg class="absolute bottom-0 left-0 h-[72px] w-full sm:h-[110px]" viewBox="0 0 1440 110" preserveAspectRatio="none" aria-hidden="true" style="filter: drop-shadow(0 -10px 24px rgba(13,27,46,0.35))">
        <path class="fill-bg" d="M0,110 L0,60 C360,5 1080,5 1440,60 L1440,110 Z" />
      </svg>

      <div class="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-24 sm:pb-28">
        <nav class="mb-4 flex items-center justify-center gap-1.5 text-xs font-medium text-white/60" aria-label="Breadcrumb">
          <NuxtLink :to="localePath('/')" class="hover:text-white transition-colors">{{ t('nav.home') }}</NuxtLink>
          <span class="text-white/40">/</span>
          <span class="text-white font-semibold">{{ t('contact.title') }}</span>
        </nav>

        <h1 class="font-heading text-4xl font-extrabold tracking-tight text-white">
          {{ t('contact.title') }}
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-white/80">
          {{ t('contact.subtitle') }}
        </p>
      </div>
    </div>

    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <!-- Message form (centered) -->
      <div class="mx-auto w-full max-w-[600px]">
        <div class="rounded-2xl border border-border bg-bg p-6 shadow-xs">
          <h2 class="font-heading text-base font-bold text-text flex items-center gap-2">
            <MessageCircle class="h-4 w-4 text-primary" />
            {{ t('contact.sendMessage') }}
          </h2>
          <p class="mt-1 text-xs text-muted">{{ t('contact.sendMessageSub') }}</p>

          <form @submit.prevent="submitMessage" class="mt-5 space-y-4">
            <div v-if="formError" role="alert" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
              {{ formError }}
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="block">
                <span class="mb-1.5 block text-xs font-semibold text-muted">{{ t('contact.fullName') }} *</span>
                <input v-model="form.name" type="text" autocomplete="name" :placeholder="t('contact.fullNamePh')" :class="inputCls" />
              </label>
              <label class="block">
                <span class="mb-1.5 block text-xs font-semibold text-muted">{{ t('contact.phone') }} *</span>
                <input v-model="form.phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="01xxxxxxxxx" :class="inputCls" dir="ltr" />
              </label>
            </div>
            <label class="block">
              <span class="mb-1.5 block text-xs font-semibold text-muted">{{ t('contact.message') }} *</span>
              <textarea v-model="form.message" rows="4" :placeholder="t('contact.messagePh')" class="min-h-[120px] w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-xs sm:text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors" />
            </label>
            <button type="submit" :disabled="loading"
              class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-7 text-sm font-bold text-on-accent hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50 transition-all sm:w-auto">
              <Send class="h-4 w-4" />
              <span>{{ loading ? t('contact.sending') : t('contact.send') }}</span>
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- Success / error toast -->
    <div
      v-if="toastMsg"
      role="status"
      class="fixed top-4 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2 rounded-xl border px-4 py-3 text-xs sm:text-sm font-bold shadow-xl"
      :class="toastMsg.type === 'success'
        ? 'border-emerald-200 bg-emerald-600 text-white'
        : 'border-rose-200 bg-rose-600 text-white'"
    >
      <CheckCircle2 v-if="toastMsg.type === 'success'" class="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{{ toastMsg.text }}</span>
    </div>
  </div>
</template>
