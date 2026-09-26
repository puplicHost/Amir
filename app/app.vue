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
    dir: locale.value === 'ar' ? 'rtl' : 'ltr',
  },
  link: [{ rel: 'icon', type: 'image/png', href: faviconHref.value }],
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
