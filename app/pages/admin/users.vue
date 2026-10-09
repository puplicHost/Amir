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

definePageMeta({ layout: 'admin', middleware: 'admin-auth', requiredPermission: 'users.manage' })

const { t, locale } = useI18n()
const toast = useAdminToast()

interface AdminUserRow {
  id: string
  email: string
  name: string
  title: string | null
  salary: number | null
  isSuper: boolean
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  permissions: string[]
}

const { data: session } = useAdminSession()
const isSuperAdmin = computed(() => !!session.value?.user.isSuper)

const fetch = useRequestFetch()
const { data, refresh, pending } = await useAsyncData('admin-users', () =>
  fetch<{ users: AdminUserRow[] }>('/api/admin/users'),
)

const showModal = ref(false)
const editing = ref<AdminUserRow | null>(null)
const JOB_TITLES = [
  'Super Admin',
  'Manager',
  'Accountant',
  'Sales',
  'Social Media',
  'Warehouse',
  'Technical',
  'Other',
]

const form = reactive({
  name: '',
  email: '',
  password: '',
  title: '',
  salary: '' as number | '',
  permissions: [] as string[],
  isActive: true,
})
const formError = ref('')
const saving = ref(false)
const deletingId = ref<string | null>(null)

function openCreate() {
  editing.value = null
  Object.assign(form, { name: '', email: '', password: '', title: '', salary: '', permissions: [], isActive: true })
  formError.value = ''
  showModal.value = true
}

function openEdit(user: AdminUserRow) {
  editing.value = user
  Object.assign(form, {
    name: user.name,
    email: user.email,
    password: '',
    title: user.title || '',
    salary: user.salary ?? '',
    permissions: [...user.permissions],
    isActive: user.isActive,
  })
  formError.value = ''
  showModal.value = true
}

interface ResourceAction {
  key: string
  en: string
  ar: string
  permission: string
}

interface ResourceDef {
  group: string
  actions: ResourceAction[]
}

// Resource × action matrix. Every checkbox maps to a real backend permission
// string (shared/permissions.ts) — single-permission resources expose one
// "Manage" checkbox instead of misleading per-action boxes.
const RESOURCE_DEFS: ResourceDef[] = [
  {
    group: 'dashboard',
    actions: [
      { key: 'view', en: 'View (financial figures)', ar: 'عرض (الأرقام المالية)', permission: 'dashboard.financials.view' },
    ],
  },
  {
    group: 'products',
    actions: [
      { key: 'view', en: 'View', ar: 'عرض', permission: 'products.view' },
      { key: 'create', en: 'Create', ar: 'إنشاء', permission: 'products.create' },
      { key: 'update', en: 'Update', ar: 'تعديل', permission: 'products.edit' },
      { key: 'delete', en: 'Delete', ar: 'حذف', permission: 'products.delete' },
    ],
  },
  {
    group: 'categories',
    actions: [
      { key: 'manage', en: 'Manage (full access)', ar: 'إدارة (صلاحية كاملة)', permission: 'categories.manage' },
    ],
  },
  {
    group: 'orders',
    actions: [
      { key: 'view', en: 'View', ar: 'عرض', permission: 'orders.view' },
      { key: 'update', en: 'Update (status)', ar: 'تعديل (الحالة)', permission: 'orders.manage' },
    ],
  },
  {
    group: 'quotes',
    actions: [
      { key: 'view', en: 'View', ar: 'عرض', permission: 'quotes.view' },
      { key: 'create', en: 'Create', ar: 'إنشاء', permission: 'quotes.manage' },
      { key: 'update', en: 'Update', ar: 'تعديل', permission: 'quotes.manage' },
    ],
  },
  {
    group: 'invoices',
    actions: [
      { key: 'view', en: 'View', ar: 'عرض', permission: 'invoices.view' },
      { key: 'update', en: 'Update', ar: 'تعديل', permission: 'invoices.manage' },
    ],
  },
  {
    group: 'inventory',
    actions: [
      { key: 'view', en: 'View', ar: 'عرض', permission: 'inventory.view' },
    ],
  },
  {
    group: 'services',
    actions: [
      { key: 'view', en: 'View', ar: 'عرض', permission: 'services.view' },
      { key: 'update', en: 'Manage (requests)', ar: 'إدارة (الطلبات)', permission: 'services.manage' },
      { key: 'configure', en: 'Configure', ar: 'تهيئة', permission: 'services.config' },
    ],
  },
  {
    group: 'financials',
    actions: [
      { key: 'view', en: 'View', ar: 'عرض', permission: 'financials.view' },
      { key: 'update', en: 'Update', ar: 'تعديل', permission: 'financials.manage' },
    ],
  },
  {
    group: 'banners',
    actions: [
      { key: 'manage', en: 'Manage (full access)', ar: 'إدارة (صلاحية كاملة)', permission: 'banners.manage' },
    ],
  },
  {
    group: 'settings',
    actions: [
      { key: 'view', en: 'View', ar: 'عرض', permission: 'settings.view' },
      { key: 'update', en: 'Update', ar: 'تعديل', permission: 'settings.manage' },
    ],
  },
  {
    group: 'users',
    actions: [
      { key: 'manage', en: 'Manage (full access)', ar: 'إدارة (صلاحية كاملة)', permission: 'users.manage' },
    ],
  },
]

