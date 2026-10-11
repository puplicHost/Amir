<script setup lang="ts">
interface Props {
  eyebrow?: string
  title: string
  accentWord?: string
  accentPosition?: 'before' | 'after' | 'inline'
  text?: string
  align?: 'left' | 'center' | 'right'
  dark?: boolean
  as?: string
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  eyebrow: undefined,
  accentWord: undefined,
  accentPosition: 'after',
  text: undefined,
  align: 'left',
  dark: false,
  as: 'h2',
  class: '',
})

const alignClasses = {
  left: 'text-left items-start',
  center: 'text-center items-center mx-auto',
  right: 'text-right items-end ml-auto',
}

const accentColor = computed(() => {
  if (props.dark) {
    return 'text-[#808080]'
  }
  return 'text-brand-black dark:text-[#808080]'
})
</script>

<template>
  <div class="flex flex-col max-w-2xl" :class="[alignClasses[props.align], props.class]">
    <div
      v-if="eyebrow"
      class="text-[11px] font-medium tracking-[0.16em] uppercase mb-3"
      :class="dark ? 'text-[#808080]' : 'text-muted dark:text-[#808080]'"
    >
      {{ eyebrow }}
    </div>

    <component
      :is="as"
      class="font-display text-2xl sm:text-3xl lg:text-4xl tracking-tight font-medium"
      :class="dark ? 'text-white' : 'text-brand-black dark:text-white'"
    >
      <template v-if="accentWord && accentPosition === 'before'">
        <span class="italic font-normal mr-2" :class="accentColor">{{ accentWord }}</span>
        <span>{{ title }}</span>
      </template>
      <template v-else-if="accentWord">
        <span>{{ title }}</span>
        <span class="italic font-normal ml-2" :class="accentColor">{{ accentWord }}</span>
      </template>
      <template v-else>
        <span>{{ title }}</span>
      </template>
    </component>

    <div
      class="w-12 h-[1px] my-4"
      :class="[
        align === 'center' ? 'mx-auto' : align === 'right' ? 'ml-auto' : '',
        dark ? 'bg-[#808080]/50' : 'bg-brand-black/30 dark:bg-[#808080]/50',
      ]"
    />

    <p
      v-if="text || $slots.text"
      class="text-sm sm:text-base leading-relaxed"
      :class="dark ? 'text-[#A6A6A6]' : 'text-muted dark:text-[#A6A6A6]'"
    >
      <slot name="text">{{ text }}</slot>
    </p>
  </div>
</template>
