
import { parseBody, serviceFieldUpdateSchema } from '../../../../../../../utils/validate'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'services.config')
  const fieldId = event.context.params?.fieldId
  const body = await parseBody(event, serviceFieldUpdateSchema)
  const serviceId = event.context.params?.id
  const existing = await prisma.serviceFormField.findUnique({ where: { id: fieldId } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Field not found' })
  if (existing.serviceId !== serviceId) {
    throw createError({ statusCode: 404, statusMessage: 'Field not found' })
  }
  const field = await prisma.serviceFormField.update({
    where: { id: fieldId },
    data: {
      labelAr: body.labelAr,
      labelEn: body.labelEn,
      fieldType: body.fieldType,
      isRequired: body.isRequired,
      options: body.options
    }
  })
  return field
})
