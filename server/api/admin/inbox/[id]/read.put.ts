export default defineEventHandler(async (event) => {
  await requirePermission(event, 'inbox.manage')

  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, message: 'Missing message id' })

  const message = await prisma.contactMessage.update({
    where: { id },
    data: { isRead: true },
  }).catch(() => null)
  if (!message) throw createError({ statusCode: 404, message: 'Message not found' })

  return message
})
