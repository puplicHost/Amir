<script setup lang="ts">
interface Props {
  variant?: 'solid' | 'outline' | 'ghost' | 'on-dark'
  size?: 'sm' | 'md' | 'lg'
  to?: string
  href?: string
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'solid',
  size: 'md',
  to: undefined,
  href: undefined,
  type: 'button',
  disabled: false,
  loading: false,
  class: '',
})

const sizeClasses = {
  sm: 'min-h-11 px-4 py-2 text-xs tracking-wider uppercase font-medium',
  md: 'min-h-11 px-6 py-2.5 text-xs sm:text-sm tracking-wider uppercase font-medium',
  lg: 'min-h-12 px-8 py-3 text-sm tracking-widest uppercase font-medium',
}

const variantClasses = {
  solid:
    'bg-[#050808] text-white hover:bg-[#262626] active:scale-[0.99] border border-[#050808] dark:bg-white dark:text-[#050808] dark:hover:bg-[#E5E5E5] dark:border-white',
  outline:
    'bg-transparent text-brand-black border border-current hover:bg-black/5 active:scale-[0.99] dark:text-white dark:hover:bg-white/10',
  ghost:
    'bg-transparent text-current hover:bg-black/5 active:scale-[0.99] border border-transparent dark:hover:bg-white/10',
  'on-dark':
    'bg-white text-[#050808] hover:bg-[#E5E5E5] active:scale-[0.99] border border-white',
}
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    class="inline-flex items-center justify-center gap-2 rounded-[2px] transition-colors duration-200 ease-out select-none"
    :class="[sizeClasses[props.size], variantClasses[props.variant], props.class]"
  >
    <span v-if="loading" class="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current opacity-40 border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
    <slot />
  </NuxtLink>
  <a
    v-else-if="href"
    :href="href"
    class="inline-flex items-center justify-center gap-2 rounded-[2px] transition-colors duration-200 ease-out select-none"
    :class="[sizeClasses[props.size], variantClasses[props.variant], props.class]"
    target="_blank"
    rel="noopener noreferrer"
  >
    <span v-if="loading" class="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current opacity-40 border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
    <slot />
  </a>
  <button
    v-else
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center gap-2 rounded-[2px] transition-colors duration-200 ease-out select-none disabled:opacity-40 disabled:cursor-not-allowed"
    :class="[sizeClasses[props.size], variantClasses[props.variant], props.class]"
  >
    <span v-if="loading" class="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current opacity-40 border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
    <slot />
  </button>
</template>
