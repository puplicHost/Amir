<script setup lang="ts">
const mobileOpen = ref(false)

onMounted(() => {
  useAdminPush()
})
</script>

<template>
  <div class="min-h-screen bg-neutral-50 text-neutral-900 lg:flex dark:bg-bg dark:text-neutral-100">
    <!-- Collapsible/Persistent Admin Sidebar -->
    <AdminSidebar
      :mobile-open="mobileOpen"
      @close-mobile="mobileOpen = false"
    />

    <!-- Main Content Area with Top Header -->
    <div class="flex min-w-0 flex-1 flex-col">
      <AdminHeader @toggle-sidebar="mobileOpen = !mobileOpen" />
      <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-on-primary">
        {{ $t('admin.skipToContent') }}
      </a>

      <main id="main-content" class="flex-1 p-4 sm:p-6 lg:p-8">
        <div class="mx-auto max-w-7xl">
          <slot />
        </div>
      </main>
    </div>

    <!-- Foreground push toasts -->
    <AdminToasts />

    <!-- Branded destructive-action confirmations -->
    <AdminConfirmDialog />
  </div>
</template>
