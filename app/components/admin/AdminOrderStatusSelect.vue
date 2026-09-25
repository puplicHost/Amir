<script setup lang="ts">
import { AlertCircle, Check, ChevronDown, Loader2 } from 'lucide-vue-next'

const props = defineProps<{
  orderId: string
  orderLabel?: string
  status: string
  canEdit: boolean
}>()

const emit = defineEmits<{
  (e: 'updated', status: string): void
}>()

const { locale } = useI18n()

const STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] as const

const dotCls: Record<string, string> = {
  Pending: 'bg-amber-500 dark:bg-amber-400',
  Processing: 'bg-[#2B71AE] dark:bg-blue-400',
  Shipped: 'bg-purple-500 dark:bg-purple-400',
  Delivered: 'bg-emerald-500 dark:bg-emerald-400',
  Cancelled: 'bg-rose-500 dark:bg-rose-400',
}

const current = ref(props.status)
watch(() => props.status, v => { current.value = v })

const open = ref(false)
const saving = ref(false)
const successFlash = ref(false)
const failed = ref(false)
const errorMessage = ref('')
const liveMessage = ref('')

const triggerRef = ref<HTMLButtonElement | null>(null)
const optionRefs = ref<HTMLButtonElement[]>([])

let flashTimer: ReturnType<typeof setTimeout> | null = null
let failTimer: ReturnType<typeof setTimeout> | null = null

onUnmounted(() => {
  if (flashTimer) clearTimeout(flashTimer)
  if (failTimer) clearTimeout(failTimer)
})

function orderName(): string {
  return props.orderLabel
    ? (locale.value === 'ar' ? `الطلب ${props.orderLabel}` : `Order ${props.orderLabel}`)
    : (locale.value === 'ar' ? 'الطلب' : 'the order')
}

function announce(message: string) {
  liveMessage.value = ''
  nextTick(() => { liveMessage.value = message })
}

function setOptionRef(el: any, index: number) {
  if (el) optionRefs.value[index] = el as HTMLButtonElement
}

function openMenu() {
  open.value = true
  nextTick(() => {
    const idx = STATUSES.indexOf(current.value as any)
    optionRefs.value[idx >= 0 ? idx : 0]?.focus()
  })
}

function close(returnFocus = false) {
  open.value = false
  if (returnFocus) triggerRef.value?.focus()
}

function toggle() {
  if (open.value) close()
  else openMenu()
}

function moveFocus(fromIndex: number, delta: number) {
  const next = (fromIndex + delta + STATUSES.length) % STATUSES.length
  optionRefs.value[next]?.focus()
}

function onOptionKeydown(e: KeyboardEvent, index: number) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    moveFocus(index, 1)
  }
  else if (e.key === 'ArrowUp') {
    e.preventDefault()
    moveFocus(index, -1)
  }
  else if (e.key === 'Home') {
    e.preventDefault()
    optionRefs.value[0]?.focus()
  }
  else if (e.key === 'End') {
    e.preventDefault()
    optionRefs.value[STATUSES.length - 1]?.focus()
  }
  else if (e.key === 'Escape') {
    e.preventDefault()
    close(true)
  }
  else if (e.key === 'Tab') {
    close()
  }
}

