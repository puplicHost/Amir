<script setup lang="ts">
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-vue-next'
import { nextSlideIndex, prevSlideIndex, shouldAutoplay } from '~~/shared/hero-slideshow'

export interface HeroSlideItem {
  url: string
  url1200: string
  alt: string | null
}

const props = withDefaults(defineProps<{
  slides: HeroSlideItem[]
  /** Autoplay interval in seconds (3-15, default 6). */
  intervalSec?: number
}>(), { intervalSec: 6 })

const { t } = useI18n()

const total = computed(() => props.slides.length)
const intervalMs = computed(() => {
  const s = Number(props.intervalSec) || 6
  return Math.min(15, Math.max(3, s)) * 1000
})

const index = ref(0)
// False during SSR so the server renders slide 1 only (no hydration mismatch).
const mounted = ref(false)
const userPaused = ref(false)
const hovering = ref(false)
const focused = ref(false)
const tabHidden = ref(false)
const inView = ref(true)
const reduceMotion = ref(false)
const swipeCooldownUntil = ref(0)

const root = ref<HTMLElement | null>(null)
let timer: ReturnType<typeof setInterval> | null = null
let observer: IntersectionObserver | null = null
let lastAdvanceAt = 0

/** Reactive autoplay gates (hover/focus fold in like a user pause). */
const canPlay = computed(() => {
  if (hovering.value || focused.value) return false
  return shouldAutoplay({
    slideCount: total.value,
    pausedByUser: userPaused.value,
    prefersReducedMotion: reduceMotion.value,
    tabHidden: tabHidden.value,
    offscreen: !inView.value,
  })
})

function stampAdvance() {
  lastAdvanceAt = Date.now()
}

function goTo(i: number) {
  if (!total.value) return
  index.value = ((i % total.value) + total.value) % total.value
  stampAdvance()
}

function next() {
  index.value = nextSlideIndex(index.value, total.value)
  stampAdvance()
}

function prev() {
  index.value = prevSlideIndex(index.value, total.value)
  stampAdvance()
}

function togglePlay() {
  userPaused.value = !userPaused.value
}

function onVisibility() {
  tabHidden.value = document.hidden
}

// Touch swipe left/right with plain pointer events (no library).
// Vertical scrolling stays native via touch-action: pan-y.
let swipeStartX: number | null = null
function onPointerDown(e: PointerEvent) {
  swipeStartX = e.clientX
}
function onPointerUp(e: PointerEvent) {
  if (swipeStartX === null || total.value < 2) {
    swipeStartX = null
    return
  }
  const dx = e.clientX - swipeStartX
  swipeStartX = null
  if (Math.abs(dx) < 40) return
  if (dx < 0) next()
  else prev()
  // A swipe pauses autoplay for one interval.
  swipeCooldownUntil.value = Date.now() + intervalMs.value
}

function sizesAttr(): string {
  return '(max-width: 1023px) 100vw, 50vw'
}

function srcsetOf(s: HeroSlideItem): string {
  return s.url1200 && s.url1200 !== s.url
    ? `${s.url1200} 1200w, ${s.url} 2400w`
    : `${s.url} 2400w`
}

onMounted(() => {
  mounted.value = true
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  reduceMotion.value = mq.matches
  // Reduced motion: start paused (manual controls + Play off).
  if (mq.matches) userPaused.value = true
  tabHidden.value = document.hidden
  document.addEventListener('visibilitychange', onVisibility)

  if (root.value && 'IntersectionObserver' in window) {
    try {
      observer = new IntersectionObserver(
        entries => {
          inView.value = entries[0]?.isIntersecting ?? true
        },
        { threshold: 0.1 },
      )
      observer.observe(root.value)
    }
    catch {
      observer = null
      inView.value = true
    }
  }

  // Autoplay starts after mount; the tick re-checks every pause rule.
  stampAdvance()
  timer = setInterval(() => {
    if (canPlay.value && Date.now() >= swipeCooldownUntil.value && Date.now() - lastAdvanceAt >= intervalMs.value) {
      next()
    }
  }, 250)

  // Preload the next slide only (keeps initial load to slide 1).
  if (total.value >= 2) {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    const s = props.slides[1]!
    link.setAttribute('imagesrcset', srcsetOf(s))
    link.setAttribute('imagesizes', sizesAttr())
    document.head.appendChild(link)
  }
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  document.removeEventListener('visibilitychange', onVisibility)
  observer?.disconnect()
})
</script>

