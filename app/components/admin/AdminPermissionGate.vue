<script setup lang="ts">
const props = defineProps<{ permission: string }>()

const can = useAdminCan(props.permission)
</script>

<template>
  <slot v-if="can" />
</template>
