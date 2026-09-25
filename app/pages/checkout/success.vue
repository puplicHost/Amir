<script setup lang="ts">
import { ArrowRight, CheckCircle2, PackageCheck, ShoppingBag } from 'lucide-vue-next'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const orderNumber = String(route.query.id || '')

useHead(() => ({ 
  title: `${locale.value === 'ar' ? 'تم تأكيد الطلب' : 'Order Confirmed'} | ${t('brand.name')}` 
}))

onMounted(() => {
  if (!orderNumber) navigateTo(localePath('/'))
})
</script>

<template>
  <div class="mx-auto flex min-h-[65vh] max-w-2xl items-center justify-center px-4 sm:px-6 py-16 sm:py-20">
    <div class="w-full text-center">
      
      <!-- Celebratory Success Badge -->
      <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 ring-8 ring-emerald-50 dark:ring-emerald-950/20">
        <CheckCircle2 class="h-10 w-10" aria-hidden="true" />
      </div>

      <h1 class="font-heading text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
        {{ locale === 'ar' ? 'تم استلام وتأكيد طلبك بنجاح!' : 'Order Confirmed!' }}
      </h1>
      
      <p class="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
        {{ locale === 'ar' ? 'شكراً لثقتكم في مانجو إلكترونيكس. تم تسجيل الطلب بنجاح في نظامنا.' : 'Thank you for your purchase with Mango Electronics. Your order is registered in our dispatch system.' }}
      </p>
      
      <!-- Reference Details Card -->
      <div 
        class="mx-auto mt-8 max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 text-start shadow-xs dark:border-slate-800 dark:bg-[#162032]"
        :style="{ borderColor: 'var(--color-border)' }"
      >
        <span class="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
          {{ locale === 'ar' ? 'رقم الطلب المرجعي' : 'Reference Order #' }}
        </span>
        <p class="font-mono text-xl sm:text-2xl font-black text-[#2B71AE] dark:text-[#F5CC07]">
          {{ orderNumber }}
        </p>
        
        <p class="mt-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-4 border-t border-slate-100 dark:border-slate-800">
          {{ locale === 'ar' 
            ? 'سيتواصل معك فريق خدمة العملاء والشحن عبر الهاتف لتأكيد موعد استلام الشحنة وتفاصيل الفاتورة.' 
            : 'Our engineering dispatch team will contact you shortly to confirm package delivery schedule and invoice details.' }}
        </p>
      </div>
      
      <!-- Continue Shopping Button -->
      <div class="mt-8 flex justify-center">
        <NuxtLink 
          :to="localePath('/products')" 
          class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2B71AE] px-7 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#285E8E] active:scale-95 transition-all"
        >
          <ShoppingBag class="h-4 w-4" />
          <span>{{ locale === 'ar' ? 'متابعة تصفح الكتالوج' : 'Continue Shopping' }}</span>
        </NuxtLink>
      </div>

    </div>
  </div>
</template>
