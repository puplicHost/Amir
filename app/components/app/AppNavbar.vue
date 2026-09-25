<script setup lang="ts">
import { ChevronDown, Globe, Menu, Moon, ShoppingCart, Sun, X, Boxes, Wrench, PhoneCall, Sparkles } from 'lucide-vue-next'

const { t, locale, setLocale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const colorMode = useColorMode()
const mobileOpen = ref(false)
const productsOpen = ref(false)

const links = computed(() => [
  { label: t('nav.home'), to: localePath('/'), exact: true },
  { label: t('nav.services'), to: localePath('/services') },
  { label: t('nav.contact'), to: localePath('/contact') },
])
const productsHref = computed(() => localePath('/products'))
const cartStore = useCartStore()

const { data: navCats } = await useAsyncData('navbar-categories', () =>
  $fetch<{ categories: { slug: string, nameAr: string, nameEn: string }[] }>('/api/categories'),
  { server: true, lazy: true },
)

const { data: generalSettings } = await useAsyncData('navbar-settings-general', () =>
  $fetch<any>('/api/settings/general'),
  { server: true, lazy: true },
)

const isDark = computed(() => colorMode.value === 'dark')

function toggleTheme() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}

function toggleLocale() {
  setLocale(locale.value === 'ar' ? 'en' : 'ar')
  mobileOpen.value = false
}

function isActiveRoute(path: string, exact = false) {
  if (exact) {
    return route.path === path || route.path === `${path}/`
  }
  return route.path === path || route.path.startsWith(`${path}/`)
}

const isProductsActive = computed(() => {
  const p = productsHref.value
  return route.path === p || route.path.startsWith(`${p}/`) || route.path.startsWith(localePath('/p/'))
})
</script>

