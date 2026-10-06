
import { parseBody, serviceOrderSchema } from '../../../../../utils/validate'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'services.config')
  const serviceId = event.context.params?.id
  const body = await parseBody(event, serviceOrderSchema)
  
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
