import { ALL_PERMISSIONS } from '../../../../shared/permissions'

interface LoginBody {
  email?: unknown
  password?: unknown
}

export default defineEventHandler(async (event) => {
  const body = await readBody<LoginBody>(event)
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  // Generic failure: never reveal whether the email exists.
  const fail = () => {
    throw createError({ statusCode: 401, statusMessage: 'Invalid email or password' })
  }

  if (!email || !password) fail()

  const user = await prisma.adminUser.findUnique({
    where: { email },
    include: { permissions: true },
  })
  if (!user || !user.isActive) fail()
  if (!(await verifyPassword(password, user.passwordHash))) fail()

  await prisma.adminUser.update({
    where: { id: user!.id },
    data: { lastLoginAt: new Date() },
  })

  const sessionUser = {
    userId: user!.id,
    email: user!.email,
    name: user!.name,
    isSuper: user!.isSuper,
    permissions: user!.isSuper
      ? [...ALL_PERMISSIONS]
      : user!.permissions.map(p => p.permission),
  }
  await createSession(event, sessionUser)

  return { user: sessionUser }
})
