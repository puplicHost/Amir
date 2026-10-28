<script setup lang="ts">
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-vue-next'
import type { ToastType } from '~/composables/useAdminToast'

const localePath = useLocalePath()
const { toasts, dismiss } = useAdminToast()

function openToast(t: { id: number, url?: string }) {
  dismiss(t.id)
  if (t.url) navigateTo(localePath(t.url))
}

const typeStyles: Record<ToastType, {
  border: string
  bar: string
  iconColor: string
  icon: any
}> = {
  success: {
    border: 'border-emerald-500/30 dark:border-emerald-500/40',
    bar: 'bg-emerald-500',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    icon: CheckCircle2,
  },
  error: {
    border: 'border-rose-500/30 dark:border-rose-500/40',
    bar: 'bg-rose-500',
    iconColor: 'text-rose-600 dark:text-rose-400',
    icon: AlertCircle,
  },
  warning: {
    border: 'border-amber-500/40 dark:border-amber-500/50',
    bar: 'bg-amber-500',
    iconColor: 'text-amber-600 dark:text-amber-400',
    icon: AlertTriangle,
  },
  info: {
    border: 'border-primary/30 dark:border-primary/50',
    bar: 'bg-primary',
    iconColor: 'text-primary dark:text-neutral-400',
    icon: Info,
  },
}
</script>

<template>
  <div
    class="pointer-events-none fixed top-4 end-4 z-[100] flex w-84 max-w-[calc(100vw-2rem)] flex-col gap-2.5"
    aria-live="polite"
    aria-atomic="false"
  >
    <TransitionGroup
      enter-active-class="transition duration-300 ease-out motion-reduce:transition-none"
      enter-from-class="transform translate-y-2 opacity-0 scale-95"
      enter-to-class="transform translate-y-0 opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in motion-reduce:transition-none"
      leave-from-class="transform translate-y-0 opacity-100 scale-100"
      leave-to-class="transform translate-y-1 opacity-0 scale-95"
    >
      <div
        v-for="t in toasts"
        :key="t.id"
        role="status"
        class="pointer-events-auto relative overflow-hidden rounded-lg border bg-white shadow-xl backdrop-blur-md dark:bg-neutral-900"
        :class="typeStyles[t.type || 'info'].border"
      >
        <div class="flex items-start gap-3 p-3.5">
          <!-- Type Icon -->
          <component
            :is="typeStyles[t.type || 'info'].icon"
            class="h-5 w-5 shrink-0 mt-0.5"
            :class="typeStyles[t.type || 'info'].iconColor"
            aria-hidden="true"
          />

          <!-- Content Body (button when navigable) -->
          <component
            :is="t.url ? 'button' : 'div'"
            :type="t.url ? 'button' : undefined"
            class="min-w-0 flex-1 text-start"
            @click="t.url ? openToast(t) : undefined"
          >
            <p class="text-xs font-bold leading-tight text-neutral-900 dark:text-neutral-100">
              {{ t.title }}
            </p>
            <p
              v-if="t.message || t.body"
              class="mt-1 line-clamp-3 text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-300"
            >
              {{ t.message || t.body }}
            </p>
          </component>

          <!-- Dismiss Button -->
          <button
            type="button"
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            :aria-label="$t('common.close')"
            @click="dismiss(t.id)"
          >
            <X class="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        <!-- Colored Brand Bottom Accent Bar -->
        <div
          class="h-1 w-full"
          :class="typeStyles[t.type || 'info'].bar"
        />
      </div>
    </TransitionGroup>
  </div>
</template>
