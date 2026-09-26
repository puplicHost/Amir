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
    border: 'border-[#F5CC07]/50 dark:border-[#F5CC07]/60',
    bar: 'bg-[#F5CC07]',
    iconColor: 'text-amber-600 dark:text-[#F5CC07]',
    icon: AlertTriangle,
  },
  info: {
    border: 'border-[#2B71AE]/30 dark:border-[#2B71AE]/50',
    bar: 'bg-[#2B71AE]',
    iconColor: 'text-[#2B71AE] dark:text-blue-400',
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
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform translate-y-2 opacity-0 scale-95"
      enter-to-class="transform translate-y-0 opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform translate-y-0 opacity-100 scale-100"
      leave-to-class="transform translate-y-1 opacity-0 scale-95"
    >
      <div
        v-for="t in toasts"
        :key="t.id"
        role="status"
        class="pointer-events-auto relative overflow-hidden rounded-lg border bg-white shadow-xl backdrop-blur-md dark:bg-[#162032]"
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

          <!-- Content Body -->
          <div
            class="min-w-0 flex-1 text-start"
            :class="t.url ? 'cursor-pointer' : ''"
            @click="t.url ? openToast(t) : undefined"
          >
            <p class="text-xs font-bold leading-tight text-slate-900 dark:text-slate-100">
              {{ t.title }}
            </p>
            <p
              v-if="t.message || t.body"
              class="mt-1 line-clamp-3 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300"
            >
              {{ t.message || t.body }}
            </p>
          </div>

          <!-- Dismiss Button -->
          <button
            type="button"
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close notification"
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
