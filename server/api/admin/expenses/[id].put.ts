const VALID_CATEGORIES = ['rent', 'electricity', 'shipping', 'marketing', 'maintenance', 'other']

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'financials.manage')
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const data: Record<string, unknown> = {}
  if (body.category !== undefined) {
    if (!VALID_CATEGORIES.includes(String(body.category))) throw createError({ statusCode: 400, message: 'Valid category is required' })
    data.category = String(body.category)
  }
  if (body.description !== undefined) data.description = body.description ? String(body.description).trim() : null
  if (body.amount !== undefined) {
    const amount = Number(body.amount)
    if (!Number.isFinite(amount) || amount < 0) throw createError({ statusCode: 400, message: 'Valid amount is required' })
    data.amount = amount
  }
  if (body.month !== undefined) data.month = Math.min(12, Math.max(1, Number(body.month) || 1))
  if (body.year !== undefined) data.year = Number(body.year) || new Date().getFullYear()
  if (body.recurring !== undefined) data.recurring = body.recurring === true

  const expense = await prisma.expense.update({ where: { id: id || '' }, data })
  return { expense: { ...expense, amount: Number(expense.amount) } }
})
