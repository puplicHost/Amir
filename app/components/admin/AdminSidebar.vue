<script setup lang="ts">
import { FileText, FolderTree, LayoutDashboard, LogOut, Settings, ShoppingCart, Users, Wrench, X } from 'lucide-vue-next'

const props = defineProps<{
  mobileOpen?: boolean
}>()

const emit = defineEmits<{
  (e: 'close-mobile'): void
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { data } = useAdminSession()

const canProductsView = useAdminCan('products.view')
const canCategoriesManage = useAdminCan('categories.manage')
const canOrdersView = useAdminCan('orders.view')
const canQuotesManage = useAdminCan('quotes.view')
const canServicesView = useAdminCan('services.view')
const canUsersManage = useAdminCan('users.manage')
const canSettingsView = useAdminCan('settings.view')

const canQuotesView = computed(() => canQuotesManage.value || canServicesView.value || canOrdersView.value || data.value?.user.isSuper)

const items = computed(() => [
  { label: t('admin.dashboard'), to: '/admin', icon: LayoutDashboard, show: true },
  { label: t('admin.products'), to: '/admin/products', icon: ShoppingCart, show: canProductsView.value },
  { label: t('admin.categories'), to: '/admin/categories', icon: FolderTree, show: canCategoriesManage.value },
  { label: t('admin.orders'), to: '/admin/orders', icon: ShoppingCart, show: canOrdersView.value },
  { label: locale.value === 'ar' ? 'عروض الأسعار' : 'Quote Requests', to: '/admin/quotes', icon: FileText, show: canQuotesView.value },
  { label: t('admin.services'), to: '/admin/services', icon: Wrench, show: canServicesView.value },
  { label: t('admin.users'), to: '/admin/users', icon: Users, show: canUsersManage.value },
  { label: t('admin.settings'), to: '/admin/settings', icon: Settings, show: canSettingsView.value },
])

function isItemActive(path: string) {
  const current = route.path.replace(/^\/(en|ar)/, '') || '/'
  const target = path.replace(/^\/(en|ar)/, '')
  if (target === '/admin') {
    return current === '/admin' || current === '/admin/'
  }
  return current === target || current.startsWith(target + '/')
}

const userInitials = computed(() => {
  const name = data.value?.user.name || 'Admin'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
})
</script>

<template>
  <div>
    <!-- Mobile backdrop overlay -->
    <div
      v-if="mobileOpen"
      class="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity lg:hidden"
      aria-hidden="true"
      @click="$emit('close-mobile')"
    />

    <!-- Sidebar Container: sticky on desktop so long tables scroll beside it;
         `start-0` keeps it glued to the correct side in RTL. Mobile stays a fixed drawer. -->
    <aside
      class="fixed inset-y-0 start-0 z-50 flex w-64 flex-col justify-between border-e border-[#1E3048] bg-[#162032] text-slate-200 transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:translate-x-0"
      :class="[
        mobileOpen ? 'translate-x-0 shadow-2xl' : 'max-lg:-translate-x-full max-lg:rtl:translate-x-full'
      ]"
    >
      <div class="flex min-h-0 flex-1 flex-col">
        <!-- Brand Header -->
        <div class="flex h-16 shrink-0 items-center justify-between border-b border-[#1E3048] px-4">
          <NuxtLink :to="localePath('/admin')" class="flex items-center gap-2.5 focus-visible:outline-none" @click="$emit('close-mobile')">
            <img src="/logo.png" alt="Mango Electronics" class="h-9 w-9 rounded object-contain shadow-xs" width="36" height="36" />
            <div class="leading-tight">
              <span class="font-heading text-sm font-bold tracking-tight text-white">{{ t('brand.name') }}</span>
              <span class="block text-[10px] font-medium tracking-wider text-slate-400 uppercase">Admin Panel</span>
            </div>
          </NuxtLink>

          <!-- Close mobile drawer button -->
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close sidebar"
            @click="$emit('close-mobile')"
          >
            <X class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <!-- Navigation items: own scroll region when the list exceeds viewport height -->
        <nav class="min-h-0 flex-1 overflow-y-auto p-3" aria-label="Admin Navigation">
          <p class="mb-2 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {{ locale === 'ar' ? 'القائمة الرئيسية' : 'Main Menu' }}
          </p>
          <ul class="space-y-1">
            <template v-for="item in items" :key="item.label">
              <li v-if="item.show">
                <NuxtLink
                  :to="localePath(item.to)"
                  class="group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all"
                  :class="[
                    isItemActive(item.to)
                      ? 'bg-[#2B71AE] text-white shadow-xs font-semibold'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  ]"
                  @click="$emit('close-mobile')"
                >
                  <component
                    :is="item.icon"
                    class="h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-105"
                    aria-hidden="true"
                  />
                  <span class="flex-1 truncate">{{ item.label }}</span>
                </NuxtLink>
              </li>
            </template>
          </ul>
        </nav>
      </div>

      <!-- User card & Logout footer -->
      <div class="shrink-0 border-t border-[#1E3048] p-3">
        <div class="mb-2 flex items-center gap-3 rounded-md bg-white/5 p-2.5">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2B71AE] text-xs font-bold text-white shadow-xs">
            {{ userInitials }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs font-semibold text-white">{{ data?.user.name }}</p>
            <p class="truncate text-[11px] text-slate-400">{{ data?.user.email }}</p>
            <span
              v-if="data?.user.isSuper"
              class="mt-0.5 inline-block rounded-full bg-[#F5CC07]/20 px-1.5 py-0.2 text-[9px] font-bold tracking-wider text-[#F5CC07] uppercase"
            >
              Super Admin
            </span>
          </div>
        </div>

        <button
          type="button"
          class="flex w-full items-center justify-center gap-2 rounded-md border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
          @click="adminLogout"
        >
          <LogOut class="h-4 w-4" aria-hidden="true" />
          <span>{{ t('admin.logout') }}</span>
        </button>
      </div>
    </aside>
  </div>
</template>
