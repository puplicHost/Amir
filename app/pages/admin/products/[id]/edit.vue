<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth', requiredPermission: 'products.edit' })

const { t, locale } = useI18n()
const route = useRoute()
const id = String(route.params.id)
const fetch = useRequestFetch()

const { data, error } = await useAsyncData(`admin-product-${id}`, () =>
  fetch<{ product: Record<string, unknown> }>(`/api/admin/products/${id}`),
)
</script>

<template>
  <div>
    <AdminPageHeader
      :title="locale === 'ar' ? 'تعديل بيانات المنتج' : 'Edit Product'"
      :description="locale === 'ar' ? 'تعديل المواصفات الفنية، التسعير، والصور.' : 'Update product attributes, retail pricing, and media gallery.'"
      back-to="/admin/products"
      :back-label="locale === 'ar' ? 'العودة للمنتجات' : 'Back to Products'"
    />
    <p v-if="error" class="rounded-md border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
      {{ locale === 'ar' ? 'المنتج غير موجود أو تعذر تحميل بياناته.' : 'Product not found or failed to load.' }}
    </p>
    <AdminProductForm v-else-if="data?.product" :existing="data.product as never" />
  </div>
</template>
