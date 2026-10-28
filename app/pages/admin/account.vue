<script setup lang="ts">
import { KeyRound, Loader2, LogOut, ShieldCheck } from 'lucide-vue-next'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t, locale } = useI18n()
const { data: sessionData } = useAdminSession()
const toast = useAdminToast()

const isDe = computed(() => locale.value === 'de')

const form = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const saving = ref(false)
const revoking = ref(false)
const error = ref('')

const canSubmit = computed(() => Boolean(
  form.currentPassword
  && form.newPassword.length >= 12
  && form.newPassword === form.confirmPassword
  && form.newPassword !== form.currentPassword
))

async function changePassword() {
  error.value = ''
  if (!canSubmit.value) {
    error.value = form.newPassword.length < 12
      ? (isDe.value ? 'Das neue Passwort muss mindestens 12 Zeichen lang sein.' : 'The new password must be at least 12 characters long.')
      : (isDe.value ? 'Die Passwörter stimmen nicht überein.' : 'The passwords do not match.')
    return
  }
  saving.value = true
  try {
    await $fetch('/api/admin/auth/password', {
      method: 'POST',
      body: {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      },
    })
    form.currentPassword = ''
    form.newPassword = ''
    form.confirmPassword = ''
    toast.success(
      isDe.value ? 'Passwort geändert' : 'Password changed',
      isDe.value ? 'Alle anderen Sitzungen wurden abgemeldet.' : 'All other sessions have been signed out.',
    )
  }
  catch (e: any) {
    error.value = e?.data?.message || e?.data?.statusMessage || (isDe.value ? 'Passwort konnte nicht geändert werden.' : 'Could not change the password.')
  }
  finally {
    saving.value = false
  }
}

async function revokeOtherSessions() {
  revoking.value = true
  error.value = ''
  try {
    const res = await $fetch<{ revoked: number }>('/api/admin/auth/revoke-sessions', { method: 'POST' })
    toast.success(
      isDe.value ? 'Sitzungen beendet' : 'Sessions revoked',
      isDe.value ? `${res.revoked} andere Sitzung(en) wurden abgemeldet.` : `${res.revoked} other session(s) were signed out.`,
    )
  }
  catch (e: any) {
    error.value = e?.data?.message || e?.data?.statusMessage || (isDe.value ? 'Sitzungen konnten nicht beendet werden.' : 'Could not revoke sessions.')
  }
  finally {
    revoking.value = false
  }
}

async function signOutEverywhere() {
  revoking.value = true
  try {
    await $fetch('/api/admin/auth/revoke-sessions', { method: 'POST' })
    await adminLogout()
  }
  finally {
    revoking.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
    <header>
      <h1 class="font-heading text-2xl font-extrabold text-text">{{ t('admin.account') }}</h1>
      <p class="mt-1 text-sm text-muted">
        {{ isDe ? 'Passwort und angemeldete Geräte verwalten.' : 'Manage your password and signed-in devices.' }}
      </p>
    </header>

    <div
      v-if="error"
      role="alert"
      class="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
    >
      {{ error }}
    </div>

    <section class="rounded-xl border border-border bg-surface p-5 sm:p-6">
      <h2 class="flex items-center gap-2 font-heading text-lg font-bold text-text">
        <KeyRound class="h-5 w-5" aria-hidden="true" />
        {{ isDe ? 'Passwort ändern' : 'Change password' }}
      </h2>
      <p class="mt-1 text-xs text-muted">
        {{ isDe ? 'Mindestens 12 Zeichen. Nach der Änderung werden alle anderen Sitzungen abgemeldet.' : 'At least 12 characters. All other sessions are signed out after the change.' }}
      </p>

      <form class="mt-5 grid gap-4 sm:grid-cols-2" @submit.prevent="changePassword">
        <label class="block sm:col-span-2">
          <span class="mb-1 block text-xs font-semibold">{{ isDe ? 'Aktuelles Passwort' : 'Current password' }}</span>
          <input v-model="form.currentPassword" type="password" autocomplete="current-password" required class="h-11 w-full rounded-md border bg-white px-3 text-sm focus:border-primary focus:outline-none dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }" />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-semibold">{{ isDe ? 'Neues Passwort' : 'New password' }}</span>
          <input v-model="form.newPassword" type="password" autocomplete="new-password" minlength="12" required class="h-11 w-full rounded-md border bg-white px-3 text-sm focus:border-primary focus:outline-none dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }" />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-semibold">{{ isDe ? 'Neues Passwort wiederholen' : 'Repeat new password' }}</span>
          <input v-model="form.confirmPassword" type="password" autocomplete="new-password" minlength="12" required class="h-11 w-full rounded-md border bg-white px-3 text-sm focus:border-primary focus:outline-none dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }" />
        </label>
        <div class="sm:col-span-2">
          <button type="submit" :disabled="saving" class="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-on-primary disabled:opacity-50">
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" aria-hidden="true" />
            {{ saving ? (isDe ? 'Speichern…' : 'Saving…') : (isDe ? 'Passwort ändern' : 'Change password') }}
          </button>
        </div>
      </form>
    </section>

    <section class="rounded-xl border border-border bg-surface p-5 sm:p-6">
      <h2 class="flex items-center gap-2 font-heading text-lg font-bold text-text">
        <ShieldCheck class="h-5 w-5" aria-hidden="true" />
        {{ isDe ? 'Angemeldete Geräte' : 'Signed-in devices' }}
      </h2>
      <p class="mt-1 text-xs text-muted">
        {{ isDe ? 'Aktuelle Sitzung:' : 'Current session:' }} {{ sessionData?.user?.email || '—' }}
      </p>
      <div class="mt-4 flex flex-wrap gap-3">
        <button type="button" :disabled="revoking" class="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-white px-4 text-xs font-semibold text-text hover:bg-border/30 disabled:opacity-50 dark:bg-[#0B1520]" @click="revokeOtherSessions">
          {{ isDe ? 'Andere Sitzungen abmelden' : 'Sign out other sessions' }}
        </button>
        <button type="button" :disabled="revoking" class="inline-flex h-11 items-center gap-2 rounded-md border border-rose-300 px-4 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40" @click="signOutEverywhere">
          <LogOut class="h-4 w-4" aria-hidden="true" />
          {{ isDe ? 'Überall abmelden' : 'Sign out everywhere' }}
        </button>
      </div>
    </section>
  </div>
</template>
