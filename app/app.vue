<script setup lang="ts">
const { locale } = useI18n()

// Dedicated key (same cached endpoint as the navbar) so the uploaded admin
// favicon is reflected in the browser tab icon. Falls back to bundled icon.
const { data: brandSettings } = await useAsyncData('app-brand-settings', () =>
  $fetch<any>('/api/settings/general'),
  { server: true, lazy: true },
)
const faviconHref = computed(() => brandSettings.value?.faviconPath || '/favicon.png')

useHead(() => ({
  htmlAttrs: {
    lang: locale.value,
    dir: 'ltr',
  },
  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
    { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
    { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
    { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
  ],
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
