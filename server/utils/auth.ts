import type { H3Event } from 'h3'
import { ALL_PERMISSIONS, getEffectivePermissions } from '../../shared/permissions'

export interface SessionUser {
  userId: string
  email: string
  name: string
  role: string
  isSuper: boolean
  permissions: string[]
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
  const isHttps = isHttpsRequest(event)
  return {
    name: 'amir_admin_session',
    password,
    maxAge: 60 * 60 * 24 * 7, // 7 days (sets iron-seal TTL and cookie expires)
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && isHttps,
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 7, // 7 days (sets cookie Max-Age)
      path: '/',
    },
  }
}

export async function getSessionUser(event: H3Event): Promise<SessionUser | null> {
  const session = await useSession<SessionUser>(event, sessionConfig(event))
  if (!session.data.userId) return null
  // Re-validate against DB on every authenticated request: deactivated users
  // lose access immediately even before their cookie expires.
  const user = await prisma.adminUser.findUnique({
    where: { id: session.data.userId },
    include: { permissions: true },
  })
  if (!user || !user.isActive) {
    await clearSession(event, sessionConfig(event))
    return null
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
  const session = await useSession<SessionUser>(event, sessionConfig(event))
  await session.update(user)
}

export async function destroySession(event: H3Event): Promise<void> {
  await clearSession(event, sessionConfig(event))
}