const ROLE_PRESETS = [
  {
    id: 'sales',
    labelAr: 'مدير مبيعات',
    labelEn: 'Sales Manager',
    permissions: [
      'orders.view', 'orders.manage',
      'quotes.view', 'quotes.manage',
      'invoices.view', 'invoices.manage',
      'products.view',
      'categories.manage',
      'inbox.view', 'inbox.manage',
    ],
  },
  {
    id: 'warehouse',
    labelAr: 'أمين مخزن',
    labelEn: 'Warehouse Staff',
    permissions: [
      'inventory.view',
      'products.view', 'products.create', 'products.edit',
      'orders.view',
    ],
  },
  {
    id: 'support',
    labelAr: 'دعم فني',
    labelEn: 'Tech Support',
    permissions: [
      'services.view', 'services.manage',
      'inbox.view', 'inbox.manage',
      'orders.view',
      'products.view',
    ],
  },
  {
    id: 'accountant',
    labelAr: 'محاسب',
    labelEn: 'Accountant',
    permissions: [
      'financials.view', 'financials.manage',
      'dashboard.financials.view',
      'invoices.view', 'invoices.manage',
      'orders.view',
      'inventory.view',
    ],
  },
]

function applyRolePreset(preset: typeof ROLE_PRESETS[number]) {
  form.permissions = [...preset.permissions]
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

function toggleResourceGroup(res: ResourceDef) {
  toggleGroup(res.actions.map(a => a.permission))
}

function groupSelectedCount(res: ResourceDef) {
  return res.actions.filter(a => form.permissions.includes(a.permission)).length
}

async function save() {
  saving.value = true
  formError.value = ''
  try {
    if (editing.value) {
      await $fetch(`/api/admin/users/${editing.value.id}`, {
        method: 'PUT',
        body: {
          name: form.name.trim(),
          title: form.title || null,
          ...(isSuperAdmin.value ? { salary: form.salary === '' ? null : Number(form.salary) } : {}),
          isActive: form.isActive,
          permissions: form.permissions,
        },
      })
    }
    else {
      await $fetch('/api/admin/users', {
        method: 'POST',
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          title: form.title || null,
          ...(isSuperAdmin.value ? { salary: form.salary === '' ? null : Number(form.salary) } : {}),
          permissions: form.permissions,
        },
      })
    }
    showModal.value = false
    await refresh()
    toast.success(
      editing.value
        ? (locale.value === 'ar' ? 'تم تعديل بيانات المسؤول' : 'Administrator Updated')
        : (locale.value === 'ar' ? 'تمت إضافة المسؤول بنجاح' : 'Administrator Created'),
      locale.value === 'ar' ? `تم حفظ حساب "${form.name}".` : `Account for "${form.name}" saved.`,
    )
  }
  catch (e: any) {
    formError.value = e?.data?.message || 'Save failed'
    toast.error(
      locale.value === 'ar' ? 'فشل حفظ المسؤول' : 'Save Failed',
      formError.value,
    )
  }
  finally {
    saving.value = false
  }
}

const { confirm: confirmDialog } = useAdminConfirm()

