<script setup lang="ts">
interface Props {
  as?: string
  variant?: 'default' | 'surface' | 'dark' | 'outline'
  hover?: boolean
  padded?: boolean | 'sm' | 'md' | 'lg' | 'none'
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  as: 'div',
  variant: 'default',
  hover: false,
  padded: 'md',
  class: '',
})

const variantClasses = {
  default: 'bg-white text-brand-black border border-border dark:bg-[#121616] dark:text-white dark:border-[#303636]',
  surface: 'bg-surface text-brand-black border border-border dark:bg-[#121616] dark:text-white dark:border-[#303636]',
  dark: 'bg-[#050808] text-white border border-[#303636]',
  outline: 'bg-transparent text-current border border-border dark:border-[#303636]',
}

const padClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6 sm:p-8',
  lg: 'p-8 sm:p-12',
}

const resolvedPadding = computed(() => {
  if (props.padded === true) return padClasses.md
  if (props.padded === false || props.padded === 'none') return ''
  if (typeof props.padded === 'string' && padClasses[props.padded] !== undefined) {
    return padClasses[props.padded]
  }
  return padClasses.md
})
</script>

<template>
  <component
    :is="as"
    class="rounded-[2px] transition duration-200"
    :class="[
      variantClasses[props.variant],
      resolvedPadding,
      hover ? 'hover:border-[#808080] dark:hover:border-[#808080] cursor-pointer' : '',
      props.class,
    ]"
  >
    <slot />
  </component>
</template>
