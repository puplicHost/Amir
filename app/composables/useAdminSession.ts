export interface AdminSessionUser {
  userId: string
  email: string
  name: string
  isSuper: boolean
  permissions: string[]
}

export function useAdminSession() {
  const fetch = useRequestFetch()
  return useAsyncData<{ user: AdminSessionUser }>('admin-session', () =>
    fetch('/api/admin/auth/session'),
  )
}

export function useAdminCan(permission: string): ComputedRef<boolean> {
  const { data } = useAdminSession()
  return computed(() => data.value?.user.permissions.includes(permission) ?? false)
}

export async function adminLogout(): Promise<void> {
  const localePath = useLocalePath()
  await $fetch('/api/admin/auth/logout', { method: 'POST' })
  await clearNuxtData('admin-session')
  await navigateTo(localePath('/admin/login'))
}
