<script setup lang="ts">
// Legacy route — personal bookings now live in the Appointments page.
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const localePath = useLocalePath()
const route = useRoute()

const oldTab = typeof route.query.tab === 'string' ? route.query.tab : ''
const view = oldTab === 'upcoming' || oldTab === 'past' ? oldTab : undefined
const { tab: _oldTab, ...rest } = route.query
const query: Record<string, unknown> = { ...rest, tab: 'my-bookings' }
if (view) query.view = view
await navigateTo({ path: localePath('/admin/appointments'), query }, { replace: true })
</script>

<template>
  <div />
</template>
