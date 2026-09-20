<script setup lang="ts">
const { t } = useI18n()

useHead(() => ({
  title: `${t('brand.name')} — ${t('brand.tagline')}`,
}))
</script>

<template>
  <div>
    <section class="bg-[#2B71AE] text-white">
      <div class="mx-auto max-w-7xl px-4 py-16 md:py-24">
        <h1 class="font-heading text-4xl font-extrabold">{{ t('home.title') }}</h1>
        <p class="mt-3 max-w-xl text-lg text-white/90">{{ t('brand.tagline') }}</p>
        <div class="mt-6 flex flex-wrap gap-3">
          <span class="rounded bg-[#F5CC07] px-4 py-2 font-semibold text-slate-900">{{ t('nav.products') }}</span>
          <span class="rounded border border-white/50 px-4 py-2 font-semibold">{{ t('nav.services') }}</span>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-4 py-12">
      <h2 class="font-heading text-2xl font-bold">{{ t('nav.products') }}</h2>
      <p class="mt-2 text-sm text-slate-500">{{ t('home.subtitle') }}</p>
      <div class="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div v-for="i in 4" :key="i" class="rounded-md border p-6" :style="{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }">
          <div class="h-24 rounded bg-slate-200 dark:bg-slate-700" />
          <div class="mt-3 h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
    </section>
  </div>
</template>
