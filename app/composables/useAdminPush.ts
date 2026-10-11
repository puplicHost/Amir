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

    const { initializeApp, getApps, getApp } = await import('firebase/app')
    const { getMessaging, getToken, onMessage } = await import('firebase/messaging')

    const app = getApps().length
      ? getApp()
      : initializeApp({
        apiKey: cfg.apiKey,
        authDomain: cfg.authDomain,
        projectId: cfg.projectId,
        messagingSenderId: cfg.messagingSenderId,
        appId: cfg.appId,
      })

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    const messaging = getMessaging(app)
    const token = await getToken(messaging, {
      vapidKey: cfg.vapidKey,
      serviceWorkerRegistration: registration,
    })
    if (!token) return

    try {
      await $fetch('/api/admin/notifications/register-token', {
        method: 'POST',
        body: { token },
      })
    }
    catch {
      console.warn('[push] Failed to register device token.')
    }

    const { push } = useAdminToast()
    const tick = useAdminNotifTick()
    onMessage(messaging, (payload) => {
      const title = payload.notification?.title || (payload.data?.title as string) || 'AMIR'
      const body = payload.notification?.body || (payload.data?.body as string) || ''
      const url = (payload.data?.url as string) || '/admin'
      push({ title, body, url })
      tick.value += 1
    })
  }
  catch {
    console.warn('[push] Admin push setup failed; continuing without push.')
  }
}
