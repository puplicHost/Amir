import { requirePermission } from '../../../utils/auth'
import { parseBody, salonClosureCreateSchema } from '../../../utils/validate'
import { logAudit } from '../../../utils/audit'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'schedule.manage')
  const body = await parseBody(event, salonClosureCreateSchema)
  try {
    const closure = await prisma.salonClosure.create({
      data: { day: body.day, reason: body.reason?.trim() || null },
    })
    await logAudit({
      entityType: 'service',
      entityId: 'salon-closures',
      entityName: body.day,
      action: 'created',
      details: 'Added a studio closure day',
      user,
    })
    return { closure }
  }
  catch (e: any) {
    if (e?.code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'This day is already marked as closed' })
    }
    throw e
  }
})
