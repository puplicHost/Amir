import { requirePermission } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'banners.manage')
  const id = getRouterParam(event, 'id')
  await prisma.banner.delete({ where: { id: id || '' } })
  return { ok: true }
})
