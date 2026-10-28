import { requirePermission } from '../../../utils/auth'
import { logAudit } from '../../../utils/audit'

// Expense CSV export (Roadmap Phase 10, no-dependency path): semicolon
// separated + BOM so German Excel opens it correctly. Respects the same
// filters as the list. Amounts are real numbers (comma decimals), dates are
// ISO days, so Excel filters and formulas work. Text cells are guarded
// against formula injection.
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

  const rows = await prisma.expense.findMany({
    where,
    orderBy: [{ day: 'asc' }, { createdAt: 'asc' }],
    take: 10000,
    include: { category: { select: { nameDe: true, nameEn: true } } },
  })

  const safe = (v: string | null | undefined): string => {
    const s = String(v ?? '')
    return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  }
  const eur = (cents: number): string => (cents / 100).toFixed(2).replace('.', ',')
  const cell = (v: string): string => {
    const s = safe(v)
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const L: string[] = []
  L.push(['Datum', 'Kategorie', 'Beschreibung', 'Lieferant', 'Zahlung', 'Betrag (EUR)', 'Steuer %'].join(';'))
  for (const r of rows) {
    L.push([
      r.day,
      cell(r.category.nameDe),
      cell(r.description),
      cell(r.vendor),
      cell(r.payMethod),
      eur(r.amountCents),
      r.taxPercent === null || r.taxPercent === undefined ? '' : String(r.taxPercent),
    ].join(';'))
  }
  const total = rows.reduce((sum, r) => sum + r.amountCents, 0)
  L.push('')
  L.push(['Kategorie', 'Summe (EUR)'].join(';'))
  const byCat = new Map<string, number>()
  const catName = new Map<string, string>()
  for (const r of rows) {
    byCat.set(r.categoryId, (byCat.get(r.categoryId) || 0) + r.amountCents)
    catName.set(r.categoryId, r.category.nameDe)
  }
  for (const [id, sum] of [...byCat.entries()].sort((a, b) => b[1] - a[1])) {
    L.push([cell(catName.get(id) || ''), eur(sum)].join(';'))
  }
  L.push('')
  L.push(['Monat', 'Summe (EUR)'].join(';'))
  const byMonth = new Map<string, number>()
  for (const r of rows) {
    const m = r.day.slice(0, 7)
    byMonth.set(m, (byMonth.get(m) || 0) + r.amountCents)
  }
  for (const [m, sum] of [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    L.push([m, eur(sum)].join(';'))
  }
  L.push('')
  L.push(['Gesamt (EUR)', eur(total)].join(';'))

  const stamp = new Date().toISOString().slice(0, 10)
  await logAudit({
    entityType: 'expense',
    entityId: 'export',
    entityName: `expenses-${stamp}`,
    action: 'exported',
    details: `${rows.length} row(s)`,
    user,
  })
  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="amir-expenses-${stamp}.csv"`)
  // BOM as raw bytes: German Excel needs it for UTF-8 detection, and string
  // bodies lose a leading BOM in transit.
  return Buffer.from('\uFEFF' + L.join('\n'), 'utf-8')
})
