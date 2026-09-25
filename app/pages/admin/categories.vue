<script setup lang="ts">
import { FolderTree, Image as ImageIcon, Pencil, Plus, Search, Star, Trash2, X } from 'lucide-vue-next'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const { t, locale } = useI18n()

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

const savingOrderId = ref<string | null>(null)

async function saveSortOrder(c: Category) {
  const next = Number(c.sortOrder) || 0
  savingOrderId.value = c.id
  try {
    await $fetch(`/api/admin/categories/${c.id}`, {
      method: 'PUT',
      body: { sortOrder: next },
    })
    await refresh()
  }
  catch (e) {
    alert((e as { data?: { message?: string } })?.data?.message || 'Failed to save order')
    await refresh()
  }
  finally {
    savingOrderId.value = null
  }
}

const route = useRoute()
const router = useRouter()

const page = ref(Number(route.query.page) || 1)
const limit = 20
const searchQuery = ref(String(route.query.search || ''))
const fetch = useRequestFetch()

const { data, refresh, pending } = await useAsyncData('admin-categories', () =>
  fetch<{ categories: Category[], total: number, pages: number }>(`/api/categories?${new URLSearchParams({
    search: searchQuery.value.trim(),
    page: String(page.value),
    limit: String(limit),
  })}`),
  { watch: [page] },
)
const showModal = ref(false)
const editing = ref<Category | null>(null)
const form = reactive({
  nameAr: '',
  nameEn: '',
  slug: '',
  descriptionAr: '',
  descriptionEn: '',
  coverVideoUrl: '',
  featuredOnHomepage: false,
  sortOrder: 0,
})
const coverFile = ref<File | null>(null)
const coverPreview = ref<string | null>(null)
const formError = ref('')
const saving = ref(false)
const deletingId = ref<string | null>(null)

const pagedCategories = computed(() => data.value?.categories || [])
const totalCategories = computed(() => data.value?.total ?? pagedCategories.value.length)

async function gotoPage(p: number) {
  page.value = p
  await router.replace({
    query: {
      search: searchQuery.value.trim() || undefined,
      page: p > 1 ? String(p) : undefined,
    },
  })
}

async function applySearch() {
  page.value = 1
  await router.replace({
    query: {
      search: searchQuery.value.trim() || undefined,
    },
  })
  await refresh()
}

function openCreate() {
  editing.value = null
  Object.assign(form, {
    nameAr: '',
    nameEn: '',
    slug: '',
    descriptionAr: '',
    descriptionEn: '',
    coverVideoUrl: '',
    featuredOnHomepage: false,
    sortOrder: (totalCategories.value || 0) + 1,
  })
  coverFile.value = null
  coverPreview.value = null
  formError.value = ''
  showModal.value = true
}

function openEdit(c: Category) {
  editing.value = c
  Object.assign(form, {
    nameAr: c.nameAr,
    nameEn: c.nameEn,
    slug: c.slug,
    descriptionAr: c.descriptionAr || '',
    descriptionEn: c.descriptionEn || '',
    coverVideoUrl: c.coverVideoUrl || '',
    featuredOnHomepage: c.featuredOnHomepage,
    sortOrder: c.sortOrder,
  })
  coverFile.value = null
  coverPreview.value = c.coverImagePath
  formError.value = ''
  showModal.value = true
}

function onCoverChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      formError.value = locale.value === 'ar' ? 'حجم الصورة يجب ألا يتجاوز 5 ميجابايت' : 'Image size must be 5MB or less.'
      return
    }
    coverFile.value = file
    coverPreview.value = URL.createObjectURL(file)
  }
}

