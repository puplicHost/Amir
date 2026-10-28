import { ALL_PERMISSIONS, getEffectivePermissions } from '../../../../shared/permissions'

interface LoginBody {
  email?: unknown
  password?: unknown
}

const MAX_FAILED_LOGINS = 5
const LOCKOUT_MS = 15 * 60 * 1000

export default defineEventHandler(async (event) => {
  // Rate limited by server/middleware/rate-limit.ts (5 req/min).
  const body = await readBody<LoginBody>(event)
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  // Generic failure: never reveal whether the email exists.
  const fail = async (account?: { id: string } | null) => {
    if (account) {
      // AUDIT P2-07: persisted per-account lockout survives restarts and is
      // shared across processes. Five failures lock the account for 15 minutes.
      try {
        const updated = await prisma.adminUser.update({
          where: { id: account.id },
          data: { failedLoginCount: { increment: 1 } },
          select: { failedLoginCount: true },
        })
        if (updated.failedLoginCount >= MAX_FAILED_LOGINS) {
          await prisma.adminUser.update({
            where: { id: account.id },
            data: { failedLoginCount: 0, lockedUntil: new Date(Date.now() + LOCKOUT_MS) },
          })
          await revokeUserSessions(account.id)
        }
      }
      catch {
        // Lockout persistence must not mask the generic credential failure.
      }
    }
    await recordFailedLogin(email)
    throw createError({ statusCode: 401, statusMessage: 'Invalid email or password' })
  }

  if (!email || !password) await fail()

  const user = await prisma.adminUser.findUnique({
    where: { email },
    include: { permissions: true },
  })
  if (!user || !user.isActive) await fail()

  if (user!.lockedUntil && user!.lockedUntil.getTime() > Date.now()) {
    setHeader(event, 'retry-after', String(Math.max(1, Math.ceil((user!.lockedUntil.getTime() - Date.now()) / 1000))))
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many failed attempts. Please try again later.',
    })
  }

  if (!(await verifyPassword(password, user!.passwordHash))) await fail(user)

  await prisma.adminUser.update({
    where: { id: user!.id },
    data: {
      lastLoginAt: new Date(),
      failedLoginCount: 0,
      lockedUntil: null,
    },
  })

  const sessionUser = {
    userId: user!.id,
    email: user!.email,
    name: user!.name,
    role: user!.role,
    isSuper: user!.isSuper,
    permissions: user!.isSuper
      ? [...ALL_PERMISSIONS]
      : getEffectivePermissions(user!.role, user!.permissions.map(p => p.permission)),
  }
  await createSession(event, sessionUser)

  return { user: sessionUser }
})
