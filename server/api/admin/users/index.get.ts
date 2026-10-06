export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'users.manage')
  const users = await prisma.adminUser.findMany({
    orderBy: { createdAt: 'asc' },
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
  return {
    users: users.map(u => ({
      ...u,
      // Salary is strictly confidential: only Super Admins receive it (edit form only, never the table).
      salary: actor.isSuper && u.salary !== null ? Number(u.salary) : null,
      permissions: u.permissions.map(p => p.permission),
    })),
  }
})
