<script setup lang="ts">
const { t } = useI18n()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="mt-16 bg-[#0B1520] text-slate-300">
    <div class="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-3">
      <div>
        <p class="font-heading text-lg font-bold text-white">{{ t('brand.name') }}</p>
        <p class="mt-1 text-sm text-slate-400">{{ t('brand.tagline') }}</p>
      </div>
      <nav aria-label="Footer">
        <p class="text-sm font-semibold uppercase tracking-wide text-slate-400">{{ t('nav.products') }}</p>
        <ul class="mt-3 space-y-2 text-sm">
          <li>{{ t('nav.allProducts') }}</li>
          <li>{{ t('nav.services') }}</li>
          <li>{{ t('nav.contact') }}</li>
        </ul>
      </nav>
      <div>
        <p class="text-sm font-semibold uppercase tracking-wide text-slate-400">{{ t('nav.contact') }}</p>
        <p class="mt-3 text-sm">Contact details arrive in Phase 6.</p>
      </div>
    </div>
    <div class="border-t border-white/10">
      <p class="mx-auto max-w-7xl px-4 py-4 text-xs text-slate-500">© {{ year }} {{ t('brand.name') }}</p>
    </div>
  </footer>
</template>
