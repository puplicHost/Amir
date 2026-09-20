export default defineEventHandler(async (event) => {
  await requirePermission(event, 'users.manage')
  const users = await prisma.adminUser.findMany({
    orderBy: { createdAt: 'asc' },
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
  return {
    users: users.map(u => ({
      ...u,
      permissions: u.permissions.map(p => p.permission),
    })),
  }
})
