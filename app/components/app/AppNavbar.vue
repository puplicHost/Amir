<script setup lang="ts">
import { ChevronDown, Globe, Menu, Moon, ShoppingCart, Sun, X } from 'lucide-vue-next'

const { t, locale, setLocale } = useI18n()
const localePath = useLocalePath()
const colorMode = useColorMode()
const mobileOpen = ref(false)
const productsOpen = ref(false)

const links = computed(() => [
  { label: t('nav.home'), to: localePath('/') },
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
</script>

<template>
  <header class="sticky top-0 z-40 border-b bg-white/95 backdrop-blur dark:bg-[#0B1520]/95" :style="{ borderColor: 'var(--color-border)' }">
    <nav class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4" aria-label="Main">
      <NuxtLink :to="localePath('/')" class="flex items-center gap-2">
        <img v-if="generalSettings?.logoPath" :src="generalSettings.logoPath" :alt="generalSettings?.siteNameEn || t('brand.name')" class="h-9 w-auto max-w-[120px] rounded object-contain" />
        <img v-else src="/logo.png" alt="Mango Electronics" class="h-9 w-9 rounded object-contain" />
        <span v-if="!generalSettings?.logoPath" class="font-heading text-lg font-bold">{{ generalSettings ? (locale === 'ar' ? generalSettings.siteNameAr : generalSettings.siteNameEn) : t('brand.name') }}</span>
      </NuxtLink>

      <ul class="hidden items-center gap-6 md:flex">
        <li v-for="link in links.slice(0, 1)" :key="link.label">
          <NuxtLink :to="link.to" class="text-sm font-medium text-slate-600 transition-colors hover:text-[#2B71AE] dark:text-slate-300 dark:hover:text-[#F5CC07]">
            {{ link.label }}
          </NuxtLink>
        </li>
        <li class="relative" @mouseenter="productsOpen = true" @mouseleave="productsOpen = false">
          <NuxtLink
            :to="productsHref"
            class="flex items-center gap-1 text-sm font-medium text-slate-600 transition-colors hover:text-[#2B71AE] dark:text-slate-300 dark:hover:text-[#F5CC07]"
            aria-haspopup="true"
            :aria-expanded="productsOpen"
            @click="productsOpen = !productsOpen"
          >
            {{ t('nav.products') }}
            <ChevronDown class="h-4 w-4" aria-hidden="true" />
          </NuxtLink>
          <ul
            v-if="productsOpen"
            class="absolute start-0 top-full min-w-52 rounded-md border bg-white py-1 shadow-md dark:bg-[#162032]"
            :style="{ borderColor: 'var(--color-border)' }"
          >
            <li>
              <NuxtLink :to="productsHref" class="block px-4 py-2.5 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800" @click="productsOpen = false">
                {{ t('nav.allProducts') }}
              </NuxtLink>
            </li>
            <li v-for="c in navCats?.categories || []" :key="c.slug">
              <NuxtLink :to="`${productsHref}/${c.slug}`" class="block px-4 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" @click="productsOpen = false">
                {{ locale === 'ar' ? c.nameAr : c.nameEn }}
              </NuxtLink>
            </li>
          </ul>
        </li>
        <li v-for="link in links.slice(1)" :key="link.label">
          <NuxtLink :to="link.to" class="text-sm font-medium text-slate-600 transition-colors hover:text-[#2B71AE] dark:text-slate-300 dark:hover:text-[#F5CC07]">
            {{ link.label }}
          </NuxtLink>
        </li>
      </ul>

      <div class="hidden items-center gap-1 md:flex">
        <button
          type="button"
          :aria-label="t('common.toggleLanguage')"
          :title="t('common.toggleLanguage')"
          class="flex h-10 min-w-10 items-center gap-1 rounded-md px-2 text-sm font-semibold transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          @click="toggleLocale"
        >
          <Globe class="h-5 w-5" aria-hidden="true" />
          {{ locale === 'ar' ? 'EN' : 'عربي' }}
        </button>
        <button
          type="button"
          :aria-label="t('common.toggleTheme')"
          :title="t('common.toggleTheme')"
          class="flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          @click="toggleTheme"
        >
          <Moon v-if="!isDark" class="h-5 w-5" aria-hidden="true" />
          <Sun v-else class="h-5 w-5" aria-hidden="true" />
        </button>
        <NuxtLink
          :to="localePath('/cart')"
          :aria-label="t('nav.cart')"
          class="relative flex h-10 w-10 items-center justify-center rounded-md transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ShoppingCart class="h-5 w-5" aria-hidden="true" />
          <span v-if="cartStore.itemCount" class="absolute -end-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F5CC07] px-1 text-xs font-bold text-slate-900">{{ cartStore.itemCount }}</span>
        </NuxtLink>
      </div>

      <div class="flex items-center gap-2 md:hidden">
        <NuxtLink
          :to="localePath('/cart')"
          :aria-label="t('nav.cart')"
          class="relative flex h-11 w-11 items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ShoppingCart class="h-6 w-6" aria-hidden="true" />
          <span v-if="cartStore.itemCount" class="absolute -end-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F5CC07] px-1 text-xs font-bold text-slate-900">{{ cartStore.itemCount }}</span>
        </NuxtLink>
        <button
          type="button"
          class="flex h-11 w-11 items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
          :aria-label="mobileOpen ? 'Close menu' : 'Open menu'"
          :aria-expanded="mobileOpen"
          @click="mobileOpen = !mobileOpen"
        >
          <X v-if="mobileOpen" class="h-6 w-6" aria-hidden="true" />
          <Menu v-else class="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
    </nav>

    <div v-if="mobileOpen" class="border-t px-4 py-3 md:hidden" :style="{ borderColor: 'var(--color-border)' }">
      <ul class="flex flex-col gap-1">
        <li v-for="link in links.slice(0, 1)" :key="link.label">
          <NuxtLink
            :to="link.to"
            class="block rounded-md px-3 py-3 text-base font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
            @click="mobileOpen = false"
          >
            {{ link.label }}
          </NuxtLink>
        </li>
        <li>
          <NuxtLink
            :to="productsHref"
            class="block rounded-md px-3 py-3 text-base font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
            @click="mobileOpen = false"
          >
            {{ t('nav.products') }}
          </NuxtLink>
          <ul class="ms-3 border-s ps-2" :style="{ borderColor: 'var(--color-border)' }">
            <li>
              <NuxtLink :to="productsHref" class="block rounded-md px-3 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" @click="mobileOpen = false">
                {{ t('nav.allProducts') }}
              </NuxtLink>
            </li>
            <li v-for="c in navCats?.categories || []" :key="c.slug">
              <NuxtLink :to="`${productsHref}/${c.slug}`" class="block rounded-md px-3 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" @click="mobileOpen = false">
                {{ locale === 'ar' ? c.nameAr : c.nameEn }}
              </NuxtLink>
            </li>
          </ul>
        </li>
        <li v-for="link in links.slice(1)" :key="link.label">
          <NuxtLink
            :to="link.to"
            class="block rounded-md px-3 py-3 text-base font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
            @click="mobileOpen = false"
          >
            {{ link.label }}
          </NuxtLink>
        </li>
      </ul>
      <div class="mt-2 flex items-center gap-2 border-t pt-3" :style="{ borderColor: 'var(--color-border)' }">
        <button
          type="button"
          class="flex h-11 flex-1 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold"
          :style="{ borderColor: 'var(--color-border)' }"
          @click="toggleLocale"
        >
          <Globe class="h-5 w-5" aria-hidden="true" />
          {{ locale === 'ar' ? 'English' : 'العربية' }}
        </button>
        <button
          type="button"
          class="flex h-11 flex-1 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold"
          :style="{ borderColor: 'var(--color-border)' }"
          @click="toggleTheme"
        >
          <Moon v-if="!isDark" class="h-5 w-5" aria-hidden="true" />
          <Sun v-else class="h-5 w-5" aria-hidden="true" />
          {{ isDark ? t('common.light') : t('common.dark') }}
        </button>
      </div>
    </div>
  </header>
</template>
