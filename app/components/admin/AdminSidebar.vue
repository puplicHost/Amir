<script setup lang="ts">
import { LayoutDashboard, LogOut } from 'lucide-vue-next'

const { t } = useI18n()

const items = computed(() => [
  { label: t('admin.dashboard'), to: '/admin', icon: LayoutDashboard },
])
</script>

<template>
  <aside class="border-b bg-[#162032] text-slate-200 lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-e dark:border-[#1E3048]">
    <div class="flex items-center gap-2 px-4 py-4">
      <img src="/logo.png" alt="Mango Electronics" class="h-9 w-9 rounded object-contain" width="36" height="36" />
      <span class="font-heading text-base font-bold text-white">{{ t('brand.name') }}</span>
    </div>
    <nav class="px-2 pb-4" aria-label="Admin">
      <ul class="flex gap-1 overflow-x-auto lg:flex-col">
        <li v-for="item in items" :key="item.label">
          <NuxtLink
            :to="item.to"
            class="flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/10"
            active-class="bg-[#2B71AE] text-white"
          >
            <component :is="item.icon" class="h-5 w-5" aria-hidden="true" />
            {{ item.label }}
          </NuxtLink>
        </li>
      </ul>
      <button
        type="button"
        class="mt-2 flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
      >
        <LogOut class="h-5 w-5" aria-hidden="true" />
        {{ t('admin.logout') }}
      </button>
    </nav>
  </aside>
</template>
