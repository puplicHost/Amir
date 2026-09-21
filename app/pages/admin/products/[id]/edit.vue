<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const id = String(route.params.id)

const { data, error } = await useAsyncData(`admin-product-${id}`, () =>
  $fetch<{ product: Record<string, unknown> }>(`/api/admin/products/${id}`),
)
</script>

<template>
  <div>
    <h1 class="mb-6 font-heading text-2xl font-bold">Edit product</h1>
    <p v-if="error" class="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">Product not found.</p>
    <AdminProductForm v-else-if="data?.product" :existing="data.product as never" />
  </div>
</template>
