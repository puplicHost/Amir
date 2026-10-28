<script setup lang="ts">
// Legacy route — Expenses now live in Finance.
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const localePath = useLocalePath()
const route = useRoute()

await navigateTo({ path: localePath('/admin/finance'), query: { ...route.query, tab: 'expenses' } }, { replace: true })
</script>

<template>
  <div />
</template>
