export default defineEventHandler(async (event) => {
  // Any authenticated admin user can view the dashboard stats
  const user = await requireAuth(event)
  const canViewFinancials = user.isSuper || user.permissions.includes('dashboard.financials.view')

  const [
    totalOrders,
    pendingOrders,
    newServiceRequests,
    totalProducts,
    totalCategories,
    activeServices,
    revenueAggregate,
    recentOrdersRaw,
    recentRequestsRaw,
    lowStockProducts,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: 'Pending' } }),
    prisma.serviceRequest.count({ where: { status: 'New' } }),
    prisma.product.count(),
    prisma.category.count(),
    prisma.service.count({ where: { isActive: true } }),
    prisma.order.aggregate({
      where: {
        status: { notIn: ['Cancelled', 'Rejected', 'Failed'] },
      },
      _sum: {
        totalAmount: true,
      },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerGovernorat: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        _count: {
          select: { items: true },
        },
      },
    }),
    prisma.serviceRequest.findMany({
      orderBy: { submittedAt: 'desc' },
      take: 5,
      include: {
        service: {
          select: {
            id: true,
            nameAr: true,
            nameEn: true,
            formFields: {
              select: {
                id: true,
                labelEn: true,
                labelAr: true,
                sortOrder: true,
              },
            },
          },
        },
        values: true,
      },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, stock: true, minStock: true },
    }),
  ])

  const lowStockCount = lowStockProducts.filter(p => p.stock <= p.minStock).length

  // Extract customer name for each service request
  const recentServiceRequests = recentRequestsRaw.map((req) => {
    const fieldMap = new Map(req.service.formFields.map((f) => [f.id, f]))
    let customerName: string | null = null

    // 1. Try explicit customer or contact person field
    for (const v of req.values) {
      const f = fieldMap.get(v.fieldId)
      if (f) {
        const en = f.labelEn.toLowerCase()
        const ar = f.labelAr
        if (
          en.includes('customer') ||
          en.includes('client') ||
          en.includes('contact') ||
          ar.includes('عميل') ||
          ar.includes('مسؤول')
        ) {
          if (v.value?.trim()) {
            customerName = v.value.trim()
            break
          }
        }
      }
    }

    // 2. Try any name field that is not machine or product
    if (!customerName) {
      for (const v of req.values) {
        const f = fieldMap.get(v.fieldId)
        if (f) {
          const en = f.labelEn.toLowerCase()
          const ar = f.labelAr
          if (
            (en.includes('name') || ar.includes('اسم')) &&
            !en.includes('machine') &&
            !en.includes('product') &&
            !ar.includes('ماكينة') &&
            !ar.includes('منتج')
          ) {
            if (v.value?.trim()) {
              customerName = v.value.trim()
              break
            }
          }
        }
      }
    }

    // 3. Fallback to first non-phone, non-governorate text value
    if (!customerName) {
      for (const v of req.values) {
        if (
          v.value &&
          !v.value.match(/^01[0-9]{9}$/) &&
          !v.value.startsWith('cairo') &&
          v.value.length < 50
        ) {
          customerName = v.value.trim()
          break
        }
      }
    }

    return {
      id: req.id,
      status: req.status,
      submittedAt: req.submittedAt,
      serviceNameAr: req.service.nameAr,
      serviceNameEn: req.service.nameEn,
      customerName: customerName || (req.values[0]?.value ? req.values[0].value.slice(0, 30) : 'Client'),
    }
  })

  const recentOrders = recentOrdersRaw.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    customerGovernorat: o.customerGovernorat,
    status: o.status,
    totalAmount: canViewFinancials ? Number(o.totalAmount || 0) : null,
    createdAt: o.createdAt,
    itemCount: o._count.items,
  }))

  return {
    stats: {
      totalOrders,
      pendingOrders,
      newServiceRequests,
      totalProducts,
      totalCategories,
      activeServices,
      totalRevenue: canViewFinancials ? Number(revenueAggregate._sum.totalAmount || 0) : null,
      lowStockCount,
    },
    recentOrders,
    recentServiceRequests,
  }
})
