<script setup lang="ts">
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Mail,
  Package,
  Receipt,
  Scissors,
  Settings,
  UserCog,
  X,
} from 'lucide-vue-next'

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

const collapsed = useCookie<boolean>('amir_admin_sidebar_collapsed', { default: () => false })
function toggleCollapse() {
  collapsed.value = !collapsed.value
}

const canBookingsViewAll = useAdminCan('bookings.view_all')
const canBookingsViewOwn = useAdminCan('bookings.view_own')
const canProductsView = useAdminCan('products.view')
const canProductsManage = useAdminCan('products.manage')
const canCategoriesManage = useAdminCan('categories.manage')
const canServicesManage = useAdminCan('services.manage')
const canScheduleManage = useAdminCan('schedule.manage')
const canUsersManage = useAdminCan('users.manage')
const canSettingsBusiness = useAdminCan('settings.business')
const canSettingsPayment = useAdminCan('settings.payment')
const canSettingsMeta = useAdminCan('settings.meta')
const canBannersManage = useAdminCan('banners.manage')
const canInboxManage = useAdminCan('inbox.manage')
const canExpensesView = useAdminCan('expenses.view')
const canRefunds = useAdminCan(['bookings.refund_handle', 'bookings.refund_issue'])

const canDashboard = computed(() => canBookingsViewAll.value || canServicesManage.value || canProductsManage.value || Boolean(data.value?.user?.isSuper))
const canSettings = computed(() => canSettingsBusiness.value || canSettingsPayment.value || canSettingsMeta.value || canBannersManage.value || Boolean(data.value?.user?.isSuper))

const { data: headerData } = useAdminHeader()

interface SidebarItem {
  label: string
  to: string
  icon: any
  show: boolean
  badge?: number
}

