export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'users.manage')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing user id' })

  const target = await prisma.adminUser.findUnique({ where: { id } })
  if (!target) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  if (target.isSuper) {
    throw createError({ statusCode: 403, statusMessage: 'Super-admin cannot be deleted' })
  }
  if (id === actor.userId) {
    throw createError({ statusCode: 403, statusMessage: 'You cannot delete yourself' })
  }

  await prisma.adminUser.delete({ where: { id } })
  return { ok: true }
})
