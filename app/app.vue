<script setup lang="ts">
const { locale } = useI18n()

useHead(() => ({
  htmlAttrs: {
    lang: locale.value,
    dir: locale.value === 'ar' ? 'rtl' : 'ltr',
  },
  link: [{ rel: 'icon', type: 'image/png', href: '/favicon.png' }],
}))
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
