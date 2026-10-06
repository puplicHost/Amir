<script setup lang="ts">
import { ArrowRight, CheckCircle2, Home, Wrench } from 'lucide-vue-next'

const { t, locale } = useI18n()
const localePath = useLocalePath()

useHead(() => ({ 
  title: `${locale.value === 'ar' ? 'تم استلام طلب الخدمة' : 'Request Received'} | ${t('brand.name')}` 
}))
</script>

<template>
  <div class="mx-auto flex min-h-[65vh] max-w-2xl items-center justify-center px-4 sm:px-6 py-16 sm:py-20 text-center">
    <div class="w-full">
      
      <!-- Celebratory Success Badge -->
      <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50">
        <CheckCircle2 class="h-10 w-10" aria-hidden="true" />
      </div>

      <h1 class="font-heading text-2xl sm:text-4xl font-extrabold text-text tracking-tight mb-3">
        {{ locale === 'ar' ? 'تم استلام طلب الخدمة بنجاح!' : 'Service Request Received!' }}
      </h1>
      
      <p class="text-sm sm:text-base text-muted max-w-lg mx-auto leading-relaxed mb-8">
        {{ locale === 'ar' 
          ? 'شكراً لتواصلكم مع مانجو إلكترونيكس. يقوم فريقنا الهندسي بدراسة المتطلبات الفنية وسيتواصل معكم هاتفياً في أقرب وقت لتنسيق موعد الفحص أو بدء التنفيذ.' 
          : 'Thank you for reaching out to Mango Electronics. Our engineering department is reviewing your requirements and will contact you directly to arrange technical inspection or deployment.' }}
      </p>

      <div class="flex flex-col sm:flex-row items-center justify-center gap-3.5">
        <NuxtLink 
          :to="localePath('/')" 
          class="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-accent px-7 text-sm font-bold text-on-accent shadow-xs hover:bg-accent-hover active:scale-95 transition-all"
        >
          <Home class="h-4 w-4" />
          <span>{{ locale === 'ar' ? 'العودة للرئيسية' : 'Back to Home' }}</span>
        </NuxtLink>

        <NuxtLink 
          :to="localePath('/services')" 
          class="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border bg-surface px-7 text-sm font-bold text-muted hover:bg-border/40 active:scale-95 transition-all"
        >
          <Wrench class="h-4 w-4 text-primary" />
          <span>{{ locale === 'ar' ? 'استعراض باقي الخدمات' : 'Explore More Services' }}</span>
        </NuxtLink>
      </div>

    </div>
  </div>
</template>
