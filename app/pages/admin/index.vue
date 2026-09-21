<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t } = useI18n()

const { data } = await useAsyncData('admin-dashboard-stats', () =>
  $fetch<{ stats: { totalOrders: number, pendingOrders: number, newServiceRequests: number, totalProducts: number } }>('/api/admin/dashboard/stats'),
)

const cards = computed(() => [
  { label: t('admin.orders'), value: data.value?.stats?.totalOrders ?? '—' },
  { label: 'Pending Orders', value: data.value?.stats?.pendingOrders ?? '—' },
  { label: t('admin.services'), value: data.value?.stats?.newServiceRequests ?? '—' },
  { label: t('admin.products'), value: data.value?.stats?.totalProducts ?? '—' },
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
