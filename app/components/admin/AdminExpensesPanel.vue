<script setup lang="ts">
import { Download, Loader2, Plus, Receipt, Trash2, Upload, X } from 'lucide-vue-next'
import { centsToEur } from '~~/shared/booking'
import { todayBerlinISO } from '~/utils/format'

// Salon expenses (Roadmap Phase 10): track spending, export filtered CSV
// for the accountant. Admin-only. No revenue/profit logic here.

const { t, locale } = useI18n()
const toast = useAdminToast()
const { confirm: confirmDialog } = useAdminConfirm()
const fetch = useRequestFetch()
const canManage = useAdminCan('expenses.manage')
const canExport = useAdminCan('expenses.export')

function monthStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const now = new Date()
const firstThisMonth = `${monthStr(now)}-01`

const from = ref(firstThisMonth)
const to = ref(todayBerlinISO())
const categoryId = ref('')
const search = ref('')
const page = ref(1)

const { data, refresh, pending } = await useAsyncData('admin-expenses', () =>
  fetch<any>('/api/admin/expenses', {
    params: {
      from: from.value || undefined,
      to: to.value || undefined,
      categoryId: categoryId.value || undefined,
      search: search.value.trim() || undefined,
      page: page.value,
    },
  }),
)
watch([from, to, categoryId], () => {
  page.value = 1
  refresh()
})
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    refresh()
  }, 400)
})
onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer)
})

const rows = computed(() => data.value?.expenses || [])
const categories = computed(() => data.value?.categories || [])
const total = computed(() => data.value?.total || 0)
const totalCount = computed(() => Number(data.value?.totalCount || rows.value.length))
const pages = computed(() => Number(data.value?.pages || 1))
const byCategory = computed(() => data.value?.byCategory || [])
const byMonth = computed(() => data.value?.byMonth || [])
function changePage(next: number) {
  page.value = next
  refresh()
}
const catName = (id: string) => {
  const c = categories.value.find((x: any) => x.id === id)
  return locale.value === 'de' ? (c?.nameDe || '') : (c?.nameEn || c?.nameDe || '')
}
function fmtDay(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString(locale.value === 'ar' ? 'ar-EG' : 'de-DE', {
    timeZone: 'Europe/Berlin', day: 'numeric', month: 'short', year: 'numeric',
  })
}

// Monthly bars (pure SVG, no dependency).
const maxMonth = computed(() => Math.max(1, ...byMonth.value.map((m: any) => m.total)))
function barH(v: number): number {
  return Math.max(4, Math.round((v / maxMonth.value) * 90))
}

// ── Add / edit modal ──
const modalOpen = ref(false)
const editing = ref<any>(null)
const form = reactive({ day: '', categoryId: '', amount: '', description: '', vendor: '', payMethod: 'cash', tax: '' })
const formError = ref('')
const saving = ref(false)

