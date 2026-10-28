<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth', requiredPermission: 'products.manage' })

const { t, locale } = useI18n()
</script>

<template>
  <div>
    <AdminPageHeader
      :title="locale === 'ar' ? 'إضافة منتج جديد' : 'Add New Product'"
      :description="locale === 'ar' ? 'أدخل تفاصيل ومواصفات وأسعار وصور المنتج الجديد.' : 'Configure technical specs, inventory pricing, and high-resolution product media.'"
      back-to="/admin/products"
      :back-label="locale === 'ar' ? 'العودة للمنتجات' : 'Back to Products'"
    />
    <AdminProductForm />
  </div>
</template>
