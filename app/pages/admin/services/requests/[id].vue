<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const reqId = route.params.id as string

useHead(() => ({ title: `Request Detail — Admin — ${t('brand.name')}` }))

const { data: request, refresh } = await useAsyncData(`service-request-${reqId}`, () =>
  $fetch<any>(`/api/admin/services/requests/${reqId}`)
)

const updating = ref(false)
async function updateStatus(newStatus: string) {
  updating.value = true
  try {
    await $fetch(`/api/admin/services/requests/${reqId}/status`, {
      method: 'PUT',
      body: { status: newStatus }
    })
    await refresh()
  } catch (e) {
    alert('Error updating status')
  }
  updating.value = false
}

function getLabel(fieldId: string) {
  if (!request.value?.service?.formFields) return fieldId
  const f = request.value.service.formFields.find((f:any) => f.id === fieldId)
  return f ? `${f.labelEn} / ${f.labelAr}` : fieldId
}
</script>

<template>
  <div v-if="request">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">Request #{{ request.id.slice(-6) }}</h1>
      <NuxtLink :to="localePath('/admin/services')" class="text-sm text-[#2B71AE] hover:underline">
        &larr; Back to Services
      </NuxtLink>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      <div class="lg:col-span-2 space-y-6">
        <div class="rounded-md border p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <h2 class="font-bold text-lg mb-4">Request Data</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div v-for="val in request.values" :key="val.id" class="mb-2">
               <div class="text-xs text-slate-500 font-medium mb-1">{{ getLabel(val.fieldId) }}</div>
               <div class="text-sm whitespace-pre-wrap">{{ val.value || '-' }}</div>
             </div>
          </div>
        </div>

        <div v-if="request.attachments?.length > 0" class="rounded-md border p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <h2 class="font-bold text-lg mb-4">Attachments</h2>
          <ul class="space-y-2">
            <li v-for="att in request.attachments" :key="att.id" class="flex items-center gap-2">
               <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
               <a :href="`/api/admin/services/requests/${request.id}/attachments/${att.id}`" target="_blank" class="text-sm text-[#2B71AE] hover:underline">
                 {{ att.originalName }}
               </a>
            </li>
          </ul>
        </div>
      </div>

      <div class="space-y-6">
        <div class="rounded-md border p-6 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800">
           <h2 class="font-bold text-lg mb-4">Status & Info</h2>
           <div class="space-y-3 text-sm">
             <div>
               <span class="text-slate-500 block mb-1">Service:</span>
               <span class="font-medium">{{ request.service.nameEn }}</span>
             </div>
             <div>
               <span class="text-slate-500 block mb-1">Submitted At:</span>
               <span>{{ new Date(request.submittedAt).toLocaleString() }}</span>
             </div>
             <div>
               <span class="text-slate-500 block mb-2">Current Status:</span>
               <span class="rounded px-2 py-1 text-xs font-medium" 
                      :class="{
                        'bg-blue-100 text-blue-700': request.status === 'New',
                        'bg-yellow-100 text-yellow-700': request.status === 'In Review',
                        'bg-green-100 text-green-700': request.status === 'Done',
                        'bg-slate-100 text-slate-700': request.status === 'Closed'
                      }">
                  {{ request.status }}
               </span>
             </div>
           </div>

           <div class="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
             <h3 class="text-sm font-medium mb-3">Update Status</h3>
             <div class="flex flex-col gap-2">
               <button @click="updateStatus('In Review')" :disabled="updating || request.status === 'In Review'" class="text-left px-3 py-2 rounded text-sm hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 border border-transparent">Mark as In Review</button>
               <button @click="updateStatus('Done')" :disabled="updating || request.status === 'Done'" class="text-left px-3 py-2 rounded text-sm hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 border border-transparent">Mark as Done</button>
               <button @click="updateStatus('Closed')" :disabled="updating || request.status === 'Closed'" class="text-left px-3 py-2 rounded text-sm hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 border border-transparent">Close Request</button>
             </div>
           </div>
        </div>
      </div>
    </div>
  </div>
</template>
