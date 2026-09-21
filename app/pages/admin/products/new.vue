<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })
</script>

<template>
  <div>
    <h1 class="mb-6 font-heading text-2xl font-bold">Add product</h1>
    <AdminProductForm />
  </div>
</template>
