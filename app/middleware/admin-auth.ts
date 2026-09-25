export default defineNuxtRouteMiddleware(async () => {
  const localePath = useLocalePath()
  const { data, error, refresh } = await useAdminSession()

  // On client-side navigation between admin pages, re-verify session to catch deactivations immediately
  if (import.meta.client) {
    await refresh()
  }

  if (error.value || !data.value?.user) {
    return navigateTo(localePath('/admin/login'))
  }
})