async function select(next: string) {
  close()
  if (next === current.value || saving.value) return
  const previous = current.value
  current.value = next
  saving.value = true
  failed.value = false
  announce(locale.value === 'ar'
    ? `جاري تحديث حالة ${orderName()} إلى ${next}…`
    : `Updating ${orderName()} status to ${next}…`)
  try {
    await $fetch(`/api/admin/orders/${props.orderId}/status`, {
      method: 'PUT',
      body: { status: next },
    })
    emit('updated', next)
    successFlash.value = true
    announce(locale.value === 'ar'
      ? `تم تحديث حالة ${orderName()} إلى ${next}.`
      : `${orderName()} status updated to ${next}.`)
    if (flashTimer) clearTimeout(flashTimer)
    flashTimer = setTimeout(() => { successFlash.value = false }, 1800)
  }
  catch (e: any) {
    // Revert so the UI never shows a state the server rejected.
    current.value = previous
    errorMessage.value = e?.data?.message || (locale.value === 'ar' ? 'فشل تحديث الحالة.' : 'Failed to update status.')
    failed.value = true
    announce(errorMessage.value)
    if (failTimer) clearTimeout(failTimer)
    failTimer = setTimeout(() => { failed.value = false }, 2600)
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <!-- Read-only badge for staff without orders.manage -->
  <AdminStatusBadge v-if="!canEdit" :status="current" size="sm" />

  <!-- Inline editable status -->
  <div v-else class="relative inline-block">
    <!-- Click-to-edit badge button: padded hit area meets 24px web target minimum -->
    <button
      ref="triggerRef"
      type="button"
      class="min-h-[28px] cursor-pointer touch-manipulation rounded-full p-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B71AE] active:brightness-95"
      :class="[
        failed ? 'ring-2 ring-rose-500' : '',
        successFlash ? 'ring-2 ring-emerald-500' : '',
      ]"
      :aria-haspopup="'listbox'"
      :aria-expanded="open"
      :aria-busy="saving"
      :aria-label="locale === 'ar' ? `تغيير حالة الطلب (الحالية: ${current})` : `Change order status (current: ${current})`"
      :title="locale === 'ar' ? 'انقر لتغيير الحالة' : 'Click to change status'"
      @click="toggle"
      @keydown.down.prevent="() => { if (!open) openMenu() }"
    >
      <span class="pointer-events-none inline-flex items-center">
        <AdminStatusBadge :status="current" size="sm" />
        <span class="-ms-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white text-slate-500 shadow-xs ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700" aria-hidden="true">
          <Loader2 v-if="saving" class="h-2.5 w-2.5 animate-spin" />
          <Check v-else-if="successFlash" class="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
          <AlertCircle v-else-if="failed" class="h-2.5 w-2.5 text-rose-600 dark:text-rose-400" />
          <ChevronDown v-else class="h-2.5 w-2.5" />
        </span>
      </span>
    </button>

    <!-- Invisible backdrop to close on outside click -->
    <button
      v-if="open"
      type="button"
      tabindex="-1"
      aria-hidden="true"
      class="fixed inset-0 z-20 cursor-default bg-transparent"
      @click="close()"
    />

    <!-- Status options dropdown (centered under badge: direction-neutral, RTL-safe) -->
    <div
      v-if="open"
      role="listbox"
      :aria-label="locale === 'ar' ? 'اختر حالة الطلب' : 'Select order status'"
      class="absolute left-1/2 top-full z-30 mt-1.5 w-44 -translate-x-1/2 overflow-hidden rounded-md border bg-white py-1 shadow-lg dark:bg-[#162032]"
      :style="{ borderColor: 'var(--color-border)' }"
    >
      <button
        v-for="(s, i) in STATUSES"
        :key="s"
        :ref="(el) => setOptionRef(el, i)"
        type="button"
        role="option"
        :aria-selected="s === current"
        class="flex w-full cursor-pointer touch-manipulation items-center gap-2 px-3 py-2 text-start text-xs font-medium transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2B71AE] active:bg-slate-100 dark:hover:bg-slate-800/60 dark:focus-visible:bg-slate-800/60 dark:active:bg-slate-800"
        :class="s === current ? 'text-[#2B71AE] dark:text-[#F5CC07]' : 'text-slate-700 dark:text-slate-300'"
        @click="select(s)"
        @keydown="onOptionKeydown($event, i)"
      >
        <span class="h-2 w-2 shrink-0 rounded-full" :class="dotCls[s]" aria-hidden="true" />
        <span class="flex-1 uppercase tracking-wide">{{ s }}</span>
        <Check v-if="s === current" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      </button>
    </div>

    <!-- Transient inline error (reverts automatically; badge already restored) -->
    <span v-if="failed" class="mt-1 block text-[10px] font-medium text-rose-600 dark:text-rose-400" role="alert">
      {{ errorMessage }}
    </span>

    <!-- Screen-reader announcements for async status changes (no focus moves) -->
    <span class="sr-only" role="status" aria-live="polite">{{ liveMessage }}</span>
  </div>
</template>
