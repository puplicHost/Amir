// Admin push subscription flow (client-only). Requests browser notification
// permission on first Admin Panel visit, registers the FCM token server-side,
// and routes foreground messages into the in-app toast system.
// Missing Firebase config or denied permission disables push gracefully.

let started = false

export async function useAdminPush() {
  if (import.meta.server || started) return
  started = true

  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    if (Notification.permission === 'denied') return

    const cfg = await $fetch<{ configured: boolean, apiKey: string, authDomain: string, projectId: string, messagingSenderId: string, appId: string, vapidKey: string }>('/api/fcm-config')
    if (!cfg.configured) {
      console.warn('[push] Firebase web config missing; admin push notifications disabled.')
      return
    }

    if (Notification.permission !== 'granted') {
      try {
        if ((await Notification.requestPermission()) !== 'granted') return
      }
      catch {
        return
      }
    }

    const { initFirebasePush } = await import('./useFirebasePush')
    await initFirebasePush({
      apiKey: cfg.apiKey,
      authDomain: cfg.authDomain,
      projectId: cfg.projectId,
      messagingSenderId: cfg.messagingSenderId,
      appId: cfg.appId,
      vapidKey: cfg.vapidKey,
    })
  }
  catch {
    console.warn('[push] Admin push setup failed; continuing without push.')
  }
}
