import { requirePermission } from '../../../utils/auth'
import { ensureDefaultCategories } from '../../../utils/expense-categories'

// Expense list with filters + totals (Roadmap Phase 10).
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'expenses.view')
  const q = getQuery(event)
  await ensureDefaultCategories()

  const where: Record<string, unknown> = { deletedAt: null }
  if (typeof q.from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(q.from)) {
    (where.day as any) = { ...(where.day as any || {}), gte: q.from }
  }
  if (typeof q.to === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(q.to)) {
    (where.day as any) = { ...(where.day as any || {}), lte: q.to }
  }
  if (typeof q.categoryId === 'string' && q.categoryId) where.categoryId = q.categoryId
  if (typeof q.search === 'string' && q.search.trim()) {
    const s = q.search.trim()
    where.OR = [
      { description: { contains: s, mode: 'insensitive' } },
      { vendor: { contains: s, mode: 'insensitive' } },
    ]
  }

  const [rows, categories] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: [{ day: 'desc' }, { createdAt: 'desc' }],
      take: 1000,
      include: { category: { select: { id: true, nameDe: true, nameEn: true } } },
    }),
    prisma.expenseCategory.findMany({ orderBy: [{ sortOrder: 'asc' }, { nameDe: 'asc' }] }),
  ])

  const total = rows.reduce((sum, r) => sum + r.amountCents, 0)
  const byCategory = new Map<string, { id: string, nameDe: string, nameEn: string, total: number, count: number }>()
  const byMonth = new Map<string, number>()
  for (const r of rows) {
    const c = byCategory.get(r.categoryId) || {
      id: r.categoryId, nameDe: r.category.nameDe, nameEn: r.category.nameEn, total: 0, count: 0,
    }
    c.total += r.amountCents
    c.count++
    byCategory.set(r.categoryId, c)
    const month = r.day.slice(0, 7)
    byMonth.set(month, (byMonth.get(month) || 0) + r.amountCents)
  }

  return {
    expenses: rows,
    total,
    byCategory: [...byCategory.values()].sort((a, b) => b.total - a.total),
    byMonth: [...byMonth.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, sum]) => ({ month, total: sum })),
    categories,
  }
})
