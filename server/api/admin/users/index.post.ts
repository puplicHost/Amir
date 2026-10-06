import { isKnownPermission } from '../../../../shared/permissions'

interface CreateUserBody {
  name?: unknown
  email?: unknown
  password?: unknown
  title?: unknown
  salary?: unknown
  permissions?: unknown
}

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'users.manage')
  const body = await readBody<CreateUserBody>(event)

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const permissions = Array.isArray(body.permissions)
    ? [...new Set(body.permissions.filter((p): p is string => typeof p === 'string' && isKnownPermission(p)))]
    : []

  if (!name) throw createError({ statusCode: 400, statusMessage: 'Name is required' })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Valid email is required' })
  }
  if (password.length < 8) {
    throw createError({ statusCode: 400, statusMessage: 'Password must be at least 8 characters' })
  }
  if (await prisma.adminUser.findUnique({ where: { email } })) {
    throw createError({ statusCode: 409, statusMessage: 'Email already in use' })
  }

  const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim().slice(0, 60) : null
  // Salary can only be set by a Super Admin; silently ignored otherwise.
  const salaryRaw = actor.isSuper ? Number(body.salary) : NaN
  const salary = Number.isFinite(salaryRaw) && salaryRaw >= 0 ? salaryRaw : null

  const user = await prisma.adminUser.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      title,
      salary,
      permissions: { create: permissions.map(permission => ({ permission })) },
    },
    select: {
      id: true,
      email: true,
      name: true,
      title: true,
      salary: true,
      isSuper: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      permissions: { select: { permission: true } },
    },
  })
  await notifyAdmins({
    type: 'new_staff_user',
    relatedEntityId: user.id,
    url: '/admin/users',
    titleEn: `New staff account: ${user.name}`,
    titleAr: `حساب إداري جديد: ${user.name}`,
    bodyEn: `${user.email} · by ${actor.name}`,
    bodyAr: `${user.email} · بواسطة ${actor.name}`,
  })

  return {
    user: {
      ...user,
      salary: actor.isSuper && user.salary !== null ? Number(user.salary) : null,
      permissions: user.permissions.map(p => p.permission),
    },
  }
})
