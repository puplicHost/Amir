
import { parseBody, serviceRequestStatusSchema } from '../../../../../utils/validate'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'services.manage')
  const id = event.context.params?.id
  const { status } = await parseBody(event, serviceRequestStatusSchema)
  
  const request = await prisma.serviceRequest.update({
    where: { id },
    data: { status }
  })
  return request
})
