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

const isRtl = computed(() => locale.value === 'ar')
const visible = computed(() => !!ticker.value?.active && !!text.value && !dismissed.value)
const duration = computed(() => `${Math.min(120, Math.max(5, ticker.value?.speed || 30))}s`)

// Seamless infinite marquee: the track holds an EVEN number of identical
// copies and the animation translates exactly -50% (one full half), so the
// reset point is pixel-identical to the start — no pause, jump, or blank gap.
// Copy count is measured so the track always covers ≥2× the viewport width
// (short strings get more copies, long strings stay at the minimum).
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
  if (n % 2 === 1) n += 1 // halves must stay identical for the -50% loop
  // No upper cap: spans are cheap text nodes, and capping would reintroduce
  // blank gaps for very short strings on wide screens.
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

watch([text, isRtl], () => nextTick(() => calcRepeatCount()))
</script>

<template>
  <div
    v-if="visible"
    data-site-ticker
    class="relative z-30 flex items-stretch gap-2 overflow-hidden border-b bg-navy text-cream"
    :style="{ borderColor: 'var(--color-border)' }"
    role="marquee"
    aria-live="off"
  >
    <div class="flex shrink-0 items-center gap-1.5 px-3 py-2">
      <Megaphone class="h-3.5 w-3.5 text-cream" aria-hidden="true" />
    </div>
    <div ref="viewportRef" class="relative flex-1 overflow-hidden">
      <!-- Hidden probe (same chunk styling) used to measure one copy's width -->
      <span ref="probeRef" class="ticker-chunk invisible absolute whitespace-nowrap text-xs font-semibold sm:text-sm" aria-hidden="true">{{ text }}</span>
      <!-- dir="ltr" keeps flex layout identical in both locales; direction is
           driven purely by the animation (mirrored keyframes for RTL). -->
      <div
        class="ticker-track flex w-max items-center whitespace-nowrap py-2 text-xs font-semibold sm:text-sm"
        dir="ltr"
        :class="{ rtl: isRtl }"
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
      class="flex shrink-0 items-center px-2.5 text-white/60 hover:text-cream"
      :aria-label="locale === 'ar' ? 'إخفاء الشريط' : 'Dismiss announcement'"
      @click="dismissed = true"
    >
      <X class="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.ticker-chunk {
  /* Small, fixed, consistent gap between back-to-back copies */
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
/* RTL: mirrored — start shifted by half and glide back to 0, same seamless loop */
.ticker-track.rtl {
  animation-name: ticker-scroll-rtl;
}
@keyframes ticker-scroll-rtl {
  from { transform: translateX(-50%); }
  to { transform: translateX(0); }
}
@media (prefers-reduced-motion: reduce) {
  .ticker-track { animation: none; }
}
</style>
