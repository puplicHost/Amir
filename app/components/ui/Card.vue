<script setup lang="ts">
import Card from '../Card.vue'
</script>
<template>
  <Card v-bind="$attrs"><slot /></Card>
</template>
