<script setup lang="ts">
import { Megaphone, X } from 'lucide-vue-next'

const { t, locale } = useI18n()

const { data } = await useAsyncData('site-ticker', () =>
  $fetch<{ ticker: { textAr: string | null, textEn: string | null, active: boolean, speed: number } }>('/api/banners'),
)

const ticker = computed(() => data.value?.ticker || null)
const dismissed = useState('ticker-dismissed', () => false)

const text = computed(() => {
  if (!ticker.value) return ''
  return ticker.value.textEn || ticker.value.textAr || ''
})

const visible = computed(() => !!ticker.value?.active && !!text.value && !dismissed.value)
const duration = computed(() => `${Math.min(120, Math.max(5, ticker.value?.speed || 30))}s`)

// Seamless infinite marquee: the track holds an EVEN number of identical
// copies and the animation translates exactly -50% (one full half), so the
// reset point is pixel-identical to the start — no pause, jump, or blank gap.
const MIN_COPIES = 4
const viewportRef = ref<HTMLElement | null>(null)
const probeRef = ref<HTMLElement | null>(null)
const repeatCount = ref(MIN_COPIES)

function calcRepeatCount() {
  const vpWidth = viewportRef.value?.clientWidth || 0
  const chunkWidth = probeRef.value?.scrollWidth || 0
  if (!vpWidth || !chunkWidth) {
    repeatCount.value = MIN_COPIES
    return
  }
  let n = Math.ceil((vpWidth * 2) / chunkWidth) + 1
  n = Math.max(MIN_COPIES, n)
  if (n % 2 === 1) n += 1
  repeatCount.value = n
}

function handleResize() {
  calcRepeatCount()
}

onMounted(() => {
  calcRepeatCount()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})

watch(text, () => nextTick(() => calcRepeatCount()))
</script>

<template>
  <div
    v-if="visible"
    data-site-ticker
    class="relative z-30 flex items-stretch gap-2 overflow-hidden border-b bg-[#050808] text-white border-[#303636]"
    role="marquee"
    aria-live="off"
  >
    <div class="flex shrink-0 items-center gap-1.5 px-3 py-2">
      <Megaphone class="h-3.5 w-3.5 text-white" aria-hidden="true" />
    </div>
    <div ref="viewportRef" class="relative flex-1 overflow-hidden">
      <!-- Hidden probe (same chunk styling) used to measure one copy's width -->
      <span ref="probeRef" class="ticker-chunk invisible absolute whitespace-nowrap text-xs font-medium sm:text-sm" aria-hidden="true">{{ text }}</span>
      <div
        class="ticker-track flex w-max items-center whitespace-nowrap py-2 text-xs font-medium sm:text-sm"
        :style="{ animationDuration: duration }"
      >
        <span
          v-for="i in repeatCount"
          :key="i"
          class="ticker-chunk"
          :aria-hidden="i === 1 ? undefined : 'true'"
        >{{ text }}</span>
      </div>
    </div>
    <button
      type="button"
      class="flex h-11 w-11 shrink-0 items-center justify-center text-white/60 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      :aria-label="t('common.close')"
      @click="dismissed = true"
    >
      <X class="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.ticker-chunk {
  padding-inline-end: 2rem;
}
.ticker-track {
  animation-name: ticker-scroll;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  will-change: transform;
}
@keyframes ticker-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
[dir="rtl"] .ticker-track {
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
