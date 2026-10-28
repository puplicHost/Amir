<script setup lang="ts">
// Legacy route — banners moved to Website & Communication; announcement bar and
// ticker configuration moved to Settings → Website & Banners.
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const localePath = useLocalePath()
const route = useRoute()

const oldTab = typeof route.query.tab === 'string' ? route.query.tab : ''
const { tab: _oldTab, ...rest } = route.query

if (oldTab === 'announcements' || oldTab === 'ticker') {
  await navigateTo({ path: localePath('/admin/settings'), query: { ...rest, tab: 'website' } }, { replace: true })
}
else {
  await navigateTo({ path: localePath('/admin/website'), query: { ...rest, tab: 'banners' } }, { replace: true })
}
</script>

<template>
  <div />
</template>
