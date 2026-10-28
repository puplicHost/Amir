<script setup lang="ts">
import { ShieldCheck, Sliders, X } from 'lucide-vue-next'

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

const isAdminRoute = computed(() =>
  route.path.replace(/^\/(en|de)(?=\/|$)/, '').startsWith('/admin'),
)

const {
  isDecided,
  bannerOpen,
  settingsModalOpen,
  acceptAll,
  rejectAll,
  setConsent,
  closeSettings,
} = useCookieConsent()

// No pre-ticked boxes for marketing
const marketingChoice = ref(false)
const settingsDialogRef = ref<HTMLElement | null>(null)

// P2-12: keyboard focus stays inside the settings dialog and returns to the
// trigger when it closes. The first-layer banner is non-modal, so no trap.
useFocusTrap(settingsDialogRef, settingsModalOpen, { onEscape: closeSettings })

const isVisible = computed(() => {
  if (isAdminRoute.value) return false
  return !isDecided.value || bannerOpen.value || settingsModalOpen.value
})

function handleAcceptAll() {
  acceptAll()
}

function handleRejectAll() {
  rejectAll()
}

function handleSaveSettings() {
  setConsent(marketingChoice.value)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isVisible.value) {
    if (settingsModalOpen.value) {
      closeSettings()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeydown)
  }
})
</script>

<template>
  <div v-if="isVisible">
    <!-- Backdrop overlay for modal / settings -->
    <div
      v-if="settingsModalOpen"
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity"
      aria-hidden="true"
      @click="closeSettings"
    />

    <!-- Granular Settings Modal -->
    <div
      v-if="settingsModalOpen"
      ref="settingsDialogRef"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-settings-title"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        class="w-full max-w-lg rounded-[2px] border border-border dark:border-[#303636] bg-white dark:bg-[#121616] p-6 sm:p-8 shadow-xl transition"
      >
        <div class="mb-4 flex items-center justify-between border-b border-border dark:border-[#303636] pb-3">
          <h2 id="consent-settings-title" class="font-display text-xl font-medium tracking-tight text-brand-black dark:text-white">
            {{ t('consent.title') }}
          </h2>
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-[2px] text-muted hover:text-brand-black dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
            :aria-label="t('common.close')"
            @click="closeSettings"
          >
            <X class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p class="mb-5 text-xs text-muted dark:text-[#A6A6A6] leading-relaxed">
          {{ t('consent.description') }}
          <NuxtLink :to="localePath('/datenschutz')" class="text-brand-black dark:text-white underline underline-offset-2 ms-1">
            {{ t('consent.privacyLink') }}
          </NuxtLink>
        </p>

        <!-- Category list -->
        <div class="space-y-4 mb-6">
          <!-- Necessary Category (Always on) -->
          <div class="rounded-[2px] border border-border dark:border-[#303636] bg-surface dark:bg-[#050808] p-4">
            <div class="flex items-center justify-between gap-3 mb-1">
              <div class="flex items-center gap-2">
                <ShieldCheck class="h-4 w-4 text-brand-black dark:text-white" aria-hidden="true" />
                <span class="font-display text-base font-medium text-brand-black dark:text-white">{{ t('consent.necessaryTitle') }}</span>
              </div>
              <span class="text-[10px] font-medium tracking-wider uppercase px-2 py-0.5 border border-border dark:border-[#303636] text-muted dark:text-[#A6A6A6]">
                {{ t('consent.alwaysActive') }}
              </span>
            </div>
            <p class="text-[11px] text-muted dark:text-[#A6A6A6] leading-relaxed">
              {{ t('consent.necessaryDesc') }}
            </p>
          </div>

          <!-- Marketing Category (No pre-ticked box) -->
          <div class="rounded-[2px] border border-border dark:border-[#303636] bg-surface dark:bg-[#050808] p-4">
            <div class="flex items-center justify-between gap-3 mb-1">
              <label for="consent-marketing-check" class="flex items-center gap-2 cursor-pointer">
                <input
                  id="consent-marketing-check"
                  v-model="marketingChoice"
                  type="checkbox"
                  class="h-4 w-4 rounded-[2px] accent-[#050808] dark:accent-white cursor-pointer"
                />
                <span class="font-display text-base font-medium text-brand-black dark:text-white">{{ t('consent.marketingTitle') }}</span>
              </label>
            </div>
            <p class="text-[11px] text-muted dark:text-[#A6A6A6] leading-relaxed ps-6">
              {{ t('consent.marketingDesc') }}
            </p>
          </div>
        </div>

        <!-- Settings actions -->
        <div class="flex flex-wrap items-center justify-end gap-3 border-t border-border dark:border-[#303636] pt-4">
          <Button
            variant="outline"
            size="sm"
            @click="handleRejectAll"
          >
            {{ t('consent.rejectAll') }}
          </Button>
          <Button
            variant="solid"
            size="sm"
            @click="handleSaveSettings"
          >
            {{ t('consent.saveSelection') }}
          </Button>
        </div>
      </div>
    </div>

    <!-- First Layer Banner (Bottom Docked) -->
    <div
      v-else-if="!isDecided || bannerOpen"
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-banner-title"
      aria-describedby="consent-banner-desc"
      class="fixed bottom-0 inset-x-0 z-40 border-t border-border dark:border-[#303636] bg-white/95 dark:bg-[#050808]/95 backdrop-blur-md p-4 sm:p-6 shadow-lg transition"
    >
      <div class="mx-auto max-w-7xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div class="max-w-3xl space-y-1.5">
          <h2 id="consent-banner-title" class="font-display text-lg sm:text-xl font-medium tracking-tight text-brand-black dark:text-white">
            {{ t('consent.title') }}
          </h2>
          <p id="consent-banner-desc" class="text-xs sm:text-sm text-muted dark:text-[#A6A6A6] leading-relaxed">
            {{ t('consent.description') }}
            <NuxtLink :to="localePath('/datenschutz')" class="text-brand-black dark:text-white underline underline-offset-2 ms-1">
              {{ t('consent.privacyLink') }}
            </NuxtLink>
          </p>
        </div>

        <!-- Equal prominence buttons on first layer -->
        <div class="flex flex-wrap items-center gap-3 shrink-0">
          <Button
            variant="solid"
            size="sm"
            @click="handleAcceptAll"
          >
            {{ t('consent.acceptAll') }}
          </Button>

          <Button
            variant="outline"
            size="sm"
            @click="handleRejectAll"
          >
            {{ t('consent.rejectAll') }}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            @click="settingsModalOpen = true"
          >
            <Sliders class="h-3.5 w-3.5" aria-hidden="true" />
            <span>{{ t('consent.settings') }}</span>
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
