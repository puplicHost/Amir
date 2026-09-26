<script setup lang="ts">
import { Megaphone, X } from 'lucide-vue-next'

const { locale } = useI18n()

const { data } = await useAsyncData('site-ticker', () =>
  $fetch<{ ticker: { textAr: string | null, textEn: string | null, active: boolean, speed: number } }>('/api/banners'),
)

const ticker = computed(() => data.value?.ticker || null)
const dismissed = useState('ticker-dismissed', () => false)

const text = computed(() => {
  if (!ticker.value) return ''
  return locale.value === 'ar'
    ? (ticker.value.textAr || ticker.value.textEn || '')
    : (ticker.value.textEn || ticker.value.textAr || '')
})

const visible = computed(() => !!ticker.value?.active && !!text.value && !dismissed.value)
const duration = computed(() => `${Math.min(120, Math.max(5, ticker.value?.speed || 30))}s`)
</script>

<template>
  <div
    v-if="visible"
    class="relative z-30 flex items-stretch gap-2 overflow-hidden border-b bg-[#0B1520] text-white dark:bg-[#F5CC07] dark:text-slate-950"
    :style="{ borderColor: 'var(--color-border)' }"
    role="marquee"
    aria-live="off"
  >
    <div class="flex shrink-0 items-center gap-1.5 px-3 py-2">
      <Megaphone class="h-3.5 w-3.5 text-[#F5CC07] dark:text-slate-950" aria-hidden="true" />
    </div>
    <div class="relative flex-1 overflow-hidden">
      <div class="ticker-track flex w-max items-center whitespace-nowrap py-2 text-xs font-semibold sm:text-sm" :style="{ animationDuration: duration }">
        <span class="pe-16">{{ text }}</span>
        <span class="pe-16" aria-hidden="true">{{ text }}</span>
      </div>
    </div>
    <button
      type="button"
      class="flex shrink-0 items-center px-2.5 text-slate-400 hover:text-white dark:text-slate-700 dark:hover:text-slate-950"
      :aria-label="locale === 'ar' ? 'إخفاء الشريط' : 'Dismiss announcement'"
      @click="dismissed = true"
    >
      <X class="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.ticker-track {
  animation-name: ticker-scroll;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
@keyframes ticker-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
/* RTL: mirror the scroll direction */
:dir(rtl) .ticker-track {
  animation-name: ticker-scroll-rtl;
}
@keyframes ticker-scroll-rtl {
  from { transform: translateX(0); }
  to { transform: translateX(50%); }
}
@media (prefers-reduced-motion: reduce) {
  .ticker-track { animation: none; }
}
</style>
