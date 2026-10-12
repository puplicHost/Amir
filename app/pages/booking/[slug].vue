<script setup lang="ts">
import { centsToEur } from '~~/shared/booking'

const { t, te, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const slug = String(route.params.slug)
const { hasMarketingConsent, getMetaCookie } = useCookieConsent()
const { trackViewContent, trackInitiateCheckout } = useMetaEvents()

const { data: service, error } = await useAsyncData(`booking-service-${slug}`, () =>
  $fetch<any>(`/api/services/${slug}`),
)

if (error.value || !service.value) {
  throw createError({ statusCode: 404, statusMessage: 'Service not found', fatal: true })
}

/** Translated display name (DB stores German; EN comes from i18n). */
const serviceDisplayName = computed(() => {
  const srv: any = service.value
  const fallback = srv?.name || ''
  if (!srv?.slug) return fallback
  const key = `serviceNames.${srv.slug}`
  try {
    if (te(key)) {
      const translated = t(key) as string
      if (translated && translated !== key) return translated
    }
  }
  catch { /* fallback to DB name */ }
  return fallback
})

useHead(() => ({
  title: `${serviceDisplayName.value || service.value.name} | ${t('brand.name')}`,
}))

const todayStr = new Date().toISOString().slice(0, 10)
const date = ref(todayStr)
const form = reactive({ name: '', phone: '', email: '', note: '' })
const formError = ref('')
const slots = ref<{ startsAt: string, available: boolean }[]>([])
const slotsPending = ref(false)
const selectedStart = ref('')
const creating = ref(false)
const paying = ref(false)
const createdToken = ref('')
const depositCents = ref(0)
const gateways = ref({ stripe: false, paypal: false })
const currency = ref('EUR')

const servicePrice = computed(() => centsToEur(Number(service.value?.priceAbCents || 0)))

async function loadSlots() {
  slotsPending.value = true
  formError.value = ''
  selectedStart.value = ''
  try {
    const res = await $fetch<{
      slots: { startsAt: string, available: boolean }[]
    }>(`/api/availability?${new URLSearchParams({ service: slug, date: date.value })}`)
    slots.value = res.slots || []
  }
  catch (e: any) {
    slots.value = []
    formError.value = e?.data?.message || e?.data?.statusMessage || 'Failed to load slots'
  }
  finally {
    slotsPending.value = false
  }
}

await loadSlots()
watch(date, loadSlots)

onMounted(() => {
  if (service.value) {
    trackViewContent({
      content_name: serviceDisplayName.value || service.value.name,
      content_category: service.value.section,
      value: Number(service.value.priceAbCents || 0) / 100,
      currency: 'EUR',
    })
  }
})

function slotLabel(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString(locale.value === 'de' ? 'de-DE' : 'en-US', { hour: '2-digit', minute: '2-digit' })
}

function slotDay(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(locale.value === 'de' ? 'de-DE' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })
}

async function payFor(token: string, provider: 'stripe' | 'paypal') {
  paying.value = true
  trackInitiateCheckout({
    value: depositCents.value ? depositCents.value / 100 : undefined,
    currency: currency.value,
  })
  try {
    const res = await $fetch<{ redirectUrl: string }>(`/api/bookings/${token}/pay`, {
      method: 'POST',
      body: { provider },
    })
    if (!res.redirectUrl) throw new Error('no redirect')
    await navigateTo(res.redirectUrl, { external: true })
  }
  catch (e: any) {
    formError.value = e?.data?.message || e?.data?.statusMessage || t('booking.payFailed')
  }
  finally {
    paying.value = false
  }
}

