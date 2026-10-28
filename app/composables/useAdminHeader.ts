// Shared header data for the admin shell.
//
// Groups the three small client-only header fetches (notifications, activity,
// inbox unread) into a single parallel request group so an admin page load
// does 1 request group (+ /api/fcm-config from useAdminPush) instead of 4
// sequential round-trips. Results are cached in useState across route
// navigations within the same session.
export const useAdminHeader = () => {
  const data = useState('admin-header', () => null as
    | { notifs: any; activity: any; inbox: any }
    | null)
  const started = useState('admin-header-started', () => false)

  const load = async () => {
    if (started.value || data.value) return
    started.value = true
    try {
      const [notifs, activity, inbox] = await Promise.all([
        $fetch('/api/admin/notifications', { params: { page: 1, limit: 7 } }),
        $fetch('/api/admin/activity', { params: { page: 1, limit: 7 } }),
        $fetch('/api/admin/inbox', { params: { page: 1, limit: 1 } }),
      ])
      data.value = { notifs, activity, inbox }
    }
    catch (err) {
      console.warn('[admin-header] Failed to load header data:', err)
    }
    finally {
      started.value = false
    }
  }

  const invalidate = () => {
    data.value = null
    started.value = false
  }

  // Trigger the load once on the client; guarded by `started`/`data` so
  // multiple components sharing this composable fetch only once.
  if (import.meta.client) {
    load()
  }

  return { data, load, invalidate }
}
