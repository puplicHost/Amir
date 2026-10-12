<script setup lang="ts">
const { t } = useI18n()

useHead(() => ({
  title: `${t('legal.agbTitle')} | ${t('brand.name')}`,
}))
</script>

<template>
  <Section variant="light" padded="normal">
    <Container size="md">
      <h1 class="font-display text-3xl sm:text-4xl font-medium tracking-tight text-brand-black dark:text-white">
        {{ t('legal.agbTitle') }}
      </h1>
      <Divider class="my-6" />
      <div class="min-h-[280px]">
        <!-- Empty legal content area -->
      </div>
    </Container>
  </Section>
</template>
