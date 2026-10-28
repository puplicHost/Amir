<script setup lang="ts">
// Legacy route — Calendar now lives in Appointments.
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const localePath = useLocalePath()
const route = useRoute()

await navigateTo({ path: localePath('/admin/appointments'), query: { ...route.query, tab: 'calendar' } }, { replace: true })
</script>

<template>
  <div />
</template>
