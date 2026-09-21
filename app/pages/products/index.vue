<script setup lang="ts">
const { t } = useI18n()

useHead(() => ({ title: `${t('products.title')} — ${t('brand.name')}` }))
</script>

<template>
  <div>
    <div class="bg-[#162032] text-white">
      <div class="mx-auto max-w-7xl px-4 py-10">
        <h1 class="font-heading text-3xl font-bold">{{ t('products.title') }}</h1>
        <p class="mt-1 text-sm text-slate-300">{{ t('products.subtitle') }}</p>
      </div>
    </div>
    <AppProductGrid />
  </div>
</template>
