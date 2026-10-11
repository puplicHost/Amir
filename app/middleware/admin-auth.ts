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

  const user = data.value.user
  const perms = user.permissions || []
  const isSuper = user.isSuper
  const isStaffOnly = !isSuper && user.role === 'STAFF' && !perms.includes('bookings.view_all')

  const targetPath = to.path.replace(/^\/(en|ar)/, '') || '/'
  if ((targetPath === '/admin' || targetPath === '/admin/') && isStaffOnly) {
    return navigateTo(localePath('/admin/my-bookings'))
  }

  // Route-level permission gate: pages declare the exact permission they need
  // via `definePageMeta({ requiredPermission: 'products.create' })`.
  // This is defense-in-depth alongside button visibility + API enforcement.
  const required = to.meta.requiredPermission as string | string[] | undefined
  if (required) {
    const needed = Array.isArray(required) ? required : [required]
    if (!isSuper && !needed.some(p => perms.includes(p))) {
      return navigateTo(localePath(isStaffOnly ? '/admin/my-bookings' : '/admin'))
    }
  }
})
