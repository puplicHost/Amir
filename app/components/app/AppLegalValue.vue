<script setup lang="ts">
const props = defineProps<{
  label: string
  value?: string | null
}>()

const { locale } = useI18n()
const isDe = computed(() => locale.value === 'de')
</script>

<template>
  <div>
    <dt class="text-xs font-semibold uppercase tracking-wide text-muted">
      {{ props.label }}
    </dt>
    <dd v-if="props.value" class="mt-0.5 text-sm text-text">
      {{ props.value }}
    </dd>
    <dd v-else class="mt-0.5 rounded-md border border-dashed border-amber-500 bg-amber-50 px-2 py-1 text-sm font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
      {{ isDe ? '[Pflichtangabe ergänzen]' : '[required detail missing]' }}
    </dd>
  </div>
</template>
