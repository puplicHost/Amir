export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, message: 'Missing quote ID' })

  const quote = await prisma.quoteRequest.findUnique({
    where: { id },
  })
  if (!quote || !quote.pdfPath) {
    throw createError({ statusCode: 404, message: 'Quote or PDF not found' })
  }

  return sendRedirect(event, quote.pdfPath)
})
