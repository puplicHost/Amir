export default defineEventHandler(async (event) => {
  await requirePermission(event, 'financials.view')
  const q = getQuery(event)
  const now = new Date()
  const month = Math.min(12, Math.max(1, Number(q.month) || now.getMonth() + 1))
  const year = Math.max(2000, Math.min(2100, Number(q.year) || now.getFullYear()))
  const end = new Date(year, month, 1)

  const expenses = await prisma.expense.findMany({
    where: {
      OR: [
        { year, month, recurring: false },
        { recurring: true, createdAt: { lt: end } },
      ],
    },
    orderBy: { createdAt: 'desc' },
  })
  return {
    month,
    year,
    expenses: expenses.map(e => ({ ...e, amount: Number(e.amount) })),
  }
})
