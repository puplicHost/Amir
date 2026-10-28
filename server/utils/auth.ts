import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import { ALL_PERMISSIONS, getEffectivePermissions } from '../../shared/permissions'
import { getClientIp } from './client-ip.ts'

export interface SessionUser {
  userId: string
  email: string
  name: string
  role: string
  isSuper: boolean
  permissions: string[]
}

/** Sealed cookie payload. Never returned to API clients. */
interface SessionCookie {
  userId: string
  sessionId: string
  sessionToken: string
}

function isHttpsRequest(event: H3Event): boolean {
  const proto = getRequestHeader(event, 'x-forwarded-proto')
  if (proto) {
    return proto.split(',')[0].trim().toLowerCase() === 'https'
  }
  const req = event.node?.req
  return Boolean(
    (req?.socket as any)?.encrypted ||
    (req?.connection as any)?.encrypted ||
    req?.headers?.['x-forwarded-ssl'] === 'on'
  )
}

function sessionConfig(event: H3Event) {
  const config = useRuntimeConfig(event)
  const password = config.sessionPassword as string | undefined
  if (!password || password.length < 32) {
    throw createError({ statusCode: 500, statusMessage: 'Session misconfigured' })
  }
  const config2 = config.public as Record<string, string> | undefined
  const siteUrl = String(config2?.siteUrl || process.env.NUXT_PUBLIC_SITE_URL || '')
  // Force Secure whenever the canonical site is HTTPS, even if a reverse proxy
  // fails to forward `x-forwarded-proto`. Only skip Secure for plain-HTTP dev.
  const secure = isHttpsRequest(event) || siteUrl.startsWith('https://')
  return {
    name: 'amir_admin_session',
    password,
    maxAge: 60 * 60 * 24 * 7, // 7 days (sets iron-seal TTL and cookie expires)
    cookie: {
      httpOnly: true,
      secure,
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 7, // 7 days (sets cookie Max-Age)
      path: '/',
    },
  }
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function tokenMatches(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashSessionToken(token), 'hex')
  const expected = Buffer.from(expectedHash, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

/** Revoke every session for a user, optionally keeping the current one. */
export async function revokeUserSessions(userId: string, exceptSessionId?: string): Promise<number> {
  const result = await prisma.adminSession.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  })
  return result.count
}

/** Revoke all sessions except the caller's current session. */
export async function revokeOtherSessions(event: H3Event, userId: string): Promise<number> {
  const session = await useSession<SessionCookie>(event, sessionConfig(event))
  const currentId = session.data.sessionId
  return revokeUserSessions(userId, currentId || undefined)
}

export async function getSessionUser(event: H3Event): Promise<SessionUser | null> {
  const session = await useSession<SessionCookie>(event, sessionConfig(event))
  const data = session.data
  if (!data.userId) return null

  // AUDIT P2-08: cookies issued before the session registry existed are not
  // accepted. Deploying this change intentionally forces a one-time re-login.
  if (!data.sessionId || !data.sessionToken) {
    await clearSession(event, sessionConfig(event))
    return null
  }

  const record = await prisma.adminSession.findUnique({ where: { id: data.sessionId } })
  const now = new Date()
  if (
    !record
    || record.userId !== data.userId
    || record.revokedAt
    || record.expiresAt <= now
    || !tokenMatches(data.sessionToken, record.tokenHash)
  ) {
    await clearSession(event, sessionConfig(event))
    return null
  }

  // Re-validate against DB on every authenticated request: deactivated users
  // lose access immediately even before their cookie expires.
  const user = await prisma.adminUser.findUnique({
    where: { id: record.userId },
    include: { permissions: true },
  })
  if (!user || !user.isActive) {
    await prisma.adminSession.update({ where: { id: record.id }, data: { revokedAt: now } }).catch(() => null)
    await clearSession(event, sessionConfig(event))
    return null
  }

  // Password changes invalidate any session created before the change.
  if (user.passwordChangedAt && record.createdAt < user.passwordChangedAt) {
    await prisma.adminSession.update({ where: { id: record.id }, data: { revokedAt: now } }).catch(() => null)
    await clearSession(event, sessionConfig(event))
    return null
  }

  // Throttle lastUsedAt writes: at most once every 10 minutes per session.
  if (now.getTime() - record.lastUsedAt.getTime() > 10 * 60 * 1000) {
    await prisma.adminSession.update({
      where: { id: record.id },
      data: { lastUsedAt: now },
    }).catch(() => null)
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isSuper: user.isSuper,
    permissions: user.isSuper
      ? [...ALL_PERMISSIONS]
      : getEffectivePermissions(user.role, user.permissions.map(p => p.permission)),
  }
}

export async function requireAuth(event: H3Event): Promise<SessionUser> {
  const user = await getSessionUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  return user
}

export async function requirePermission(event: H3Event, permission: string | string[]): Promise<SessionUser> {
  const user = await requireAuth(event)
  const required = Array.isArray(permission) ? permission : [permission]
  const ok = user.isSuper || required.some(p => user.permissions.includes(p))
  if (!ok) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return user
}

export async function createSession(event: H3Event, user: SessionUser): Promise<void> {
  // AUDIT P2-08: a random bearer token is sealed in the cookie; only its hash
  // is persisted. Every request verifies the row and the token.
  const sessionToken = randomBytes(32).toString('base64url')
  const sessionId = randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const ip = getClientIp(event)
  const userAgent = String(getRequestHeader(event, 'user-agent') || '').slice(0, 1000) || null

  await prisma.adminSession.create({
    data: {
      id: sessionId,
      userId: user.userId,
      tokenHash: hashSessionToken(sessionToken),
      ip: ip === 'unknown' ? null : ip,
      userAgent,
      expiresAt,
    },
  })

  const session = await useSession<SessionCookie>(event, sessionConfig(event))
  await session.update({
    userId: user.userId,
    sessionId,
    sessionToken,
  })
}

export async function destroySession(event: H3Event): Promise<void> {
  const session = await useSession<SessionCookie>(event, sessionConfig(event))
  const sessionId = session.data.sessionId
  if (sessionId) {
    await prisma.adminSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    }).catch(() => null)
  }
  await clearSession(event, sessionConfig(event))
}
