<script setup lang="ts">
defineProps<{ page: number, pages: number }>()

const emit = defineEmits<{ (e: 'change', page: number): void }>()
</script>

<template>
  <nav v-if="pages > 1" class="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
    <button
      type="button"
      class="h-10 min-w-10 rounded border px-3 text-sm disabled:opacity-40"
      :style="{ borderColor: 'var(--color-border)' }"
      :disabled="page <= 1"
      @click="emit('change', page - 1)"
    >
      ‹
    </button>
    <span class="px-2 text-sm">Page {{ page }} of {{ pages }}</span>
    <button
      type="button"
      class="h-10 min-w-10 rounded border px-3 text-sm disabled:opacity-40"
      :style="{ borderColor: 'var(--color-border)' }"
      :disabled="page >= pages"
      @click="emit('change', page + 1)"
    >
      ›
    </button>
  </nav>
</template>
