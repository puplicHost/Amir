<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })
const { t } = useI18n()
const localePath = useLocalePath()

useHead(() => ({ title: `Services — Admin — ${t('brand.name')}` }))

const activeTab = ref<'services'|'requests'>('services')

// Data
const { data: services, refresh: refreshServices } = await useAsyncData('admin-services', () =>
  $fetch<any[]>('/api/admin/services')
)

const requestsPage = ref(1)
const requestsLimit = 20
const { data: requestsData, refresh: refreshRequests } = await useAsyncData('admin-requests', () =>
  $fetch<any>('/api/admin/services/requests', { params: { page: requestsPage.value, limit: requestsLimit } }),
  { watch: [requestsPage] }
)

// Actions
const deleting = ref('')
async function deleteService(id: string) {
  if (!confirm('Are you sure you want to delete this service?')) return
  deleting.value = id
  try {
    await $fetch(`/api/admin/services/${id}`, { method: 'DELETE' })
    await refreshServices()
  } catch (e: any) {
    alert(e.data?.message || 'Error deleting service')
  }
  deleting.value = ''
}

async function toggleActive(service: any) {
  try {
    await $fetch(`/api/admin/services/${service.id}`, {
      method: 'PUT',
      body: { ...service, isActive: !service.isActive }
    })
    await refreshServices()
  } catch (e) {
    alert('Error toggling status')
  }
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between"> <h1 class="text-2xl font-bold">Services Management</h1> </div>

    <div class="mb-6 flex space-x-4 border-b border-slate-200 rtl:space-x-reverse dark:border-slate-800">
      <button 
        @click="activeTab = 'services'"
        class="pb-2 px-1 border-b-2 font-medium"
        :class="activeTab === 'services' ? 'border-[#2B71AE] text-[#2B71AE]' : 'border-transparent text-slate-500 hover:text-slate-700'"
      >
        Services
      </button>
      <button 
        @click="activeTab = 'requests'"
        class="pb-2 px-1 border-b-2 font-medium"
        :class="activeTab === 'requests' ? 'border-[#2B71AE] text-[#2B71AE]' : 'border-transparent text-slate-500 hover:text-slate-700'"
      >
        Service Requests
      </button>
    </div>

    <div v-if="activeTab === 'services'">
      <div class="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th class="p-3 font-medium">Name (AR/EN)</th>
              <th class="p-3 font-medium">Status</th>
              <th class="p-3 font-medium">Fields</th>
              <th class="p-3 font-medium">Requests</th>
              <th class="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
            <tr v-for="service in services" :key="service.id" class="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td class="p-3">
                <div class="font-medium">{{ service.nameEn }}</div>
                <div class="text-xs text-slate-500">{{ service.nameAr }}</div>
              </td>
              <td class="p-3">
                <button 
                  @click="toggleActive(service)"
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="service.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'"
                >
                  {{ service.isActive ? 'Active' : 'Inactive' }}
                </button>
              </td>
              <td class="p-3">{{ service._count.formFields }}</td>
              <td class="p-3">{{ service._count.requests }}</td>
              <td class="p-3">
                <div class="flex gap-2">
                  <NuxtLink :to="localePath(`/admin/services/${service.id}/form`)" class="text-[#2B71AE] hover:underline">
                    Form Builder
                  </NuxtLink>
                  <button 
                    v-if="service._count.requests === 0"
                    @click="deleteService(service.id)"
                    :disabled="deleting === service.id"
                    class="text-red-500 hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-else>
      <div class="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
        <table class="w-full text-left text-sm">
          <thead class="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th class="p-3 font-medium">Req #</th>
              <th class="p-3 font-medium">Service</th>
              <th class="p-3 font-medium">Date</th>
              <th class="p-3 font-medium">Status</th>
              <th class="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
            <tr v-for="req in requestsData?.requests" :key="req.id" class="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td class="p-3 font-mono text-xs">{{ req.id.slice(-6) }}</td>
              <td class="p-3">{{ req.service.nameEn }}</td>
              <td class="p-3">{{ new Date(req.submittedAt).toLocaleDateString() }}</td>
              <td class="p-3">
                <span class="rounded px-2 py-0.5 text-xs font-medium" 
                      :class="{
                        'bg-blue-100 text-blue-700': req.status === 'New',
                        'bg-yellow-100 text-yellow-700': req.status === 'In Review',
                        'bg-green-100 text-green-700': req.status === 'Done',
                        'bg-slate-100 text-slate-700': req.status === 'Closed'
                      }">
                  {{ req.status }}
                </span>
              </td>
              <td class="p-3">
                <NuxtLink :to="localePath(`/admin/services/requests/${req.id}`)" class="text-[#2B71AE] hover:underline">
                  View
                </NuxtLink>
              </td>
            </tr>
            <tr v-if="!requestsData?.requests?.length">
              <td colspan="5" class="p-6 text-center text-slate-500">No requests found.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="mt-4 flex items-center justify-between" v-if="requestsData?.total > requestsLimit">
        <button 
          @click="requestsPage--" 
          :disabled="requestsPage === 1"
          class="px-3 py-1 border rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span class="text-sm">Page {{ requestsPage }}</span>
        <button 
          @click="requestsPage++"
          :disabled="requestsPage * requestsLimit >= requestsData?.total"
          class="px-3 py-1 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>
