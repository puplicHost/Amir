<script setup lang="ts">
import type { Component } from 'vue'

interface AdminTabItem {
  id: string
  label: string
  icon?: Component
  badge?: string | number
}

const props = withDefaults(defineProps<{
  tabs: AdminTabItem[]
  modelValue: string
  ariaLabel?: string
  idPrefix?: string
}>(), {
  ariaLabel: '',
  idPrefix: 'admin-tabs',
})

const emit = defineEmits<{ (e: 'update:modelValue', id: string): void }>()

const { locale } = useI18n()

function tabId(id: string): string {
  return `${props.idPrefix}-tab-${id}`
}

function select(id: string) {
  if (id !== props.modelValue) emit('update:modelValue', id)
}

function onKeydown(e: KeyboardEvent) {
  const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End']
  if (!keys.includes(e.key) || !props.tabs.length) return
  const index = props.tabs.findIndex(tab => tab.id === props.modelValue)
  if (index < 0) return
  e.preventDefault()

  const rtl = locale.value === 'ar'
  let next = index
  if (e.key === 'Home') next = 0
  else if (e.key === 'End') next = props.tabs.length - 1
  else if (e.key === 'ArrowRight') next = rtl ? (index - 1 + props.tabs.length) % props.tabs.length : (index + 1) % props.tabs.length
  else next = rtl ? (index + 1) % props.tabs.length : (index - 1 + props.tabs.length) % props.tabs.length

  select(props.tabs[next].id)
  nextTick(() => document.getElementById(tabId(props.tabs[next].id))?.focus())
}
</script>

<template>
  <div
    class="mb-6 flex gap-1 overflow-x-auto border-b"
    :style="{ borderColor: 'var(--color-border)' }"
    role="tablist"
    :aria-label="ariaLabel || undefined"
    @keydown="onKeydown"
  >
    <button
      v-for="tab in tabs"
      :id="tabId(tab.id)"
      :key="tab.id"
      type="button"
      role="tab"
      :aria-selected="modelValue === tab.id"
      :aria-controls="`${idPrefix}-panel-${tab.id}`"
      :tabindex="modelValue === tab.id ? 0 : -1"
      class="-mb-px inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-xs font-semibold transition-colors"
      :class="modelValue === tab.id
        ? 'border-primary text-primary dark:border-primary dark:text-primary'
        : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'"
      @click="select(tab.id)"
    >
      <component :is="tab.icon" v-if="tab.icon" class="h-4 w-4" aria-hidden="true" />
      <span>{{ tab.label }}</span>
      <span
        v-if="tab.badge !== undefined && tab.badge !== ''"
        class="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
      >
        {{ tab.badge }}
      </span>
    </button>
  </div>
</template>
