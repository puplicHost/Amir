import { requirePermission } from '../../../utils/auth'
import { ensureDefaultCategories } from '../../../utils/expense-categories'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'expenses.view')
  await ensureDefaultCategories()
  const categories = await prisma.expenseCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { nameDe: 'asc' }],
  })
  return { categories }
})
