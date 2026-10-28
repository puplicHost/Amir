import { requirePermission } from '../../../utils/auth'
import { ensureDefaultCategories } from '../../../utils/expense-categories'

// Expense list with filters + totals (Roadmap Phase 10).
// AUDIT P2-03: totals and charts are computed by the database over ALL matching
// rows; only the table page is limited. No silent 1,000-row truncation.
function clampInt(raw: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof raw === 'string' ? Number.parseInt(raw, 10) : NaN
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

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

  const page = clampInt(q.page, 1, 1, 100000)
  const pageSize = clampInt(q.pageSize, 50, 1, 200)

  const [rows, totals, categories, categoryGroups, dayGroups] = await Promise.all([
    prisma.expense.findMany({
      where: where as any,
      orderBy: [{ day: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { category: { select: { id: true, nameDe: true, nameEn: true } } },
    }),
    prisma.expense.aggregate({
      where: where as any,
      _sum: { amountCents: true },
      _count: { _all: true },
    }),
    prisma.expenseCategory.findMany({ orderBy: [{ sortOrder: 'asc' }, { nameDe: 'asc' }] }),
    prisma.expense.groupBy({
      by: ['categoryId'],
      where: where as any,
      _sum: { amountCents: true },
      _count: { _all: true },
    }),
    prisma.expense.groupBy({
      by: ['day'],
      where: where as any,
      _sum: { amountCents: true },
    }),
  ])

  const categoryNames = new Map(categories.map(c => [c.id, c]))
  const byCategory = categoryGroups
    .map((group) => {
      const category = categoryNames.get(group.categoryId)
      return {
        id: group.categoryId,
        nameDe: category?.nameDe || '',
        nameEn: category?.nameEn || category?.nameDe || '',
        total: group._sum.amountCents || 0,
        count: group._count._all,
      }
    })
    .sort((a, b) => b.total - a.total)

  const monthTotals = new Map<string, number>()
  for (const group of dayGroups) {
    const month = group.day.slice(0, 7)
    monthTotals.set(month, (monthTotals.get(month) || 0) + (group._sum.amountCents || 0))
  }
  const byMonth = [...monthTotals.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, total]) => ({ month, total }))

  const totalCount = totals._count._all
  return {
    expenses: rows,
    total: totals._sum.amountCents || 0,
    totalCount,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(totalCount / pageSize)),
    byCategory,
    byMonth,
    categories,
  }
})
