<script setup lang="ts">
// Legacy route — all-bookings management now lives in the Appointments page.
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const localePath = useLocalePath()
const route = useRoute()

const query: Record<string, unknown> = { ...route.query, tab: 'bookings' }
await navigateTo({ path: localePath('/admin/appointments'), query }, { replace: true })
</script>

<template>
  <div />
</template>
