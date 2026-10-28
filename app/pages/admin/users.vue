<script setup lang="ts">
// Legacy route — user management now lives in Salon Management → Team.
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const localePath = useLocalePath()
await navigateTo({ path: localePath('/admin/salon'), query: { tab: 'team', teamTab: 'users' } }, { replace: true })
</script>

<template>
  <div />
</template>
