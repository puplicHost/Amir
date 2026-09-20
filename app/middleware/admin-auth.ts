export default defineNuxtRouteMiddleware(async () => {
  const { data, error } = await useAdminSession()
  // Refresh on each admin navigation so deactivation applies immediately.
  await refreshNuxtData('admin-session')
  if (error.value || !data.value?.user) {
    return navigateTo('/admin/login')
  }
})
