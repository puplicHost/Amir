import { isKnownPermission } from '../../../../shared/permissions'

interface UpdateUserBody {
  name?: unknown
  isActive?: unknown
  permissions?: unknown
}

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'users.manage')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing user id' })

  const target = await prisma.adminUser.findUnique({
    where: { id },
    include: { permissions: true },
  })
  if (!target) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  if (target.isSuper) {
    throw createError({ statusCode: 403, statusMessage: 'Super-admin cannot be modified' })
  }

  const body = await readBody<UpdateUserBody>(event)
  const data: { name?: string, isActive?: boolean } = {}

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) throw createError({ statusCode: 400, statusMessage: 'Name is required' })
    data.name = name
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== 'boolean') {
      throw createError({ statusCode: 400, statusMessage: 'isActive must be boolean' })
    }
    if (id === actor.userId && body.isActive === false) {
      throw createError({ statusCode: 403, statusMessage: 'You cannot deactivate yourself' })
    }
    data.isActive = body.isActive
  }

  let permissions: string[] | undefined
  if (body.permissions !== undefined) {
    if (!Array.isArray(body.permissions)) {
      throw createError({ statusCode: 400, statusMessage: 'permissions must be an array' })
    }
    permissions = [...new Set(body.permissions.filter((p): p is string => typeof p === 'string' && isKnownPermission(p)))]
    if (id === actor.userId && !permissions.includes('users.manage')) {
      throw createError({ statusCode: 403, statusMessage: 'You cannot remove your own users.manage permission' })
    }
  }

  const user = await prisma.adminUser.update({
    where: { id },
    data: {
      ...data,
      ...(permissions !== undefined
        ? {
            permissions: {
              deleteMany: {},
              create: permissions.map(permission => ({ permission })),
            },
          }
        : {}),
    },
    select: {
      id: true,
      email: true,
      name: true,
      isSuper: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      permissions: { select: { permission: true } },
    },
  })
  return { user: { ...user, permissions: user.permissions.map(p => p.permission) } }
})
