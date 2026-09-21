<script setup lang="ts">
import { CheckCircle2 } from 'lucide-vue-next'

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const orderNumber = String(route.query.id || '')

useHead(() => ({ title: `Order Confirmed — ${t('brand.name')}` }))

onMounted(() => {
  if (!orderNumber) navigateTo(localePath('/'))
})
</script>

<template>
  <div class="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4 py-16">
    <div class="w-full text-center">
      <CheckCircle2 class="mx-auto mb-6 h-16 w-16 text-green-500" aria-hidden="true" />
      <h1 class="font-heading text-3xl font-extrabold">Order Confirmed!</h1>
      <p class="mt-2 text-lg text-slate-500">Thank you for your purchase.</p>
      
      <div class="mx-auto mt-8 max-w-sm rounded-md border p-6 text-left" :style="{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }">
        <p class="text-sm font-semibold uppercase tracking-wide text-slate-500">Order Number</p>
        <p class="mt-1 font-heading text-xl font-bold">{{ orderNumber }}</p>
        
        <p class="mt-4 text-sm text-slate-600 dark:text-slate-300">
          Our team will contact you shortly to confirm the order details and delivery schedule.
        </p>
      </div>
      
      <div class="mt-8">
        <NuxtLink :to="localePath('/products')" class="inline-flex h-11 items-center justify-center rounded bg-[#2B71AE] px-6 font-semibold text-white hover:bg-[#285E8E]">
          Continue Shopping
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
