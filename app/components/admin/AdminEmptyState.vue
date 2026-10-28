<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  title: string
  description?: string
  icon?: Component
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center" :style="{ borderColor: 'var(--color-border)' }">
    <div
      v-if="icon"
      class="mb-3.5 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500"
    >
      <component :is="icon" class="h-6 w-6" aria-hidden="true" />
    </div>
    <h3 class="font-heading text-base font-semibold text-neutral-800 dark:text-neutral-200">
      {{ title }}
    </h3>
    <p v-if="description" class="mt-1 max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
      {{ description }}
    </p>
    <div v-if="$slots.default || $slots.action" class="mt-4 flex flex-wrap justify-center gap-2">
      <slot name="action">
        <slot />
      </slot>
    </div>
  </div>
</template>
