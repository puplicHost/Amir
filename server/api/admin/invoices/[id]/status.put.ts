export default defineEventHandler(async (event) => {
  await requirePermission(event, 'invoices.manage')
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const data: Record<string, unknown> = {}
  if (body.status !== undefined) {
    if (!['Pending', 'Paid', 'Cancelled'].includes(body.status)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid status' })
    }
    data.status = body.status
  }
  if (body.notes !== undefined) data.notes = body.notes ? String(body.notes) : null
  if (body.paymentMethod !== undefined) data.paymentMethod = String(body.paymentMethod || 'COD')

  const invoice = await prisma.invoice.update({
    where: { id: id || '' },
    data,
    include: { items: true },
  })
  return { invoice }
})
