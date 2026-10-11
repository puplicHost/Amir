<script setup lang="ts">
interface Props {
  as?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  as: 'div',
  size: 'lg',
  class: '',
})

const sizeClasses = {
  sm: 'max-w-3xl',
  md: 'max-w-5xl',
  lg: 'max-w-7xl',
  xl: 'max-w-[1400px]',
  full: 'w-full',
}
</script>

<template>
  <component
    :is="as"
    class="mx-auto w-full px-4 sm:px-6 lg:px-8"
    :class="[sizeClasses[props.size], props.class]"
  >
    <slot />
  </component>
</template>
