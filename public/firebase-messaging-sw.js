/* Firebase Cloud Messaging service worker — background push handling.
 * Served statically from site root so its scope covers the whole app.
 * Public web config is fetched from /api/fcm-config (public keys only —
 * no secrets here). If push is unconfigured, the worker stays inert. */
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js')

let messagingPromise = null

function getMessaging() {
  if (!messagingPromise) {
    messagingPromise = fetch('/api/fcm-config')
      .then((r) => r.json())
      .then((cfg) => {
        if (!cfg || !cfg.configured) throw new Error('FCM not configured')
        firebase.initializeApp({
          apiKey: cfg.apiKey,
          authDomain: cfg.authDomain,
          projectId: cfg.projectId,
          messagingSenderId: cfg.messagingSenderId,
          appId: cfg.appId,
        })
        return firebase.messaging()
      })
    messagingPromise.catch(() => { messagingPromise = null })
  }
  return messagingPromise
}

getMessaging()
  .then((messaging) => {
    messaging.onBackgroundMessage((payload) => {
      const title = (payload.notification && payload.notification.title)
        || (payload.data && payload.data.title)
        || 'Mango Electronics'
      const body = (payload.notification && payload.notification.body)
        || (payload.data && payload.data.body)
        || ''
      const url = (payload.data && payload.data.url) || '/admin'
      self.registration.showNotification(title, {
        body,
        icon: '/logo.png',
        badge: '/logo.png',
        data: { url },
      })
    })
  })
  .catch(() => { /* push unconfigured — stay inert */ })

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/admin'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.focus()
          if ('navigate' in client) return client.navigate(url)
          return undefined
        }
      }
      return clients.openWindow(url)
    }),
  )
})
