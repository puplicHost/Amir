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
  setLocale(locale.value === 'ar' ? 'en' : 'ar')
}

async function login() {
  if (pending.value) return
  pending.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/admin/auth/login', {
      method: 'POST',
      body: { email: email.value, password: password.value },
    })
    await clearNuxtData('admin-session')
    await refreshNuxtData('admin-session')
    await navigateTo(localePath('/admin'))
  }
  catch (e) {
    const status = (e as { response?: { status?: number } })?.response?.status
    errorMessage.value = status === 401
      ? (locale.value === 'ar' ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : 'Invalid email or password.')
      : (locale.value === 'ar' ? 'حدث خطأ في النظام. يرجى المحاولة مرة أخرى.' : 'Something went wrong. Please try again.')
  }
  finally {
    pending.value = false
  }
}

useHead(() => ({ title: `Admin Login | ${t('brand.name')}` }))
</script>

<template>
  <div class="flex min-h-screen flex-col justify-between bg-[#F8F9FA] px-4 py-8 dark:bg-[#0B1520]">
    <!-- Top Bar: Back to Store & Toggles -->
    <div class="mx-auto flex w-full max-w-md items-center justify-between">
      <NuxtLink
        :to="localePath('/')"
        class="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-[#2B71AE] dark:text-slate-400 dark:hover:text-[#F5CC07]"
      >
        <ArrowRight v-if="locale === 'ar'" class="h-3.5 w-3.5" aria-hidden="true" />
        <ArrowLeft v-else class="h-3.5 w-3.5" aria-hidden="true" />
        <span>{{ locale === 'ar' ? 'العودة للمتجر' : 'Back to Store' }}</span>
      </NuxtLink>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="flex h-8 items-center gap-1 rounded-md border px-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          @click="toggleLocale"
        >
          <Globe class="h-3.5 w-3.5" aria-hidden="true" />
          <span>{{ locale === 'ar' ? 'English' : 'عربي' }}</span>
        </button>

        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-md border text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
          @click="toggleTheme"
        >
          <Moon v-if="!isDark" class="h-3.5 w-3.5" aria-hidden="true" />
          <Sun v-else class="h-3.5 w-3.5 text-[#F5CC07]" aria-hidden="true" />
        </button>
      </div>
    </div>

    <!-- Login Card -->
    <div class="mx-auto w-full max-w-md my-auto">
      <div class="mb-6 flex flex-col items-center gap-2 text-center">
        <img src="/logo.png" alt="Mango Electronics" class="h-12 w-12 rounded object-contain shadow-xs" width="48" height="48" />
        <h1 class="font-heading text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {{ t('brand.name') }}
        </h1>
        <p class="text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">
          {{ locale === 'ar' ? 'بوابة إدارة المنصة' : 'Administrative Console' }}
        </p>
      </div>

      <form
        class="rounded-lg border bg-white p-6 shadow-sm dark:bg-[#162032]"
        :style="{ borderColor: 'var(--color-border)' }"
        @submit.prevent="login"
      >
        <!-- Error Alert -->
        <div
          v-if="errorMessage"
          role="alert"
          class="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
        >
          {{ errorMessage }}
        </div>

        <div class="space-y-4">
          <!-- Email Field -->
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {{ locale === 'ar' ? 'البريد الإلكتروني' : 'Email Address' }}
            </span>
            <div class="relative">
              <Mail class="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                v-model="email"
                type="email"
                required
                autocomplete="username"
                placeholder="admin@mango-electronics.com"
                class="h-10 w-full rounded-md border bg-white ps-9 pe-3 text-xs text-slate-900 transition-colors placeholder:text-slate-400 focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520] dark:text-slate-100 dark:focus:border-[#2B71AE]"
                :style="{ borderColor: 'var(--color-border)' }"
              />
            </div>
          </label>

          <!-- Password Field -->
          <label class="block">
            <span class="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {{ locale === 'ar' ? 'كلمة المرور' : 'Password' }}
            </span>
            <div class="relative">
              <Lock class="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                v-model="password"
                type="password"
                required
                autocomplete="current-password"
                placeholder="••••••••"
                class="h-10 w-full rounded-md border bg-white ps-9 pe-3 text-xs text-slate-900 transition-colors placeholder:text-slate-400 focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520] dark:text-slate-100 dark:focus:border-[#2B71AE]"
                :style="{ borderColor: 'var(--color-border)' }"
              />
            </div>
          </label>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="pending"
          class="mt-6 flex h-10 w-full items-center justify-center rounded-md bg-[#2B71AE] px-4 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#285E8E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B71AE] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>{{ pending ? (locale === 'ar' ? 'جاري التحقق…' : 'Authenticating…') : (locale === 'ar' ? 'تسجيل الدخول' : 'Sign in to Admin') }}</span>
        </button>
      </form>
    </div>

    <!-- Footer Copyright -->
    <div class="text-center text-[11px] text-slate-400">
      &copy; {{ new Date().getFullYear() }} {{ t('brand.name') }}. All rights reserved.
    </div>
  </div>
</template>