function openAdd() {
  editing.value = null
  Object.assign(form, {
    day: todayBerlinISO(),
    categoryId: categories.value.find((c: any) => c.isActive)?.id || '',
    amount: '', description: '', vendor: '', payMethod: 'cash', tax: '',
  })
  formError.value = ''
  modalOpen.value = true
}
function openEdit(r: any) {
  editing.value = r
  Object.assign(form, {
    day: r.day, categoryId: r.categoryId, amount: String(r.amountCents / 100),
    description: r.description || '', vendor: r.vendor || '',
    payMethod: r.payMethod || 'cash', tax: r.taxPercent === null || r.taxPercent === undefined ? '' : String(r.taxPercent),
  })
  formError.value = ''
  modalOpen.value = true
}
async function saveExpense() {
  formError.value = ''
  saving.value = true
  try {
    const body = {
      day: form.day,
      categoryId: form.categoryId,
      amountEur: Number(String(form.amount).replace(',', '.')),
      description: form.description.trim() || undefined,
      vendor: form.vendor.trim() || undefined,
      payMethod: form.payMethod,
      taxPercent: form.tax === '' ? undefined : Number(form.tax),
    }
    if (editing.value) {
      await $fetch(`/api/admin/expenses/${editing.value.id}`, { method: 'PUT', body })
    }
    else {
      await $fetch('/api/admin/expenses', { method: 'POST', body })
    }
    modalOpen.value = false
    await refresh()
    toast.success(locale.value === 'ar' ? 'تم الحفظ' : 'Saved', t('expenses.saved'))
  }
  catch (e: any) { formError.value = e?.data?.message || e?.data?.statusMessage || t('expenses.saveFailed') }
  finally { saving.value = false }
}
async function removeExpense(r: any) {
  const ok = await confirmDialog({
    title: t('expenses.deleteTitle'),
    message: t('expenses.deleteMessage', {
      amount: centsToEur(r.amountCents),
      category: catName(r.categoryId),
    }),
    confirmLabel: t('expenses.delete'),
  })
  if (!ok) return
  try {
    await $fetch(`/api/admin/expenses/${r.id}`, { method: 'DELETE' })
    await refresh()
    toast.success(t('expenses.deleted'))
  }
  catch (e: any) { toast.error('Error', e?.data?.message || t('expenses.deleteFailed')) }
}
const uploadingId = ref('')
async function uploadReceipt(ev: Event, r: any) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  uploadingId.value = r.id
  try {
    const fd = new FormData()
    fd.append('file', file)
    await $fetch(`/api/admin/expenses/${r.id}/receipt`, { method: 'POST', body: fd })
    await refresh()
  }
  catch (e: any) { toast.error('Error', e?.data?.message || 'Upload failed') }
  finally { uploadingId.value = '' }
}

function exportUrl(): string {
  const p = new URLSearchParams()
  if (from.value) p.set('from', from.value)
  if (to.value) p.set('to', to.value)
  if (categoryId.value) p.set('categoryId', categoryId.value)
  return `/api/admin/expenses/export?${p.toString()}`
}

// ── Categories ──
const catOpen = ref(false)
const catForm = reactive({ nameDe: '', nameEn: '' })
const savingCat = ref(false)
async function addCategory() {
  if (!catForm.nameDe.trim() || !catForm.nameEn.trim()) return
  savingCat.value = true
  try {
    await $fetch('/api/admin/expense-categories', {
      method: 'POST',
      body: { nameDe: catForm.nameDe.trim(), nameEn: catForm.nameEn.trim() },
    })
    catForm.nameDe = ''; catForm.nameEn = ''
    await refresh()
  }
  catch (e: any) { toast.error('Error', e?.data?.message || 'Create failed') }
  finally { savingCat.value = false }
}
async function toggleCategory(c: any) {
  try {
    await $fetch(`/api/admin/expense-categories/${c.id}`, {
      method: 'PUT',
      body: { nameDe: c.nameDe, nameEn: c.nameEn, isActive: !c.isActive },
    })
    await refresh()
  }
  catch (e: any) { toast.error('Error', e?.data?.message || 'Update failed') }
}
</script>

<template>
  <div>
