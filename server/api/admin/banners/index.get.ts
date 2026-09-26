import { requirePermission } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'banners.manage')
  const banners = await prisma.banner.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  })
  return { banners }
})
