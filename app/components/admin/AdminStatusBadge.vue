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
  
  if (['active', 'delivered', 'done', 'completed', 'accepted', 'paid', 'مقبول'].includes(s)) {
    return {
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50',
      dot: 'bg-emerald-500 dark:bg-emerald-400',
    }
  }
  if (['pending', 'pending approval', 'معلق'].includes(s)) {
    return {
      classes: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50',
      dot: 'bg-amber-500 dark:bg-amber-400',
    }
  }
  if (['processing', 'new', 'in review', 'in_review', 'reviewed', 'contacted', 'جديد', 'تمت المراجعة'].includes(s)) {
    return {
      classes: 'bg-neutral-50 text-primary border-neutral-200 dark:bg-neutral-950/40 dark:text-neutral-300 dark:border-neutral-800/50',
      dot: 'bg-primary dark:bg-neutral-400',
    }
  }
  if (['shipped'].includes(s)) {
    return {
      classes: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50',
      dot: 'bg-purple-500 dark:bg-purple-400',
    }
  }
  if (['cancelled', 'rejected', 'failed', 'مرفوض'].includes(s)) {
    return {
      classes: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50',
      dot: 'bg-rose-500 dark:bg-rose-400',
    }
  }
  if (['super', 'superadmin'].includes(s)) {
    return {
      classes: 'bg-primary/20 text-neutral-900 border-primary/40 dark:bg-primary/20 dark:text-primary dark:border-primary/30',
      dot: 'bg-primary',
    }
  }
  return {
    classes: 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700',
    dot: 'bg-neutral-400 dark:bg-neutral-500',
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
