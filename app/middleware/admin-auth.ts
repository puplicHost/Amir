export default defineNuxtRouteMiddleware(async (to) => {
  const localePath = useLocalePath()
  const { data, error } = await useAdminSession()

  if (error.value || !data.value?.user) {
    return navigateTo(localePath('/admin/login'))
  }

  const user = data.value.user
  const perms = user.permissions || []
  const isSuper = user.isSuper
  const isStaffOnly = !isSuper && user.role === 'STAFF' && !perms.includes('bookings.view_all')

  const targetPath = to.path.replace(/^\/(en|ar)/, '') || '/'
  if ((targetPath === '/admin' || targetPath === '/admin/') && isStaffOnly) {
    return navigateTo({ path: localePath('/admin/appointments'), query: { tab: 'my-bookings' } })
  }

  // Route-level permission gate: pages declare the exact permission they need
  // via `definePageMeta({ requiredPermission: 'products.manage' })`.
  // This is defense-in-depth alongside button visibility + API enforcement.
  const required = to.meta.requiredPermission as string | string[] | undefined
  if (required) {
    const needed = Array.isArray(required) ? required : [required]
    if (!isSuper && !needed.some(p => perms.includes(p))) {
      return navigateTo(isStaffOnly ? { path: localePath('/admin/appointments'), query: { tab: 'my-bookings' } } : localePath('/admin'))
    }
  }
})
