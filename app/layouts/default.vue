<script setup lang="ts">
// Public marketing pixels (Meta, Google Ads, TikTok, Snapchat, Pinterest).
// The endpoint is cached and returns only public IDs/options; provider scripts
// are injected client-side by AppMarketingPixels after marketing consent.
const route = useRoute()
const { data: marketingPublic } = await useAsyncData('marketing-public-config', () =>
  $fetch<{ platforms: Record<string, { id: string, events: Record<string, boolean>, options?: Record<string, string> }> }>('/api/marketing/public-config')
    .catch(() => ({ platforms: {} })),
)
// The admin login page also uses the default layout — exclude it explicitly.
const isAdminRoute = computed(() =>
  route.path.replace(/^\/(en|de)(?=\/|$)/, '').startsWith('/admin'),
)
</script>

<template>
  <div class="min-h-screen">
    <AppMarketingPixels v-if="!isAdminRoute" :platforms="marketingPublic?.platforms || {}" />
    <!-- Top Announcement Bar (Change 11 & 12) -->
    <AppAnnouncementBar v-if="!isAdminRoute" />
    <AppNavbar />
    <AppTicker />
    <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-black">
      {{ $t('nav.skipToContent') }}
    </a>
    <main id="main-content">
      <slot />
    </main>
    <AppFooter />
    <AppConsentBanner v-if="!isAdminRoute" />
  </div>
</template>
