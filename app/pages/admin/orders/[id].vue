<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const route = useRoute()
const id = String(route.params.id)

const { data, refresh, error } = await useAsyncData(`admin-order-${id}`, () =>
  $fetch<{ order: any }>(`/api/admin/orders/${id}`),
)

const newStatus = ref('')
const updating = ref(false)

if (data.value?.order) {
  newStatus.value = data.value.order.status
}

async function updateStatus() {
  if (!confirm(`Change order status to ${newStatus.value}?`)) {
    newStatus.value = data.value!.order.status
    return
  }
  updating.value = true
  try {
    await $fetch(`/api/admin/orders/${id}/status`, {
      method: 'PUT',
      body: { status: newStatus.value },
    })
    await refresh()
  }
  catch (e) {
    alert((e as any)?.data?.message || 'Update failed')
    newStatus.value = data.value!.order.status
  }
  finally {
    updating.value = false
  }
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
  <div v-if="error" class="rounded border border-red-300 bg-red-50 p-4 text-red-700">Order not found.</div>
  <div v-else-if="data?.order">
    <div class="mb-6 flex items-center justify-between gap-4">
      <div>
        <h1 class="font-heading text-2xl font-bold">Order {{ data.order.orderNumber }}</h1>
        <p class="text-sm text-slate-500">{{ new Date(data.order.createdAt).toLocaleString() }}</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="rounded-full px-3 py-1 text-sm font-bold" :class="statusColor(data.order.status)">
          {{ data.order.status }}
        </span>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      <div class="space-y-6 lg:col-span-2">
        <div class="rounded-md border bg-white p-6 dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
          <h2 class="mb-4 font-heading text-lg font-bold">Items</h2>
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b text-slate-500" :style="{ borderColor: 'var(--color-border)' }">
                <th class="pb-2 font-medium">Product</th>
                <th class="pb-2 font-medium text-right">Price</th>
                <th class="pb-2 font-medium text-right">Qty</th>
                <th class="pb-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody class="divide-y" :style="{ borderColor: 'var(--color-border)' }">
              <tr v-for="item in data.order.items" :key="item.id">
                <td class="py-3 font-medium">
                  {{ item.productNameSnapshot }}
                  <span v-if="!item.productId" class="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">Deleted</span>
                </td>
                <td class="py-3 text-right">{{ item.productPriceSnapshot }}</td>
                <td class="py-3 text-right">{{ item.quantity }}</td>
                <td class="py-3 text-right font-semibold">{{ item.subtotal }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="font-bold">
                <td colspan="3" class="pt-4 text-right">Total Amount:</td>
                <td class="pt-4 text-right text-base text-[#2B71AE]">{{ data.order.totalAmount }} EGP</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="rounded-md border bg-white p-6 dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
          <h2 class="mb-4 font-heading text-lg font-bold">Status History</h2>
          <div class="relative border-s ml-3 pl-4 space-y-6" :style="{ borderColor: 'var(--color-border)' }">
            <div v-for="h in data.order.statusHistory" :key="h.id" class="relative">
              <span class="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#2B71AE] dark:border-[#162032]"></span>
              <p class="font-bold text-sm" :class="statusColor(h.status).split(' ')[1]">{{ h.status }}</p>
              <p class="text-xs text-slate-500">{{ new Date(h.changedAt).toLocaleString() }} <span v-if="h.changedBy">— {{ h.changedBy.name }}</span></p>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-6">
        <div class="rounded-md border bg-white p-6 dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
          <h2 class="mb-4 font-heading text-lg font-bold">Customer Details</h2>
          <div class="space-y-3 text-sm">
            <div>
              <p class="text-slate-500">Name</p>
              <p class="font-medium">{{ data.order.customerName }}</p>
            </div>
            <div>
              <p class="text-slate-500">Phone</p>
              <p class="font-medium" dir="ltr">{{ data.order.customerPhone }}</p>
            </div>
            <div v-if="data.order.customerEmail">
              <p class="text-slate-500">Email</p>
              <p class="font-medium">{{ data.order.customerEmail }}</p>
            </div>
            <div>
              <p class="text-slate-500">Governorate</p>
              <p class="font-medium capitalize">{{ data.order.customerGovernorat }}</p>
            </div>
            <div v-if="data.order.customerAddress">
              <p class="text-slate-500">Address</p>
              <p class="font-medium">{{ data.order.customerAddress }}</p>
            </div>
          </div>
        </div>

        <div class="rounded-md border bg-white p-6 dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
          <h2 class="mb-4 font-heading text-lg font-bold">Payment</h2>
          <p class="text-sm font-medium">{{ data.order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online Payment' }}</p>
        </div>

        <AdminPermissionGate permission="orders.manage">
          <div class="rounded-md border bg-white p-6 dark:bg-[#162032]" :style="{ borderColor: 'var(--color-border)' }">
            <h2 class="mb-4 font-heading text-lg font-bold">Update Status</h2>
            <select v-model="newStatus" class="mb-4 h-10 w-full rounded border bg-transparent px-3 text-sm" :style="{ borderColor: 'var(--color-border)' }" :disabled="updating">
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <button
              type="button"
              class="h-10 w-full rounded bg-[#2B71AE] font-semibold text-white hover:bg-[#285E8E] disabled:opacity-50"
              :disabled="updating || newStatus === data.order.status"
              @click="updateStatus"
            >
              {{ updating ? 'Updating...' : 'Save Status' }}
            </button>
          </div>
        </AdminPermissionGate>
      </div>
    </div>
  </div>
</template>
