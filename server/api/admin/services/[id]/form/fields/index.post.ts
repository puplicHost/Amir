
import { parseBody, serviceFieldCreateSchema } from '../../../../../../utils/validate'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'services.config')
  const serviceId = event.context.params?.id
  const body = await parseBody(event, serviceFieldCreateSchema)
  const service = await prisma.service.findUnique({ where: { id: serviceId } })
  if (!service) throw createError({ statusCode: 404, statusMessage: 'Service not found' })
  const field = await prisma.serviceFormField.create({
    data: {
      serviceId: serviceId as string,
      labelAr: body.labelAr,
      labelEn: body.labelEn,
      fieldType: body.fieldType,
      isRequired: body.isRequired ?? false,
      sortOrder: body.sortOrder ?? 999,
      options: body.options ?? null
    }
  })
  return field
})