<template>
  <header 
    class="sticky top-0 z-40 border-b bg-white/90 backdrop-blur-md transition-colors duration-200 dark:bg-[#0B1520]/90" 
    :style="{ borderColor: 'var(--color-border)' }"
  >
    <nav class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8" aria-label="Main">
      
      <!-- Brand Logo & Name -->
      <NuxtLink :to="localePath('/')" class="group flex items-center gap-2.5 focus-visible:outline-none">
        <img 
          v-if="generalSettings?.logoPath" 
          :src="generalSettings.logoPath" 
          :alt="generalSettings?.siteNameEn || t('brand.name')" 
          class="h-9 w-auto max-w-[130px] rounded object-contain transition-transform group-hover:scale-102" 
        />
        <img 
          v-else 
          src="/logo.png" 
          alt="Mango Electronics" 
          class="h-9 w-9 rounded object-contain shadow-xs transition-transform group-hover:scale-105" 
        />
        <div class="leading-tight">
          <span class="font-heading text-base sm:text-lg font-bold tracking-tight text-slate-900 transition-colors group-hover:text-[#2B71AE] dark:text-white dark:group-hover:text-[#F5CC07]">
            {{ generalSettings ? (locale === 'ar' ? generalSettings.siteNameAr : generalSettings.siteNameEn) : t('brand.name') }}
          </span>
          <span class="hidden lg:block text-[10px] font-medium tracking-wider text-slate-500 uppercase dark:text-slate-400">
            {{ locale === 'ar' ? 'أدوات وحلول هندسية' : 'Engineering & Electronics' }}
          </span>
        </div>
      </NuxtLink>

      <!-- Desktop Navigation Links -->
      <ul class="hidden items-center gap-1 lg:gap-2 md:flex">
        <!-- Home Link -->
        <li>
          <NuxtLink 
            :to="localePath('/')" 
            class="inline-flex items-center rounded-lg px-3.5 py-2 text-sm font-semibold transition-all"
            :class="isActiveRoute(localePath('/'), true) 
              ? 'bg-[#2B71AE]/10 text-[#2B71AE] dark:bg-[#F5CC07]/15 dark:text-[#F5CC07]' 
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white'"
          >
            {{ t('nav.home') }}
          </NuxtLink>
        </li>

        <!-- Products Dropdown -->
        <li 
          class="relative" 
          @mouseenter="productsOpen = true" 
          @mouseleave="productsOpen = false"
        >
          <NuxtLink
            :to="productsHref"
            class="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all"
            :class="isProductsActive 
              ? 'bg-[#2B71AE]/10 text-[#2B71AE] dark:bg-[#F5CC07]/15 dark:text-[#F5CC07]' 
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white'"
            aria-haspopup="true"
            :aria-expanded="productsOpen"
            @click="productsOpen = !productsOpen"
          >
            <span>{{ t('nav.products') }}</span>
            <ChevronDown 
              class="h-3.5 w-3.5 transition-transform duration-200" 
              :class="productsOpen ? 'rotate-180 text-[#2B71AE] dark:text-[#F5CC07]' : 'text-slate-400'" 
              aria-hidden="true" 
            />
          </NuxtLink>

          <!-- Dropdown Flyout Card -->
          <div
            v-if="productsOpen"
            class="absolute start-0 top-full pt-1.5 z-50 w-72"
          >
            <div 
              class="rounded-xl border bg-white p-2 shadow-xl ring-1 ring-black/5 dark:bg-[#162032] dark:ring-white/10"
              :style="{ borderColor: 'var(--color-border)' }"
            >
              <NuxtLink 
                :to="productsHref" 
                class="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-bold text-[#2B71AE] hover:bg-[#2B71AE]/10 dark:text-[#F5CC07] dark:hover:bg-[#F5CC07]/15 transition-colors"
                @click="productsOpen = false"
              >
                <Boxes class="h-4 w-4" />
                <span>{{ t('nav.allProducts') }}</span>
              </NuxtLink>

              <div class="my-1.5 border-t border-slate-100 dark:border-slate-800"></div>

              <div class="max-h-64 overflow-y-auto space-y-0.5 pr-1">
                <NuxtLink 
                  v-for="c in navCats?.categories || []" 
                  :key="c.slug"
                  :to="`${productsHref}/${c.slug}`" 
                  class="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-[#2B71AE] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-[#F5CC07] transition-colors"
                  @click="productsOpen = false"
                >
                  <span class="truncate">{{ locale === 'ar' ? c.nameAr : c.nameEn }}</span>
                  <span class="text-[10px] font-mono text-slate-400 group-hover:text-slate-500">→</span>
                </NuxtLink>
              </div>
            </div>
          </div>
        </li>

        <!-- Services Link -->
        <li>
          <NuxtLink 
            :to="localePath('/services')" 
            class="inline-flex items-center rounded-lg px-3.5 py-2 text-sm font-semibold transition-all"
            :class="isActiveRoute(localePath('/services')) 
              ? 'bg-[#2B71AE]/10 text-[#2B71AE] dark:bg-[#F5CC07]/15 dark:text-[#F5CC07]' 
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white'"
          >
            {{ t('nav.services') }}
          </NuxtLink>
        </li>

        <!-- Contact Link -->
        <li>
          <NuxtLink 
            :to="localePath('/contact')" 
            class="inline-flex items-center rounded-lg px-3.5 py-2 text-sm font-semibold transition-all"
            :class="isActiveRoute(localePath('/contact')) 
              ? 'bg-[#2B71AE]/10 text-[#2B71AE] dark:bg-[#F5CC07]/15 dark:text-[#F5CC07]' 
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white'"
          >
            {{ t('nav.contact') }}
          </NuxtLink>
        </li>
      </ul>

      <!-- Action Utilities (Language, Theme, Cart) -->
      <div class="hidden items-center gap-2 md:flex">
        <!-- Language Switcher -->
        <button
          type="button"
          :aria-label="t('common.toggleLanguage')"
          :title="t('common.toggleLanguage')"
          class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50/80 px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800 transition-all"
          @click="toggleLocale"
        >
          <Globe class="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          <span>{{ locale === 'ar' ? 'English' : 'العربية' }}</span>
        </button>

        <!-- Theme Toggle -->
        <button
          type="button"
          :aria-label="t('common.toggleTheme')"
          :title="t('common.toggleTheme')"
          class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200/80 bg-slate-50/80 text-slate-700 hover:bg-slate-100 active:scale-95 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800 transition-all"
          @click="toggleTheme"
        >
          <Moon v-if="!isDark" class="h-4 w-4 text-slate-600" aria-hidden="true" />
          <Sun v-else class="h-4 w-4 text-[#F5CC07]" aria-hidden="true" />
        </button>

        <div class="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

        <!-- Shopping Cart Button -->
        <NuxtLink
          :to="localePath('/cart')"
          :aria-label="t('nav.cart')"
          class="relative inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#2B71AE] px-3.5 text-xs font-bold text-white shadow-xs hover:bg-[#285E8E] active:scale-95 transition-all"
        >
          <ShoppingCart class="h-4 w-4" aria-hidden="true" />
          <span class="hidden lg:inline">{{ t('nav.cart') }}</span>
          <span 
            v-if="cartStore.itemCount" 
            class="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F5CC07] px-1 text-[11px] font-black text-slate-950 shadow-xs"
          >
            {{ cartStore.itemCount }}
          </span>
        </NuxtLink>
      </div>

      <!-- Mobile Actions -->
      <div class="flex items-center gap-2 md:hidden">
        <NuxtLink
          :to="localePath('/cart')"
          :aria-label="t('nav.cart')"
          class="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
        >
          <ShoppingCart class="h-5 w-5" aria-hidden="true" />
          <span 
            v-if="cartStore.itemCount" 
            class="absolute -end-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[#F5CC07] px-1 text-[10px] font-black text-slate-950 shadow-xs"
          >
            {{ cartStore.itemCount }}
          </span>
        </NuxtLink>

        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
          :aria-label="mobileOpen ? 'Close menu' : 'Open menu'"
          :aria-expanded="mobileOpen"
          @click="mobileOpen = !mobileOpen"
        >
          <X v-if="mobileOpen" class="h-5 w-5" aria-hidden="true" />
          <Menu v-else class="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </nav>

    <!-- Mobile Drawer Menu -->
    <div 
      v-if="mobileOpen" 
      class="border-t bg-white px-4 py-4 md:hidden dark:bg-[#162032] shadow-2xl transition-all" 
      :style="{ borderColor: 'var(--color-border)' }"
    >
      <ul class="flex flex-col gap-1.5">
        <li>
          <NuxtLink
            :to="localePath('/')"
            class="block rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors"
            :class="isActiveRoute(localePath('/'), true) ? 'bg-[#2B71AE]/10 text-[#2B71AE] dark:bg-[#F5CC07]/15 dark:text-[#F5CC07]' : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'"
            @click="mobileOpen = false"
          >
            {{ t('nav.home') }}
          </NuxtLink>
        </li>
        <li>
          <NuxtLink
            :to="productsHref"
            class="flex items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors"
            :class="isProductsActive ? 'bg-[#2B71AE]/10 text-[#2B71AE] dark:bg-[#F5CC07]/15 dark:text-[#F5CC07]' : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'"
            @click="mobileOpen = false"
          >
            <span>{{ t('nav.products') }}</span>
            <span class="text-xs text-slate-400 font-mono">{{ t('nav.allProducts') }}</span>
          </NuxtLink>
        </li>
        <li>
          <NuxtLink
            :to="localePath('/services')"
            class="block rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors"
            :class="isActiveRoute(localePath('/services')) ? 'bg-[#2B71AE]/10 text-[#2B71AE] dark:bg-[#F5CC07]/15 dark:text-[#F5CC07]' : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'"
            @click="mobileOpen = false"
          >
            {{ t('nav.services') }}
          </NuxtLink>
        </li>
        <li>
          <NuxtLink
            :to="localePath('/contact')"
            class="block rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors"
            :class="isActiveRoute(localePath('/contact')) ? 'bg-[#2B71AE]/10 text-[#2B71AE] dark:bg-[#F5CC07]/15 dark:text-[#F5CC07]' : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'"
            @click="mobileOpen = false"
          >
            {{ t('nav.contact') }}
          </NuxtLink>
        </li>
      </ul>

      <!-- Mobile Theme & Language Toggles -->
      <div class="mt-4 flex items-center gap-2 border-t pt-3.5" :style="{ borderColor: 'var(--color-border)' }">
        <button
          type="button"
          class="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          :style="{ borderColor: 'var(--color-border)' }"
          @click="toggleLocale"
        >
          <Globe class="h-4 w-4 text-slate-400" aria-hidden="true" />
          <span>{{ locale === 'ar' ? 'English' : 'العربية' }}</span>
        </button>
        <button
          type="button"
          class="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          :style="{ borderColor: 'var(--color-border)' }"
          @click="toggleTheme"
        >
          <Moon v-if="!isDark" class="h-4 w-4 text-slate-500" aria-hidden="true" />
          <Sun v-else class="h-4 w-4 text-[#F5CC07]" aria-hidden="true" />
          <span>{{ isDark ? t('common.light') : t('common.dark') }}</span>
        </button>
      </div>
    </div>
  </header>
</template>
