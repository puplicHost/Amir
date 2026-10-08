export default defineEventHandler(async (event) => {
  await requirePermission(event, 'inbox.manage')

  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, message: 'Missing message id' })

  await prisma.contactMessage.delete({ where: { id } }).catch(() => null)

  return { ok: true }
})
