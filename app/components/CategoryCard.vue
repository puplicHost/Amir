<script setup lang="ts">
import { Boxes } from 'lucide-vue-next'

defineProps<{
  /** Display name */
  name: string
  /** Cover image path or null */
  cover: string | null
  /** Card destination */
  to: string | Record<string, unknown>
}>()
</script>

<template>
  <NuxtLink
    :to="to"
    class="group flex h-full flex-col overflow-hidden rounded-sm border border-border bg-surface transition-[border-color] duration-150 motion-safe:transition-[border-color] hover:border-text"
  >
    <!-- Image tile (4:5, full card width) or neutral gray tile with centered line icon -->
    <div class="relative aspect-[4/5] w-full shrink-0 overflow-hidden bg-border/40">
      <img
        v-if="cover"
        :src="cover"
        :alt="name"
        class="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
      />
      <div v-else class="absolute inset-0 flex items-center justify-center text-muted">
        <Boxes class="h-8 w-8" :stroke-width="1.5" aria-hidden="true" />
      </div>
    </div>

    <!-- Text below the image, never overlapping -->
    <div class="flex min-w-0 flex-1 flex-col justify-center p-3.5">
      <h3 class="font-sans text-[15px] font-semibold leading-snug text-text line-clamp-2 text-balance">
        {{ name }}
      </h3>
    </div>
  </NuxtLink>
</template>
