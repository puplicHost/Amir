<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'

interface Props {
  name: string
  price: string | number
  description?: string
  actionText?: string
  actionTo?: string
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  description: undefined,
  actionText: undefined,
  actionTo: undefined,
  class: '',
})

const formattedPrice = computed(() => {
  if (typeof props.price === 'number') {
    return `ab ${props.price.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} €`
  }
  const clean = String(props.price).trim()
  if (clean.startsWith('ab')) return clean
  return `ab ${clean}`
})
</script>

<template>
  <div
    class="group py-4 sm:py-5 border-b border-border/80 dark:border-[#303636]/80 transition-colors duration-150 hover:border-[#808080]"
    :class="props.class"
  >
    <div class="flex items-baseline justify-between gap-3">
      <!-- Service name at left -->
      <div class="font-display text-lg sm:text-xl font-medium tracking-tight text-brand-black dark:text-white group-hover:text-black dark:group-hover:text-white">
        {{ name }}
      </div>

      <!-- Hairline leader line -->
      <div class="flex-1 mx-3 border-b border-dotted border-border dark:border-[#303636]" aria-hidden="true" />

      <!-- Price at right -->
      <div class="font-display text-base sm:text-lg font-medium text-brand-black dark:text-white shrink-0">
        {{ formattedPrice }}
      </div>

      <!-- Booking action -->
      <NuxtLink
        v-if="actionTo"
        :to="actionTo"
        class="ml-4 shrink-0 inline-flex items-center gap-1 text-[11px] font-medium tracking-[0.16em] uppercase text-muted hover:text-brand-black dark:text-[#A6A6A6] dark:hover:text-white transition-colors duration-150"
      >
        <span>{{ actionText || 'Buchen' }}</span>
        <ChevronRight class="h-3.5 w-3.5" aria-hidden="true" />
      </NuxtLink>
    </div>

    <!-- Optional description -->
    <p v-if="description" class="mt-1.5 text-xs sm:text-sm text-muted dark:text-[#A6A6A6] leading-relaxed max-w-xl">
      {{ description }}
    </p>
  </div>
</template>
