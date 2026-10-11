export default defineEventHandler(async (event) => {
  await requirePermission(event, 'inbox.manage')

  const res = await prisma.contactMessage.updateMany({
    where: { isRead: false },
    data: { isRead: true },
  })

  return { updated: res.count }
})
