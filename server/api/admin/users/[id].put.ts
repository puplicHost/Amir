import { isKnownPermission } from '../../../../shared/permissions'
import { ADMIN_ROLES } from '../../../../shared/booking'

interface UpdateUserBody {
  name?: unknown
  title?: unknown
  salary?: unknown
  role?: unknown
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
  const data: { name?: string, title?: string | null, salary?: number | null, role?: string, isActive?: boolean } = {}

  // 1. Role validation & self-change prevention
  if (body.role !== undefined) {
    if (typeof body.role !== 'string' || !ADMIN_ROLES.includes(body.role as any)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid role' })
    }
    if (id === actor.userId && body.role !== actor.role) {
      throw createError({ statusCode: 400, statusMessage: 'You cannot change your own role' })
    }
    data.role = body.role
  }

  // 2. Active status & self-deactivation prevention
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== 'boolean') {
      throw createError({ statusCode: 400, statusMessage: 'isActive must be boolean' })
    }
    if (id === actor.userId && body.isActive === false) {
      throw createError({ statusCode: 400, statusMessage: 'You cannot deactivate yourself' })
    }
    data.isActive = body.isActive
  }

  // 3. Last active ADMIN protection
  const isTargetActiveAdmin = target.isActive && target.role === 'ADMIN' && !target.isSuper
  const willLoseAdmin = (body.isActive === false) || (data.role !== undefined && data.role !== 'ADMIN')
  if (isTargetActiveAdmin && willLoseAdmin) {
    const activeAdminsCount = await prisma.adminUser.count({
      where: {
        isActive: true,
        role: 'ADMIN',
        isSuper: false,
      },
    })
    if (activeAdminsCount <= 1) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Cannot demote or deactivate the last active administrator',
      })
    }
  }

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) throw createError({ statusCode: 400, statusMessage: 'Name is required' })
    data.name = name
  }
  if (body.title !== undefined) {
    data.title = typeof body.title === 'string' && body.title.trim() ? body.title.trim().slice(0, 60) : null
  }
  // Salary is strictly Super-Admin-only; silently ignored for everyone else.
  if (body.salary !== undefined && actor.isSuper) {
    if (body.salary === null || body.salary === '') {
      data.salary = null
    }
    else {
      const salary = Number(body.salary)
      if (!Number.isFinite(salary) || salary < 0) throw createError({ statusCode: 400, statusMessage: 'Valid salary is required' })
      data.salary = salary
    }
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
      title: true,
      salary: true,
      role: true,
      isSuper: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      permissions: { select: { permission: true } },
    },
  })

  // AUDIT P2-08: deactivation revokes every active session immediately.
  if (!user.isActive) {
    await revokeUserSessions(user.id)
  }

  // Security-audit notification — only for permission or active-state changes.
  const oldPerms = target.permissions.map(p => p.permission).sort().join(',')
  const newPerms = (permissions ?? target.permissions.map(p => p.permission)).sort().join(',')
  const permsChanged = oldPerms !== newPerms
  const activeChanged = body.isActive !== undefined && target.isActive !== user.isActive
  if (permsChanged || activeChanged) {
    const changesEn: string[] = []
    const changesAr: string[] = []
    if (permsChanged) {
      changesEn.push(`permissions: ${newPerms || 'none'}`)
      changesAr.push(`Berechtigungen: ${newPerms || 'keine'}`)
    }
    if (activeChanged) {
      changesEn.push(user.isActive ? 'reactivated' : 'deactivated')
      changesAr.push(user.isActive ? 'aktiviert' : 'deaktiviert')
    }
    await notifyAdmins({
      type: 'staff_updated',
      relatedEntityId: user.id,
      url: '/admin/salon?tab=team&teamTab=users',
      titleEn: `Staff updated: ${user.name}`,
      titleAr: `Mitarbeiter aktualisiert: ${user.name}`,
      bodyEn: `${user.email} · ${changesEn.join(' · ')} · by ${actor.name}`,
      bodyAr: `${user.email} · ${changesAr.join(' · ')} · von ${actor.name}`,
    })
  }

  return {
    user: {
      ...user,
      salary: actor.isSuper && user.salary !== null ? Number(user.salary) : null,
      permissions: user.permissions.map(p => p.permission),
    },
  }
})
