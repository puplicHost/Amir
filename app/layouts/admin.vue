<script setup lang="ts">
const mobileOpen = ref(false)

onMounted(() => {
  useAdminPush()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 lg:flex dark:bg-[#0B1520] dark:text-slate-100">
    <!-- Collapsible/Persistent Admin Sidebar -->
    <AdminSidebar
      :mobile-open="mobileOpen"
      @close-mobile="mobileOpen = false"
    />

    <!-- Main Content Area with Top Header -->
    <div class="flex min-w-0 flex-1 flex-col">
      <AdminHeader @toggle-sidebar="mobileOpen = !mobileOpen" />
      
      <main class="flex-1 p-4 sm:p-6 lg:p-8">
        <div class="mx-auto max-w-7xl">
          <slot />
        </div>
      </main>
    </div>

    <!-- Foreground push toasts -->
    <AdminToasts />
  </div>
</template>
