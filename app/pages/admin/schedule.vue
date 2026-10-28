<script setup lang="ts">
// Legacy route — Opening hours now live in Salon Management.
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const localePath = useLocalePath()
const route = useRoute()

await navigateTo({ path: localePath('/admin/salon'), query: { ...route.query, tab: 'hours' } }, { replace: true })
</script>

<template>
  <div />
</template>
