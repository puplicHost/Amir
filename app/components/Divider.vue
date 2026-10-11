<script setup lang="ts">
interface Props {
  vertical?: boolean
  dark?: boolean
  short?: boolean
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  vertical: false,
  dark: false,
  short: false,
  class: '',
})
</script>

<template>
  <div
    v-if="vertical"
    class="w-[1px] self-stretch"
    :class="[
      dark ? 'bg-[#303636]' : 'bg-border dark:bg-[#303636]',
      props.class,
    ]"
    role="separator"
    aria-orientation="vertical"
  />
  <div
    v-else
    role="separator"
    aria-orientation="horizontal"
    :class="[
      short ? 'w-12 mx-0' : 'w-full',
      'h-[1px]',
      dark ? 'bg-[#303636]' : 'bg-border dark:bg-[#303636]',
      props.class,
    ]"
  />
</template>
