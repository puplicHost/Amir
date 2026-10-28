<script setup lang="ts">
import { AlertTriangle, X } from 'lucide-vue-next'

const { locale } = useI18n()
const { pending, resolvePending } = useAdminConfirm()

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') resolvePending(false)
}

watch(() => pending.value, (p) => {
  if (import.meta.client) {
    if (p) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  }
})

onUnmounted(() => {
  if (import.meta.client) window.removeEventListener('keydown', onKeydown)
})

const cancelText = computed(() =>
  pending.value?.cancelLabel || (locale.value === 'ar' ? 'إلغاء' : 'Cancel'),
)
const confirmText = computed(() =>
  pending.value?.confirmLabel || (locale.value === 'ar' ? 'حذف' : 'Delete'),
)
</script>

<template>
  <div
    v-if="pending"
    class="fixed inset-0 z-[90] flex items-center justify-center p-4"
    role="alertdialog"
    aria-modal="true"
    :aria-label="pending.title"
  >
    <button
      type="button"
      tabindex="-1"
      aria-hidden="true"
      class="absolute inset-0 cursor-default bg-black/60 backdrop-blur-xs"
      @click="resolvePending(false)"
    />
    <div
      class="relative w-full max-w-sm overflow-hidden rounded-xl border bg-white shadow-2xl dark:bg-neutral-900"
      :style="{ borderColor: 'var(--color-border)' }"
    >
      <div class="h-1 w-full" :class="pending.danger ? 'bg-rose-500' : 'bg-primary'" />
      <div class="p-5">
        <div class="flex items-start gap-3">
          <div
            class="flex h-11 w-10 shrink-0 items-center justify-center rounded-full"
            :class="pending.danger ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400' : 'bg-primary/10 text-primary dark:text-neutral-400'"
          >
            <AlertTriangle class="h-5 w-5" aria-hidden="true" />
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="font-heading text-sm font-bold text-neutral-900 dark:text-neutral-100">
              {{ pending.title }}
            </h2>
            <p v-if="pending.message" class="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              {{ pending.message }}
            </p>
          </div>
          <button
            type="button"
            class="flex h-11 w-7 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
            :aria-label="cancelText"
            @click="resolvePending(false)"
          >
            <X class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div class="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            class="inline-flex h-11 items-center rounded-md border px-4 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            @click="resolvePending(false)"
          >
            {{ cancelText }}
          </button>
          <button
            type="button"
            class="inline-flex h-11 items-center rounded-md px-5 text-xs font-bold shadow-xs transition active:scale-[0.98]"
            :class="pending.danger ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-primary hover:bg-primary/90 text-on-primary'"
            @click="resolvePending(true)"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
