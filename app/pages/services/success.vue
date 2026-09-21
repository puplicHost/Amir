<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
useHead(() => ({ title: `Request Received — ${t('brand.name')}` }))
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-20 text-center">
    <div class="mb-6 mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
      <svg class="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
    </div>
    <h1 class="mb-4 font-heading text-3xl font-bold">Request Received Successfully</h1>
    <p class="mb-8 text-lg text-slate-500">Our engineering team will review your details and contact you shortly.</p>
    <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
      <NuxtLink :to="localePath('/')" class="h-12 flex items-center justify-center rounded bg-[#2B71AE] px-8 font-bold text-white hover:bg-[#285E8E] min-w-48">
        Back to Home
      </NuxtLink>
      <NuxtLink :to="localePath('/services')" class="h-12 flex items-center justify-center rounded border border-slate-300 px-8 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 min-w-48">
        More Services
      </NuxtLink>
    </div>
  </div>
</template>
