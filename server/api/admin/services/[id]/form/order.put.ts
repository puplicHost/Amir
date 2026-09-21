
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'services.config')
  const serviceId = event.context.params?.id
  const body = await readBody<{ fieldIds: string[] }>(event)
  
  // Need to update multiple records
  const updatePromises = body.fieldIds.map((id, index) => 
    prisma.serviceFormField.update({
      where: { id },
      data: { sortOrder: index + 1 }
    })
  )
  await prisma.$transaction(updatePromises)
  return { success: true }
})
