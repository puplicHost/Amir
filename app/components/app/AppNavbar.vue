<script setup lang="ts">
import {
  Calendar,
  ChevronDown,
  Globe,
  Menu,
  Moon,
  Sun,
  X,
} from 'lucide-vue-next'

const { t, locale, setLocale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const colorMode = useColorMode()
const config = useRuntimeConfig()
const isLaunchMode = computed(() => !!config.public.launchMode)

const mobileOpen = ref(false)
const productsOpen = ref(false)
const drawerRef = ref<HTMLElement | null>(null)

const isDark = computed(() => colorMode.value === 'dark')

function toggleTheme() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}

function toggleLocale() {
  setLocale(locale.value === 'de' ? 'en' : 'de')
}

// Fetch categories for the products dropdown
const { data: catData } = await useAsyncData('navbar-categories', () =>
  $fetch<{ categories: { id: string, slug: string, nameAr: string, nameEn: string }[] }>('/api/categories'),
)
const categories = computed(() => catData.value?.categories || [])

function isActive(path: string, exact = false): boolean {
  const current = route.path.replace(/^\/(en|de)(?=\/|$)/, '') || '/'
  const target = path.replace(/^\/(en|de)(?=\/|$)/, '') || '/'
  if (exact) return current === target
  return current === target || current.startsWith(target + '/')
}

// Close drawer on escape key & route change
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (mobileOpen.value) {
      mobileOpen.value = false
    }
    if (productsOpen.value) {
      productsOpen.value = false
    }
  }
}

watch(() => route.fullPath, () => {
  mobileOpen.value = false
  productsOpen.value = false
})

// Focus trap on mobile drawer (P2-12: Tab containment + focus restore)
watch(mobileOpen, (open) => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = open ? 'hidden' : ''
  }
})
useFocusTrap(drawerRef, mobileOpen, { onEscape: () => { mobileOpen.value = false } })

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeydown)
    document.body.style.overflow = ''
  }
})

// Mobile bottom bar conditions:
// 1. Not an admin route
// 2. Not a booking page (/booking/*)
// 3. Not while consent banner is actively open
const { isDecided, bannerOpen } = useCookieConsent()
const isBookingRoute = computed(() => {
  const p = route.path.replace(/^\/(en|de)(?=\/|$)/, '')
  return p.startsWith('/booking')
})
const isAdminRoute = computed(() => {
  const p = route.path.replace(/^\/(en|de)(?=\/|$)/, '')
  return p.startsWith('/admin')
})

const showMobileBottomBar = computed(() => {
  if (isAdminRoute.value || isBookingRoute.value) return false
  const consentOpen = !isDecided.value || bannerOpen.value
  return !consentOpen
})
</script>

