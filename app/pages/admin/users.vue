<script setup lang="ts">
import {
  Check,
  Clock,
  Key,
  Mail,
  Pencil,
  Plus,
  Shield,
  ShieldAlert,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-vue-next'
import { PERMISSION_GROUPS } from '~~/shared/permissions'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t, locale } = useI18n()

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

const { data, refresh, pending } = await useAsyncData('admin-users', () =>
  $fetch<{ users: AdminUserRow[] }>('/api/admin/users'),
)

const showModal = ref(false)
const editing = ref<AdminUserRow | null>(null)
const form = reactive({
  name: '',
  email: '',
  password: '',
  permissions: [] as string[],
  isActive: true,
})
const formError = ref('')
const saving = ref(false)
const deletingId = ref<string | null>(null)

function openCreate() {
  editing.value = null
  Object.assign(form, { name: '', email: '', password: '', permissions: [], isActive: true })
  formError.value = ''
  showModal.value = true
}

function openEdit(user: AdminUserRow) {
  editing.value = user
  Object.assign(form, {
    name: user.name,
    email: user.email,
    password: '',
    permissions: [...user.permissions],
    isActive: user.isActive,
  })
  formError.value = ''
  showModal.value = true
}

function togglePermission(p: string) {
  const i = form.permissions.indexOf(p)
  if (i >= 0) form.permissions.splice(i, 1)
  else form.permissions.push(p)
}

function toggleGroup(perms: readonly string[]) {
  const allSelected = perms.every(p => form.permissions.includes(p))
  if (allSelected) {
    form.permissions = form.permissions.filter(p => !perms.includes(p))
  }
  else {
    perms.forEach((p) => {
      if (!form.permissions.includes(p)) form.permissions.push(p)
    })
  }
}

