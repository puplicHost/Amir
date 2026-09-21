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
      class="mb-3.5 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
    >
      <component :is="icon" class="h-6 w-6" aria-hidden="true" />
    </div>
    <h3 class="font-heading text-base font-semibold text-slate-800 dark:text-slate-200">
      {{ title }}
    </h3>
    <p v-if="description" class="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
      {{ description }}
    </p>
    <div v-if="$slots.default || $slots.action" class="mt-4 flex flex-wrap justify-center gap-2">
      <slot name="action">
        <slot />
      </slot>
    </div>
  </div>
</template>