<template>
  <div
    ref="root"
    role="group"
    aria-roledescription="carousel"
    :aria-label="t('hero.carouselLabel')"
    :aria-live="canPlay ? 'off' : 'polite'"
    class="relative h-full w-full overflow-hidden [touch-action:pan-y]"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
    @focusin="focused = true"
    @focusout="focused = false"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
  >
    <!-- Slides: server renders slide 1 only; the rest mount on the client -->
    <template v-for="(s, i) in slides" :key="s.url + i">
      <div
        v-if="mounted || i === 0"
        role="group"
        aria-roledescription="slide"
        :aria-label="t('hero.slideCounter', { n: i + 1, total: slides.length })"
        :aria-hidden="i !== index"
        class="absolute inset-0"
        :class="[
          i === index ? 'z-10 opacity-100' : 'pointer-events-none opacity-0',
          reduceMotion ? '' : 'transition-opacity duration-700 motion-safe:transition-opacity',
        ]"
      >
        <img
          :src="i === 0 || i === index ? s.url : undefined"
          :srcset="i === 0 || i === index ? srcsetOf(s) : undefined"
          :sizes="i === 0 || i === index ? sizesAttr() : undefined"
          :alt="s.alt || ''"
          :loading="i === 0 ? 'eager' : 'lazy'"
          :fetchpriority="i === 0 ? 'high' : 'auto'"
          class="h-full w-full origin-center object-cover object-center"
          :class="i === index
            ? (i % 2 === 0
              ? 'motion-safe:animate-[kenburns-a_7s_ease-out_forwards]'
              : 'motion-safe:animate-[kenburns-b_7s_ease-out_forwards]')
            : ''"
          draggable="false"
        />
      </div>
    </template>

    <!-- Controls (2+ slides only) -->
    <!-- <template v-if="slides.length >= 2">
      <button
        type="button"
        :aria-label="t('hero.prevSlide')"
        class="absolute bottom-20 start-2 z-20 flex h-11 w-11 items-center justify-center rounded-sm bg-[#050808]/60 text-white transition-colors hover:bg-[#050808]/80 focus-visible:outline-2 md:bottom-auto md:top-1/2 md:-translate-y-1/2"
        @click="prev"
      >
        <ChevronLeft class="h-5 w-5 rtl:rotate-180" :stroke-width="1.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        :aria-label="t('hero.nextSlide')"
        class="absolute bottom-20 end-2 z-20 flex h-11 w-11 items-center justify-center rounded-sm bg-[#050808]/60 text-white transition-colors hover:bg-[#050808]/80 focus-visible:outline-2 md:bottom-auto md:top-1/2 md:-translate-y-1/2"
        @click="next"
      >
        <ChevronRight class="h-5 w-5 rtl:rotate-180" :stroke-width="1.5" aria-hidden="true" />
      </button>

      <div class="pointer-events-none absolute bottom-20 inset-x-0 z-20 flex items-center justify-center gap-0.5 md:bottom-2">
        <button
          v-for="(s, i) in slides"
          :key="'dot' + i"
          type="button"
          :aria-label="t('hero.goToSlide', { n: i + 1 })"
          class="pointer-events-auto flex h-11 w-11 items-center justify-center"
          @click="goTo(i)"
        >
          <span
            class="h-1.5 w-1.5 rounded-full transition-colors"
            :class="i === index ? 'bg-white' : 'bg-white/50'"
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          :aria-label="userPaused ? t('hero.playAutoplay') : t('hero.pauseAutoplay')"
          class="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-sm bg-[#050808]/60 text-white transition-colors hover:bg-[#050808]/80"
          @click="togglePlay"
        >
          <Play v-if="userPaused" class="h-4 w-4" :stroke-width="1.5" aria-hidden="true" />
          <Pause v-else class="h-4 w-4" :stroke-width="1.5" aria-hidden="true" />
        </button>
      </div>
    </template> -->
  </div>
</template>
