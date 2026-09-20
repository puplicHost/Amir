<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const { t } = useI18n()

const cards = computed(() => [
  { label: t('admin.orders'), value: '—' },
  { label: t('admin.products'), value: '—' },
  { label: t('admin.services'), value: '—' },
  { label: t('admin.users'), value: '—' },
])
</script>

<template>
  <div>
    <h1 class="font-heading text-2xl font-bold">{{ t('admin.dashboard') }}</h1>
    <p class="mt-1 text-sm text-slate-500">{{ t('admin.shellNotice') }}</p>
    <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="card in cards"
        :key="card.label"
        class="rounded-md border p-6"
        :style="{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }"
      >
        <p class="text-sm font-medium text-slate-500">{{ card.label }}</p>
        <p class="mt-1 font-heading text-3xl font-bold">{{ card.value }}</p>
      </div>
    </div>
  </div>
</template>
