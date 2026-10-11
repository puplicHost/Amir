<script setup lang="ts">
interface Props {
  as?: string
  variant?: 'light' | 'dark' | 'surface' | 'black'
  padded?: 'tight' | 'normal' | 'loose' | 'none'
  hairline?: 'top' | 'bottom' | 'both' | 'none'
  id?: string
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  as: 'section',
  variant: 'light',
  padded: 'normal',
  hairline: 'none',
  id: undefined,
  class: '',
})

const variantClasses = {
  light: 'bg-white text-brand-black dark:bg-[#050808] dark:text-white',
  dark: 'bg-[#050808] text-white',
  black: 'bg-[#050808] text-white',
  surface: 'bg-surface text-brand-black dark:bg-[#121616] dark:text-white',
}

const padClasses = {
  tight: 'py-10 sm:py-14',
  normal: 'py-16 sm:py-24',
  loose: 'py-20 sm:py-32',
  none: '',
}

const hairlineClasses = computed(() => {
  if (props.hairline === 'both') {
    return props.variant === 'dark' || props.variant === 'black'
      ? 'border-y border-[#303636]'
      : 'border-y border-border dark:border-[#303636]'
  }
  if (props.hairline === 'top') {
    return props.variant === 'dark' || props.variant === 'black'
      ? 'border-t border-[#303636]'
      : 'border-t border-border dark:border-[#303636]'
  }
  if (props.hairline === 'bottom') {
    return props.variant === 'dark' || props.variant === 'black'
      ? 'border-b border-[#303636]'
      : 'border-b border-border dark:border-[#303636]'
  }
  return ''
})
</script>

<template>
  <component
    :is="as"
    :id="id"
    :class="[variantClasses[props.variant], padClasses[props.padded], hairlineClasses, props.class]"
  >
    <slot />
  </component>
</template>
