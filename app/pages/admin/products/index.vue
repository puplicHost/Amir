<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

interface Row {
  id: string
  slug: string
  nameAr: string
  nameEn: string
  price: string | number
  isActive: boolean
  category: { id: string, slug: string, nameAr: string, nameEn: string }
  images: { path: string }[]
}

const route = useRoute()
const router = useRouter()

const search = ref(String(route.query.search || ''))
const categoryId = ref(String(route.query.categoryId || ''))
const status = ref(String(route.query.status || ''))
const page = ref(Number(route.query.page) || 1)

const { data: catData } = await useAsyncData('admin-product-categories', () =>
  $fetch<{ categories: { id: string, nameEn: string }[] }>('/api/categories'),
)

const { data, refresh } = await useAsyncData('admin-products', () => $fetch<{ products: Row[], total: number, pages: number }>(
  `/api/admin/products?${new URLSearchParams({
    search: search.value,
    categoryId: categoryId.value,
    status: status.value,
    page: String(page.value),
  })}`,
), { watch: [page] })

async function applyFilters() {
  page.value = 1
  await router.replace({ query: { search: search.value || undefined, categoryId: categoryId.value || undefined, status: status.value || undefined } })
  await refresh()
}

async function removeProduct(p: Row) {
  if (!confirm(`Delete ${p.nameEn}? Images will be removed from storage.`)) return
  await $fetch(`/api/admin/products/${p.id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between gap-3">
      <h1 class="font-heading text-2xl font-bold">Products</h1>
      <NuxtLink to="/admin/products/new" class="flex h-10 items-center rounded bg-[#2B71AE] px-4 font-semibold text-white hover:bg-[#285E8E]">
        Add product
      </NuxtLink>
    </div>

    <div class="mt-4 flex flex-wrap gap-2">
      <input v-model="search" placeholder="Search by name…" class="h-10 rounded border bg-transparent px-3 text-sm" :style="{ borderColor: 'var(--color-border)' }" @keyup.enter="applyFilters" />
      <select v-model="categoryId" class="h-10 rounded border bg-transparent px-2 text-sm" :style="{ borderColor: 'var(--color-border)' }" @change="applyFilters">
        <option value="">All categories</option>
        <option v-for="c in catData?.categories || []" :key="c.id" :value="c.id">{{ c.nameEn }}</option>
      </select>
      <select v-model="status" class="h-10 rounded border bg-transparent px-2 text-sm" :style="{ borderColor: 'var(--color-border)' }" @change="applyFilters">
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      <button type="button" class="h-10 rounded border px-4 text-sm" :style="{ borderColor: 'var(--color-border)' }" @click="applyFilters">Apply</button>
    </div>

    <div class="mt-4 overflow-x-auto rounded-md border" :style="{ borderColor: 'var(--color-border)' }">
      <table class="w-full min-w-[760px] text-left text-sm">
        <thead>
          <tr class="border-b text-xs uppercase tracking-wide text-slate-500" :style="{ borderColor: 'var(--color-border)' }">
            <th class="px-4 py-3 font-semibold">Product</th>
            <th class="px-4 py-3 font-semibold">Category</th>
            <th class="px-4 py-3 font-semibold">Price</th>
            <th class="px-4 py-3 font-semibold">Status</th>
            <th class="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in data?.products || []" :key="p.id" class="border-b last:border-0" :style="{ borderColor: 'var(--color-border)' }">
            <td class="px-4 py-2">
              <span class="flex items-center gap-2">
                <img v-if="p.images[0]" :src="p.images[0].path" :alt="p.nameEn" class="h-12 w-12 rounded object-cover" loading="lazy" width="48" height="48" />
                <span v-else class="flex h-12 w-12 items-center justify-center rounded bg-slate-200 text-xs text-slate-500 dark:bg-slate-700">—</span>
                <span class="font-medium">{{ p.nameEn }}</span>
              </span>
            </td>
            <td class="px-4 py-3">{{ p.category.nameEn }}</td>
            <td class="px-4 py-3 font-semibold">{{ p.price }} EGP</td>
            <td class="px-4 py-3">{{ p.isActive ? 'Active' : 'Inactive' }}</td>
            <td class="px-4 py-3 text-right">
              <NuxtLink :to="`/admin/products/${p.id}/edit`" class="rounded px-2 py-1.5 font-medium text-[#2B71AE] hover:bg-slate-100 dark:hover:bg-slate-800">Edit</NuxtLink>
              <a :href="`/p/${p.slug}`" target="_blank" rel="noopener" class="rounded px-2 py-1.5 font-medium text-[#2B71AE] hover:bg-slate-100 dark:hover:bg-slate-800">View</a>
              <button type="button" class="rounded px-2 py-1.5 font-medium text-red-600 hover:bg-red-50" @click="removeProduct(p)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!data?.products?.length" class="px-4 py-8 text-center text-sm text-slate-500">No products yet.</p>
    </div>

    <div v-if="(data?.pages || 0) > 1" class="mt-4 flex items-center gap-2">
      <button type="button" class="h-10 rounded border px-4 text-sm" :style="{ borderColor: 'var(--color-border)' }" :disabled="page <= 1" @click="page--">‹ Prev</button>
      <span class="text-sm">Page {{ page }} of {{ data?.pages }}</span>
      <button type="button" class="h-10 rounded border px-4 text-sm" :style="{ borderColor: 'var(--color-border)' }" :disabled="page >= (data?.pages || 1)" @click="page++">Next ›</button>
    </div>
  </div>
</template>
