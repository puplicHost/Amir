<script setup lang="ts">
import { centsToEur } from '~~/shared/booking'

const { t, te, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const slug = String(route.params.slug)
const { hasMarketingConsent, getMetaCookie } = useCookieConsent()
const { trackViewContent, trackBookingStarted, trackInitiateCheckout } = useMetaEvents()

const { data: service, error } = await useAsyncData(`booking-service-${slug}`, () =>
  $fetch<any>(`/api/services/${slug}`),
)

if (error.value || !service.value) {
  throw createError({ statusCode: 404, statusMessage: 'Service not found', fatal: true })
}

/** Translated display name: explicit English DB copy, then i18n, then German. */
const serviceDisplayName = computed(() => {
  const srv: any = service.value
  const fallback = srv?.name || ''
  if (locale.value === 'en' && srv?.nameEn) return srv.nameEn
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

const date = ref('')
const form = reactive({ name: '', phone: '', email: '', note: '', whatsappReminder: false, acceptTerms: false })
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
// AUDIT P2-04/P2-05: salon-local calendar day and explicit zone from the
// server. A UTC ISO slice would default to the previous day before ~02:00.
const { data: bookingConfig } = await useAsyncData('booking-config', () =>
  $fetch<any>('/api/settings/booking-public').catch(() => null),
)
const salonTimezone = ref(String(bookingConfig.value?.timezone || DEFAULT_SALON_TIMEZONE))
const horizonDays = ref(Number(bookingConfig.value?.horizonDays) || 60)
const minDate = ref(todayInZone(salonTimezone.value))
date.value = minDate.value
const maxDate = computed(() => addDaysToDayStr(minDate.value, Math.max(0, horizonDays.value - 1)))
// UX-04: stable per-attempt key so a double-submit cannot create two bookings.
const idempotencyKey = ref('')

interface StaffOption { id: string, displayName: string, imagePath: string | null, sortOrder: number }
const staffOptions = ref<StaffOption[]>([])
const selectedStaff = ref('any')

const servicePrice = computed(() => centsToEur(Number(service.value?.priceAbCents || 0)))

const { data: contact } = await useAsyncData(`booking-contact-${slug}`, () =>
  $fetch<any>('/api/settings/contact').catch(() => null),
)
const waBookUrl = computed(() => {
  const raw = String(contact.value?.contactWhatsapp || '').replace(/\D/g, '')
  if (!raw) return ''
  const name = serviceDisplayName.value || service.value?.name || ''
  const msg = locale.value === 'de'
    ? `Hallo! Ich möchte gerne "${name}" buchen.`
    : `Hello! I'd like to book "${name}".`
  return `https://wa.me/${raw}?text=${encodeURIComponent(msg)}`
})

async function loadStaff() {
  try {
    const res = await $fetch<{ staff: StaffOption[] }>(`/api/staff?${new URLSearchParams({ service: slug })}`)
    staffOptions.value = res.staff || []
  }
  catch {
    staffOptions.value = []
  }
}

const cancelWindowHours = ref(24)
async function loadSlots() {
  slotsPending.value = true
  formError.value = ''
  selectedStart.value = ''
  idempotencyKey.value = ''
  try {
    const res = await $fetch<{
      slots: { startsAt: string, available: boolean }[]
      cancelWindowHours?: number
      timezone?: string
      horizonDays?: number
    }>(`/api/availability?${new URLSearchParams({ service: slug, date: date.value, staff: selectedStaff.value })}`)
    slots.value = res.slots || []
    if (typeof res.cancelWindowHours === 'number') cancelWindowHours.value = res.cancelWindowHours
    if (res.timezone) salonTimezone.value = res.timezone
    if (typeof res.horizonDays === 'number') horizonDays.value = res.horizonDays
  }
  catch (e: any) {
    slots.value = []
    formError.value = e?.data?.message || e?.data?.statusMessage || 'Failed to load slots'
  }
  finally {
    slotsPending.value = false
  }
}

await loadStaff()
await loadSlots()
watch(date, loadSlots)
watch(selectedStaff, loadSlots)
// A different slot is a different booking attempt → fresh idempotency key.
watch(selectedStart, () => { idempotencyKey.value = '' })

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
  return formatTimeInZone(iso, salonTimezone.value, locale.value)
}

function slotDay(iso: string): string {
  return formatDateInZone(iso, salonTimezone.value, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }, locale.value)
}

async function payFor(token: string, provider: 'stripe' | 'paypal') {
  paying.value = true
  trackInitiateCheckout({
    value: depositCents.value ? depositCents.value / 100 : undefined,
    currency: currency.value,
  }, `booking-started-${token}`)
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// RFC4122 v4 UUID (server validates uuid()).
function makeIdempotencyKey(): string {
  const c = globalThis.crypto
  if (c?.randomUUID) return c.randomUUID()
  const bytes = new Uint8Array(16)
  if (c?.getRandomValues) {
    c.getRandomValues(bytes)
  }
  else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  const b6 = bytes[6] ?? 0
  const b8 = bytes[8] ?? 0
  bytes[6] = (b6 & 0x0f) | 0x40
  bytes[8] = (b8 & 0x3f) | 0x80
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

async function createBooking() {
  formError.value = ''
  if (!form.name.trim() || !form.phone.trim()) {
    formError.value = locale.value === 'de' ? 'Name und Telefonnummer sind erforderlich.' : 'Name and phone are required.'
    return
  }
  if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) {
    formError.value = locale.value === 'de' ? 'Bitte geben Sie eine gültige E-Mail-Adresse ein.' : 'Please enter a valid email address.'
    return
  }
  if (!selectedStart.value) {
    formError.value = locale.value === 'de' ? 'Bitte wählen Sie zuerst einen Termin.' : 'Please pick a slot first.'
    return
  }
  if (!form.acceptTerms) {
    formError.value = t('booking.consentRequired')
    return
  }
  creating.value = true
  // UX-04: reuse the same key across retries of this attempt; a new slot
  // selection clears it (see watch below) so a fresh booking can be made.
  if (!idempotencyKey.value) {
    idempotencyKey.value = makeIdempotencyKey()
  }
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
        locale: locale.value === 'en' ? 'en' : 'de',
        acceptTerms: form.acceptTerms,
        acceptPrivacy: form.acceptTerms,
        whatsappReminder: form.whatsappReminder,
        staffId: selectedStaff.value === 'any' ? undefined : selectedStaff.value,
        note: form.note.trim() || undefined,
        marketingConsent: hasMarketingConsent.value,
        fbp: hasMarketingConsent.value ? (getMetaCookie('_fbp') || undefined) : undefined,
        fbc: hasMarketingConsent.value ? (getMetaCookie('_fbc') || undefined) : undefined,
        idempotencyKey: idempotencyKey.value,
      },
    })
    createdToken.value = res.token
    depositCents.value = res.depositCents
    currency.value = res.currency
    gateways.value = res.gateways
    // The booking now exists server-side and the authoritative deposit amount
    // is known. Stable per booking token so retries cannot duplicate the event.
    trackBookingStarted({
      content_name: serviceDisplayName.value || service.value?.name,
      content_category: service.value?.section,
      value: res.depositCents / 100,
      currency: res.currency,
    }, `booking-started-${res.token}`)
    // UX-01: never auto-redirect. The deposit is disclosed and the customer
    // explicitly chooses how to pay (even when a single gateway is enabled).
  }
  catch (e: any) {
    const msg = e?.data?.message || e?.data?.statusMessage || ''
    const status = e?.statusCode ?? e?.data?.statusCode
    formError.value = status === 409
      ? t('booking.slotTaken')
      : status === 503
        ? t('booking.blocked')
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
      <span class="text-slate-400" aria-hidden="true">/</span>
      <NuxtLink :to="localePath('/services')" class="hover:text-primary transition-colors">{{ t('nav.services') }}</NuxtLink>
      <span class="text-slate-400" aria-hidden="true">/</span>
      <span class="text-text font-semibold">{{ serviceDisplayName }}</span>
    </nav>

    <div class="mb-8 flex items-center gap-4">
      <img
        v-if="service.coverImagePath"
        :src="service.coverImagePath"
        :alt="serviceDisplayName"
        class="h-20 w-20 shrink-0 rounded-xl border object-cover sm:h-24 sm:w-24"
        loading="eager"
        decoding="async"
        width="192"
        height="192"
        :style="{ borderColor: 'var(--color-border)' }"
      />
      <div class="min-w-0">
        <h1 class="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-text mb-2">
          {{ t('booking.title') }}: {{ serviceDisplayName }}
        </h1>
        <p class="text-sm text-muted">
          {{ t('services.priceAb') }} {{ servicePrice }} · {{ service.durationMin }} {{ t('services.minutes') }}
        </p>
        <a
          v-if="waBookUrl"
          :href="waBookUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-2 inline-flex h-11 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          <IconWhatsApp class="h-4 w-4" />
          <span>{{ t('booking.bookViaWhatsapp') }}</span>
        </a>
      </div>
    </div>

    <div
      v-if="formError"
      role="alert"
      class="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
    >
      {{ formError }}
    </div>

    <!-- Staff -->
    <section class="mb-8 rounded-xl border border-border bg-surface p-4 sm:p-6">
      <h2 class="font-heading text-base font-bold text-text mb-4">{{ t('booking.pickStaff') }}</h2>
      <p v-if="!staffOptions.length" class="text-xs text-muted">{{ t('booking.noStaff') }}</p>
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-2" role="radiogroup" :aria-label="t('booking.pickStaff')">
        <button
          type="button"
          role="radio"
          :aria-checked="selectedStaff === 'any'"
          class="flex items-center gap-3 rounded-xl border p-3 text-start transition active:scale-95"
          :class="selectedStaff === 'any'
            ? 'border-accent bg-accent/10'
            : 'border-border bg-white hover:border-primary dark:bg-[#0B1520]'"
          @click="selectedStaff = 'any'"
        >
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary" aria-hidden="true">✦</span>
          <span class="min-w-0">
            <span class="block truncate text-xs font-bold text-text">{{ t('booking.anyStaff') }}</span>
          </span>
        </button>
        <button
          v-for="st in staffOptions"
          :key="st.id"
          type="button"
          role="radio"
          :aria-checked="selectedStaff === st.id"
          class="flex items-center gap-3 rounded-xl border p-3 text-start transition active:scale-95"
          :class="selectedStaff === st.id
            ? 'border-accent bg-accent/10'
            : 'border-border bg-white hover:border-primary dark:bg-[#0B1520]'"
          @click="selectedStaff = st.id"
        >
          <img
            v-if="st.imagePath"
            :src="st.imagePath"
            width="88" height="88"
            :alt="st.displayName"
            class="h-11 w-11 shrink-0 rounded-full border object-cover"
            loading="lazy"
            decoding="async"
            :style="{ borderColor: 'var(--color-border)' }"
          />
          <span v-else class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300" aria-hidden="true">
            {{ st.displayName.slice(0, 1).toUpperCase() }}
          </span>
          <span class="min-w-0">
            <span class="block truncate text-xs font-bold text-text">{{ st.displayName }}</span>
          </span>
        </button>
      </div>
    </section>

    <!-- Date + slots -->
    <section class="mb-8 rounded-xl border border-border bg-surface p-4 sm:p-6">
      <h2 class="font-heading text-base font-bold text-text mb-4">{{ t('booking.pickSlot') }}</h2>
      <input
        v-model="date"
        type="date"
        :min="minDate"
        :max="maxDate"
        :aria-label="t('booking.pickSlot')"
        class="mb-4 h-11 rounded-md border bg-white px-3 text-sm text-text focus:border-primary focus:outline-none dark:bg-[#0B1520]"
        :style="{ borderColor: 'var(--color-border)' }"
      />
      <div v-if="slotsPending" role="status" class="grid grid-cols-3 sm:grid-cols-4 gap-2">
        <div v-for="i in 8" :key="i" class="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
      </div>
      <p v-else-if="!slots.length" class="text-xs text-muted">{{ t('booking.noSlots') }}</p>
      <div v-else class="grid grid-cols-3 sm:grid-cols-4 gap-2">
        <button
          v-for="s in slots"
          :key="s.startsAt"
          type="button"
          :disabled="!s.available"
          class="h-11 rounded-lg border text-xs font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          :class="selectedStart === s.startsAt
            ? 'border-accent bg-accent text-on-accent'
            : 'border-border bg-white text-text hover:border-primary dark:bg-[#0B1520]'"
          :title="slotDay(s.startsAt)"
          :aria-label="s.available ? slotLabel(s.startsAt) : `${slotLabel(s.startsAt)} — ${t('booking.booked')}`"
          @click="selectedStart = s.startsAt"
        >
          {{ slotLabel(s.startsAt) }}
          <span v-if="!s.available" class="block text-[10px] font-semibold opacity-70">{{ t('booking.booked') }}</span>
        </button>
      </div>
    </section>

    <!-- Guest form -->
    <section v-if="!createdToken" class="mb-8 rounded-xl border border-border bg-surface p-4 sm:p-6">
      <h2 class="font-heading text-base font-bold text-text mb-4">{{ t('booking.yourDetails') }}</h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block">
          <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ t('booking.name') }} *</span>
          <input v-model="form.name" type="text" name="customerName" autocomplete="name" spellcheck="false" class="h-11 w-full rounded-md border bg-white px-3 text-sm text-text focus:border-primary focus:outline-none dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }" />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ t('booking.phone') }} *</span>
          <input v-model="form.phone" type="tel" name="customerPhone" autocomplete="tel" placeholder="+49..." dir="ltr" class="h-11 w-full rounded-md border bg-white px-3 text-sm text-text focus:border-primary focus:outline-none dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }" />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ t('booking.email') }}</span>
          <input v-model="form.email" type="email" name="customerEmail" autocomplete="email" spellcheck="false" dir="ltr" class="h-11 w-full rounded-md border bg-white px-3 text-sm text-text focus:border-primary focus:outline-none dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }" />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">{{ t('booking.note') }}</span>
          <input v-model="form.note" type="text" name="customerNote" class="h-11 w-full rounded-md border bg-white px-3 text-sm text-text focus:border-primary focus:outline-none dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }" />
        </label>
      </div>

      <label class="mt-4 flex cursor-pointer items-start gap-2">
        <input v-model="form.whatsappReminder" type="checkbox" class="mt-0.5 h-4 w-4 rounded accent-emerald-600" />
        <span class="text-[11px] text-muted">{{ t('booking.waReminderOptIn') }}</span>
      </label>

      <label class="mt-4 flex cursor-pointer items-start gap-2 rounded-lg border border-border bg-white/60 p-3 dark:bg-[#0B1520]">
        <input
          v-model="form.acceptTerms"
          type="checkbox"
          required
          class="mt-0.5 h-4 w-4 rounded accent-emerald-600"
          :aria-describedby="'booking-consent-hint'"
        />
        <span id="booking-consent-hint" class="text-[11px] leading-relaxed text-muted">
          {{ t('booking.consentAgree') }}
          <NuxtLink :to="localePath('/agb')" target="_blank" class="font-semibold text-primary underline underline-offset-2">{{ t('legal.agbTitle') }}</NuxtLink>
          {{ t('booking.consentAnd') }}
          <NuxtLink :to="localePath('/datenschutz')" target="_blank" class="font-semibold text-primary underline underline-offset-2">{{ t('legal.datenschutzTitle') }}</NuxtLink>.
        </span>
      </label>

      <p class="mt-4 text-[11px] text-muted">{{ t('manage.policyShort', { hours: cancelWindowHours }) }}</p>

      <button
        type="button"
        :disabled="creating || !selectedStart || !form.acceptTerms"
        class="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-7 text-sm font-bold text-on-accent shadow-xs hover:bg-accent-hover active:scale-95 transition disabled:opacity-50"
        @click="createBooking"
      >
        <span>{{ creating ? '…' : t('booking.continueToPay') }}</span>
      </button>
    </section>

    <!-- Deposit disclosure + provider checkout (UX-01: always shown before redirect) -->
    <section v-if="createdToken && (gateways.stripe || gateways.paypal)" class="rounded-xl border border-border bg-surface p-4 sm:p-6">
      <h2 class="font-heading text-base font-bold text-text mb-2">{{ t('booking.payWith') }}</h2>
      <p class="mb-1 text-sm font-bold text-text">{{ t('booking.depositDue') }}: {{ centsToEur(depositCents) }}</p>
      <p class="mb-4 text-xs text-muted">{{ t('booking.depositNote', { amount: centsToEur(depositCents) }) }}</p>
      <div class="flex flex-wrap gap-3">
        <button
          v-if="gateways.stripe"
          type="button"
          :disabled="paying"
          class="inline-flex h-11 items-center rounded-xl bg-accent px-6 text-sm font-bold text-on-accent hover:bg-accent-hover active:scale-95 transition disabled:opacity-50"
          @click="payFor(createdToken, 'stripe')"
        >
          {{ t('booking.stripe') }}
        </button>
        <button
          v-if="gateways.paypal"
          type="button"
          :disabled="paying"
          class="inline-flex h-11 items-center rounded-xl border border-border bg-white px-6 text-sm font-bold text-text hover:bg-border/40 active:scale-95 transition disabled:opacity-50 dark:bg-[#0B1520]"
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