<template>
  <header
    class="sticky top-0 z-40 w-full bg-white dark:bg-[#050808] border-b border-border dark:border-[#303636] transition-colors"
  >
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
      <!-- Left: Brand Logo -->
      <NuxtLink :to="localePath('/')" class="flex items-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2">
        <img
          src="/brand/logo-black-transparent-small.png"
          width="132" height="44" alt="AMIR Frisur & Kosmetik Studio"
          class="h-11 w-auto object-contain dark:hidden"
        />
        <img
          src="/brand/logo-white-transparent-small.png"
          width="132" height="44" alt="AMIR Frisur & Kosmetik Studio"
          class="h-11 w-auto object-contain hidden dark:block"
        />
      </NuxtLink>

      <!-- Center: Centered Links with 1px active underline -->
      <nav class="hidden md:flex items-center gap-8 lg:gap-10" aria-label="Main navigation">
        <NuxtLink
          :to="localePath('/')"
          class="relative py-1 text-xs lg:text-sm font-medium tracking-wider uppercase transition-colors"
          :class="[
            isActive('/', true)
              ? 'text-brand-black dark:text-white after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-brand-black dark:after:bg-white'
              : 'text-muted hover:text-brand-black dark:text-[#A6A6A6] dark:hover:text-white',
          ]"
        >
          {{ t('nav.home') }}
        </NuxtLink>

        <NuxtLink
          :to="localePath('/services')"
          class="relative py-1 text-xs lg:text-sm font-medium tracking-wider uppercase transition-colors"
          :class="[
            isActive('/services')
              ? 'text-brand-black dark:text-white after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-brand-black dark:after:bg-white'
              : 'text-muted hover:text-brand-black dark:text-[#A6A6A6] dark:hover:text-white',
          ]"
        >
          {{ t('nav.services') }}
        </NuxtLink>

        <!-- Produkte with dropdown -->
        <div class="relative" @mouseleave="productsOpen = false">
          <div class="flex items-center gap-1">
            <NuxtLink
              :to="localePath('/products')"
              class="relative py-1 text-xs lg:text-sm font-medium tracking-wider uppercase transition-colors"
              :class="[
                isActive('/products')
                  ? 'text-brand-black dark:text-white after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-brand-black dark:after:bg-white'
                  : 'text-muted hover:text-brand-black dark:text-[#A6A6A6] dark:hover:text-white',
              ]"
            >
              {{ t('nav.products') }}
            </NuxtLink>
            <button
              type="button"
              class="flex h-11 w-11 items-center justify-center text-muted hover:text-brand-black dark:text-[#A6A6A6] dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
              :aria-label="t('nav.toggleCategories')"
              :aria-expanded="productsOpen"
              aria-haspopup="true"
              @click="productsOpen = !productsOpen"
            >
              <ChevronDown class="h-3.5 w-3.5 transition-transform duration-200" :class="{ 'rotate-180': productsOpen }" aria-hidden="true" />
            </button>
          </div>

          <!-- Dropdown flyout -->
          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 translate-y-1"
          >
            <div
              v-if="productsOpen"
              class="absolute left-0 top-full mt-2 w-56 rounded-[2px] border border-border dark:border-[#303636] bg-white dark:bg-[#121616] p-2 shadow-lg z-50"
            >
              <NuxtLink
                :to="localePath('/products')"
                class="block px-3 py-2 text-xs font-medium uppercase tracking-wider text-brand-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-[2px] transition-colors"
                @click="productsOpen = false"
              >
                {{ t('nav.allProducts') }}
              </NuxtLink>
              <div class="my-1 border-t border-border dark:border-[#303636]" />
              <NuxtLink
                v-for="cat in categories"
                :key="cat.id"
                :to="localePath(`/products/${cat.slug}`)"
                class="block px-3 py-2 text-xs font-medium text-muted hover:text-brand-black dark:text-[#A6A6A6] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-[2px] transition-colors"
                @click="productsOpen = false"
              >
                {{ cat.nameEn || cat.nameAr }}
              </NuxtLink>
            </div>
          </Transition>
        </div>

        <NuxtLink
          :to="localePath('/about')"
          class="relative py-1 text-xs lg:text-sm font-medium tracking-wider uppercase transition-colors"
          :class="[
            isActive('/about')
              ? 'text-brand-black dark:text-white after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-brand-black dark:after:bg-white'
              : 'text-muted hover:text-brand-black dark:text-[#A6A6A6] dark:hover:text-white',
          ]"
        >
          {{ t('nav.about') }}
        </NuxtLink>

        <NuxtLink
          :to="localePath('/contact')"
          class="relative py-1 text-xs lg:text-sm font-medium tracking-wider uppercase transition-colors"
          :class="[
            isActive('/contact')
              ? 'text-brand-black dark:text-white after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-brand-black dark:after:bg-white'
              : 'text-muted hover:text-brand-black dark:text-[#A6A6A6] dark:hover:text-white',
          ]"
        >
          {{ t('nav.contact') }}
        </NuxtLink>
      </nav>

      <!-- Right: Action Utilities -->
      <div class="hidden md:flex items-center gap-3">
        <!-- Language toggle (Visible in dev mode only) -->
        <button
          v-if="!isLaunchMode"
          type="button"
          :aria-label="t('common.toggleLanguage')"
          :title="t('common.toggleLanguage')"
          class="flex h-11 items-center gap-1.5 rounded-[2px] border border-border dark:border-[#303636] px-2.5 text-xs font-medium tracking-wider uppercase text-brand-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          @click="toggleLocale"
        >
          <Globe class="h-3.5 w-3.5" aria-hidden="true" />
          <span>{{ locale === 'de' ? 'EN' : 'DE' }}</span>
        </button>

        <!-- Theme toggle -->
        <button
          type="button"
          :aria-label="t('common.toggleTheme')"
          :title="t('common.toggleTheme')"
          class="flex h-11 w-9 items-center justify-center rounded-[2px] border border-border dark:border-[#303636] text-brand-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          @click="toggleTheme"
        >
          <ClientOnly>
            <Moon v-if="!isDark" class="h-4 w-4" aria-hidden="true" />
            <Sun v-else class="h-4 w-4 text-white" aria-hidden="true" />
            <template #fallback>
              <Moon class="h-4 w-4" aria-hidden="true" />
            </template>
          </ClientOnly>
        </button>

        <!-- Book appointment CTA -->
        <Button
          variant="solid"
          size="sm"
          :to="localePath('/services')"
          class="ml-2"
        >
          <Calendar class="h-3.5 w-3.5" aria-hidden="true" />
          <span>{{ t('nav.bookAppointment') }}</span>
        </Button>
      </div>

      <!-- Mobile Hamburger Button (44px target) -->
      <div class="flex items-center gap-2 md:hidden">
        <button
          v-if="!isLaunchMode"
          type="button"
          class="flex h-11 min-w-11 items-center justify-center rounded-[2px] border border-border dark:border-[#303636] px-2 text-xs font-medium tracking-wider uppercase text-brand-black dark:text-white"
          :aria-label="t('nav.switchLanguage')"
          @click="toggleLocale"
        >
          {{ locale === 'de' ? 'EN' : 'DE' }}
        </button>

        <button
          type="button"
          class="flex h-11 w-11 items-center justify-center rounded-[2px] border border-border dark:border-[#303636] text-brand-black dark:text-white"
          :aria-label="mobileOpen ? t('nav.closeMenu') : t('nav.openMenu')"
          :aria-expanded="mobileOpen"
          @click="mobileOpen = !mobileOpen"
        >
          <Menu v-if="!mobileOpen" class="h-5 w-5" aria-hidden="true" />
          <X v-else class="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>

    <!-- Mobile Full-Height Drawer with Focus Trap -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-x-full"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 translate-x-full"
      >
        <div
          v-if="mobileOpen"
          ref="drawerRef"
          class="fixed inset-0 z-50 flex flex-col bg-white dark:bg-[#050808] text-brand-black dark:text-white"
          role="dialog"
          aria-modal="true"
          :aria-label="t('nav.mobileNav')"
          @keydown.escape="mobileOpen = false"
        >
          <!-- Drawer Header -->
          <div class="flex h-16 items-center justify-between border-b border-border dark:border-[#303636] px-6">
            <img
              src="/brand/logo-black-transparent-small.png"
              width="132" height="44" alt="AMIR"
              class="h-11 w-auto object-contain dark:hidden"
            />
            <img
              src="/brand/logo-white-transparent-small.png"
              width="132" height="44" alt="AMIR"
              class="h-11 w-auto object-contain hidden dark:block"
            />
            <button
              type="button"
              class="flex h-11 w-11 items-center justify-center rounded-[2px] border border-border dark:border-[#303636] text-brand-black dark:text-white"
              :aria-label="t('nav.closeMenu')"
              @click="mobileOpen = false"
            >
              <X class="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <!-- Drawer Navigation Links (44px+ touch targets) -->
          <div class="flex-1 overflow-y-auto px-6 py-8 space-y-2">
            <NuxtLink
              :to="localePath('/')"
              class="flex h-12 items-center text-lg font-medium tracking-wider uppercase border-b border-border/50 dark:border-[#303636]/50"
              @click="mobileOpen = false"
            >
              {{ t('nav.home') }}
            </NuxtLink>

            <NuxtLink
              :to="localePath('/services')"
              class="flex h-12 items-center text-lg font-medium tracking-wider uppercase border-b border-border/50 dark:border-[#303636]/50"
              @click="mobileOpen = false"
            >
              {{ t('nav.services') }}
            </NuxtLink>

            <NuxtLink
              :to="localePath('/products')"
              class="flex h-12 items-center text-lg font-medium tracking-wider uppercase border-b border-border/50 dark:border-[#303636]/50"
              @click="mobileOpen = false"
            >
              {{ t('nav.products') }}
            </NuxtLink>

            <div v-if="categories.length" class="pl-4 space-y-1">
              <NuxtLink
                v-for="cat in categories"
                :key="cat.id"
                :to="localePath(`/products/${cat.slug}`)"
                class="flex h-11 items-center text-sm text-muted dark:text-[#A6A6A6]"
                @click="mobileOpen = false"
              >
                {{ cat.nameEn || cat.nameAr }}
              </NuxtLink>
            </div>

            <NuxtLink
              :to="localePath('/about')"
              class="flex h-12 items-center text-lg font-medium tracking-wider uppercase border-b border-border/50 dark:border-[#303636]/50"
              @click="mobileOpen = false"
            >
              {{ t('nav.about') }}
            </NuxtLink>

            <NuxtLink
              :to="localePath('/contact')"
              class="flex h-12 items-center text-lg font-medium tracking-wider uppercase border-b border-border/50 dark:border-[#303636]/50"
              @click="mobileOpen = false"
            >
              {{ t('nav.contact') }}
            </NuxtLink>
          </div>

          <!-- Drawer Footer -->
          <div class="p-6 border-t border-border dark:border-[#303636] space-y-4">
            <Button
              variant="solid"
              size="lg"
              :to="localePath('/services')"
              class="w-full"
              @click="mobileOpen = false"
            >
              <Calendar class="h-4 w-4" aria-hidden="true" />
              <span>{{ t('nav.bookAppointment') }}</span>
            </Button>

            <div class="flex items-center justify-between pt-2">
              <button
                type="button"
                class="flex h-11 items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted dark:text-[#A6A6A6]"
                @click="toggleTheme"
              >
                <Moon v-if="!isDark" class="h-4 w-4" aria-hidden="true" />
                <Sun v-else class="h-4 w-4 text-white" aria-hidden="true" />
                <span>{{ isDark ? t('common.dark') : t('common.light') }}</span>
              </button>

              <button
                v-if="!isLaunchMode"
                type="button"
                class="flex h-11 items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted dark:text-[#A6A6A6]"
                @click="toggleLocale"
              >
                <Globe class="h-4 w-4" aria-hidden="true" />
                <span>{{ locale === 'de' ? 'English (EN)' : 'Deutsch (DE)' }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Mobile Fixed Bottom "Termin buchen" Bar -->
    <Teleport to="body">
      <div
        v-if="showMobileBottomBar"
        class="md:hidden fixed bottom-0 inset-x-0 z-30 p-3 bg-white/95 dark:bg-[#050808]/95 backdrop-blur-sm border-t border-border dark:border-[#303636]"
        style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom))"
      >
        <Button
          variant="solid"
          size="md"
          :to="localePath('/services')"
          class="w-full h-12 text-xs uppercase tracking-widest font-medium"
        >
          <Calendar class="h-4 w-4" aria-hidden="true" />
          <span>{{ t('nav.bookAppointment') }}</span>
        </Button>
      </div>
      <!-- In-flow spacer so the fixed bar never covers footer content -->
      <div v-if="showMobileBottomBar" class="md:hidden h-[84px]" aria-hidden="true" />
    </Teleport>
  </header>
</template>
