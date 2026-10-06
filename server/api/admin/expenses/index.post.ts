const VALID_CATEGORIES = ['rent', 'electricity', 'shipping', 'marketing', 'maintenance', 'other']

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'financials.manage')
  const body = await readBody(event)

  const category = String(body.category || '')
  if (!VALID_CATEGORIES.includes(category)) throw createError({ statusCode: 400, message: 'Valid category is required' })
  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount < 0) throw createError({ statusCode: 400, message: 'Valid amount is required' })
  const now = new Date()
  const month = body.month !== undefined ? Math.min(12, Math.max(1, Number(body.month) || now.getMonth() + 1)) : now.getMonth() + 1
  const year = body.year !== undefined ? Number(body.year) || now.getFullYear() : now.getFullYear()

  const expense = await prisma.expense.create({
    data: {
      category,
      description: body.description ? String(body.description).trim() : null,
      amount,
      month,
      year,
      recurring: body.recurring === true,
    },
  })
  return { expense: { ...expense, amount: Number(expense.amount) } }
})
