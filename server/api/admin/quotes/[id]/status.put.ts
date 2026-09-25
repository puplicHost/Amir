export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const hasAccess = user.isSuper || 
    user.permissions.includes('quotes.manage') || 
    user.permissions.includes('services.manage') || 
    user.permissions.includes('orders.manage')

  if (!hasAccess) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const id = event.context.params?.id
  const body = await readBody(event)

  const status = typeof body.status === 'string' ? body.status.trim() : ''
  if (!status || !['New', 'Reviewed', 'Closed'].includes(status)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid status' })
  }

  const quote = await prisma.quoteRequest.update({
    where: { id },
    data: { status },
  })

  return { quote }
})
