<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

const activeTab = ref('general')

const tabs = [
  { id: 'general', label: 'General', ready: true },
  { id: 'contact', label: 'Contact', ready: true },
  { id: 'seo', label: 'SEO / GEO', ready: true },
  { id: 'store', label: 'Store Config', ready: true },
  { id: 'payment', label: 'Payment', ready: true },
]
</script>

<template>
  <div>
    <h1 class="font-heading text-2xl font-bold">Settings</h1>
    <div class="mt-6 border-b" :style="{ borderColor: 'var(--color-border)' }">
      <nav class="-mb-px flex gap-6" aria-label="Tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors"
          :class="[
            activeTab === tab.id
              ? 'border-[#2B71AE] text-[#2B71AE] dark:border-[#F5CC07] dark:text-[#F5CC07]'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:hover:text-slate-300',
            { 'opacity-40 cursor-not-allowed': !tab.ready }
          ]"
          :disabled="!tab.ready"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </nav>
    </div>

    <div class="mt-6 max-w-2xl">
      <div v-if="activeTab === 'general'">
        <AdminSettingsGeneral />
      </div>
      <div v-else-if="activeTab === 'contact'">
        <AdminSettingsContact />
      </div>
      <div v-else-if="activeTab === 'seo'">
        <AdminSettingsSeo />
      </div>
      <div v-else-if="activeTab === 'store'">
        <AdminSettingsStore />
      </div>
      <div v-else-if="activeTab === 'payment'">
        <AdminSettingsPayment />
      </div>
    </div>
  </div>
</template>
