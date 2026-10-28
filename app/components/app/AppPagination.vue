<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps<{ page: number, pages: number }>()

const emit = defineEmits<{ (e: 'change', page: number): void }>()

const { locale } = useI18n()

const visiblePages = computed(() => {
  const total = props.pages
  const current = props.page
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const window = new Set<number>([1, 2, total - 1, total, current - 1, current, current + 1])
  return [...window].filter(p => p >= 1 && p <= total).sort((a, b) => a - b)
})

function goto(p: number) {
  const next = Math.min(Math.max(1, p), Math.max(1, props.pages))
  if (next !== props.page) emit('change', next)
}
</script>

<template>
  <nav v-if="pages > 1" class="mt-8 flex flex-wrap items-center justify-center gap-1.5" aria-label="Pagination">
    <button
      type="button"
      class="inline-flex h-11 min-w-10 items-center justify-center gap-1 rounded-[2px] border border-border px-3 text-sm font-medium text-muted transition-colors hover:bg-border/40 disabled:cursor-not-allowed disabled:opacity-40"
      :disabled="page <= 1"
      aria-label="Previous page"
      @click="goto(page - 1)"
    >
      <ChevronLeft class="h-4 w-4" aria-hidden="true" />
    </button>

    <template v-for="(p, i) in visiblePages" :key="p">
      <span v-if="i > 0 && p - visiblePages[i - 1] > 1" class="px-1 text-sm text-muted">…</span>
      <button
        type="button"
        class="h-11 min-w-10 rounded-[2px] border px-3 text-sm font-medium transition-colors"
        :class="p === page
          ? 'bg-[#050808] text-white dark:bg-white dark:text-[#050808] border-transparent'
          : 'border-border hover:bg-black/5 dark:hover:bg-white/10 text-brand-black dark:text-white'"
        :aria-current="p === page ? 'page' : undefined"
        @click="goto(p)"
      >
        {{ p }}
      </button>
    </template>

    <button
      type="button"
      class="inline-flex h-11 min-w-10 items-center justify-center gap-1 rounded-[2px] border border-border px-3 text-sm font-medium text-muted transition-colors hover:bg-border/40 disabled:cursor-not-allowed disabled:opacity-40"
      :disabled="page >= pages"
      aria-label="Next page"
      @click="goto(page + 1)"
    >
      <ChevronRight class="h-4 w-4" aria-hidden="true" />
    </button>
  </nav>
</template>