const items = computed<SidebarItem[]>(() => [
  { label: t('admin.dashboard'), to: '/admin', icon: LayoutDashboard, show: canDashboard.value },
  { label: t('admin.appointments'), to: '/admin/appointments', icon: CalendarDays, show: canBookingsViewAll.value || canBookingsViewOwn.value },
  { label: t('admin.salonManagement'), to: '/admin/salon', icon: Scissors, show: canServicesManage.value || canUsersManage.value || canScheduleManage.value },
  { label: t('admin.catalog'), to: '/admin/catalog', icon: Package, show: canProductsView.value || canCategoriesManage.value },
  { label: t('admin.finance'), to: '/admin/finance', icon: Receipt, show: canExpensesView.value || canRefunds.value },
  { label: t('admin.website'), to: '/admin/website', icon: Mail, show: canInboxManage.value || canBannersManage.value, badge: canInboxManage.value ? (headerData.value?.inbox?.unreadCount || 0) : 0 },
  { label: t('admin.settings'), to: '/admin/settings', icon: Settings, show: canSettings.value },
  { label: t('admin.account'), to: '/admin/account', icon: UserCog, show: true },
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
         `start-0` keeps it glued to the correct side in RTL. Collapsible on desktop. -->
    <aside
      class="fixed inset-y-0 start-0 z-50 flex flex-col justify-between border-e border-white/10 bg-brand-black text-neutral-200 transition duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:translate-x-0"
      :class="[
        mobileOpen ? 'w-64 translate-x-0 shadow-2xl' : 'max-lg:-translate-x-full max-lg:rtl:translate-x-full',
        collapsed ? 'lg:w-20' : 'lg:w-64'
      ]"
    >
      <div class="flex min-h-0 flex-1 flex-col">
        <!-- Brand Header with Collapse Toggle -->
        <div
          class="relative flex h-16 shrink-0 items-center border-b border-white/10 transition"
          :class="collapsed ? 'justify-center px-2' : 'justify-between px-4'"
        >
          <!-- Expanded Brand -->
          <NuxtLink
            v-if="!collapsed"
            :to="localePath('/admin')"
            class="flex items-center gap-2.5 focus-visible:outline-none min-w-0"
            @click="$emit('close-mobile')"
          >
            <img src="/logo.png" alt="Amir" class="h-9 w-9 shrink-0 rounded object-contain shadow-xs" width="36" height="36" />
            <div class="leading-tight min-w-0">
              <span class="font-heading text-sm font-bold tracking-tight text-white block truncate">{{ t('brand.name') }}</span>
              <span class="block text-[10px] font-medium tracking-wider text-neutral-400 uppercase">Admin Panel</span>
            </div>
          </NuxtLink>

          <!-- Collapsed Brand Logo -->
          <NuxtLink
            v-else
            :to="localePath('/admin')"
            class="flex items-center justify-center focus-visible:outline-none"
            :title="t('brand.name')"
            @click="$emit('close-mobile')"
          >
            <img src="/logo.png" alt="Amir" class="h-9 w-9 rounded object-contain shadow-xs" width="36" height="36" />
          </NuxtLink>

          <!-- Desktop Collapse / Expand Toggle Button -->
          <button
            type="button"
            class="hidden lg:flex h-11 w-7 items-center justify-center rounded-md text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
            :class="collapsed ? 'absolute -end-3.5 top-4.5 z-50 bg-brand-black border border-white/10 shadow-md rounded-full text-white' : ''"
            :title="collapsed ? (locale === 'ar' ? 'توسيع القائمة الجانبية' : 'Expand sidebar') : (locale === 'ar' ? 'طي القائمة الجانبية' : 'Collapse sidebar')"
            :aria-label="collapsed ? (locale === 'ar' ? 'توسيع القائمة الجانبية' : 'Expand sidebar') : (locale === 'ar' ? 'طي القائمة الجانبية' : 'Collapse sidebar')"
            @click="toggleCollapse"
          >
            <component :is="collapsed ? ChevronRight : ChevronLeft" class="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </button>

          <!-- Mobile Close Drawer Button -->
          <button
            type="button"
            class="flex h-11 w-8 items-center justify-center rounded-md text-neutral-400 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close sidebar"
            @click="$emit('close-mobile')"
          >
            <X class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <!-- Navigation items -->
        <nav class="min-h-0 flex-1 overflow-y-auto p-2.5" aria-label="Admin Navigation">
          <ul class="space-y-1">
            <li v-for="item in items.filter(i => i.show)" :key="item.to">
              <NuxtLink
                :to="localePath(item.to)"
                class="group flex items-center rounded-md text-sm font-medium transition"
                :class="[
                  collapsed ? 'h-10 w-10 justify-center mx-auto p-0' : 'gap-3 px-3 py-2.5',
                  isItemActive(item.to)
                    ? 'bg-white text-brand-black shadow-xs font-semibold'
                    : 'text-neutral-300 hover:bg-white/10 hover:text-white'
                ]"
                :title="collapsed ? item.label : undefined"
                @click="$emit('close-mobile')"
              >
                <component
                  :is="item.icon"
                  class="h-4 w-4 shrink-0 transition-transform group-hover:scale-105"
                  aria-hidden="true"
                />
                <span v-if="!collapsed" class="flex-1 truncate">{{ item.label }}</span>
                <span
                  v-if="!collapsed && item.badge > 0"
                  class="shrink-0 rounded-full bg-white px-1.5 py-px text-[10px] font-black text-brand-black"
                >
                  {{ item.badge > 99 ? '99+' : item.badge }}
                </span>
              </NuxtLink>
            </li>
          </ul>
        </nav>
      </div>

      <!-- Footer section with View Store & User Card -->
      <div class="shrink-0 border-t border-white/10 p-2.5 space-y-2">
        <!-- View Store Button (Moved into Sidebar) -->
        <NuxtLink
          :to="localePath('/')"
          target="_blank"
          rel="noopener noreferrer"
          class="group flex items-center rounded-md text-xs font-semibold text-neutral-300 transition-colors hover:bg-white/10 hover:text-white border border-white/5"
          :class="collapsed ? 'h-11 w-9 justify-center mx-auto p-0' : 'h-11 w-full gap-2.5 px-3'"
          :title="locale === 'ar' ? 'عرض المتجر في نافذة جديدة' : 'Open public store in a new tab'"
        >
          <ExternalLink class="h-4 w-4 shrink-0 text-white transition-transform group-hover:scale-110" aria-hidden="true" />
          <span v-if="!collapsed" class="truncate">{{ locale === 'ar' ? 'عرض المتجر' : 'View Store' }}</span>
        </NuxtLink>

        <!-- User card -->
        <div
          class="flex items-center rounded-md bg-white/5 transition"
          :class="collapsed ? 'justify-center p-1.5' : 'gap-3 p-2.5'"
          :title="collapsed ? `${data?.user.name} (${data?.user.email})` : undefined"
        >
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-brand-black shadow-xs">
            {{ userInitials }}
          </div>
          <div v-if="!collapsed" class="min-w-0 flex-1">
            <p class="truncate text-xs font-semibold text-white">{{ data?.user.name }}</p>
            <p class="truncate text-[11px] text-neutral-400">{{ data?.user.email }}</p>
            <span
              v-if="data?.user.isSuper"
              class="mt-0.5 inline-block rounded-full bg-white/15 px-1.5 py-0.2 text-[9px] font-bold tracking-wider text-white uppercase"
            >
              Super Admin
            </span>
          </div>
        </div>

        <!-- Logout button -->
        <button
          type="button"
          class="flex items-center justify-center rounded-md border border-white/10 text-xs font-medium text-neutral-300 transition-colors hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
          :class="collapsed ? 'h-11 w-9 mx-auto p-0' : 'w-full gap-2 px-3 py-2'"
          :title="collapsed ? t('admin.logout') : undefined"
          @click="adminLogout" :aria-label="collapsed ? t('admin.logout') : undefined">
          <LogOut class="h-4 w-4 shrink-0" aria-hidden="true" />
          <span v-if="!collapsed">{{ t('admin.logout') }}</span>
        </button>
      </div>
    </aside>
  </div>
</template>
