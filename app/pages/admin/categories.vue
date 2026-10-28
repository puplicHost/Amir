<script setup lang="ts">
// Legacy route — Categories now live in Catalog.
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const localePath = useLocalePath()
const route = useRoute()

await navigateTo({ path: localePath('/admin/catalog'), query: { ...route.query, tab: 'categories' } }, { replace: true })
</script>

<template>
  <div />
</template>
