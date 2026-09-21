<script setup lang="ts">
const props = withDefaults(defineProps<{
  status: string
  showDot?: boolean
  size?: 'sm' | 'md'
}>(), {
  showDot: true,
  size: 'md',
})

const badgeConfig = computed(() => {
  const s = props.status?.toLowerCase() || ''
  
  if (['active', 'delivered', 'done', 'completed'].includes(s)) {
    return {
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50',
      dot: 'bg-emerald-500 dark:bg-emerald-400',
    }
  }
  if (['pending'].includes(s)) {
    return {
      classes: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50',
      dot: 'bg-amber-500 dark:bg-amber-400',
    }
  }
  if (['processing', 'new', 'in review', 'in_review'].includes(s)) {
    return {
      classes: 'bg-blue-50 text-[#2B71AE] border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50',
      dot: 'bg-[#2B71AE] dark:bg-blue-400',
    }
  }
  if (['shipped'].includes(s)) {
    return {
      classes: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50',
      dot: 'bg-purple-500 dark:bg-purple-400',
    }
  }
  if (['cancelled', 'rejected', 'failed'].includes(s)) {
    return {
      classes: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50',
      dot: 'bg-rose-500 dark:bg-rose-400',
    }
  }
  if (['super', 'superadmin'].includes(s)) {
    return {
      classes: 'bg-[#F5CC07]/20 text-slate-900 border-[#F5CC07]/40 dark:bg-[#F5CC07]/20 dark:text-[#F5CC07] dark:border-[#F5CC07]/30',
      dot: 'bg-[#F5CC07]',
    }
  }
  return {
    classes: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    dot: 'bg-slate-400 dark:bg-slate-500',
  }
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full border font-medium uppercase tracking-wider transition-colors"
    :class="[
      badgeConfig.classes,
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs'
    ]"
  >
    <span
      v-if="showDot"
      class="h-1.5 w-1.5 rounded-full shrink-0"
      :class="badgeConfig.dot"
      aria-hidden="true"
    />
    <span>{{ status }}</span>
  </span>
</template>
