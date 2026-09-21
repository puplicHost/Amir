<script setup lang="ts">
import { FolderTree, LayoutDashboard, LogOut, Settings, ShoppingCart, Users, Wrench } from 'lucide-vue-next'

const { t } = useI18n()
const { data } = useAdminSession()

const canProductsView = useAdminCan('products.view')
const canCategoriesManage = useAdminCan('categories.manage')
const canOrdersView = useAdminCan('orders.view')
const canServicesView = useAdminCan('services.view')
const canUsersManage = useAdminCan('users.manage')
const canSettingsView = useAdminCan('settings.view')

const items = computed(() => [
  { label: t('admin.dashboard'), to: '/admin', icon: LayoutDashboard, ready: true },
  { label: t('admin.products'), to: '/admin/products', icon: ShoppingCart, show: canProductsView.value, ready: true },
  { label: t('admin.categories'), to: '/admin/categories', icon: FolderTree, show: canCategoriesManage.value, ready: true },
  { label: t('admin.orders'), to: '/admin/orders', icon: ShoppingCart, show: canOrdersView.value, ready: false },
  { label: t('admin.services'), to: '/admin/services', icon: Wrench, show: canServicesView.value, ready: false },
  { label: t('admin.users'), to: '/admin/users', icon: Users, show: canUsersManage.value, ready: true },
  { label: t('admin.settings'), to: '/admin/settings', icon: Settings, show: canSettingsView.value, ready: false },
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
        <template v-for="item in items" :key="item.label">
          <li v-if="item.show">
            <NuxtLink
              v-if="item.ready"
              :to="item.to"
              class="flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/10"
              active-class="bg-[#2B71AE] text-white"
            >
              <component :is="item.icon" class="h-5 w-5" aria-hidden="true" />
              {{ item.label }}
            </NuxtLink>
            <span
              v-else
              class="flex cursor-not-allowed items-center gap-2 whitespace-nowrap rounded-md px-3 py-2.5 text-sm font-medium opacity-40"
              :title="item.to"
            >
              <component :is="item.icon" class="h-5 w-5" aria-hidden="true" />
              {{ item.label }}
            </span>
          </li>
        </template>
      </ul>
      <div class="mt-3 border-t border-white/10 px-3 pt-3">
        <p class="truncate text-sm font-medium text-white">{{ data?.user.name }}</p>
        <p class="truncate text-xs text-slate-400">{{ data?.user.email }}</p>
        <button
          type="button"
          class="mt-2 flex w-full items-center gap-2 rounded-md px-1 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:text-white"
          @click="adminLogout"
        >
          <LogOut class="h-5 w-5" aria-hidden="true" />
          {{ t('admin.logout') }}
        </button>
      </div>
    </nav>
  </aside>
</template>
