import { requirePermission } from '../../../utils/auth'
import { parseBody, expenseCategorySchema } from '../../../utils/validate'
import { logAudit } from '../../../utils/audit'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'expenses.manage')
  const body = await parseBody(event, expenseCategorySchema)
  const row = await prisma.expenseCategory.create({
    data: {
      nameDe: body.nameDe,
      nameEn: body.nameEn,
      isActive: body.isActive ?? true,
      sortOrder: body.sortOrder ?? 0,
    },
  })
  await logAudit({
    entityType: 'expense-category',
    entityId: row.id,
    entityName: row.nameDe,
    action: 'created',
    details: row.nameEn,
    user,
  })
  return { category: row }
})
