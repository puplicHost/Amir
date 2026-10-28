<script setup lang="ts">
// Legacy route — Reminders now live in Appointments.
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const localePath = useLocalePath()
const route = useRoute()

await navigateTo({ path: localePath('/admin/appointments'), query: { ...route.query, tab: 'reminders' } }, { replace: true })
</script>

<template>
  <div />
</template>
