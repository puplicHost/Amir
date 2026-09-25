<script setup lang="ts">
import { Facebook, Instagram, Mail, MapPin, Phone, Share2 } from 'lucide-vue-next'

const { locale } = useI18n()
const fetch = useRequestFetch()
const { data } = await useAsyncData('settings-contact', () => fetch<any>('/api/admin/settings'))

const form = reactive({
  contactPhone1: '',
  contactPhone2: '',
  contactWhatsapp: '',
  contactEmail: '',
  contactAddressAr: '',
  contactAddressEn: '',
  socialFacebook: '',
  socialInstagram: '',
  googleMapsEmbedUrl: '',
})

const loading = ref(false)
const statusMessage = ref('')
const isError = ref(false)

onMounted(() => {
  if (data.value) {
    Object.keys(form).forEach((k) => {
      form[k as keyof typeof form] = data.value[k] || ''
    })
  }
})

async function save() {
  loading.value = true
  statusMessage.value = ''
  isError.value = false
  try {
    await $fetch('/api/admin/settings/contact', { method: 'PUT', body: form })
    statusMessage.value = locale.value === 'ar' ? 'تم حفظ بيانات الاتصال والموقع بنجاح.' : 'Contact and location settings saved successfully.'
  }
  catch (e: any) {
    isError.value = true
    statusMessage.value = e?.data?.message || (locale.value === 'ar' ? 'حدث خطأ أثناء الحفظ.' : 'Failed to save contact settings.')
  }
  finally {
    loading.value = false
    setTimeout(() => { if (!isError.value) statusMessage.value = '' }, 4000)
  }
}

const inputCls = 'h-10 w-full rounded-md border bg-white px-3 text-xs transition-colors focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520]'
</script>

<template>
  <form class="space-y-6" @submit.prevent="save">
    <!-- Inline Feedback Banner -->
    <div
      v-if="statusMessage"
      role="alert"
      class="rounded-md border p-3 text-xs font-medium transition-all"
      :class="isError ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'"
    >
      {{ statusMessage }}
    </div>

    <!-- Section 1: Official Communication Channels -->
    <div class="rounded-md border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <div class="mb-4 flex items-center gap-2">
        <Phone class="h-4 w-4 text-[#2B71AE]" aria-hidden="true" />
        <h2 class="font-heading text-base font-bold text-slate-900 dark:text-slate-100">
          {{ locale === 'ar' ? 'قنوات الاتصال الرسمية' : 'Contact Channels' }}
        </h2>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Primary Phone Number</span>
          <input v-model="form.contactPhone1" type="text" placeholder="01000000000" dir="ltr" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Secondary Phone Number</span>
          <input v-model="form.contactPhone2" type="text" placeholder="01100000000" dir="ltr" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">WhatsApp Number</span>
          <input v-model="form.contactWhatsapp" type="text" placeholder="01000000000" dir="ltr" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Official Email</span>
          <input v-model="form.contactEmail" type="email" placeholder="info@mango-electronics.com" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
        </label>
      </div>
    </div>

    <!-- Section 2: Physical Address -->
    <div class="rounded-md border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <div class="mb-4 flex items-center gap-2">
        <MapPin class="h-4 w-4 text-[#2B71AE]" aria-hidden="true" />
        <h2 class="font-heading text-base font-bold text-slate-900 dark:text-slate-100">
          {{ locale === 'ar' ? 'العنوان والمقر' : 'Headquarters & Address' }}
        </h2>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Address (EN)</span>
          <textarea v-model="form.contactAddressEn" rows="2.5" placeholder="Industrial Zone, Cairo, Egypt" class="w-full rounded-md border bg-white p-2.5 text-xs focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }" />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Address (AR)</span>
          <textarea v-model="form.contactAddressAr" rows="2.5" dir="rtl" placeholder="المنطقة الصناعية، القاهرة، مصر" class="w-full rounded-md border bg-white p-2.5 text-xs focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }" />
        </label>
      </div>
    </div>

    <!-- Section 3: Social Profiles -->
    <div class="rounded-md border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <div class="mb-4 flex items-center gap-2">
        <Share2 class="h-4 w-4 text-[#2B71AE]" aria-hidden="true" />
        <h2 class="font-heading text-base font-bold text-slate-900 dark:text-slate-100">
          {{ locale === 'ar' ? 'منصات التواصل الاجتماعي' : 'Social Profiles' }}
        </h2>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block">
          <span class="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Facebook class="h-3.5 w-3.5 text-[#1877F2]" />
            <span>Facebook Page URL</span>
          </span>
          <input v-model="form.socialFacebook" type="url" placeholder="https://facebook.com/..." :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
        </label>

        <label class="block">
          <span class="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Instagram class="h-3.5 w-3.5 text-[#E4405F]" />
            <span>Instagram Profile URL</span>
          </span>
          <input v-model="form.socialInstagram" type="url" placeholder="https://instagram.com/..." :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
        </label>
      </div>
    </div>

    <!-- Section 4: Map Embed -->
    <div class="rounded-md border bg-white p-5 shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <h2 class="mb-1 font-heading text-base font-bold text-slate-900 dark:text-slate-100">
        {{ locale === 'ar' ? 'خريطة جوجل (Google Maps)' : 'Google Maps Location' }}
      </h2>
      <p class="mb-3 text-xs text-slate-500 dark:text-slate-400">
        {{ locale === 'ar' ? 'أدخل كود iframe المضمن من خرائط جوجل لعرض الموقع في صفحة التواصل.' : 'Paste the Google Maps iframe embed code to display on the contact page.' }}
      </p>

      <textarea
        v-model="form.googleMapsEmbedUrl"
        rows="3"
        placeholder='<iframe src="https://www.google.com/maps/embed?..." width="600" height="450" ...></iframe>'
        class="w-full rounded-md border bg-white p-2.5 font-mono text-xs focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520]"
        :style="{ borderColor: 'var(--color-border)' }"
      />
    </div>

    <!-- Submit Button -->
    <div class="flex items-center justify-end gap-3 pt-2">
      <button
        type="submit"
        :disabled="loading"
        class="inline-flex h-10 items-center gap-2 rounded-md bg-[#2B71AE] px-6 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#285E8E] disabled:opacity-50"
      >
        <span>{{ loading ? (locale === 'ar' ? 'جاري الحفظ…' : 'Saving…') : (locale === 'ar' ? 'حفظ معلومات التواصل' : 'Save Contact Settings') }}</span>
      </button>
    </div>
  </form>
</template>
