import { requirePermission } from '../../../utils/auth'
import { logAudit } from '../../../utils/audit'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'expenses.manage')
  const id = getRouterParam(event, 'id') || ''
  const existing = await prisma.expenseCategory.findUnique({ where: { id } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  const used = await prisma.expense.count({ where: { categoryId: id, deletedAt: null } })
  if (used > 0) {
    // Used categories are deactivated instead of deleted.
    const row = await prisma.expenseCategory.update({ where: { id }, data: { isActive: false } })
    await logAudit({
      entityType: 'expense-category',
      entityId: id,
      entityName: existing.nameDe,
      action: 'updated',
      details: 'Deactivated (in use)',
      user,
    })
    return { category: row, deactivated: true }
  }
  await prisma.expenseCategory.delete({ where: { id } })
  await logAudit({
    entityType: 'expense-category',
    entityId: id,
    entityName: existing.nameDe,
    action: 'deleted',
    details: '',
    user,
  })
  return { success: true }
})
