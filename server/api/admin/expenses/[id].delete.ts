import { requirePermission } from '../../../utils/auth'
import { logAudit } from '../../../utils/audit'

// Soft delete (Roadmap Phase 10): the row stays for the audit trail.
export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'expenses.manage')
  const id = getRouterParam(event, 'id') || ''
  const existing = await prisma.expense.findFirst({ where: { id, deletedAt: null } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Expense not found' })
  await prisma.expense.update({ where: { id }, data: { deletedAt: new Date() } })
  await logAudit({
    entityType: 'expense',
    entityId: id,
    entityName: `${existing.day} · ${(existing.amountCents / 100).toFixed(2)} EUR`,
    action: 'deleted',
    details: 'Soft-deleted',
    user,
  })
  return { success: true }
})