async function save() {
  saving.value = true
  formError.value = ''
  try {
    if (editing.value) {
      await $fetch(`/api/admin/users/${editing.value.id}`, {
        method: 'PUT',
        body: { name: form.name.trim(), isActive: form.isActive, permissions: form.permissions },
      })
    }
    else {
      await $fetch('/api/admin/users', {
        method: 'POST',
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          permissions: form.permissions,
        },
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
  if (!confirm(`Are you sure you want to delete administrator "${user.name}"?`)) return
  deletingId.value = user.id
  try {
    await $fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
    await refresh()
  }
  catch (e) {
    alert((e as { data?: { message?: string } })?.data?.message || 'Delete failed')
  }
  finally {
    deletingId.value = null
  }
}

function formatDate(d: string | null) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString(locale.value === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getUserInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

const inputCls = 'h-10 w-full rounded-md border bg-white px-3 text-xs transition-colors focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#0B1520]'
</script>

<template>
  <div>
    <!-- Header -->
    <AdminPageHeader
      :title="t('admin.users')"
      :description="locale === 'ar' ? 'إدارة حسابات مسؤولي لوحة التحكم وتعيين صلاحيات الوصول (RBAC).' : 'Manage administrative staff accounts and granular RBAC permission assignments.'"
    >
      <template #actions>
        <button
          type="button"
          class="inline-flex h-10 items-center gap-1.5 rounded-md bg-[#2B71AE] px-4 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#285E8E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B71AE]"
          @click="openCreate"
        >
          <Plus class="h-4 w-4" aria-hidden="true" />
          <span>{{ locale === 'ar' ? 'إضافة مسؤول' : 'Add User' }}</span>
        </button>
      </template>
    </AdminPageHeader>

    <!-- Users Table Card -->
    <div class="overflow-hidden rounded-md border bg-white shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-start text-sm">
          <thead>
            <tr class="border-b bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/40 dark:text-slate-400" :style="{ borderColor: 'var(--color-border)' }">
              <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'المسؤول' : 'Admin User' }}</th>
              <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'البريد الإلكتروني' : 'Email' }}</th>
              <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'الصلاحيات' : 'Role & Permissions' }}</th>
              <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'آخر تسجيل دخول' : 'Last Login' }}</th>
              <th scope="col" class="px-4 py-3 text-center">{{ locale === 'ar' ? 'الحالة' : 'Status' }}</th>
              <th scope="col" class="px-4 py-3 text-end">{{ locale === 'ar' ? 'الإجراءات' : 'Actions' }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
            <tr
              v-for="user in data?.users || []"
              :key="user.id"
              class="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
              :class="{ 'opacity-60': !user.isActive }"
            >
              <!-- Name & Avatar -->
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-xs"
                    :class="user.isSuper ? 'bg-[#2B71AE]' : 'bg-slate-600'"
                  >
                    {{ getUserInitials(user.name) }}
                  </div>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-slate-900 dark:text-slate-100">{{ user.name }}</span>
                      <span
                        v-if="user.isSuper"
                        class="rounded-full bg-[#F5CC07]/20 px-2 py-0.2 text-[10px] font-bold tracking-wide text-amber-900 dark:text-[#F5CC07]"
                      >
                        Super Admin
                      </span>
                    </div>
                  </div>
                </div>
              </td>

              <!-- Email -->
              <td class="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                {{ user.email }}
              </td>

              <!-- Permissions -->
              <td class="px-4 py-3">
                <span
                  v-if="user.isSuper"
                  class="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40"
                >
                  <Shield class="h-3 w-3 text-amber-600" aria-hidden="true" />
                  <span>{{ locale === 'ar' ? 'جميع الصلاحيات' : 'Full Access' }}</span>
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <Key class="h-3 w-3 text-slate-400" aria-hidden="true" />
                  <span>{{ user.permissions.length }} {{ locale === 'ar' ? 'صلاحيات' : 'permissions' }}</span>
                </span>
              </td>

              <!-- Last Login -->
              <td class="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                {{ formatDate(user.lastLoginAt) }}
              </td>

              <!-- Active Status -->
              <td class="px-4 py-3 text-center">
                <AdminStatusBadge :status="user.isActive ? (locale === 'ar' ? 'نشط' : 'Active') : (locale === 'ar' ? 'معطل' : 'Inactive')" size="sm" />
              </td>

              <!-- Actions -->
              <td class="px-4 py-3 text-end">
                <div v-if="!user.isSuper" class="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    class="inline-flex h-8 items-center gap-1 rounded px-2.5 text-xs font-semibold text-[#2B71AE] transition-colors hover:bg-[#2B71AE]/10 dark:text-blue-400 dark:hover:bg-blue-950/50"
                    @click="openEdit(user)"
                  >
                    <Pencil class="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{{ locale === 'ar' ? 'تعديل' : 'Edit' }}</span>
                  </button>
                  <button
                    type="button"
                    :disabled="deletingId === user.id"
                    class="inline-flex h-8 items-center gap-1 rounded px-2.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                    @click="removeUser(user)"
                  >
                    <Trash2 class="h-3.5 w-3.5" aria-hidden="true" />
                    <span class="hidden sm:inline">{{ locale === 'ar' ? 'حذف' : 'Delete' }}</span>
                  </button>
                </div>
                <span v-else class="text-xs text-slate-400">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!data?.users?.length" class="p-8">
        <AdminEmptyState
          :title="locale === 'ar' ? 'لا يوجد مسؤولين مسجلين' : 'No admin users found'"
          :description="locale === 'ar' ? 'أضف أعضاء الفريق مع تحديد أدوارهم وصلاحياتهم.' : 'Create administrative accounts with specific role permissions.'"
          :icon="Users"
        />
      </div>
    </div>

    <!-- Modal for Create / Edit Admin User -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      @click.self="showModal = false"
    >
      <div
        class="my-8 max-h-[90vh] w-full max-w-[540px] overflow-y-auto rounded-lg border bg-white p-6 shadow-xl dark:bg-[#162032]"
        :style="{ borderColor: 'var(--color-border)' }"
      >
        <!-- Modal Header -->
        <div class="mb-5 flex items-center justify-between border-b pb-4" :style="{ borderColor: 'var(--color-border)' }">
          <div>
            <h2 class="font-heading text-lg font-bold text-slate-900 dark:text-slate-100">
              {{ editing ? (locale === 'ar' ? 'تعديل بيانات المسؤول' : 'Edit Administrator') : (locale === 'ar' ? 'إضافة مسؤول جديد' : 'Add Administrator') }}
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              {{ locale === 'ar' ? 'تحديد الاسم، البريد، وتخصيص صلاحيات العمل.' : 'Configure credentials and granular RBAC access rights.' }}
            </p>
          </div>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            @click="showModal = false"
          >
            <X class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <!-- Error Banner -->
        <div
          v-if="formError"
          role="alert"
          class="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
        >
          {{ formError }}
        </div>

        <!-- Form Fields -->
        <div class="space-y-4">
          <label class="block">
            <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Full Name *</span>
            <input v-model="form.name" type="text" required placeholder="e.g. Ahmed Ali" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
          </label>

          <label v-if="!editing" class="block">
            <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Email Address *</span>
            <input v-model="form.email" type="email" required placeholder="admin@mango-electronics.com" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
          </label>

          <label v-if="!editing" class="block">
            <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Password (minimum 8 characters) *</span>
            <input v-model="form.password" type="password" required minlength="8" placeholder="••••••••" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
          </label>

          <div v-if="editing" class="pt-1">
            <label class="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              <input v-model="form.isActive" type="checkbox" class="h-4 w-4 rounded accent-[#2B71AE]" />
              <span>{{ locale === 'ar' ? 'حساب المسؤول نشط ويمكنه تسجيل الدخول' : 'Account active and permitted to login' }}</span>
            </label>
          </div>

          <!-- Granular Permissions Matrix (RTL Safe) -->
          <div class="border-t pt-4" :style="{ borderColor: 'var(--color-border)' }">
            <div class="mb-2 flex items-center justify-between">
              <span class="block text-xs font-bold text-slate-800 dark:text-slate-200">
                {{ locale === 'ar' ? 'صلاحيات الوصول المخصصة' : 'Assigned Permissions' }}
              </span>
              <span class="text-[11px] text-slate-400">
                {{ form.permissions.length }} selected
              </span>
            </div>

            <div class="space-y-3">
              <div
                v-for="(perms, group) in PERMISSION_GROUPS"
                :key="group"
                class="rounded-md border p-3 bg-slate-50/50 dark:bg-slate-800/30"
                :style="{ borderColor: 'var(--color-border)' }"
              >
                <div class="mb-2 flex items-center justify-between">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {{ group }}
                  </span>
                  <button
                    type="button"
                    class="text-[10px] font-semibold text-[#2B71AE] hover:underline dark:text-blue-400"
                    @click="toggleGroup(perms)"
                  >
                    {{ perms.every(p => form.permissions.includes(p)) ? (locale === 'ar' ? 'إلغاء الكل' : 'Deselect all') : (locale === 'ar' ? 'تحديد الكل' : 'Select all') }}
                  </button>
                </div>

                <!-- Permission Checkbox Chips using logical spacing (me-3) -->
                <div class="flex flex-wrap gap-2">
                  <label
                    v-for="p in perms"
                    :key="p"
                    class="inline-flex cursor-pointer items-center gap-1.5 rounded border px-2.5 py-1 text-xs transition-colors select-none"
                    :class="[
                      form.permissions.includes(p)
                        ? 'border-[#2B71AE] bg-[#2B71AE]/10 text-[#2B71AE] font-semibold dark:border-blue-500 dark:text-blue-300'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
                    ]"
                  >
                    <input
                      type="checkbox"
                      :checked="form.permissions.includes(p)"
                      class="hidden"
                      @change="togglePermission(p)"
                    />
                    <Check v-if="form.permissions.includes(p)" class="h-3 w-3" aria-hidden="true" />
                    <span>{{ p }}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="mt-6 flex items-center justify-end gap-2.5 border-t pt-4" :style="{ borderColor: 'var(--color-border)' }">
          <button
            type="button"
            class="h-9 rounded-md border px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            @click="showModal = false"
          >
            {{ locale === 'ar' ? 'إلغاء' : 'Cancel' }}
          </button>
          <button
            type="button"
            :disabled="saving"
            class="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#2B71AE] px-5 text-xs font-semibold text-white shadow-xs hover:bg-[#285E8E] disabled:opacity-50"
            @click="save"
          >
            <span>{{ saving ? (locale === 'ar' ? 'جاري الحفظ…' : 'Saving…') : (locale === 'ar' ? 'حفظ المسؤول' : 'Save User') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
