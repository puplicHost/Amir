// Firebase push initialization — isolated so the Firebase SDK is only bundled
// and preloaded when FCM is actually configured.
//
// This composable is imported dynamically from useAdminPush.ts only after
// /api/fcm-config returns configured: true, so the Firebase chunks
// (firebase/app + firebase/messaging) are NOT loaded on every admin page
// when push is disabled.
import { useAdminToast } from './useAdminToast'
import { useAdminNotifTick } from './useAdminToast'

interface FcmConfig {
  apiKey: string
  authDomain: string
  projectId: string
  messagingSenderId: string
  appId: string
  vapidKey: string
}

export async function initFirebasePush(cfg: FcmConfig) {
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
