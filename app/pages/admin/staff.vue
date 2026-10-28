<script setup lang="ts">
// Legacy route — staff profiles and availability now live in Salon Management → Team.
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const localePath = useLocalePath()
await navigateTo({ path: localePath('/admin/salon'), query: { tab: 'team', teamTab: 'staff' } }, { replace: true })
</script>

<template>
  <div />
</template>
