<script setup lang="ts">
import { Scissors } from 'lucide-vue-next'
import IconDamen from '~/components/icons/IconDamen.vue'
import IconHerren from '~/components/icons/IconHerren.vue'
import IconKinder from '~/components/icons/IconKinder.vue'
import IconKosmetik from '~/components/icons/IconKosmetik.vue'

const props = defineProps<{
  /** Service section: DAMEN | HERREN | KINDER | KOSMETIK (case-insensitive) */
  section?: string | null
}>()

const iconComponent = computed(() => {
  switch ((props.section || '').toUpperCase()) {
    case 'DAMEN':
      return IconDamen
    case 'HERREN':
      return IconHerren
    case 'KINDER':
      return IconKinder
    case 'KOSMETIK':
      return IconKosmetik
    default:
      return Scissors
  }
})
</script>

<template>
  <component :is="iconComponent" aria-hidden="true" v-bind="$attrs" />
</template>
