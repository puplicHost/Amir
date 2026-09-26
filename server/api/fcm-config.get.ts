// Public endpoint serving Firebase *public* web config to the client app and
// the messaging service worker. Contains no secrets — web API keys are
// designed to be public. Missing values yield `configured: false` so the
// client disables push gracefully.
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event).public as Record<string, string>

  const out = {
    apiKey: config.firebaseApiKey || '',
    authDomain: config.firebaseAuthDomain || '',
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    messagingSenderId: config.firebaseMessagingSenderId || '',
    appId: config.firebaseAppId || '',
    vapidKey: config.firebaseVapidKey || '',
  }

  return { ...out, configured: Boolean(out.apiKey && out.messagingSenderId && out.appId && out.vapidKey) }
})
