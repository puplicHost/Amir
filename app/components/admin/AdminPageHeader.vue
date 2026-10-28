<script setup lang="ts">
import { ArrowLeft, ArrowRight } from 'lucide-vue-next'

const props = defineProps<{
  title: string
  description?: string
  backTo?: string
  backLabel?: string
}>()

const { locale } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="space-y-1">
      <div v-if="backTo" class="mb-2">
        <NuxtLink
          :to="localePath(backTo)"
          class="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 transition-colors hover:text-primary dark:text-neutral-400 dark:hover:text-primary"
        >
          <ArrowRight v-if="locale === 'ar'" class="h-3.5 w-3.5" aria-hidden="true" />
          <ArrowLeft v-else class="h-3.5 w-3.5" aria-hidden="true" />
          <span>{{ backLabel || (locale === 'ar' ? 'رجوع' : 'Back') }}</span>
        </NuxtLink>
      </div>
      <div class="flex items-center gap-3">
        <h1 class="font-heading text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          {{ title }}
        </h1>
        <slot name="badge" />
      </div>
      <p v-if="description" class="text-sm text-neutral-500 dark:text-neutral-400">
        {{ description }}
      </p>
    </div>
    <div v-if="$slots.actions || $slots.default" class="flex flex-wrap items-center gap-2.5">
      <slot name="actions">
        <slot />
      </slot>
    </div>
  </div>
</template>