async function save() {
  if (!form.nameAr.trim() || !form.nameEn.trim()) {
    formError.value = locale.value === 'ar' ? 'الاسم باللغتين العربية والإنجليزية مطلوب' : 'Name in both Arabic and English is required.'
    return
  }

  saving.value = true
  formError.value = ''
  try {
    let id = editing.value?.id
    if (editing.value) {
      const res = await $fetch<{ category: Category }>(`/api/admin/categories/${id}`, {
        method: 'PUT',
        body: { ...form },
      })
      id = res.category.id
    }
    else {
      const res = await $fetch<{ category: Category }>('/api/admin/categories', {
        method: 'POST',
        body: { ...form },
      })
      id = res.category.id
    }

    if (coverFile.value && id) {
      const fd = new FormData()
      fd.append('cover', coverFile.value)
      await $fetch(`/api/admin/categories/${id}/cover`, {
        method: 'POST',
        body: fd,
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

async function removeCategory(c: Category) {
  if (!confirm(`Are you sure you want to delete category "${c.nameEn}"? This action cannot be undone.`)) return
  deletingId.value = c.id
  try {
    await $fetch(`/api/admin/categories/${c.id}`, { method: 'DELETE' })
    await refresh()
    if (!pagedCategories.value.length && page.value > 1) await gotoPage(page.value - 1)
  }
  catch (e) {
    alert((e as { data?: { message?: string } })?.data?.message || 'Delete failed')
  }
  finally {
    deletingId.value = null
  }
}

const inputCls = 'h-10 w-full rounded-md border bg-transparent px-3 text-sm transition-colors focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:focus:border-[#2B71AE]'
</script>

<template>
  <div>
    <!-- Page Header -->
    <AdminPageHeader
      :title="t('admin.categories')"
      :description="locale === 'ar' ? 'إدارة تصنيفات الكتالوج، الأوصاف، وصور الغلاف.' : 'Manage catalog categories, descriptions, and cover images.'"
    >
      <template #actions>
        <button
          type="button"
          class="inline-flex h-10 items-center gap-1.5 rounded-md bg-[#2B71AE] px-4 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#285E8E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B71AE]"
          @click="openCreate"
        >
          <Plus class="h-4 w-4" aria-hidden="true" />
          <span>{{ locale === 'ar' ? 'إضافة فئة' : 'Add Category' }}</span>
        </button>
      </template>
    </AdminPageHeader>

    <!-- Toolbar: Search & Counters -->
    <form class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" @submit.prevent="applySearch">
      <div class="relative w-full sm:max-w-xs">
        <Search class="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          v-model="searchQuery"
          type="search"
          :placeholder="locale === 'ar' ? 'بحث في الفئات…' : 'Filter categories…'"
          class="h-9 w-full rounded-md border bg-white ps-9 pe-3 text-xs placeholder:text-slate-400 focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 dark:bg-[#162032]"
          :style="{ borderColor: 'var(--color-border)' }"
          @change="applySearch"
        />
      </div>
      <div class="text-xs text-slate-500">
        {{ locale === 'ar' ? `إجمالي الفئات: ${totalCategories}` : `Total Categories: ${totalCategories}` }}
      </div>
    </form>

    <!-- Categories Data Table -->
    <div class="overflow-hidden rounded-md border bg-white shadow-xs dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-start text-sm">
          <thead>
            <tr class="border-b bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800/40 dark:text-slate-400" :style="{ borderColor: 'var(--color-border)' }">
              <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'الفئة' : 'Category' }}</th>
              <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'الاسم بالعربية' : 'Arabic Name' }}</th>
              <th scope="col" class="px-4 py-3 text-start">{{ locale === 'ar' ? 'الرابط (Slug)' : 'Slug' }}</th>
              <th scope="col" class="px-4 py-3 text-center">{{ locale === 'ar' ? 'مميز بالرئيسية' : 'Featured' }}</th>
              <th scope="col" class="px-4 py-3 text-center">{{ locale === 'ar' ? 'الترتيب' : 'Order' }}</th>
              <th scope="col" class="px-4 py-3 text-end">{{ locale === 'ar' ? 'الإجراءات' : 'Actions' }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
            <tr
              v-for="c in pagedCategories"
              :key="c.id"
              class="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
            >
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-slate-100 dark:bg-slate-800" :style="{ borderColor: 'var(--color-border)' }">
                    <img
                      v-if="c.coverImagePath"
                      :src="c.coverImagePath"
                      :alt="c.nameEn"
                      class="h-full w-full object-cover"
                      loading="lazy"
                    />
                    <div v-else class="flex h-full w-full items-center justify-center text-slate-400">
                      <FolderTree class="h-5 w-5" aria-hidden="true" />
                    </div>
                  </div>
                  <div>
                    <span class="font-semibold text-slate-900 dark:text-slate-100">{{ c.nameEn }}</span>
                    <p v-if="c.descriptionEn" class="line-clamp-1 max-w-xs text-xs text-slate-500">
                      {{ c.descriptionEn }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                {{ c.nameAr }}
              </td>
              <td class="px-4 py-3">
                <span class="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {{ c.slug }}
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <span
                  v-if="c.featuredOnHomepage"
                  class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40"
                >
                  <Star class="h-3 w-3 fill-amber-500 text-amber-500" aria-hidden="true" />
                  <span>{{ locale === 'ar' ? 'مميز' : 'Featured' }}</span>
                </span>
                <span v-else class="text-xs text-slate-400">-</span>
              </td>
              <td class="px-4 py-3 text-center">
                <input
                  v-model.number="c.sortOrder"
                  type="number"
                  min="0"
                  :disabled="savingOrderId === c.id"
                  :aria-label="locale === 'ar' ? `ترتيب العرض لفئة ${c.nameAr}` : `Display order for ${c.nameEn}`"
                  :title="locale === 'ar' ? 'عدّل الرقم ثم اضغط Enter للحفظ' : 'Edit the number, then press Enter to save'"
                  class="h-8 w-20 rounded-md border bg-transparent px-2 text-center font-mono text-xs text-slate-700 transition-colors focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20 disabled:opacity-50 dark:text-slate-300"
                  :style="{ borderColor: 'var(--color-border)' }"
                  @change="saveSortOrder(c)"
                />
              </td>
              <td class="px-4 py-3 text-end">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    class="inline-flex h-8 items-center gap-1 rounded px-2.5 text-xs font-medium text-[#2B71AE] transition-colors hover:bg-[#2B71AE]/10 dark:text-blue-400 dark:hover:bg-blue-950/50"
                    @click="openEdit(c)"
                  >
                    <Pencil class="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{{ locale === 'ar' ? 'تعديل' : 'Edit' }}</span>
                  </button>
                  <button
                    type="button"
                    :disabled="deletingId === c.id"
                    class="inline-flex h-8 items-center gap-1 rounded px-2.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                    @click="removeCategory(c)"
                  >
                    <Trash2 class="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{{ locale === 'ar' ? 'حذف' : 'Delete' }}</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <AdminPagination
        :page="page"
        :pages="data?.pages || 1"
        :total="totalCategories"
        :item-name="locale === 'ar' ? 'فئة' : 'categories'"
        @change="gotoPage"
      />

      <!-- Empty State -->
      <div v-if="!pagedCategories.length" class="p-8">
        <AdminEmptyState
          :title="searchQuery ? (locale === 'ar' ? 'لا توجد فئات مطابقة للبحث' : 'No matching categories found') : (locale === 'ar' ? 'لا توجد فئات حتى الآن' : 'No categories yet')"
          :description="searchQuery ? (locale === 'ar' ? 'جرب البحث بكلمات أخرى.' : 'Try a different search term.') : (locale === 'ar' ? 'ابدأ بإضافة أول فئة لترتيب منتجاتك.' : 'Create your first category to start organizing products.')"
          :icon="FolderTree"
        >
          <template #action>
            <button
              v-if="!searchQuery"
              type="button"
              class="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#2B71AE] px-4 text-xs font-semibold text-white shadow-xs hover:bg-[#285E8E]"
              @click="openCreate"
            >
              <Plus class="h-3.5 w-3.5" aria-hidden="true" />
              <span>{{ locale === 'ar' ? 'إضافة فئة' : 'Add Category' }}</span>
            </button>
          </template>
        </AdminEmptyState>
      </div>
    </div>

    <!-- Create / Edit Category Modal Dialog -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      @click.self="showModal = false"
    >
      <div
        class="my-8 max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-lg border bg-white p-6 shadow-xl transition-all dark:bg-[#162032]"
        :style="{ borderColor: 'var(--color-border)' }"
      >
        <!-- Modal Header -->
        <div class="mb-5 flex items-center justify-between border-b pb-4" :style="{ borderColor: 'var(--color-border)' }">
          <div>
            <h2 class="font-heading text-lg font-bold text-slate-900 dark:text-slate-100">
              {{ editing ? (locale === 'ar' ? 'تعديل الفئة' : 'Edit Category') : (locale === 'ar' ? 'إضافة فئة جديدة' : 'Add Category') }}
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              {{ locale === 'ar' ? 'تحديد الاسم والصورة وبيانات العرض' : 'Configure names, cover media, and display settings' }}
            </p>
          </div>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            :aria-label="locale === 'ar' ? 'إغلاق النافذة' : 'Close modal'"
            @click="showModal = false"
          >
            <X class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <!-- Form Error Banner -->
        <div
          v-if="formError"
          role="alert"
          class="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
        >
          {{ formError }}
        </div>

        <!-- Form Body -->
        <div class="space-y-4">
          <!-- Dual Language Names -->
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Name (EN) *</span>
              <input v-model="form.nameEn" type="text" required placeholder="e.g. Microcontrollers" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Name (AR) *</span>
              <input v-model="form.nameAr" type="text" required placeholder="مثال: ميكروكنترولر" dir="rtl" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
            </label>
          </div>

          <!-- Slug -->
          <label class="block">
            <div class="flex items-center justify-between">
              <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Slug</span>
              <span class="text-[11px] text-slate-400">Auto-generated if left empty</span>
            </div>
            <input v-model="form.slug" type="text" placeholder="e.g. microcontrollers" :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
          </label>

          <!-- Dual Language Descriptions -->
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Description (EN)</span>
              <textarea v-model="form.descriptionEn" rows="2" class="w-full rounded-md border bg-transparent p-2.5 text-xs transition-colors focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20" :style="{ borderColor: 'var(--color-border)' }" />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Description (AR)</span>
              <textarea v-model="form.descriptionAr" rows="2" dir="rtl" class="w-full rounded-md border bg-transparent p-2.5 text-xs transition-colors focus:border-[#2B71AE] focus:outline-none focus:ring-2 focus:ring-[#2B71AE]/20" :style="{ borderColor: 'var(--color-border)' }" />
            </label>
          </div>

          <!-- Cover Image Upload with Preview -->
          <div>
            <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Cover Image</span>
            <div class="flex items-start gap-4 rounded-md border p-3" :style="{ borderColor: 'var(--color-border)' }">
              <div class="relative flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                <img v-if="coverPreview" :src="coverPreview" alt="Preview" class="h-full w-full object-cover" />
                <ImageIcon v-else class="h-6 w-6 text-slate-400" aria-hidden="true" />
              </div>
              <div class="flex-1 text-xs">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  class="block w-full text-xs text-slate-500 file:me-3 file:rounded-md file:border-0 file:bg-[#2B71AE]/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#2B71AE] hover:file:bg-[#2B71AE]/20 cursor-pointer"
                  @change="onCoverChange"
                />
                <span class="mt-1 block text-[11px] text-slate-400">JPG, PNG or WEBP (Max 5MB)</span>
              </div>
            </div>
          </div>

          <!-- Cover Video URL -->
          <label class="block">
            <span class="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Cover Video URL (Optional)</span>
            <input v-model="form.coverVideoUrl" type="url" placeholder="https://..." :class="inputCls" :style="{ borderColor: 'var(--color-border)' }" />
          </label>

          <!-- Toggles & Order -->
          <div class="flex flex-wrap items-center justify-between gap-4 border-t pt-4" :style="{ borderColor: 'var(--color-border)' }">
            <label class="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              <input v-model="form.featuredOnHomepage" type="checkbox" class="h-4 w-4 rounded accent-[#2B71AE]" />
              <span>{{ locale === 'ar' ? 'عرض كفئة مميزة في الصفحة الرئيسية' : 'Feature on homepage' }}</span>
            </label>

            <label class="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
              <span>{{ locale === 'ar' ? 'الترتيب:' : 'Sort order:' }}</span>
              <input v-model.number="form.sortOrder" type="number" class="h-8 w-20 rounded border bg-transparent px-2 text-center text-xs" :style="{ borderColor: 'var(--color-border)' }" />
            </label>
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
            <span>{{ saving ? (locale === 'ar' ? 'جاري الحفظ…' : 'Saving…') : (locale === 'ar' ? 'حفظ الفئة' : 'Save Category') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
