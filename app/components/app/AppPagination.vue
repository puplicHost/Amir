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
  <nav v-if="pages > 1" class="mt-8 flex flex-wrap items-center justify-center gap-1.5" :aria-label="locale === 'ar' ? 'ترقيم الصفحات' : 'Pagination'">
    <button
      type="button"
      class="inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
      :style="{ borderColor: 'var(--color-border)' }"
      :disabled="page <= 1"
      :aria-label="locale === 'ar' ? 'الصفحة السابقة' : 'Previous page'"
      @click="goto(page - 1)"
    >
      <ChevronRight v-if="locale === 'ar'" class="h-4 w-4" aria-hidden="true" />
      <ChevronLeft v-else class="h-4 w-4" aria-hidden="true" />
    </button>

    <template v-for="(p, i) in visiblePages" :key="p">
      <span v-if="i > 0 && p - visiblePages[i - 1] > 1" class="px-1 text-sm text-slate-400">…</span>
      <button
        type="button"
        class="h-10 min-w-10 rounded-md border px-3 text-sm font-semibold transition-colors"
        :class="p === page
          ? 'bg-[#2B71AE] text-white dark:bg-[#F5CC07] dark:text-slate-950'
          : 'hover:bg-slate-100 dark:hover:bg-slate-800'"
        :style="p === page ? { borderColor: 'transparent' } : { borderColor: 'var(--color-border)' }"
        :aria-current="p === page ? 'page' : undefined"
        @click="goto(p)"
      >
        {{ p }}
      </button>
    </template>

    <button
      type="button"
      class="inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
      :style="{ borderColor: 'var(--color-border)' }"
      :disabled="page >= pages"
      :aria-label="locale === 'ar' ? 'الصفحة التالية' : 'Next page'"
      @click="goto(page + 1)"
    >
      <ChevronLeft v-if="locale === 'ar'" class="h-4 w-4" aria-hidden="true" />
      <ChevronRight v-else class="h-4 w-4" aria-hidden="true" />
    </button>
  </nav>
</template>
