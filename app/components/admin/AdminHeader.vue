<script setup lang="ts">
import { ExternalLink, Globe, Menu, Moon, Sun } from 'lucide-vue-next'

defineEmits<{
  (e: 'toggle-sidebar'): void
}>()

const { t, locale, setLocale } = useI18n()
const localePath = useLocalePath()
const colorMode = useColorMode()
const { data } = useAdminSession()

const isDark = computed(() => colorMode.value === 'dark')

function toggleTheme() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}

function toggleLocale() {
  setLocale(locale.value === 'ar' ? 'en' : 'ar')
}

const userInitials = computed(() => {
  const name = data.value?.user.name || 'Admin'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
})
</script>

<template>
  <header
    class="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-white/95 px-4 backdrop-blur transition-colors lg:px-8 dark:bg-[#0B1520]/95"
    :style="{ borderColor: 'var(--color-border)' }"
  >
    <div class="flex items-center gap-3">
      <!-- Mobile menu trigger -->
      <button
        type="button"
        class="flex h-10 w-10 items-center justify-center rounded-md border text-slate-600 transition-colors hover:bg-slate-100 lg:hidden dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        :aria-label="locale === 'ar' ? 'فتح القائمة الجانبية' : 'Open sidebar'"
        @click="$emit('toggle-sidebar')"
      >
        <Menu class="h-5 w-5" aria-hidden="true" />
      </button>

      <!-- Store link shortcut -->
      <NuxtLink
        :to="localePath('/')"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-[#2B71AE] hover:text-[#2B71AE] dark:border-slate-800 dark:text-slate-300 dark:hover:border-[#F5CC07] dark:hover:text-[#F5CC07]"
        :title="locale === 'ar' ? 'عرض المتجر في نافذة جديدة' : 'Open public store in a new tab'"
      >
        <ExternalLink class="h-3.5 w-3.5" aria-hidden="true" />
        <span class="hidden sm:inline">{{ locale === 'ar' ? 'عرض المتجر' : 'View Store' }}</span>
      </NuxtLink>
    </div>

    <div class="flex items-center gap-2">
      <!-- Language toggle -->
      <button
        type="button"
        :aria-label="t('common.toggleLanguage')"
        :title="t('common.toggleLanguage')"
        class="flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        @click="toggleLocale"
      >
        <Globe class="h-3.5 w-3.5" aria-hidden="true" />
        <span>{{ locale === 'ar' ? 'English' : 'عربي' }}</span>
      </button>

      <!-- Theme toggle -->
      <button
        type="button"
        :aria-label="t('common.toggleTheme')"
        :title="t('common.toggleTheme')"
        class="flex h-9 w-9 items-center justify-center rounded-md border text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        @click="toggleTheme"
      >
        <Moon v-if="!isDark" class="h-4 w-4" aria-hidden="true" />
        <Sun v-else class="h-4 w-4 text-[#F5CC07]" aria-hidden="true" />
      </button>

      <div class="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

      <!-- User avatar badge -->
      <div v-if="data?.user" class="hidden sm:flex items-center gap-2.5">
        <div class="flex h-8 w-8 items-center justify-center rounded-full bg-[#2B71AE] text-xs font-bold text-white shadow-sm">
          {{ userInitials }}
        </div>
        <div class="text-xs leading-tight">
          <p class="font-semibold text-slate-800 dark:text-slate-200">{{ data.user.name }}</p>
          <p class="text-[10px] text-slate-500 dark:text-slate-400">
            {{ data.user.isSuper ? (locale === 'ar' ? 'مدير عام' : 'Super Admin') : (locale === 'ar' ? 'مدير' : 'Admin') }}
          </p>
        </div>
      </div>
    </div>
  </header>
</template>
