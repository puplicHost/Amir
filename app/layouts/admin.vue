<template>
  <div class="min-h-screen lg:flex">
    <AdminSidebar />
    <div class="flex-1">
      <main class="p-4 lg:p-8">
        <slot />
      </main>
    </div>
  </div>
</template>
