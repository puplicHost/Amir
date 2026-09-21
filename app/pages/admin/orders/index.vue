<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const router = useRouter()

const search = ref(String(route.query.search || ''))
const status = ref(String(route.query.status || ''))
const paymentMethod = ref(String(route.query.paymentMethod || ''))
const page = ref(Number(route.query.page) || 1)

interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerPhone: string
  customerGovernorat: string
  totalAmount: string
  paymentMethod: string
  status: string
  createdAt: string
  _count: { items: number }
}

const { data, refresh } = await useAsyncData('admin-orders', () =>
  $fetch<{ orders: Order[], pages: number, total: number }>(`/api/admin/orders?${new URLSearchParams({
    search: search.value,
    status: status.value,
    paymentMethod: paymentMethod.value,
    page: String(page.value),
  })}`),
  { watch: [page] }
)

async function applyFilters() {
  page.value = 1
  await router.replace({ query: { search: search.value || undefined, status: status.value || undefined, paymentMethod: paymentMethod.value || undefined } })
  await refresh()
}

function formatDate(d: string) {
  return new Date(d).toLocaleString()
}

const statusColor = (s: string) => {
  switch (s) {
    case 'Pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'Processing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    case 'Shipped': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
    case 'Delivered': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    case 'Cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
  }
}
</script>

<template>
  <div>
    <h1 class="font-heading text-2xl font-bold">Orders</h1>

    <div class="mt-6 flex flex-wrap gap-2">
      <input v-model="search" placeholder="Search orders, names, phones..." class="h-10 min-w-64 rounded border bg-transparent px-3 text-sm" :style="{ borderColor: 'var(--color-border)' }" @keyup.enter="applyFilters" />
      <select v-model="status" class="h-10 rounded border bg-transparent px-2 text-sm" :style="{ borderColor: 'var(--color-border)' }" @change="applyFilters">
        <option value="">All statuses</option>
        <option value="Pending">Pending</option>
        <option value="Processing">Processing</option>
        <option value="Shipped">Shipped</option>
        <option value="Delivered">Delivered</option>
        <option value="Cancelled">Cancelled</option>
      </select>
      <select v-model="paymentMethod" class="h-10 rounded border bg-transparent px-2 text-sm" :style="{ borderColor: 'var(--color-border)' }" @change="applyFilters">
        <option value="">All payment methods</option>
        <option value="COD">Cash on Delivery</option>
        <option value="ONLINE">Online Payment</option>
      </select>
      <button type="button" class="h-10 rounded border px-4 text-sm" :style="{ borderColor: 'var(--color-border)' }" @click="applyFilters">Apply</button>
    </div>

    <div class="mt-4 overflow-x-auto rounded-md border" :style="{ borderColor: 'var(--color-border)' }">
      <table class="w-full min-w-[960px] text-left text-sm">
        <thead>
          <tr class="border-b text-xs uppercase tracking-wide text-slate-500" :style="{ borderColor: 'var(--color-border)' }">
            <th class="px-4 py-3 font-semibold">Order</th>
            <th class="px-4 py-3 font-semibold">Date</th>
            <th class="px-4 py-3 font-semibold">Customer</th>
            <th class="px-4 py-3 font-semibold">Total</th>
            <th class="px-4 py-3 font-semibold">Status</th>
            <th class="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in data?.orders || []" :key="o.id" class="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50" :style="{ borderColor: 'var(--color-border)' }">
            <td class="px-4 py-3 font-medium">{{ o.orderNumber }}</td>
            <td class="px-4 py-3 text-slate-500">{{ formatDate(o.createdAt) }}</td>
            <td class="px-4 py-3">
              <p>{{ o.customerName }}</p>
              <p class="text-xs text-slate-500">{{ o.customerPhone }}</p>
            </td>
            <td class="px-4 py-3 font-semibold">{{ o.totalAmount }} EGP</td>
            <td class="px-4 py-3">
              <span class="rounded-full px-2.5 py-0.5 text-xs font-bold" :class="statusColor(o.status)">{{ o.status }}</span>
            </td>
            <td class="px-4 py-3 text-right">
              <NuxtLink :to="`/admin/orders/${o.id}`" class="rounded px-3 py-1.5 font-medium text-[#2B71AE] hover:bg-slate-100 dark:hover:bg-slate-800">
                View
              </NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!data?.orders?.length" class="px-4 py-8 text-center text-sm text-slate-500">No orders found.</p>
    </div>

    <div v-if="(data?.pages || 0) > 1" class="mt-4 flex items-center gap-2">
      <button type="button" class="h-10 rounded border px-4 text-sm" :style="{ borderColor: 'var(--color-border)' }" :disabled="page <= 1" @click="page--">‹ Prev</button>
      <span class="text-sm">Page {{ page }} of {{ data?.pages }}</span>
      <button type="button" class="h-10 rounded border px-4 text-sm" :style="{ borderColor: 'var(--color-border)' }" :disabled="page >= (data?.pages || 1)" @click="page++">Next ›</button>
    </div>
  </div>
</template>
