export default defineNuxtRouteMiddleware(async (to) => {
  const localePath = useLocalePath()
  const { data, error, refresh } = await useAdminSession()

  // On client-side navigation between admin pages, re-verify session to catch deactivations immediately
  if (import.meta.client) {
    await refresh()
  }

  if (error.value || !data.value?.user) {
    return navigateTo(localePath('/admin/login'))
  }

  // Route-level permission gate: pages declare the exact permission they need
  // via `definePageMeta({ requiredPermission: 'products.create' })`.
  // This is defense-in-depth alongside button visibility + API enforcement.
  const required = to.meta.requiredPermission as string | string[] | undefined
  if (required) {
    const needed = Array.isArray(required) ? required : [required]
    const perms = data.value.user.permissions || []
    const isSuper = data.value.user.isSuper
    if (!isSuper && !needed.some(p => perms.includes(p))) {
      return navigateTo(localePath('/admin'))
    }
  }
})
