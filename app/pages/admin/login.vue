<script setup lang="ts">
import { ArrowLeft, ArrowRight, Globe, Lock, Mail, Moon, Sun } from 'lucide-vue-next'

const { t, locale, setLocale } = useI18n()
const localePath = useLocalePath()
const colorMode = useColorMode()

const email = ref('')
const password = ref('')
const pending = ref(false)
const errorMessage = ref('')

const isDark = computed(() => colorMode.value === 'dark')

function toggleTheme() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}

function toggleLocale() {
  setLocale(locale.value === 'de' ? 'en' : 'de')
}

async function login() {
  if (pending.value) return
  pending.value = true
  errorMessage.value = ''
  try {
    const res = await $fetch<{ user: { role: string, isSuper: boolean, permissions: string[] } }>('/api/admin/auth/login', {
      method: 'POST',
      body: { email: email.value, password: password.value },
    })
    await clearNuxtData('admin-session')
    await refreshNuxtData('admin-session')
    const isStaffOnly = !res.user.isSuper && res.user.role === 'STAFF' && !res.user.permissions.includes('bookings.view_all')
    if (isStaffOnly) {
      await navigateTo({ path: localePath('/admin/appointments'), query: { tab: 'my-bookings' } })
    }
    else {
      await navigateTo(localePath('/admin'))
    }
  }
  catch (e) {
    const status = (e as { response?: { status?: number } })?.response?.status
    const isDe = locale.value === 'de'
    if (status === 401) {
      errorMessage.value = isDe ? 'Ungültige E-Mail-Adresse oder Passwort.' : 'Invalid email or password.'
    }
    else if (status === 429) {
      errorMessage.value = isDe ? 'Zu viele Versuche. Bitte warten Sie eine Minute.' : 'Too many attempts. Please wait a minute and try again.'
    }
    else {
      errorMessage.value = isDe ? 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.' : 'Something went wrong. Please try again.'
    }
  }
  finally {
    pending.value = false
  }
}

useHead(() => ({ title: `Admin Login | ${t('brand.name')}` }))
</script>

<template>
  <div class="flex min-h-screen flex-col justify-between bg-surface px-4 py-8 dark:bg-bg">
    <!-- Top Bar: Back to Store & Toggles -->
    <div class="mx-auto flex w-full max-w-md items-center justify-between">
      <NuxtLink
        :to="localePath('/')"
        class="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-brand-black dark:text-[#A6A6A6] dark:hover:text-white"
      >
        <ArrowLeft class="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
        <span>{{ locale === 'de' ? 'Zurück zum Studio' : 'Back to Studio' }}</span>
      </NuxtLink>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="flex h-11 items-center gap-1 rounded-[2px] border border-border px-3 text-xs font-medium text-brand-black transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current dark:border-[#303636] dark:text-white dark:hover:bg-white/10"
          :aria-label="t('nav.switchLanguage')"
          @click="toggleLocale"
        >
          <Globe class="h-3.5 w-3.5" aria-hidden="true" />
          <span class="tracking-wider uppercase">{{ locale === 'de' ? 'EN' : 'DE' }}</span>
        </button>

        <button
          type="button"
          class="flex h-11 w-11 items-center justify-center rounded-[2px] border border-border text-brand-black transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current dark:border-[#303636] dark:text-white dark:hover:bg-white/10"
          :aria-label="t('common.toggleTheme')"
          :aria-pressed="isDark"
          @click="toggleTheme"
        >
          <ClientOnly>
            <Moon v-if="!isDark" class="h-3.5 w-3.5" aria-hidden="true" />
            <Sun v-else class="h-3.5 w-3.5 text-white" aria-hidden="true" />
            <template #fallback>
              <Moon class="h-3.5 w-3.5" aria-hidden="true" />
            </template>
          </ClientOnly>
        </button>
      </div>
    </div>

    <!-- Login Card -->
    <div class="mx-auto w-full max-w-md my-auto">
      <div class="mb-6 flex flex-col items-center gap-2 text-center">
        <img src="/brand/logo-black-transparent-small.png" alt="Amir" width="120" height="40" class="h-10 w-auto object-contain dark:hidden" />
        <img src="/brand/logo-white-transparent-small.png" alt="Amir" width="120" height="40" class="h-10 w-auto object-contain hidden dark:block" />
        <h1 class="text-xs font-medium text-muted uppercase tracking-wider dark:text-[#A6A6A6]">
          {{ locale === 'de' ? 'Verwaltung' : 'Administration' }}
        </h1>
      </div>

      <form
        class="rounded-[2px] border bg-white p-6 shadow-xs dark:bg-[#121616] border-border dark:border-[#303636]"
        @submit.prevent="login"
      >
        <!-- Error Alert -->
        <div
          v-if="errorMessage"
          role="alert"
          class="mb-4 rounded-[2px] border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
        >
          {{ errorMessage }}
        </div>

        <div class="space-y-4">
          <!-- Email Field -->
          <label class="block">
            <span class="mb-1.5 block text-xs font-medium text-brand-black dark:text-white">
              {{ locale === 'de' ? 'E-Mail-Adresse' : 'Email Address' }}
            </span>
            <div class="relative">
              <Mail class="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                v-model="email"
                type="email"
                name="email"
                required
                autocomplete="username"
                spellcheck="false"
                placeholder="admin@amir.com…"
                class="h-11 w-full rounded-[2px] border bg-white ps-9 pe-3 text-xs text-brand-black transition-colors placeholder:text-muted focus:border-brand-black focus:outline-none focus:ring-1 focus:ring-brand-black dark:bg-[#050808] dark:text-white dark:border-[#303636] dark:focus:border-white"
              />
            </div>
          </label>

          <!-- Password Field -->
          <label class="block">
            <span class="mb-1.5 block text-xs font-medium text-brand-black dark:text-white">
              {{ locale === 'de' ? 'Passwort' : 'Password' }}
            </span>
            <div class="relative">
              <Lock class="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                v-model="password"
                type="password"
                name="password"
                required
                autocomplete="current-password"
                spellcheck="false"
                placeholder="••••••••"
                class="h-11 w-full rounded-[2px] border bg-white ps-9 pe-3 text-xs text-brand-black transition-colors placeholder:text-muted focus:border-brand-black focus:outline-none focus:ring-1 focus:ring-brand-black dark:bg-[#050808] dark:text-white dark:border-[#303636] dark:focus:border-white"
              />
            </div>
          </label>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="pending"
          :aria-busy="pending"
          class="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-[2px] bg-[#050808] dark:bg-white text-xs font-medium tracking-wider uppercase text-white dark:text-[#050808] transition-colors hover:bg-[#262626] dark:hover:bg-[#E5E5E5] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span v-if="pending" class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current opacity-50 border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
          <span>{{ pending ? (locale === 'de' ? 'Anmeldung…' : 'Authenticating…') : (locale === 'de' ? 'Anmelden' : 'Sign In') }}</span>
        </button>
      </form>
    </div>

    <!-- Footer Copyright -->
    <div class="text-center text-[11px] text-neutral-400">
      &copy; {{ new Date().getFullYear() }} {{ t('brand.name') }}. All rights reserved.
    </div>
  </div>
</template>
