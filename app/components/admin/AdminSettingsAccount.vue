<script setup lang="ts">
import { KeyRound, Loader2, LogOut, ShieldCheck, UserRound } from 'lucide-vue-next'

const { locale } = useI18n()
const { data: sessionData } = useAdminSession()
const toast = useAdminToast()
const { confirm: confirmDialog } = useAdminConfirm()

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
  && form.newPassword !== form.currentPassword,
))

const passwordMismatch = computed(() =>
  Boolean(form.confirmPassword && form.newPassword !== form.confirmPassword),
)

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
  const confirmed = await confirmDialog({
    title: isDe.value ? 'Überall abmelden?' : 'Sign out everywhere?',
    message: isDe.value
      ? 'Alle Sitzungen, auch diese, werden beendet. Sie müssen sich erneut anmelden.'
      : 'All sessions, including this one, will be ended. You will need to sign in again.',
    confirmLabel: isDe.value ? 'Überall abmelden' : 'Sign out everywhere',
    danger: true,
  })
  if (!confirmed) return
  revoking.value = true
  try {
    await $fetch('/api/admin/auth/revoke-sessions', { method: 'POST' })
    await adminLogout()
  }
  finally {
    revoking.value = false
  }
}

const roleLabel = computed(() => {
  const role = sessionData.value?.user?.role || '—'
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()
})
</script>

<template>
  <div class="space-y-5">
    <div
      v-if="error"
      role="alert"
      class="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
    >
      {{ error }}
    </div>

    <!-- Profile -->
    <section class="rounded-xl border border-border bg-surface p-5 sm:p-6">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="flex items-center gap-2 font-heading text-lg font-bold text-text">
            <UserRound class="h-5 w-5" aria-hidden="true" />
            {{ isDe ? 'Profil' : 'Profile' }}
          </h2>
          <p class="mt-1 text-xs text-muted">
            {{ isDe ? 'Mit diesem Konto sind Sie aktuell angemeldet.' : 'You are currently signed in with this account.' }}
          </p>
        </div>
        <span
          v-if="sessionData?.user?.isSuper"
          class="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary dark:bg-primary/20 dark:text-neutral-200"
        >
          {{ isDe ? 'Super-Admin' : 'Super admin' }}
        </span>
      </div>
      <dl class="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted">{{ isDe ? 'Name' : 'Name' }}</dt>
          <dd class="mt-0.5 truncate text-sm font-semibold text-text">{{ sessionData?.user?.name || '—' }}</dd>
        </div>
        <div>
          <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted">{{ isDe ? 'E-Mail' : 'Email' }}</dt>
          <dd class="mt-0.5 truncate text-sm text-text" dir="ltr">{{ sessionData?.user?.email || '—' }}</dd>
        </div>
        <div>
          <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted">{{ isDe ? 'Rolle' : 'Role' }}</dt>
          <dd class="mt-0.5 text-sm font-semibold text-text">{{ roleLabel }}</dd>
        </div>
      </dl>
    </section>

    <!-- Password -->
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
          <input v-model="form.currentPassword" type="password" autocomplete="current-password" required class="h-11 w-full rounded-md border bg-white px-3 text-sm focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }" />
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-semibold">{{ isDe ? 'Neues Passwort' : 'New password' }}</span>
          <input v-model="form.newPassword" type="password" autocomplete="new-password" minlength="12" required class="h-11 w-full rounded-md border bg-white px-3 text-sm focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:bg-[#0B1520]" :style="{ borderColor: 'var(--color-border)' }" />
          <span class="mt-1 block text-[11px] text-muted">{{ isDe ? 'Mindestens 12 Zeichen.' : 'At least 12 characters.' }}</span>
        </label>
        <label class="block">
          <span class="mb-1 block text-xs font-semibold">{{ isDe ? 'Neues Passwort wiederholen' : 'Repeat new password' }}</span>
          <input
            v-model="form.confirmPassword"
            type="password"
            autocomplete="new-password"
            minlength="12"
            required
            :aria-invalid="passwordMismatch"
            :aria-describedby="passwordMismatch ? 'account-password-mismatch' : 'account-password-hint'"
            class="h-11 w-full rounded-md border bg-white px-3 text-sm focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:bg-[#0B1520]"
            :style="{ borderColor: passwordMismatch ? '#e11d48' : 'var(--color-border)' }"
          />
          <span v-if="passwordMismatch" id="account-password-mismatch" class="mt-1 block text-[11px] font-medium text-rose-600 dark:text-rose-400">
            {{ isDe ? 'Die Passwörter stimmen nicht überein.' : 'The passwords do not match.' }}
          </span>
          <span v-else id="account-password-hint" class="mt-1 block text-[11px] text-muted">
            {{ isDe ? 'Beide Eingaben müssen identisch sein.' : 'Both entries must match.' }}
          </span>
        </label>
        <div class="sm:col-span-2">
          <button
            type="submit"
            :disabled="saving"
            class="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-semibold text-on-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 dark:focus-visible:ring-offset-neutral-900"
          >
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" aria-hidden="true" />
            {{ saving ? (isDe ? 'Speichern…' : 'Saving…') : (isDe ? 'Passwort ändern' : 'Change password') }}
          </button>
        </div>
      </form>
    </section>

    <!-- Sessions -->
    <section class="rounded-xl border border-border bg-surface p-5 sm:p-6">
      <h2 class="flex items-center gap-2 font-heading text-lg font-bold text-text">
        <ShieldCheck class="h-5 w-5" aria-hidden="true" />
        {{ isDe ? 'Angemeldete Geräte' : 'Signed-in devices' }}
      </h2>
      <p class="mt-1 text-xs text-muted" role="status">
        {{ isDe ? 'Aktuelle Sitzung:' : 'Current session:' }} <span class="font-semibold text-text" dir="ltr">{{ sessionData?.user?.email || '—' }}</span>
      </p>
      <p class="mt-2 text-xs text-muted">
        {{ isDe
          ? 'Melden Sie andere Geräte ab, wenn Sie ein Gerät nicht mehr erkennen. „Überall abmelden“ beendet auch diese Sitzung.'
          : 'Sign out other devices you no longer recognize. “Sign out everywhere” also ends this session.' }}
      </p>
      <div class="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          :disabled="revoking"
          class="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-white px-4 text-xs font-semibold text-text hover:bg-border/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 dark:bg-[#0B1520] dark:focus-visible:ring-offset-neutral-900"
          @click="revokeOtherSessions"
        >
          {{ isDe ? 'Andere Sitzungen abmelden' : 'Sign out other sessions' }}
        </button>
        <button
          type="button"
          :disabled="revoking"
          class="inline-flex h-11 items-center gap-2 rounded-md border border-rose-300 px-4 text-xs font-semibold text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 disabled:opacity-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40 dark:focus-visible:ring-offset-neutral-900"
          @click="signOutEverywhere"
        >
          <LogOut class="h-4 w-4" aria-hidden="true" />
          {{ isDe ? 'Überall abmelden' : 'Sign out everywhere' }}
        </button>
      </div>
    </section>
  </div>
</template>
