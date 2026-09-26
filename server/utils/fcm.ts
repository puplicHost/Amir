// Firebase Cloud Messaging (Admin SDK) — server-only.
// Credentials come exclusively from environment variables; nothing is
// hardcoded or logged. If any required var is missing, push is disabled
// gracefully (returns null) instead of crashing the app.
//
// NOTE: firebase-admin v14 modular API (firebase-admin/app + messaging).
// The legacy `admin.credential` / `admin.messaging()` namespace no longer
// exists on the default export.
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getMessaging, type Messaging } from 'firebase-admin/messaging'

let app: App | null = null
let misconfigured = false

export function getAdminMessaging(): Messaging | null {
  if (app) return getMessaging(app)
  if (misconfigured) return null

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  // Env-stored private keys use literal "\n" escapes — restore real newlines.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    misconfigured = true
    console.warn('[fcm] Firebase Admin credentials missing (FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY). Push notifications disabled.')
    return null
  }

  try {
    app = getApps().length
      ? getApps()[0]
      : initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
    return getMessaging(app)
  }
  catch {
    misconfigured = true
    console.warn('[fcm] Firebase Admin initialization failed. Push notifications disabled.')
    return null
  }
}

export interface AdminPushPayload {
  /** Permission gating who receives the push (e.g. 'orders.view'). */
  permission: string
  title: string
  body: string
  /** Deep-link path opened when the notification is clicked. */
  url: string
  type: string
}

const INVALID_TOKEN_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
])

/** Find active admins holding `permission` (super admins hold all permissions). */
export async function findEligibleAdminIds(permission: string): Promise<string[]> {
  const admins = await prisma.adminUser.findMany({
    where: {
      isActive: true,
      OR: [{ isSuper: true }, { permissions: { some: { permission } } }],
    },
    select: { id: true },
  })
  return admins.map(a => a.id)
}

export async function sendPushToAdmins(payload: AdminPushPayload): Promise<{ sent: number, failed: number }> {
  const result = { sent: 0, failed: 0 }
  const messaging = getAdminMessaging()
  if (!messaging) return result

  const adminIds = await findEligibleAdminIds(payload.permission)
  if (!adminIds.length) return result

  const tokens = await prisma.adminDeviceToken.findMany({
    where: { adminUserId: { in: adminIds } },
    select: { fcmToken: true },
  })
  if (!tokens.length) return result

  try {
    const response = await messaging.sendEach(
      tokens.map(t => ({
        token: t.fcmToken,
        notification: { title: payload.title, body: payload.body },
        data: { url: payload.url, type: payload.type },
        webpush: { fcmOptions: { link: payload.url } },
      })),
    )
    const stale: string[] = []
    response.responses.forEach((r, i) => {
      if (r.success) {
        result.sent += 1
      }
      else {
        result.failed += 1
        const code = (r.error as { code?: string } | undefined)?.code
        if (code && INVALID_TOKEN_CODES.has(code)) stale.push(tokens[i].fcmToken)
        else console.warn(`[fcm] Push failed for a token (${code || 'unknown error'}).`)
      }
    })
    if (stale.length) {
      await prisma.adminDeviceToken.deleteMany({ where: { fcmToken: { in: stale } } })
    }
    if (result.sent) {
      await prisma.adminDeviceToken.updateMany({
        where: { fcmToken: { in: tokens.map(t => t.fcmToken) } },
        data: { lastUsedAt: new Date() },
      })
    }
  }
  catch {
    console.warn('[fcm] Batch push send failed.')
    result.failed += tokens.length
  }
  return result
}
