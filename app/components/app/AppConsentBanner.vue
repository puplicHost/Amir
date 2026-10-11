<script setup lang="ts">
import { ShieldCheck, Sliders, X } from 'lucide-vue-next'

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()

const isAdminRoute = computed(() =>
  route.path.replace(/^\/(en|ar)(?=\/|$)/, '').startsWith('/admin'),
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
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-settings-title"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        class="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl transition-all"
        :style="{ borderColor: 'var(--color-border)' }"
      >
        <div class="mb-4 flex items-center justify-between border-b border-border pb-3">
          <h2 id="consent-settings-title" class="font-heading text-lg font-bold text-text">
            {{ t('consent.title') }}
          </h2>
          <button
            type="button"
            class="rounded-md p-1 text-muted hover:text-text focus:outline-none focus:ring-2 focus:ring-primary"
            :aria-label="t('common.close')"
            @click="closeSettings"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <p class="mb-5 text-xs text-muted leading-relaxed">
          {{ t('consent.description') }}
          <NuxtLink :to="localePath('/datenschutz')" class="text-primary underline ms-1">
            {{ t('consent.privacyLink') }}
          </NuxtLink>
        </p>

        <!-- Category list -->
        <div class="space-y-4 mb-6">
          <!-- Necessary Category (Always on) -->
          <div class="rounded-xl border border-border bg-bg/50 p-4">
            <div class="flex items-center justify-between gap-3 mb-1">
              <div class="flex items-center gap-2">
                <ShieldCheck class="h-4 w-4 text-emerald-600" />
                <span class="font-heading text-sm font-bold text-text">{{ t('consent.necessaryTitle') }}</span>
              </div>
              <span class="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {{ t('consent.alwaysActive') }}
              </span>
            </div>
            <p class="text-[11px] text-muted leading-relaxed">
              {{ t('consent.necessaryDesc') }}
            </p>
          </div>

          <!-- Marketing Category (No pre-ticked box) -->
          <div class="rounded-xl border border-border bg-bg/50 p-4">
            <div class="flex items-center justify-between gap-3 mb-1">
              <label for="consent-marketing-check" class="flex items-center gap-2 cursor-pointer">
                <input
                  id="consent-marketing-check"
                  v-model="marketingChoice"
                  type="checkbox"
                  class="h-4 w-4 rounded accent-primary cursor-pointer"
                />
                <span class="font-heading text-sm font-bold text-text">{{ t('consent.marketingTitle') }}</span>
              </label>
            </div>
            <p class="text-[11px] text-muted leading-relaxed ps-6">
              {{ t('consent.marketingDesc') }}
            </p>
          </div>
        </div>

        <!-- Settings actions -->
        <div class="flex flex-wrap items-center justify-end gap-2.5 border-t border-border pt-4">
          <button
            type="button"
            class="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-xs font-bold text-text hover:bg-border/30 active:scale-95 transition-all"
            @click="handleRejectAll"
          >
            {{ t('consent.rejectAll') }}
          </button>
          <button
            type="button"
            class="inline-flex h-10 items-center justify-center rounded-xl bg-accent px-5 text-xs font-bold text-on-accent shadow-xs hover:bg-accent-hover active:scale-95 transition-all"
            @click="handleSaveSettings"
          >
            {{ t('consent.saveSelection') }}
          </button>
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
      class="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-surface/98 backdrop-blur-md p-4 sm:p-6 shadow-2xl transition-all"
      :style="{ borderColor: 'var(--color-border)' }"
    >
      <div class="mx-auto max-w-7xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div class="max-w-3xl space-y-1.5">
          <h2 id="consent-banner-title" class="font-heading text-base font-bold text-text">
            {{ t('consent.title') }}
          </h2>
          <p id="consent-banner-desc" class="text-xs sm:text-sm text-muted leading-relaxed">
            {{ t('consent.description') }}
            <NuxtLink :to="localePath('/datenschutz')" class="text-primary underline ms-1">
              {{ t('consent.privacyLink') }}
            </NuxtLink>
          </p>
        </div>

        <!-- Equal prominence buttons on first layer -->
        <div class="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            class="flex-1 sm:flex-none inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border-2 border-primary bg-primary px-6 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-primary/90 active:scale-95 transition-all cursor-pointer"
            @click="handleAcceptAll"
          >
            {{ t('consent.acceptAll') }}
          </button>

          <button
            type="button"
            class="flex-1 sm:flex-none inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border-2 border-primary bg-surface px-6 text-xs sm:text-sm font-bold text-text hover:bg-border/40 active:scale-95 transition-all cursor-pointer"
            @click="handleRejectAll"
          >
            {{ t('consent.rejectAll') }}
          </button>

          <button
            type="button"
            class="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border px-4 text-xs font-semibold text-muted hover:text-text hover:bg-border/30 active:scale-95 transition-all cursor-pointer"
            @click="settingsModalOpen = true"
          >
            <Sliders class="h-3.5 w-3.5" />
            <span>{{ t('consent.settings') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
