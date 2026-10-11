<script setup lang="ts">
import { Globe, Menu, Moon, Sun } from 'lucide-vue-next'

defineEmits<{
  (e: 'toggle-sidebar'): void
}>()

const { t, locale, setLocale } = useI18n()
const config = useRuntimeConfig()
const isLaunchMode = computed(() => !!config.public.launchMode)
const colorMode = useColorMode()
const { data } = useAdminSession()

const isDark = computed(() => colorMode.value === 'dark')

function toggleTheme() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}

function toggleLocale() {
  setLocale(locale.value === 'de' ? 'en' : 'de')
}

const userInitials = computed(() => {
  const name = data.value?.user.name || 'Admin'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
})
</script>

<template>
  <header
    class="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-white/95 px-4 backdrop-blur transition-colors lg:px-8 dark:bg-[#050808]/95 border-border dark:border-[#303636]"
  >
    <div class="flex items-center gap-3">
      <!-- Mobile menu trigger -->
      <button
        type="button"
        class="flex h-10 w-10 items-center justify-center rounded-[2px] border text-slate-600 transition-colors hover:bg-slate-100 lg:hidden dark:border-[#303636] dark:text-slate-300 dark:hover:bg-[#121616]"
        :aria-label="locale === 'de' ? 'Seitenleiste öffnen' : 'Open sidebar'"
        @click="$emit('toggle-sidebar')"
      >
        <Menu class="h-5 w-5" aria-hidden="true" />
      </button>
    </div>

    <div class="flex items-center gap-2">
      <!-- Notification center -->
      <AdminNotificationBell />

      <!-- Latest activity -->
      <AdminActivityBell />

      <!-- Language toggle (Visible in dev mode, hidden in launch mode) -->
      <button
        v-if="!isLaunchMode"
        type="button"
        :aria-label="t('common.toggleLanguage')"
        :title="t('common.toggleLanguage')"
        class="flex h-9 items-center gap-1.5 rounded-[2px] border border-border px-2.5 text-xs font-medium text-brand-black transition-colors hover:bg-black/5 dark:border-[#303636] dark:text-white dark:hover:bg-white/10"
        @click="toggleLocale"
      >
        <Globe class="h-3.5 w-3.5" aria-hidden="true" />
        <span class="tracking-wider uppercase">{{ locale === 'de' ? 'EN' : 'DE' }}</span>
      </button>

      <!-- Theme toggle -->
      <button
        type="button"
        :aria-label="t('common.toggleTheme')"
        :title="t('common.toggleTheme')"
        class="flex h-9 w-9 items-center justify-center rounded-[2px] border border-border text-brand-black transition-colors hover:bg-black/5 dark:border-[#303636] dark:text-white dark:hover:bg-white/10"
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

      <div class="h-4 w-[1px] bg-border dark:bg-[#303636] mx-1 hidden sm:block" />

      <!-- User avatar badge -->
      <div v-if="data?.user" class="hidden sm:flex items-center gap-2.5">
        <div class="flex h-8 w-8 items-center justify-center rounded-[2px] bg-[#050808] dark:bg-white text-xs font-medium text-white dark:text-[#050808]">
          {{ userInitials }}
        </div>
        <div class="text-xs leading-tight">
          <p class="font-medium text-brand-black dark:text-white">{{ data.user.name }}</p>
          <p class="text-[10px] text-muted dark:text-[#A6A6A6]">
            {{ data.user.isSuper ? (locale === 'de' ? 'Hauptadministrator' : 'Super Admin') : (data.user.role === 'STAFF' ? (locale === 'de' ? 'Mitarbeiter' : 'Staff') : (locale === 'de' ? 'Administrator' : 'Admin')) }}
          </p>
        </div>
      </div>
    </div>
  </header>
</template>
