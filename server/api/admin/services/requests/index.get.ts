
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'services.view')
  const query = getQuery(event)
  const page = Math.max(1, parseInt(query.page as string || '1'))
  // Hard cap: never return more than 100 items even without a pagination param.
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string || '20')))
  const status = query.status as string | undefined
  const serviceId = query.serviceId as string | undefined

  const where: any = {}
  if (status) where.status = status
  if (serviceId) where.serviceId = serviceId

  // We could add search if we want to search by Customer Name in values
  // but it's a bit complex since values are in a related table. 
  // Let's keep it simple for now or fetch all if search is provided and filter in JS if search is simple

  const [total, requests] = await Promise.all([
    prisma.serviceRequest.count({ where }),
    prisma.serviceRequest.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        service: { select: { nameAr: true, nameEn: true } },
        values: true
      }
    })
  ])

  // Extract Customer Name and Phone from values for easier table display
  // We assume the frontend will pass 'customer_name' or similar, but the seed used 'Customer Name' (En) / 'اسم العميل' (Ar).
  // The frontend can just render them or we can try to guess. Let's just return values and let frontend handle it.

  return { requests, total, page, limit, pages: Math.ceil(total / limit) }
})
