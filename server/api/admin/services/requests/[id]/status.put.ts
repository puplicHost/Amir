
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'services.manage')
  const id = event.context.params?.id
  const { status } = await readBody(event)
  
  const request = await prisma.serviceRequest.update({
    where: { id },
    data: { status }
  })
  return request
})
