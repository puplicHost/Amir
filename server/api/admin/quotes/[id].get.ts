export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const hasAccess = user.isSuper || 
    user.permissions.includes('quotes.view') || 
    user.permissions.includes('services.view') || 
    user.permissions.includes('orders.view')

  if (!hasAccess) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, message: 'Missing quote id' })

  const quote = await prisma.quoteRequest.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: {
            select: {
              slug: true,
              nameAr: true,
              nameEn: true,
              images: { where: { isCover: true }, take: 1, select: { path: true } },
            },
          },
        },
      },
    },
  })

  if (!quote) throw createError({ statusCode: 404, message: 'Quote not found' })

  return { quote }
})
