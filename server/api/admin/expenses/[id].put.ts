import { requirePermission } from '../../../utils/auth'
import { parseBody, expenseSchema } from '../../../utils/validate'
import { logAudit } from '../../../utils/audit'
import { eurToCents } from '../../../../shared/booking'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'expenses.manage')
  const id = getRouterParam(event, 'id') || ''
  const body = await parseBody(event, expenseSchema)

  const existing = await prisma.expense.findFirst({ where: { id, deletedAt: null } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Expense not found' })
  const category = await prisma.expenseCategory.findUnique({ where: { id: body.categoryId } })
  if (!category || !category.isActive) {
    throw createError({ statusCode: 400, statusMessage: 'Category is not available' })
  }
  const amountCents = eurToCents(body.amountEur)
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid amount' })
  }

  const row = await prisma.expense.update({
    where: { id },
    data: {
      day: body.day,
      categoryId: category.id,
      amountCents,
      description: body.description?.trim() || null,
      vendor: body.vendor?.trim() || null,
      payMethod: body.payMethod || 'cash',
      taxPercent: body.taxPercent ?? null,
    },
  })
  await logAudit({
    entityType: 'expense',
    entityId: row.id,
    entityName: `${row.day} · ${(amountCents / 100).toFixed(2)} EUR`,
    action: 'updated',
    details: category.nameDe,
    user,
  })
  return { expense: row }
})