<div class="mb-4 flex flex-wrap items-center justify-end gap-2">
      <div class="flex flex-wrap gap-2">
          <a
            v-if="canExport"
            :href="exportUrl()"
            class="inline-flex h-11 items-center gap-1.5 rounded-md border px-3.5 text-xs font-bold text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-800"
            :style="{ borderColor: 'var(--color-border)' }"
          >
            <Download class="h-3.5 w-3.5" aria-hidden="true" />
            <span>{{ t('expenses.export') }}</span>
          </a>
          <button
            v-if="canManage"
            type="button"
            class="inline-flex h-11 items-center gap-1.5 rounded-md bg-primary px-3.5 text-xs font-bold text-on-primary hover:bg-primary/90"
            @click="openAdd"
          >
            <Plus class="h-3.5 w-3.5" aria-hidden="true" />
            <span>{{ t('expenses.add') }}</span>
          </button>
        </div>
    </div>

    <!-- Filters -->
    <div class="mb-4 flex flex-wrap items-end gap-2">
      <label class="block">
        <span class="mb-1 block text-[11px] font-semibold text-neutral-500">{{ t('expenses.from') }}</span>
        <input v-model="from" type="date" class="h-11 rounded-md border bg-transparent px-2 text-xs" :style="{ borderColor: 'var(--color-border)' }" />
      </label>
      <label class="block">
        <span class="mb-1 block text-[11px] font-semibold text-neutral-500">{{ t('expenses.to') }}</span>
        <input v-model="to" type="date" class="h-11 rounded-md border bg-transparent px-2 text-xs" :style="{ borderColor: 'var(--color-border)' }" />
      </label>
      <label class="block">
        <span class="mb-1 block text-[11px] font-semibold text-neutral-500">{{ t('expenses.category') }}</span>
        <select v-model="categoryId" class="h-11 rounded-md border bg-transparent px-2 text-xs" :style="{ borderColor: 'var(--color-border)' }">
          <option value="">{{ t('expenses.allCategories') }}</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ locale === 'de' ? c.nameDe : c.nameEn }}</option>
        </select>
      </label>
      <label class="block min-w-40 flex-1">
        <span class="mb-1 block text-[11px] font-semibold text-neutral-500">{{ t('expenses.search') }}</span>
        <input v-model="search" type="search" class="h-11 w-full rounded-md border bg-transparent px-2 text-xs" :style="{ borderColor: 'var(--color-border)' }" />
      </label>
      <p class="ms-auto text-sm font-bold text-neutral-900 dark:text-neutral-100" dir="ltr">{{ centsToEur(total) }}</p>
    </div>

    <!-- Summary -->
    <div class="mb-4 grid gap-4 lg:grid-cols-2">
      <div class="rounded-xl border bg-white p-4 dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
        <h2 class="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-400">{{ t('expenses.byCategory') }}</h2>
        <p v-if="!byCategory.length" class="text-xs text-neutral-400">—</p>
        <div v-for="c in byCategory" :key="c.id" class="mb-2">
          <div class="mb-0.5 flex justify-between text-xs">
            <span class="font-semibold text-neutral-700 dark:text-neutral-200">{{ locale === 'de' ? c.nameDe : c.nameEn }} ({{ c.count }})</span>
            <span class="font-mono" dir="ltr">{{ centsToEur(c.total) }}</span>
          </div>
          <div class="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div class="h-full rounded-full bg-primary" :style="{ width: `${Math.round((c.total / Math.max(1, total)) * 100)}%` }" />
          </div>
        </div>
      </div>
      <div class="rounded-xl border bg-white p-4 dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
        <h2 class="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-400">{{ t('expenses.byMonth') }}</h2>
        <div v-if="!byMonth.length" class="text-xs text-neutral-400">—</div>
        <svg v-else viewBox="0 0 300 110" class="w-full" role="img" :aria-label="t('expenses.byMonth')">
          <g v-for="(m, i) in byMonth" :key="m.month">
            <rect
              :x="8 + i * (284 / byMonth.length)"
              :y="100 - barH(m.total)"
              :width="Math.max(6, 284 / byMonth.length - 6)"
              :height="barH(m.total)"
              rx="2"
              class="fill-primary"
            />
            <text :x="8 + i * (284 / byMonth.length)" y="109" font-size="7" class="fill-neutral-400">{{ m.month.slice(2) }}</text>
          </g>
        </svg>
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-hidden rounded-xl border bg-white dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[720px] text-start text-xs">
          <thead>
            <tr class="border-b bg-neutral-50/75 text-[11px] uppercase tracking-wider text-neutral-500 dark:bg-neutral-800/40" :style="{ borderColor: 'var(--color-border)' }">
              <th scope="col" class="px-4 py-3 text-start">{{ t('staffAdmin.day') }}</th>
              <th scope="col" class="px-4 py-3 text-start">{{ t('expenses.category') }}</th>
              <th scope="col" class="px-4 py-3 text-start">{{ t('expenses.description') }}</th>
              <th scope="col" class="px-4 py-3 text-end">{{ t('expenses.amount') }}</th>
              <th scope="col" class="px-4 py-3 text-center">{{ t('expenses.receipt') }}</th>
              <th v-if="canManage" scope="col" class="px-4 py-3 text-end">{{ t('expenses.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800/60">
            <tr v-for="r in rows" :key="r.id" class="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40">
              <td class="px-4 py-3 font-semibold" dir="ltr">{{ fmtDay(r.day) }}</td>
              <td class="px-4 py-3">{{ catName(r.categoryId) }}</td>
              <td class="px-4 py-3 text-neutral-500">
                {{ r.description || '—' }}
                <span v-if="r.vendor" class="block text-[11px]">{{ r.vendor }} · {{ r.payMethod }}</span>
              </td>
              <td class="px-4 py-3 text-end font-mono font-bold" dir="ltr">{{ centsToEur(r.amountCents) }}</td>
              <td class="px-4 py-3 text-center">
                <a v-if="r.receiptPath" :href="r.receiptPath" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">
                  <Receipt class="mx-auto h-4 w-4" aria-hidden="true" />
                </a>
                <label v-else-if="canManage" class="inline-flex cursor-pointer items-center text-neutral-400 hover:text-neutral-600">
                  <Upload class="h-4 w-4" aria-hidden="true" />
                  <input type="file" accept="image/jpeg,image/png,image/webp,.pdf" class="sr-only" @change="uploadReceipt($event, r)" />
                </label>
                <Loader2 v-if="uploadingId === r.id" class="mx-auto h-4 w-4 animate-spin" aria-hidden="true" />
              </td>
              <td v-if="canManage" class="px-4 py-3 text-end whitespace-nowrap">
                <button type="button" class="rounded px-2 py-1 min-h-11 min-w-11 text-[11px] font-bold text-primary hover:bg-neutral-50 dark:hover:bg-neutral-950/40" @click="openEdit(r)">{{ t('expenses.edit') }}</button>
                <button type="button" :aria-label="t('staffAdmin.remove')" class="rounded px-2 py-1 min-h-11 min-w-11 text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40" @click="removeExpense(r)">
                  <Trash2 class="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!rows.length && !pending" class="p-4">
          <AdminEmptyState :title="t('expenses.none')" :description="t('expenses.noneHint')" :icon="Receipt" />
        </div>
      </div>
      <AdminPagination
        v-if="pages > 1"
        :page="page"
        :pages="pages"
        :total="totalCount"
        :item-name="t('expenses.title')"
        @change="changePage"
      />
    </div>

    <!-- Categories -->
    <div v-if="canManage" class="mt-4 rounded-xl border bg-white p-4 dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
      <button type="button" class="text-xs font-bold text-neutral-700 dark:text-neutral-200" @click="catOpen = !catOpen">
        {{ t('expenses.manageCategories') }} {{ catOpen ? '▾' : '▸' }}
      </button>
      <div v-if="catOpen" class="mt-3">
        <div class="mb-3 flex flex-wrap items-end gap-2">
          <label class="block">
            <span class="mb-1 block text-[11px] text-neutral-500">DE *</span>
            <input v-model="catForm.nameDe" type="text" class="h-11 rounded-md border bg-transparent px-2 text-xs" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
          <label class="block">
            <span class="mb-1 block text-[11px] text-neutral-500">EN *</span>
            <input v-model="catForm.nameEn" type="text" class="h-11 rounded-md border bg-transparent px-2 text-xs" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
          <button type="button" :disabled="savingCat" class="h-11 rounded-md bg-primary px-4 text-xs font-bold text-on-primary disabled:opacity-50" @click="addCategory">
            {{ t('expenses.addCategory') }}
          </button>
        </div>
        <ul class="flex flex-wrap gap-2">
          <li
            v-for="c in categories"
            :key="c.id"
            class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs"
            :class="c.isActive ? '' : 'opacity-50'"
            :style="{ borderColor: 'var(--color-border)' }"
          >
            <span class="font-semibold">{{ locale === 'de' ? c.nameDe : c.nameEn }}</span>
            <button type="button" class="text-[11px] text-neutral-400 hover:text-neutral-600" @click="toggleCategory(c)">
              {{ c.isActive ? t('expenses.deactivate') : t('expenses.activate') }}
            </button>
          </li>
        </ul>
      </div>
    </div>

    <!-- Add / edit modal -->
    <div
      v-if="modalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      @click.self="modalOpen = false"
@keydown.escape="modalOpen = false"
    >
      <div class="w-full max-w-lg rounded-xl border bg-white p-5 shadow-xl dark:bg-neutral-900" :style="{ borderColor: 'var(--color-border)' }">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="font-heading text-sm font-bold">{{ editing ? t('expenses.editTitle') : t('expenses.addTitle') }}</h3>
          <button type="button" class="text-neutral-400 hover:text-neutral-600" @click="modalOpen = false" :aria-label="t('common.close')">
            <X class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1 block text-xs font-semibold">{{ t('staffAdmin.day') }} *</span>
            <input v-model="form.day" type="date" class="h-11 w-full rounded-md border bg-transparent px-2 text-sm" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
          <label class="block">
            <span class="mb-1 block text-xs font-semibold">{{ t('expenses.category') }} *</span>
            <select v-model="form.categoryId" class="h-11 w-full rounded-md border bg-transparent px-2 text-sm" :style="{ borderColor: 'var(--color-border)' }">
              <option v-for="c in categories.filter((x: any) => x.isActive)" :key="c.id" :value="c.id">{{ locale === 'de' ? c.nameDe : c.nameEn }}</option>
            </select>
          </label>
          <label class="block">
            <span class="mb-1 block text-xs font-semibold">{{ t('expenses.amount') }} (EUR) *</span>
            <input v-model="form.amount" type="number" min="0.01" step="0.01" dir="ltr" class="h-11 w-full rounded-md border bg-transparent px-2 text-sm" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
          <label class="block">
            <span class="mb-1 block text-xs font-semibold">{{ t('expenses.payMethod') }}</span>
            <select v-model="form.payMethod" class="h-11 w-full rounded-md border bg-transparent px-2 text-sm" :style="{ borderColor: 'var(--color-border)' }">
              <option value="cash">{{ t('calendar.payCash') }}</option>
              <option value="card">{{ t('calendar.payCard') }}</option>
              <option value="transfer">{{ t('expenses.payTransfer') }}</option>
              <option value="other">{{ t('expenses.payOther') }}</option>
            </select>
          </label>
          <label class="block sm:col-span-2">
            <span class="mb-1 block text-xs font-semibold">{{ t('expenses.description') }}</span>
            <input v-model="form.description" type="text" class="h-11 w-full rounded-md border bg-transparent px-2 text-sm" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
          <label class="block">
            <span class="mb-1 block text-xs font-semibold">{{ t('expenses.vendor') }}</span>
            <input v-model="form.vendor" type="text" class="h-11 w-full rounded-md border bg-transparent px-2 text-sm" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
          <label class="block">
            <span class="mb-1 block text-xs font-semibold">{{ t('expenses.tax') }} (%)</span>
            <input v-model="form.tax" type="number" min="0" max="100" class="h-11 w-full rounded-md border bg-transparent px-2 text-sm" :style="{ borderColor: 'var(--color-border)' }" />
          </label>
        </div>
        <p v-if="formError" role="alert" class="mt-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">{{ formError }}</p>
        <div class="mt-4 flex justify-end gap-2">
          <button type="button" class="h-11 rounded-md px-4 text-xs font-semibold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800" @click="modalOpen = false">{{ t('expenses.cancel') }}</button>
          <button
            type="button"
            :disabled="saving || !form.day || !form.categoryId || !form.amount"
            class="h-11 rounded-md bg-primary px-5 text-xs font-bold text-on-primary disabled:opacity-50"
            @click="saveExpense"
          >
            {{ t('expenses.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
