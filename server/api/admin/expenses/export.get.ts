import { Readable } from 'node:stream'
import { requirePermission } from '../../../utils/auth'
import { logAudit } from '../../../utils/audit'

// Expense CSV export (Roadmap Phase 10, no-dependency path): semicolon
// separated + BOM so German Excel opens it correctly. Respects the same
// filters as the list. Amounts are real numbers (comma decimals), dates are
// ISO days, so Excel filters and formulas work. Text cells are guarded
// against formula injection.
// AUDIT P2-03: rows are streamed in batches; totals come from DB aggregates,
// so exports are never truncated at 10,000 rows.
export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'expenses.export')
  const q = getQuery(event)

  const where: Record<string, unknown> = { deletedAt: null }
  if (typeof q.from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(q.from)) {
    (where.day as any) = { ...(where.day as any || {}), gte: q.from }
  }
  if (typeof q.to === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(q.to)) {
    (where.day as any) = { ...(where.day as any || {}), lte: q.to }
  }
  if (typeof q.categoryId === 'string' && q.categoryId) where.categoryId = q.categoryId

  const [totals, categories, categoryGroups, dayGroups] = await Promise.all([
    prisma.expense.aggregate({
      where: where as any,
      _sum: { amountCents: true },
      _count: { _all: true },
    }),
    prisma.expenseCategory.findMany({ select: { id: true, nameDe: true } }),
    prisma.expense.groupBy({
      by: ['categoryId'],
      where: where as any,
      _sum: { amountCents: true },
    }),
    prisma.expense.groupBy({
      by: ['day'],
      where: where as any,
      _sum: { amountCents: true },
    }),
  ])

  const safe = (v: string | null | undefined): string => {
    const s = String(v ?? '')
    return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  }
  const eur = (cents: number): string => (cents / 100).toFixed(2).replace('.', ',')
  const cell = (v: string): string => {
    const s = safe(v)
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  const catName = new Map(categories.map(c => [c.id, c.nameDe]))
  const monthTotals = new Map<string, number>()
  for (const group of dayGroups) {
    const month = group.day.slice(0, 7)
    monthTotals.set(month, (monthTotals.get(month) || 0) + (group._sum.amountCents || 0))
  }

  const totalCount = totals._count._all
  const total = totals._sum.amountCents || 0
  const stamp = new Date().toISOString().slice(0, 10)

  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="amir-expenses-${stamp}.csv"`)
  setHeader(event, 'Cache-Control', 'no-store')

  await logAudit({
    entityType: 'expense',
    entityId: 'export',
    entityName: `expenses-${stamp}`,
    action: 'exported',
    details: `${totalCount} row(s)`,
    user,
  })

  const BATCH = 500
  async function* csvChunks(): AsyncGenerator<Buffer> {
    // BOM as raw bytes: German Excel needs it for UTF-8 detection.
    yield Buffer.from(`\uFEFF${['Datum', 'Kategorie', 'Beschreibung', 'Lieferant', 'Zahlung', 'Betrag (EUR)', 'Steuer %'].join(';')}\n`, 'utf-8')

    let skip = 0
    while (true) {
      const rows = await prisma.expense.findMany({
        where: where as any,
        orderBy: [{ day: 'asc' }, { createdAt: 'asc' }],
        skip,
        take: BATCH,
        include: { category: { select: { nameDe: true } } },
      })
      if (!rows.length) break
      const lines = rows.map(r => [
        r.day,
        cell(r.category.nameDe),
        cell(r.description),
        cell(r.vendor),
        cell(r.payMethod),
        eur(r.amountCents),
        r.taxPercent === null || r.taxPercent === undefined ? '' : String(r.taxPercent),
      ].join(';'))
      yield Buffer.from(`${lines.join('\n')}\n`, 'utf-8')
      skip += rows.length
      if (rows.length < BATCH) break
    }

    const summary: string[] = ['']
    summary.push(['Kategorie', 'Summe (EUR)'].join(';'))
    const byCat = [...categoryGroups].sort((a, b) => (b._sum.amountCents || 0) - (a._sum.amountCents || 0))
    for (const group of byCat) {
      summary.push([cell(catName.get(group.categoryId) || ''), eur(group._sum.amountCents || 0)].join(';'))
    }
    summary.push('')
    summary.push(['Monat', 'Summe (EUR)'].join(';'))
    for (const [month, sum] of [...monthTotals.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      summary.push([month, eur(sum)].join(';'))
    }
    summary.push('')
    summary.push(['Gesamt (EUR)', eur(total)].join(';'))
    summary.push(['Zeilen', String(totalCount)].join(';'))
    yield Buffer.from(summary.join('\n'), 'utf-8')
  }

  return sendStream(event, Readable.from(csvChunks()))
})
