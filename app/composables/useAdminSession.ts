export interface AdminSessionUser {
  userId: string
  email: string
  name: string
  isSuper: boolean
  permissions: string[]
}

export function useAdminSession() {
  return useAsyncData<{ user: AdminSessionUser }>('admin-session', () =>
    $fetch('/api/admin/auth/session'),
  )
}

export function useAdminCan(permission: string): ComputedRef<boolean> {
  const { data } = useAdminSession()
  return computed(() => data.value?.user.permissions.includes(permission) ?? false)
}

export async function adminLogout(): Promise<void> {
  await $fetch('/api/admin/auth/logout', { method: 'POST' })
  await clearNuxtData('admin-session')
  await navigateTo('/admin/login')
}
