
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'services.view')
  const id = event.context.params?.id
  const request = await prisma.serviceRequest.findUnique({
    where: { id },
    include: {
      service: { select: { nameAr: true, nameEn: true, formFields: true } },
      values: true,
      attachments: true
    }
  })
  return request
})
