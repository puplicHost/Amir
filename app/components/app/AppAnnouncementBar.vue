<script setup lang="ts">
import { ChevronLeft, ChevronRight, X } from 'lucide-vue-next'

const { locale } = useI18n()
const localePath = useLocalePath()

interface AnnouncementItem {
  id: string
  textAr: string
  textEn: string | null
  type: string
  linkType: string
  linkValue: string | null
}

const { data, refresh } = await useAsyncData('announcement-feed', () =>
  $fetch<{
    items: AnnouncementItem[]
    active: boolean
    bgColor: string
  }>('/api/announcements'),
)

const isDismissed = useState('announcement-bar-dismissed', () => false)
const currentIndex = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  if (typeof window !== 'undefined') {
    // Clear legacy dismiss flag so it doesn't cause a disappearing flash on refresh
    try { sessionStorage.removeItem('mango_announcement_dismissed') } catch {}
  }
  startTimer()
})

onUnmounted(() => {
  stopTimer()
})

const activeItems = computed(() => data.value?.items || [])
const isBarVisible = computed(() => {
  return !isDismissed.value && data.value?.active && activeItems.value.length > 0
})

const currentItem = computed(() => activeItems.value[currentIndex.value] || null)

function textOf(item: AnnouncementItem | null) {
  if (!item) return ''
  return locale.value === 'ar' ? item.textAr : (item.textEn || item.textAr)
}

function linkOf(item: AnnouncementItem | null) {
  if (!item || item.linkType === 'none' || !item.linkValue) return null
  if (item.linkType === 'url') return item.linkValue
  if (item.linkType === 'product') return localePath(`/p/${item.linkValue}`)
  if (item.linkType === 'service') return localePath(`/services/${item.linkValue}`)
  return item.linkValue
}

function isExternalLink(item: AnnouncementItem | null) {
  return item?.linkType === 'url'
}

function next() {
  if (activeItems.value.length <= 1) return
  currentIndex.value = (currentIndex.value + 1) % activeItems.value.length
}

function prev() {
  if (activeItems.value.length <= 1) return
  currentIndex.value = (currentIndex.value - 1 + activeItems.value.length) % activeItems.value.length
}

function goTo(idx: number) {
  currentIndex.value = idx
}

function startTimer() {
  stopTimer()
  if (activeItems.value.length > 1) {
    timer = setInterval(() => {
      next()
    }, 5000)
  }
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function dismiss() {
  isDismissed.value = true
}

// Touch swipe support on mobile
const touchStartX = ref(0)
function onTouchStart(e: TouchEvent) {
  touchStartX.value = e.changedTouches[0].screenX
  stopTimer()
}
function onTouchEnd(e: TouchEvent) {
  const diff = e.changedTouches[0].screenX - touchStartX.value
  if (Math.abs(diff) > 40) {
    if (diff > 0) prev()
    else next()
  }
  startTimer()
}
</script>

<template>
  <div
    v-if="isBarVisible"
    data-site-announce
    class="relative z-50 flex h-10 w-full items-center justify-between px-3 text-xs font-semibold text-white transition-colors print:hidden"
    :style="{ backgroundColor: data?.bgColor || 'rgb(var(--primary) / 1)' }"
    @mouseenter="stopTimer"
    @mouseleave="startTimer"
    @touchstart="onTouchStart"
    @touchend="onTouchEnd"
  >
    <!-- Right side (in RTL): Previous arrow button -->
    <div class="flex items-center">
      <button
        v-if="activeItems.length > 1"
        type="button"
        class="hidden sm:flex h-7 w-7 items-center justify-center rounded text-white/80 hover:bg-white/15 hover:text-white active:scale-95 transition-all"
        :aria-label="locale === 'ar' ? 'السابق' : 'Previous'"
        @click="prev"
      >
        <ChevronRight class="h-4 w-4" />
      </button>
    </div>

    <!-- Center: Transitioning announcement content -->
    <div class="flex-1 overflow-hidden text-center px-2">
      <Transition
        mode="out-in"
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div :key="currentIndex" class="truncate">
          <!-- Clickable Link if configured -->
          <NuxtLink
            v-if="linkOf(currentItem) && !isExternalLink(currentItem)"
            :to="linkOf(currentItem)!"
            class="inline-flex items-center gap-1.5 hover:underline"
          >
            <span>{{ textOf(currentItem) }}</span>
            <span class="text-[10px] opacity-80 underline underline-offset-2">
              {{ locale === 'ar' ? '— اضغط للتفاصيل' : '— Click for details' }}
            </span>
          </NuxtLink>

          <a
            v-else-if="linkOf(currentItem) && isExternalLink(currentItem)"
            :href="linkOf(currentItem)!"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 hover:underline"
          >
            <span>{{ textOf(currentItem) }}</span>
            <span class="text-[10px] opacity-80 underline underline-offset-2">
              {{ locale === 'ar' ? '— اضغط للتفاصيل' : '— Click for details' }}
            </span>
          </a>

          <!-- Static text if no link -->
          <span v-else>
            {{ textOf(currentItem) }}
          </span>
        </div>
      </Transition>
    </div>

    <!-- Left side (in RTL): Next arrow + Dots indicators + Close button -->
    <div class="flex items-center gap-2">
      <!-- Dots indicators -->
      <div v-if="activeItems.length > 1" class="flex items-center gap-1 px-1">
        <button
          v-for="(_, i) in activeItems"
          :key="i"
          type="button"
          class="h-1.5 rounded-full transition-all"
          :class="i === currentIndex ? 'w-3.5 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'"
          :aria-label="`Go to slide ${i + 1}`"
          @click="goTo(i)"
        />
      </div>

      <!-- Next button -->
      <button
        v-if="activeItems.length > 1"
        type="button"
        class="hidden sm:flex h-7 w-7 items-center justify-center rounded text-white/80 hover:bg-white/15 hover:text-white active:scale-95 transition-all"
        :aria-label="locale === 'ar' ? 'التالي' : 'Next'"
        @click="next"
      >
        <ChevronLeft class="h-4 w-4" />
      </button>

      <!-- Dismiss (×) Button -->
      <button
        type="button"
        class="flex h-7 w-7 items-center justify-center rounded text-white/70 hover:bg-white/15 hover:text-white transition-all active:scale-90 ms-1"
        :title="locale === 'ar' ? 'إغلاق الإشعار' : 'Close'"
        @click="dismiss"
      >
        <X class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>
