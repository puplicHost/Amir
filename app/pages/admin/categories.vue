<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t } = useI18n()

interface Category {
  id: string
  nameAr: string
  nameEn: string
  slug: string
  descriptionAr: string | null
  descriptionEn: string | null
  coverImagePath: string | null
  coverVideoUrl: string | null
  featuredOnHomepage: boolean
  sortOrder: number
}

const { data, refresh } = await useAsyncData('admin-categories', () =>
  $fetch<{ categories: Category[] }>('/api/categories'),
)

const showModal = ref(false)
const editing = ref<Category | null>(null)
const form = reactive({
  nameAr: '', nameEn: '', slug: '', descriptionAr: '', descriptionEn: '',
  coverVideoUrl: '', featuredOnHomepage: false, sortOrder: 0,
})
const coverFile = ref<File | null>(null)
const formError = ref('')
const saving = ref(false)

function openCreate() {
  editing.value = null
  Object.assign(form, { nameAr: '', nameEn: '', slug: '', descriptionAr: '', descriptionEn: '', coverVideoUrl: '', featuredOnHomepage: false, sortOrder: 0 })
  coverFile.value = null
  formError.value = ''
  showModal.value = true
}

function openEdit(c: Category) {
  editing.value = c
  Object.assign(form, {
    nameAr: c.nameAr, nameEn: c.nameEn, slug: c.slug,
    descriptionAr: c.descriptionAr || '', descriptionEn: c.descriptionEn || '',
    coverVideoUrl: c.coverVideoUrl || '', featuredOnHomepage: c.featuredOnHomepage, sortOrder: c.sortOrder,
  })
  coverFile.value = null
  formError.value = ''
  showModal.value = true
}

async function save() {
  saving.value = true
  formError.value = ''
  try {
    let id = editing.value?.id
    if (editing.value) {
      const res = await $fetch<{ category: Category }>(`/api/admin/categories/${id}`, { method: 'PUT', body: { ...form } })
      id = res.category.id
    }
    else {
      const res = await $fetch<{ category: Category }>('/api/admin/categories', { method: 'POST', body: { ...form } })
      id = res.category.id
    }
    if (coverFile.value && id) {
      const fd = new FormData()
      fd.append('cover', coverFile.value)
      await $fetch(`/api/admin/categories/${id}/cover`, { method: 'POST', body: fd })
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

async function removeCategory(c: Category) {
  if (!confirm(`Delete ${c.nameEn}?`)) return
  try {
    await $fetch(`/api/admin/categories/${c.id}`, { method: 'DELETE' })
    await refresh()
  }
  catch (e) {
    alert((e as { data?: { message?: string } })?.data?.message || 'Delete failed')
  }
}

function onCover(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  coverFile.value = f && f.size <= 5 * 1024 * 1024 ? f : null
}

const inputCls = 'h-10 w-full rounded border bg-transparent px-3'
</script>

<template>
  <div>
    <div class="flex items-center justify-between gap-3">
      <h1 class="font-heading text-2xl font-bold">{{ t('admin.categories') }}</h1>
      <button type="button" class="h-10 rounded bg-[#2B71AE] px-4 font-semibold text-white hover:bg-[#285E8E]" @click="openCreate">
        Add category
      </button>
    </div>

    <div class="mt-6 overflow-x-auto rounded-md border" :style="{ borderColor: 'var(--color-border)' }">
      <table class="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr class="border-b text-xs uppercase tracking-wide text-slate-500" :style="{ borderColor: 'var(--color-border)' }">
            <th class="px-4 py-3 font-semibold">Name (EN)</th>
            <th class="px-4 py-3 font-semibold">Name (AR)</th>
            <th class="px-4 py-3 font-semibold">Slug</th>
            <th class="px-4 py-3 font-semibold">Featured</th>
            <th class="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in data?.categories || []" :key="c.id" class="border-b last:border-0" :style="{ borderColor: 'var(--color-border)' }">
            <td class="px-4 py-3 font-medium">{{ c.nameEn }}</td>
            <td class="px-4 py-3">{{ c.nameAr }}</td>
            <td class="px-4 py-3 text-slate-500">{{ c.slug }}</td>
            <td class="px-4 py-3">{{ c.featuredOnHomepage ? 'Yes' : 'No' }}</td>
            <td class="px-4 py-3 text-right">
              <button type="button" class="rounded px-2 py-1.5 font-medium text-[#2B71AE] hover:bg-slate-100 dark:hover:bg-slate-800" @click="openEdit(c)">Edit</button>
              <button type="button" class="rounded px-2 py-1.5 font-medium text-red-600 hover:bg-red-50" @click="removeCategory(c)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!data?.categories?.length" class="px-4 py-8 text-center text-sm text-slate-500">No categories yet.</p>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div class="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-lg bg-white p-6 shadow-lg dark:bg-[#162032]">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="font-heading text-xl font-bold">{{ editing ? 'Edit category' : 'Add category' }}</h2>
          <button type="button" class="flex h-10 w-10 items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800" @click="showModal = false">✕</button>
        </div>
        <div v-if="formError" role="alert" class="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{{ formError }}</div>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="block"><span class="mb-1 block text-sm font-medium">Name (AR) *</span><input v-model="form.nameAr" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" /></label>
          <label class="block"><span class="mb-1 block text-sm font-medium">Name (EN) *</span><input v-model="form.nameEn" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" /></label>
        </div>
        <label class="mt-3 block"><span class="mb-1 block text-sm font-medium">Slug (auto if empty)</span><input v-model="form.slug" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" /></label>
        <label class="mt-3 block"><span class="mb-1 block text-sm font-medium">Description (AR)</span><textarea v-model="form.descriptionAr" rows="2" class="w-full rounded border bg-transparent px-3 py-2" :style="{ borderColor: 'var(--color-border)' }" /></label>
        <label class="mt-3 block"><span class="mb-1 block text-sm font-medium">Description (EN)</span><textarea v-model="form.descriptionEn" rows="2" class="w-full rounded border bg-transparent px-3 py-2" :style="{ borderColor: 'var(--color-border)' }" /></label>
        <label class="mt-3 block"><span class="mb-1 block text-sm font-medium">Cover image (max 5MB)</span><input type="file" accept="image/jpeg,image/png,image/webp" class="text-sm" @change="onCover" /></label>
        <label class="mt-3 block"><span class="mb-1 block text-sm font-medium">Cover video URL (optional)</span><input v-model="form.coverVideoUrl" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" /></label>
        <div class="mt-3 flex items-center gap-4">
          <label class="inline-flex items-center gap-2 text-sm"><input v-model="form.featuredOnHomepage" type="checkbox" class="h-4 w-4" /> Feature on homepage</label>
          <label class="inline-flex items-center gap-2 text-sm">Order <input v-model.number="form.sortOrder" type="number" class="h-9 w-20 rounded border bg-transparent px-2" :style="{ borderColor: 'var(--color-border)' }" /></label>
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="h-10 rounded border px-4" :style="{ borderColor: 'var(--color-border)' }" @click="showModal = false">Cancel</button>
          <button type="button" :disabled="saving" class="h-10 rounded bg-[#2B71AE] px-4 font-semibold text-white hover:bg-[#285E8E] disabled:opacity-50" @click="save">{{ saving ? '…' : 'Save' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