async function createBooking() {
  formError.value = ''
  if (!form.name.trim() || !form.phone.trim()) {
    formError.value = locale.value === 'de' ? 'Name und Telefonnummer sind erforderlich.' : 'Name and phone are required.'
    return
  }
  if (!selectedStart.value) {
    formError.value = locale.value === 'de' ? 'Bitte wählen Sie zuerst einen Termin.' : 'Please pick a slot first.'
    return
  }
  creating.value = true
  try {
    const res = await $fetch<{
      token: string
      depositCents: number
      currency: string
      gateways: { stripe: boolean, paypal: boolean }
    }>('/api/bookings', {
      method: 'POST',
      body: {
        serviceSlug: slug,
        customerName: form.name.trim(),
        customerPhone: form.phone.trim(),
        customerEmail: form.email.trim() || undefined,
        startsAt: selectedStart.value,
        note: form.note.trim() || undefined,
        marketingConsent: hasMarketingConsent.value,
        fbp: hasMarketingConsent.value ? (getMetaCookie('_fbp') || undefined) : undefined,
        fbc: hasMarketingConsent.value ? (getMetaCookie('_fbc') || undefined) : undefined,
      },
    })
    createdToken.value = res.token
    depositCents.value = res.depositCents
    currency.value = res.currency
    gateways.value = res.gateways
    if (!res.gateways.stripe && !res.gateways.paypal) return
    if (res.gateways.stripe && !res.gateways.paypal) {
      await payFor(res.token, 'stripe')
    }
    else if (res.gateways.paypal && !res.gateways.stripe) {
      await payFor(res.token, 'paypal')
    }
  }
  catch (e: any) {
    const msg = e?.data?.message || e?.data?.statusMessage || ''
    formError.value = e?.statusCode === 409 || e?.data?.statusCode === 409
      ? t('booking.slotTaken')
      : (msg || t('booking.createFailed'))
  }
  finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
    <nav class="mb-6 flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted" aria-label="Breadcrumb">
      <NuxtLink :to="localePath('/')" class="hover:text-primary transition-colors">{{ t('nav.home') }}</NuxtLink>
      <span class="text-slate-400">/</span>
      <NuxtLink :to="localePath('/services')" class="hover:text-primary transition-colors">{{ t('nav.services') }}</NuxtLink>
      <span class="text-slate-400">/</span>
      <span class="text-text font-semibold">{{ serviceDisplayName }}</span>
    </nav>

    <div class="mb-8 flex items-center gap-4">
      <img
        v-if="service.coverImagePath"
        :src="service.coverImagePath"
        :alt="serviceDisplayName"
        class="h-20 w-20 shrink-0 rounded-xl border object-cover sm:h-24 sm:w-24"
        :style="{ borderColor: 'var(--color-border)' }"
      />
      <div class="min-w-0">
        <h1 class="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-text mb-2">
          {{ t('booking.title') }}: {{ serviceDisplayName }}
        </h1>
        <p class="text-sm text-muted">
          {{ t('services.priceAb') }} {{ servicePrice }} · {{ service.durationMin }} {{ t('services.minutes') }}
        </p>
      </div>
    </div>

    <div
      v-if="formError"
      role="alert"
      class="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
    >
      {{ formError }}
    </div>

    <!-- Date + slots -->
    <section class="mb-8 rounded-xl border border-border bg-surface p-4 sm:p-6">
      <h2 class="font-heading text-base font-bold text-text mb-4">{{ t('booking.pickSlot') }}</h2>
      <input
        v-model="date"
        type="date"
        class="mb-4 h-10 rounded-md border bg-white px-3 text-sm text-text focus:border-primary focus:outline-none dark:bg-[#0B1520]"
        :style="{ borderColor: 'var(--color-border)' }"
      />
      <div v-if="slotsPending" class="grid grid-cols-3 sm:grid-cols-4 gap-2">
        <div v-for="i in 8" :key="i" class="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
      </div>
      <p v-else-if="!slots.length" class="text-xs text-muted">{{ t('booking.noSlots') }}</p>
      <div v-else class="grid grid-cols-3 sm:grid-cols-4 gap-2">
        <button
          v-for="s in slots"
          :key="s.startsAt"
          type="button"
          :disabled="!s.available"
          class="h-10 rounded-lg border text-xs font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          :class="selectedStart === s.startsAt
            ? 'border-accent bg-accent text-on-accent'
            : 'border-border bg-white text-text hover:border-primary dark:bg-[#0B1520]'"
          :title="slotDay(s.startsAt)"
          @click="selectedStart = s.startsAt"
        >
          {{ slotLabel(s.startsAt) }}
        </button>
      </div>
    </section>

    <!-- Guest form -->
    <section v-if="!createdToken" class="mb-8 rounded-xl border border-border bg-surface p-4 sm:p-6">
      <h2 class="font-heading text-base font-bold text-text mb-4">{{ t('booking.yourDetails') }}</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block">
          <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ t('booking.name') }} *</span>
          <input v-model="form.name" type="text" autocomplete="name" class="h-10 w-full rounded-md border bg-white px-3 text-sm text-text focus:border-primary focus:outline-none dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }" />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ t('booking.phone') }} *</span>
          <input v-model="form.phone" type="tel" autocomplete="tel" placeholder="+49..." dir="ltr" class="h-10 w-full rounded-md border bg-white px-3 text-sm text-text focus:border-primary focus:outline-none dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }" />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ t('booking.email') }}</span>
          <input v-model="form.email" type="email" autocomplete="email" dir="ltr" class="h-10 w-full rounded-md border bg-white px-3 text-sm text-text focus:border-primary focus:outline-none dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }" />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ t('booking.note') }}</span>
          <input v-model="form.note" type="text" class="h-10 w-full rounded-md border bg-white px-3 text-sm text-text focus:border-primary focus:outline-none dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }" />
        </label>
      </div>

      <button
        type="button"
        :disabled="creating || !selectedStart"
        class="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-7 text-sm font-bold text-on-accent shadow-xs hover:bg-accent-hover active:scale-95 transition-all disabled:opacity-50"
        @click="createBooking"
      >
        <span>{{ creating ? '…' : t('booking.continueToPay') }}</span>
      </button>
    </section>

    <!-- Gateway choice (both on) -->
    <section v-if="createdToken && gateways.stripe && gateways.paypal" class="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <h2 class="font-heading text-base font-bold text-text mb-2">{{ t('booking.payWith') }}</h2>
      <p class="text-xs text-muted mb-4">{{ t('booking.depositDue') }}: {{ centsToEur(depositCents) }} {{ currency }}</p>
      <div class="flex flex-wrap gap-3">
        <button
          type="button"
          :disabled="paying"
          class="inline-flex h-11 items-center rounded-xl bg-accent px-6 text-sm font-bold text-on-accent hover:bg-accent-hover active:scale-95 transition-all disabled:opacity-50"
          @click="payFor(createdToken, 'stripe')"
        >
          {{ t('booking.stripe') }}
        </button>
        <button
          type="button"
          :disabled="paying"
          class="inline-flex h-11 items-center rounded-xl border border-border bg-white px-6 text-sm font-bold text-text hover:bg-border/40 active:scale-95 transition-all disabled:opacity-50 dark:bg-[#0B1520]"
          @click="payFor(createdToken, 'paypal')"
        >
          {{ t('booking.paypal') }}
        </button>
      </div>
    </section>

    <!-- No gateway -->
    <section v-if="createdToken && !gateways.stripe && !gateways.paypal" class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-900 dark:border-yellow-900/40 dark:bg-yellow-950/20 dark:text-yellow-200">
      {{ t('booking.blocked') }}
    </section>
  </div>
</template>
