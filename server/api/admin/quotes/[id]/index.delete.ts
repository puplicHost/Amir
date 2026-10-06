export default defineEventHandler(async (event) => {
  await requireQuotesManage(event)

  const id = event.context.params?.id
  const existing = await prisma.quoteRequest.findUnique({ where: { id: id || '' } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Quote not found' })

  await prisma.quoteRequest.delete({ where: { id: existing.id } })
  return { ok: true }
})
