<script setup lang="ts">
const { t } = useI18n()

const email = ref('')
const password = ref('')
const pending = ref(false)
const errorMessage = ref('')

async function login() {
  if (pending.value) return
  pending.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/admin/auth/login', {
      method: 'POST',
      body: { email: email.value, password: password.value },
    })
    await navigateTo('/admin')
  }
  catch (e) {
    const status = (e as { response?: { status?: number } })?.response?.status
    errorMessage.value = status === 401
      ? 'Invalid email or password'
      : 'Something went wrong. Please try again.'
  }
  finally {
    pending.value = false
  }
}

useHead(() => ({ title: `Admin login — ${t('brand.name')}` }))
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-[#F8F9FA] px-4 dark:bg-[#0B1520]">
    <div class="w-full max-w-[400px]">
      <div class="mb-6 flex flex-col items-center gap-2 text-center">
        <img src="/logo.png" alt="Mango Electronics" class="h-14 w-14 rounded object-contain" width="56" height="56" />
        <p class="font-heading text-xl font-bold">{{ t('brand.name') }}</p>
      </div>

      <form
        class="rounded-lg border bg-white p-6 shadow-sm dark:bg-[#162032]"
        :style="{ borderColor: 'var(--color-border)' }"
        @submit.prevent="login"
      >
        <div
          v-if="errorMessage"
          role="alert"
          class="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {{ errorMessage }}
        </div>

        <label class="mb-4 block">
          <span class="mb-1 block text-sm font-medium">Email</span>
          <input
            v-model="email"
            type="email"
            required
            autocomplete="username"
            class="h-10 w-full rounded border bg-transparent px-3 text-base focus:outline-none focus:ring-2 focus:ring-[#2B71AE]"
            :style="{ borderColor: 'var(--color-border)' }"
          />
        </label>

        <label class="mb-5 block">
          <span class="mb-1 block text-sm font-medium">Password</span>
          <input
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            class="h-10 w-full rounded border bg-transparent px-3 text-base focus:outline-none focus:ring-2 focus:ring-[#2B71AE]"
            :style="{ borderColor: 'var(--color-border)' }"
          />
        </label>

        <button
          type="submit"
          :disabled="pending"
          class="h-10 w-full rounded bg-[#2B71AE] font-semibold text-white transition hover:bg-[#285E8E] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ pending ? '…' : 'Log in' }}
        </button>
      </form>
    </div>
  </div>
</template>
