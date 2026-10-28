<script setup lang="ts">
// Legacy route — the contact inbox now lives in the Website & Communication page.
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const localePath = useLocalePath()
const route = useRoute()

const oldTab = typeof route.query.tab === 'string' ? route.query.tab : ''
const inboxTab = oldTab === 'unread' || oldTab === 'read' ? oldTab : undefined
const { tab: _oldTab, ...rest } = route.query
const query: Record<string, unknown> = { ...rest, tab: 'inbox' }
if (inboxTab) query.inboxTab = inboxTab
await navigateTo({ path: localePath('/admin/website'), query }, { replace: true })
</script>

<template>
  <div />
</template>
