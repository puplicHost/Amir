<script setup lang="ts">
// Legacy route — users and staff now live in Salon Management → Team.
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const localePath = useLocalePath()
const route = useRoute()

const oldTab = typeof route.query.tab === 'string' ? route.query.tab : ''
const teamTab = oldTab === 'users' || oldTab === 'staff' ? oldTab : undefined
const { tab: _oldTab, ...rest } = route.query
const query: Record<string, unknown> = { ...rest, tab: 'team' }
if (teamTab) query.teamTab = teamTab
await navigateTo({ path: localePath('/admin/salon'), query }, { replace: true })
</script>

<template>
  <div />
</template>
