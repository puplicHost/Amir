<script setup lang="ts">
import { ChevronLeft, ChevronRight, X } from 'lucide-vue-next'

const { t, locale } = useI18n()
const localePath = useLocalePath()

interface AnnouncementItem {
  id: string
  textAr: string
  textEn: string | null
  type: string
  linkType: string
  linkValue: string | null
}

const { data } = await useAsyncData('announcement-feed', () =>
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
  return item.textEn || item.textAr || ''
}

function linkOf(item: AnnouncementItem | null) {
  if (!item || item.linkType === 'none' || !item.linkValue) return null
  if (item.linkType === 'url') return item.linkValue
  if (item.linkType === 'product') return localePath(`/p/${item.linkValue}`)
  if (item.linkType === 'service') return localePath('/services')
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

const reducedMotion = ref(false)
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function startTimer() {
  stopTimer()
  if (activeItems.value.length > 1 && !reducedMotion.value) {
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
</script>

<template>
  <div
    v-if="isBarVisible"
    data-site-announce
    class="relative z-50 flex min-h-11 w-full items-center justify-between px-2 sm:px-4 text-[11px] font-medium tracking-wide bg-[#050808] text-white border-b border-[#303636] print:hidden"
    @mouseenter="stopTimer"
    @mouseleave="startTimer"
    @focusin="stopTimer"
    @focusout="startTimer"
  >
    <div class="flex items-center">
      <button
        v-if="activeItems.length > 1"
        type="button"
        class="flex h-11 w-11 items-center justify-center text-white/60 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        :aria-label="t('common.previous')"
        @click="prev"
      >
        <ChevronLeft class="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>

    <div class="flex-1 overflow-hidden text-center px-2">
      <Transition
        mode="out-in"
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-1"
      >
        <div :key="currentIndex" class="truncate">
          <NuxtLink
            v-if="linkOf(currentItem) && !isExternalLink(currentItem)"
            :to="linkOf(currentItem)!"
            class="inline-flex items-center gap-1.5 hover:underline underline-offset-2"
          >
            <span>{{ textOf(currentItem) }}</span>
            <span class="text-[10px] opacity-75">
              {{ locale === 'de' ? '— Details ansehen' : '— View details' }}
            </span>
          </NuxtLink>

          <a
            v-else-if="linkOf(currentItem) && isExternalLink(currentItem)"
            :href="linkOf(currentItem)!"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 hover:underline underline-offset-2"
          >
            <span>{{ textOf(currentItem) }}</span>
            <span class="text-[10px] opacity-75">
              {{ locale === 'de' ? '— Details ansehen' : '— View details' }}
            </span>
          </a>

          <span v-else>
            {{ textOf(currentItem) }}
          </span>
        </div>
      </Transition>
    </div>

    <div class="flex items-center">
      <button
        v-if="activeItems.length > 1"
        type="button"
        class="flex h-11 w-11 items-center justify-center text-white/60 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        :aria-label="t('common.next')"
        @click="next"
      >
        <ChevronRight class="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      <button
        type="button"
        class="flex h-11 w-11 items-center justify-center text-white/60 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ms-1"
        :aria-label="t('common.close')"
        @click="dismiss"
      >
        <X class="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>
