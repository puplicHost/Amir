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
      class="relative w-full max-w-sm overflow-hidden rounded-xl border bg-white shadow-2xl dark:bg-[#162032]"
      :style="{ borderColor: 'var(--color-border)' }"
    >
      <div class="h-1 w-full" :class="pending.danger ? 'bg-rose-500' : 'bg-[#2B71AE]'" />
      <div class="p-5">
        <div class="flex items-start gap-3">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            :class="pending.danger ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400' : 'bg-[#2B71AE]/10 text-[#2B71AE] dark:text-blue-400'"
          >
            <AlertTriangle class="h-5 w-5" aria-hidden="true" />
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="font-heading text-sm font-bold text-slate-900 dark:text-slate-100">
              {{ pending.title }}
            </h2>
            <p v-if="pending.message" class="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {{ pending.message }}
            </p>
          </div>
          <button
            type="button"
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            :aria-label="cancelText"
            @click="resolvePending(false)"
          >
            <X class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div class="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            class="inline-flex h-9 items-center rounded-md border px-4 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            @click="resolvePending(false)"
          >
            {{ cancelText }}
          </button>
          <button
            type="button"
            class="inline-flex h-9 items-center rounded-md px-5 text-xs font-bold text-white shadow-xs transition-all active:scale-[0.98]"
            :class="pending.danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#2B71AE] hover:bg-[#285E8E]'"
            @click="resolvePending(true)"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