async function removeUser(user: AdminUserRow) {
  const ok = await confirmDialog({
    title: locale.value === 'ar' ? `حذف المسؤول "${user.name}"؟` : `Delete administrator "${user.name}"?`,
    message: locale.value === 'ar' ? 'لا يمكن التراجع عن هذا الإجراء.' : 'This action cannot be undone.',
  })
  if (!ok) return
  deletingId.value = user.id
  try {
    await $fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
    await refresh()
    toast.success(
      locale.value === 'ar' ? 'تم حذف المسؤول' : 'Administrator Deleted',
      locale.value === 'ar' ? `تم حذف حساب "${user.name}".` : `Account for "${user.name}" deleted.`,
    )
  }
  catch (e: any) {
    toast.error(
      locale.value === 'ar' ? 'فشل حذف المسؤول' : 'Delete Failed',
      e?.data?.message || 'Delete failed',
    )
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

const groupLabels: Record<string, { en: string, ar: string }> = {
  dashboard: { en: 'Dashboard', ar: 'لوحة التحكم' },
  products: { en: 'Products Management', ar: 'إدارة المنتجات' },
  categories: { en: 'Catalog Categories', ar: 'إدارة الأقسام' },
  orders: { en: 'Orders & Fulfillment', ar: 'إدارة الطلبات' },
  quotes: { en: 'Price Quotations', ar: 'عروض السعر' },
  invoices: { en: 'Invoices', ar: 'الفواتير' },
  inventory: { en: 'Inventory', ar: 'المخزون' },
  services: { en: 'Engineering Services', ar: 'الخدمات' },
  financials: { en: 'Financial Accounts', ar: 'الحسابات المالية (Financials)' },
  banners: { en: 'Notifications & Banners', ar: 'الإشعارات والبنرات' },
  users: { en: 'User Management', ar: 'إدارة المستخدمين' },
  settings: { en: 'Platform Settings', ar: 'الإعدادات' },
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
          class="inline-flex h-10 items-center gap-1.5 rounded-md bg-[#F5CC07] px-4 text-xs font-semibold text-slate-950 shadow-xs transition-colors hover:bg-yellow-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5CC07]"
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
          <thead class="sticky top-0 z-10">
            <tr class="border-b bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/40 dark:text-slate-400" :style="{ borderColor: 'var(--color-border)' }">
              <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'المسؤول' : 'Admin User' }}</th>
              <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'البريد الإلكتروني' : 'Email' }}</th>
              <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'المسمى الوظيفي' : 'Job Title' }}</th>
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
              class="transition-colors even:bg-slate-50/50 even:dark:bg-slate-800/30 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
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

              <!-- Job Title -->
              <td class="px-4 py-3">
                <span v-if="user.title" class="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {{ user.title }}
                </span>
                <span v-else class="text-xs text-slate-400">—</span>
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

          <!-- Job Title (right after email) -->
          <label class="block">
            <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {{ locale === 'ar' ? 'المسمى الوظيفي' : 'Job Title' }}
            </span>
            <select v-model="form.title" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }">
              <option value="">{{ locale === 'ar' ? 'اختر المسمى…' : 'Select title…' }}</option>
              <option v-for="jt in JOB_TITLES" :key="jt" :value="jt">{{ jt }}</option>
            </select>
            <span class="mt-1 block text-xs text-slate-400">
              {{ locale === 'ar' ? 'المسمى الوظيفي منفصل عن الصلاحيات — يمكنك تعيين أي صلاحيات بغض النظر عن المسمى' : 'Job title is separate from permissions — any permissions can be assigned regardless of title' }}
            </span>
          </label>

          <!-- Monthly Salary (Super Admin only, confidential) -->
          <label v-if="isSuperAdmin" class="block">
            <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {{ locale === 'ar' ? 'الراتب الشهري' : 'Monthly Salary' }}
            </span>
            <div class="relative">
              <input v-model.number="form.salary" type="number" min="0" step="0.01" placeholder="0 جنيه" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" class="pe-12" />
              <span class="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{{ locale === 'ar' ? 'جنيه' : 'EGP' }}</span>
            </div>
            <span class="mt-1 block text-xs font-medium text-rose-500 dark:text-rose-400">
              {{ locale === 'ar' ? '🔒 هذه المعلومة سرية — تظهر فقط لك كـ Super Admin' : '🔒 Confidential — visible only to you as Super Admin' }}
            </span>
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

          <!-- Role Presets Shortcuts -->
          <div class="border-t pt-4" :style="{ borderColor: 'var(--color-border)' }">
            <span class="mb-2 block text-xs font-bold text-slate-800 dark:text-slate-200">
              {{ locale === 'ar' ? 'نماذج أدوار جاهزة (تحديد سريع):' : 'Role Presets (Quick select):' }}
            </span>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="preset in ROLE_PRESETS"
                :key="preset.id"
                type="button"
                class="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:border-[#2B71AE] hover:bg-[#2B71AE]/10 hover:text-[#2B71AE] dark:border-slate-700 dark:bg-[#162032] dark:text-slate-300 dark:hover:border-blue-400 dark:hover:text-blue-300"
                @click="applyRolePreset(preset)"
              >
                <span>{{ locale === 'ar' ? preset.labelAr : preset.labelEn }}</span>
              </button>
            </div>
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
            <p class="mb-2 rounded-md bg-blue-50 px-2.5 py-1.5 text-[11px] leading-relaxed text-[#2B71AE] dark:bg-blue-950/40 dark:text-blue-300">
              {{ locale === 'ar' ? 'ملاحظة: تسري تغييرات الصلاحيات على المستخدم فور تحميله لأي صفحة (التحقق لحظي من الخادم)، بينما تتحدث القائمة الجانبية لديه عند تنقله بين الصفحات — لا حاجة لتسجيل الخروج.' : 'Note: permission changes are enforced immediately by the API; the staff member’s sidebar refreshes on their next page navigation — no re-login needed.' }}
            </p>

            <div class="space-y-2.5">
              <div
                v-for="res in RESOURCE_DEFS"
                :key="res.group"
                class="rounded-md border bg-slate-50/50 p-3 dark:bg-slate-800/30"
                :style="{ borderColor: 'var(--color-border)' }"
              >
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div class="flex min-w-0 items-center justify-between gap-2 sm:w-44 sm:shrink-0">
                    <span class="truncate text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {{ groupLabels[res.group] ? (locale === 'ar' ? groupLabels[res.group].ar : groupLabels[res.group].en) : res.group }}
                    </span>
                    <button
                      type="button"
                      class="shrink-0 text-[10px] font-semibold text-[#2B71AE] hover:underline dark:text-blue-400"
                      @click="toggleResourceGroup(res)"
                    >
                      {{ groupSelectedCount(res) === res.actions.length ? (locale === 'ar' ? 'إلغاء الكل' : 'Deselect all') : (locale === 'ar' ? 'تحديد الكل' : 'Select all') }}
                    </button>
                  </div>

                  <!-- Standard action checkboxes (View / Create / Update / Delete) -->
                  <div class="flex flex-1 flex-wrap gap-2">
                    <label
                      v-for="a in res.actions"
                      :key="a.key"
                      class="inline-flex cursor-pointer items-center gap-1.5 rounded border px-2.5 py-1 text-xs transition-colors select-none"
                      :class="[
                        form.permissions.includes(a.permission)
                          ? 'border-[#2B71AE] bg-[#2B71AE]/10 text-[#2B71AE] font-semibold dark:border-blue-500 dark:text-blue-300'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
                      ]"
                      :title="a.permission"
                    >
                      <input
                        type="checkbox"
                        :checked="form.permissions.includes(a.permission)"
                        class="hidden"
                        @change="togglePermission(a.permission)"
                      />
                      <Check v-if="form.permissions.includes(a.permission)" class="h-3 w-3" aria-hidden="true" />
                      <span>{{ locale === 'ar' ? a.ar : a.en }}</span>
                    </label>
                  </div>
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
            class="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#F5CC07] px-5 text-xs font-semibold text-slate-950 shadow-xs hover:bg-yellow-400 disabled:opacity-50"
            @click="save"
          >
            <span>{{ saving ? (locale === 'ar' ? 'جاري الحفظ…' : 'Saving…') : (locale === 'ar' ? 'حفظ المسؤول' : 'Save User') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
