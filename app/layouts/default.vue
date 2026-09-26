<script setup lang="ts">
// Meta Pixel bootstrap (public layout only — never in the admin panel).
// Blocking (not lazy) so the snippet is present in SSR <head>, matching
// Meta's "paste in <head> of every page" requirement. Endpoint is cached.
const route = useRoute()
const { data: metaPublic } = await useAsyncData('meta-pixel-public', () =>
  $fetch<{ enabled: boolean, pixelId: string | null }>('/api/settings/meta-public'),
)
// The admin login page also uses the default layout — exclude it explicitly.
const isAdminRoute = computed(() =>
  route.path.replace(/^\/(en|ar)(?=\/|$)/, '').startsWith('/admin'),
)
</script>

<template>
  <div class="min-h-screen">
    <AppMetaPixel v-if="!isAdminRoute && metaPublic?.enabled && metaPublic?.pixelId" :pixel-id="metaPublic.pixelId" />
    <AppNavbar />
    <AppTicker />
    <main>
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
