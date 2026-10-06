export default defineEventHandler(async (event) => {
  await requireQuotesView(event)

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
