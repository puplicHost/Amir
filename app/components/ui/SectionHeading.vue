<script setup lang="ts">
import SectionHeading from '../SectionHeading.vue'
</script>
<template>
  <SectionHeading v-bind="$attrs">
    <template #text><slot name="text" /></template>
  </SectionHeading>
</template>
