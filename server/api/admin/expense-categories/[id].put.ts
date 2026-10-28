import { requirePermission } from '../../../utils/auth'
import { parseBody, expenseCategorySchema } from '../../../utils/validate'
import { logAudit } from '../../../utils/audit'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'expenses.manage')
  const id = getRouterParam(event, 'id') || ''
  const body = await parseBody(event, expenseCategorySchema)
  const existing = await prisma.expenseCategory.findUnique({ where: { id } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  const row = await prisma.expenseCategory.update({
    where: { id },
    data: {
      nameDe: body.nameDe,
      nameEn: body.nameEn,
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
    },
  })
  await logAudit({
    entityType: 'expense-category',
    entityId: row.id,
    entityName: row.nameDe,
    action: 'updated',
    details: row.nameEn,
    user,
  })
  return { category: row }
})
