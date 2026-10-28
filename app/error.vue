<template>
  <div style="padding: 2rem; text-align: center;">
    <h1>{{ error.statusCode === 404 ? 'Page not found' : 'Something went wrong' }}</h1>
    <a href="/">Go back home</a>
  </div>
</template>

<script setup>
const props = defineProps({ error: Object })
</script>
