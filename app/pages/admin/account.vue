<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t } = useI18n()
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6">
    <header>
      <h1 class="font-heading text-2xl font-extrabold text-text">{{ t('admin.account') }}</h1>
      <p class="mt-1 text-sm text-muted">{{ t('admin.accountDescription') }}</p>
    </header>

    <AdminSettingsAccount />
  </div>
</template>
