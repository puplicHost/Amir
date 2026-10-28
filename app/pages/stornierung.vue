<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

useHead(() => ({
  title: `${t('legal.stornierungTitle')} | ${t('brand.name')}`,
}))
</script>

<template>
  <Section variant="light" padded="normal">
    <Container size="md">
      <h1 class="font-display text-3xl sm:text-4xl font-medium tracking-tight text-brand-black dark:text-white">
        {{ t('legal.stornierungTitle') }}
      </h1>
      <Divider class="my-6" />
      <div class="min-h-[280px] rounded-xl border border-border bg-surface p-6 text-center" role="status">
        <p class="text-sm text-muted">{{ t('legal.placeholder') }}</p>
        <NuxtLink :to="localePath('/contact')" class="mt-4 inline-flex h-11 items-center rounded-xl bg-accent px-6 text-sm font-bold text-on-accent hover:bg-accent-hover transition-colors">
          {{ t('nav.contact') }}
        </NuxtLink>
      </div>
    </Container>
  </Section>
</template>
