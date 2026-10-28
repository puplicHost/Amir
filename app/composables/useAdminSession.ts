export interface AdminSessionUser {
  userId: string
  email: string
  name: string
  role: string
  isSuper: boolean
  permissions: string[]
}

export function useAdminSession() {
  const fetch = useRequestFetch()
  return useAsyncData<{ user: AdminSessionUser }>('admin-session', () =>
    fetch('/api/admin/auth/session'),
  )
}

/** True when the signed-in admin holds at least one of the given permissions. */
export function useAdminCan(permission: string | string[]): ComputedRef<boolean> {
  const { data } = useAdminSession()
  const needed = Array.isArray(permission) ? permission : [permission]
  return computed(() => {
    const granted = data.value?.user.permissions ?? []
    return needed.some(p => granted.includes(p))
  })
}

export async function adminLogout(): Promise<void> {
  const localePath = useLocalePath()
  await $fetch('/api/admin/auth/logout', { method: 'POST' })
  await clearNuxtData('admin-session')
  await navigateTo(localePath('/admin/login'))
}
