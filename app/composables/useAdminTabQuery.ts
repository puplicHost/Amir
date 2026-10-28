import type { ComputedRef } from 'vue'

/**
 * URL-backed tab state for consolidated admin pages.
 *
 * The query parameter is authoritative: an unknown or unauthorized value is
 * replaced (client-side only) with the preferred tab (or the first allowed one),
 * so refresh, deep links and browser history all land on a valid section.
 */
export function useAdminTabQuery<T extends string>(
  allowed: ComputedRef<T[]>,
  key = 'tab',
  preferred?: () => T | null,
) {
  const route = useRoute()
  const router = useRouter()

  const requested = computed(() => {
    const value = route.query[key]
    return typeof value === 'string' ? value : ''
  })

  function fallbackTab(): T | null {
    const wanted = preferred?.()
    if (wanted && allowed.value.includes(wanted)) return wanted
    return allowed.value[0] ?? null
  }

  const activeTab = computed<T | null>(() => {
    if (allowed.value.includes(requested.value as T)) return requested.value as T
    return fallbackTab()
  })

  function selectTab(tab: string) {
    if (tab === activeTab.value) return
    return router.push({ query: { ...route.query, [key]: tab } })
  }

  if (import.meta.client) {
    watch([requested, allowed], () => {
      if (!allowed.value.length) return
      if (!allowed.value.includes(requested.value as T)) {
        const target = fallbackTab()
        if (target) router.replace({ query: { ...route.query, [key]: target } })
      }
    }, { immediate: true })
  }

  return { activeTab, selectTab }
}
