<script setup lang="ts">
import { PERMISSION_GROUPS } from '../../../shared/permissions'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t } = useI18n()

interface AdminUserRow {
  id: string
  email: string
  name: string
  isSuper: boolean
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  permissions: string[]
}

const { data, refresh } = await useAsyncData('admin-users', () =>
  $fetch<{ users: AdminUserRow[] }>('/api/admin/users'),
)

const showModal = ref(false)
const editing = ref<AdminUserRow | null>(null)
const form = reactive({ name: '', email: '', password: '', permissions: [] as string[], isActive: true })
const formError = ref('')
const saving = ref(false)

function openCreate() {
  editing.value = null
  Object.assign(form, { name: '', email: '', password: '', permissions: [], isActive: true })
  formError.value = ''
  showModal.value = true
}

function openEdit(user: AdminUserRow) {
  editing.value = user
  Object.assign(form, { name: user.name, email: user.email, password: '', permissions: [...user.permissions], isActive: user.isActive })
  formError.value = ''
  showModal.value = true
}

function togglePermission(p: string) {
  const i = form.permissions.indexOf(p)
  if (i >= 0) form.permissions.splice(i, 1)
  else form.permissions.push(p)
}

async function save() {
  saving.value = true
  formError.value = ''
  try {
    if (editing.value) {
      await $fetch(`/api/admin/users/${editing.value.id}`, {
        method: 'PUT',
        body: { name: form.name, isActive: form.isActive, permissions: form.permissions },
      })
    }
    else {
      await $fetch('/api/admin/users', {
        method: 'POST',
        body: { name: form.name, email: form.email, password: form.password, permissions: form.permissions },
      })
    }
    showModal.value = false
    await refresh()
  }
  catch (e) {
    formError.value = (e as { data?: { message?: string } })?.data?.message || 'Save failed'
  }
  finally {
    saving.value = false
  }
}

async function removeUser(user: AdminUserRow) {
  if (!confirm(`Delete ${user.name}?`)) return
  await $fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
  await refresh()
}

function formatDate(d: string | null) {
  return d ? new Date(d).toLocaleString() : '—'
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between gap-3">
      <h1 class="font-heading text-2xl font-bold">{{ t('admin.users') }}</h1>
      <button
        type="button"
        class="h-10 rounded bg-[#2B71AE] px-4 font-semibold text-white hover:bg-[#285E8E]"
        @click="openCreate"
      >
        Add user
      </button>
    </div>

    <div class="mt-6 overflow-x-auto rounded-md border" :style="{ borderColor: 'var(--color-border)' }">
      <table class="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr class="border-b text-xs uppercase tracking-wide text-slate-500" :style="{ borderColor: 'var(--color-border)' }">
            <th class="px-4 py-3 font-semibold">Name</th>
            <th class="px-4 py-3 font-semibold">Email</th>
            <th class="px-4 py-3 font-semibold">Permissions</th>
            <th class="px-4 py-3 font-semibold">Last login</th>
            <th class="px-4 py-3 font-semibold">Active</th>
            <th class="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="user in data?.users || []"
            :key="user.id"
            class="border-b last:border-0"
            :class="{ 'opacity-50': !user.isActive }"
            :style="{ borderColor: 'var(--color-border)' }"
          >
            <td class="px-4 py-3 font-medium">
              {{ user.name }}
              <span v-if="user.isSuper" class="ml-1 rounded-full bg-[#F5CC07] px-2 py-0.5 text-xs font-bold text-slate-900">super</span>
            </td>
            <td class="px-4 py-3">{{ user.email }}</td>
            <td class="px-4 py-3">{{ user.isSuper ? 'all' : user.permissions.length }}</td>
            <td class="px-4 py-3">{{ formatDate(user.lastLoginAt) }}</td>
            <td class="px-4 py-3">{{ user.isActive ? 'Yes' : 'No' }}</td>
            <td class="px-4 py-3 text-right">
              <button
                v-if="!user.isSuper"
                type="button"
                class="rounded px-2 py-1.5 font-medium text-[#2B71AE] hover:bg-slate-100 dark:hover:bg-slate-800"
                @click="openEdit(user)"
              >
                Edit
              </button>
              <button
                v-if="!user.isSuper"
                type="button"
                class="rounded px-2 py-1.5 font-medium text-red-600 hover:bg-red-50"
                @click="removeUser(user)"
              >
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!data?.users?.length" class="px-4 py-8 text-center text-sm text-slate-500">
        No admin users yet.
      </p>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div class="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-lg bg-white p-6 shadow-lg dark:bg-[#162032]">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="font-heading text-xl font-bold">{{ editing ? 'Edit user' : 'Add user' }}</h2>
          <button type="button" class="flex h-10 w-10 items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800" @click="showModal = false">✕</button>
        </div>

        <div v-if="formError" role="alert" class="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {{ formError }}
        </div>

        <label class="mb-3 block">
          <span class="mb-1 block text-sm font-medium">Full name</span>
          <input v-model="form.name" type="text" required class="h-10 w-full rounded border bg-transparent px-3" :style="{ borderColor: 'var(--color-border)' }" />
        </label>

        <label v-if="!editing" class="mb-3 block">
          <span class="mb-1 block text-sm font-medium">Email</span>
          <input v-model="form.email" type="email" required class="h-10 w-full rounded border bg-transparent px-3" :style="{ borderColor: 'var(--color-border)' }" />
        </label>

        <label v-if="!editing" class="mb-3 block">
          <span class="mb-1 block text-sm font-medium">Password (min 8 chars)</span>
          <input v-model="form.password" type="password" required minlength="8" class="h-10 w-full rounded border bg-transparent px-3" :style="{ borderColor: 'var(--color-border)' }" />
        </label>

        <label v-if="editing" class="mb-3 flex items-center gap-2 text-sm">
          <input v-model="form.isActive" type="checkbox" class="h-4 w-4" /> Active
        </label>

        <div class="mb-4">
          <p class="mb-2 text-sm font-medium">Permissions</p>
          <div v-for="(perms, group) in PERMISSION_GROUPS" :key="group" class="mb-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ group }}</p>
            <label v-for="p in perms" :key="p" class="mr-3 inline-flex items-center gap-1 text-sm">
              <input type="checkbox" :checked="form.permissions.includes(p)" class="h-4 w-4" @change="togglePermission(p)" />
              {{ p }}
            </label>
          </div>
        </div>

        <div class="flex justify-end gap-2">
          <button type="button" class="h-10 rounded border px-4" :style="{ borderColor: 'var(--color-border)' }" @click="showModal = false">Cancel</button>
          <button type="button" :disabled="saving" class="h-10 rounded bg-[#2B71AE] px-4 font-semibold text-white hover:bg-[#285E8E] disabled:opacity-50" @click="save">
            {{ saving ? '…' : 'Save' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
