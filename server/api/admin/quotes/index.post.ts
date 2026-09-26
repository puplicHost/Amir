import { generateQuotePdf, type QuotePdfItem } from '../../../utils/quote-pdf'
import { storeFile } from '../../../utils/storage'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const hasAccess = user.isSuper || 
    user.permissions.includes('quotes.manage') || 
    user.permissions.includes('quotes.view') || 
    user.permissions.includes('services.view') || 
    user.permissions.includes('orders.view')

  if (!hasAccess) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const body = await readBody(event)

  const companyName = String(body.companyName || '').trim()
  const contactName = String(body.contactName || '').trim()
  const phone = String(body.phone || '').trim()
  const email = body.email ? String(body.email).trim() : null
  const notes = body.notes ? String(body.notes).trim() : null

  if (!companyName || !contactName || !phone) {
    throw createError({ statusCode: 400, message: 'Company name, contact name, and phone are required.' })
  }

  // Egyptian phone format check
  if (!/^01[0125][0-9]{8}$/.test(phone)) {
    throw createError({ statusCode: 400, message: 'Invalid Egyptian phone number (e.g. 01012345678).' })
  }

  const rawItems = Array.isArray(body.items) ? body.items : []
  if (rawItems.length === 0) {
    throw createError({ statusCode: 400, message: 'Please select at least one product for the quote.' })
  }

  // Split into catalog items and custom manual items
  const catalogProductIds = rawItems
    .filter((i: any) => !i.isCustom && i.productId)
    .map((i: any) => String(i.productId))

  const dbProducts = catalogProductIds.length > 0
    ? await prisma.product.findMany({
        where: { id: { in: catalogProductIds } },
        include: {
          category: { select: { nameAr: true, nameEn: true } },
          images: { where: { isCover: true }, take: 1, select: { path: true } },
        },
      })
    : []

  const dbProductMap = new Map(dbProducts.map(p => [p.id, p]))

  // Generate unique quote number: QT-YYYYMM-XXXX
  const datePrefix = new Date().toISOString().slice(0, 7).replace('-', '')
  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  const quoteNumber = `QT-${datePrefix}-${randomSuffix}`

  let subtotalAmount = 0
  const quoteItemsData: any[] = []
  const pdfItemsEn: QuotePdfItem[] = []
  const pdfItemsAr: QuotePdfItem[] = []

  for (const raw of rawItems) {
    const qty = Math.max(1, Number(raw.quantity) || 1)
    const itemNotes = raw.notes ? String(raw.notes).trim() : null

    if (raw.isCustom) {
      // Manual custom product
      const nameEn = String(raw.nameEn || raw.name || 'Custom Hardware').trim()
      const nameAr = String(raw.nameAr || raw.name || nameEn).trim()
      const price = Math.max(0, Number(raw.price) || 0)
      const subtotal = price * qty
      subtotalAmount += subtotal
      const imagePath = raw.imagePath || raw.coverImage || null

      quoteItemsData.push({
        productId: null,
        productNameSnapshot: nameEn,
        productNameEnSnapshot: nameEn,
        productNameArSnapshot: nameAr,
        priceSnapshot: price,
        quantity: qty,
        imagePath,
        notes: itemNotes,
        isCustom: true,
      })

      pdfItemsEn.push({
        name: nameEn,
        nameEn,
        nameAr,
        imagePath,
        notes: itemNotes,
        price,
        quantity: qty,
        subtotal,
      })

      pdfItemsAr.push({
        name: nameAr,
        nameEn,
        nameAr,
        imagePath,
        notes: itemNotes,
        price,
        quantity: qty,
        subtotal,
      })
    }
    else {
      // Catalog product
      const product = dbProductMap.get(String(raw.productId))
      if (!product) continue

      const price = Number(product.price)
      const subtotal = price * qty
      subtotalAmount += subtotal
      const imagePath = product.images?.[0]?.path || raw.coverImage || null

      quoteItemsData.push({
        productId: product.id,
        productNameSnapshot: product.nameEn,
        productNameEnSnapshot: product.nameEn,
        productNameArSnapshot: product.nameAr,
        priceSnapshot: price,
        quantity: qty,
        imagePath,
        notes: itemNotes,
        isCustom: false,
      })

      pdfItemsEn.push({
        name: product.nameEn,
        nameEn: product.nameEn,
        nameAr: product.nameAr,
        imagePath,
        notes: itemNotes,
        price,
        quantity: qty,
        subtotal,
      })

      pdfItemsAr.push({
        name: product.nameAr,
        nameEn: product.nameEn,
        nameAr: product.nameAr,
        imagePath,
        notes: itemNotes,
        price,
        quantity: qty,
        subtotal,
      })
    }
  }

  if (quoteItemsData.length === 0) {
    throw createError({ statusCode: 400, message: 'Valid line items are required.' })
  }

  // Calculate discount
  const discountType = ['percentage', 'fixed'].includes(body.discountType) ? body.discountType : 'none'
  const discountValue = Math.max(0, Number(body.discountValue) || 0)
  let discountAmount = 0

  if (discountType === 'percentage' && discountValue > 0) {
    discountAmount = Math.round(((subtotalAmount * discountValue) / 100) * 100) / 100
  }
  else if (discountType === 'fixed' && discountValue > 0) {
    discountAmount = Math.min(subtotalAmount, discountValue)
  }

  const grandTotal = Math.max(0, subtotalAmount - discountAmount)

  // Fetch site settings and representative info
  const [siteSettings, adminUser] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: 1 } }),
    prisma.adminUser.findUnique({ where: { id: user.userId }, select: { email: true, phone: true } }),
  ])

  const accountRepEmail = adminUser?.email || user.email || siteSettings?.contactEmail || 'sales@mango-electronics.com'
  const accountRepPhone = adminUser?.phone || siteSettings?.contactPhone1 || '01000000000'

  // Create Quote in database
  const quote = await prisma.quoteRequest.create({
    data: {
      quoteNumber,
      companyName,
      contactName,
      phone,
      email,
      notes,
      subtotalAmount,
      discountType,
      discountValue,
      discountAmount,
      totalAmount: grandTotal,
      status: 'Reviewed',
      accountRepEmail,
      accountRepPhone,
      items: {
        create: quoteItemsData,
      },
    },
  })

  // Generate BOTH English and Arabic PDFs
  const [pdfBufferEn, pdfBufferAr] = await Promise.all([
    generateQuotePdf({
      quoteNumber: quote.quoteNumber,
      companyName: quote.companyName,
      contactName: quote.contactName,
      phone: quote.phone,
      email: quote.email,
      notes: quote.notes,
      createdAt: quote.createdAt,
      items: pdfItemsEn,
      subtotalAmount,
      discountType,
      discountValue,
      discountAmount,
      totalAmount: grandTotal,
      locale: 'en',
      termsText: siteSettings?.quoteTermsEn,
      accountRepEmail,
      accountRepPhone,
      siteSettings: siteSettings || undefined,
    }),
    generateQuotePdf({
      quoteNumber: quote.quoteNumber,
      companyName: quote.companyName,
      contactName: quote.contactName,
      phone: quote.phone,
      email: quote.email,
      notes: quote.notes,
      createdAt: quote.createdAt,
      items: pdfItemsAr,
      subtotalAmount,
      discountType,
      discountValue,
      discountAmount,
      totalAmount: grandTotal,
      locale: 'ar',
      termsText: siteSettings?.quoteTermsAr,
      accountRepEmail,
      accountRepPhone,
      siteSettings: siteSettings || undefined,
    }),
  ])

  const filenameEn = `Quotation-${quote.quoteNumber}-EN.pdf`
  const filenameAr = `Quotation-${quote.quoteNumber}-AR.pdf`

  const [storedEn, storedAr] = await Promise.all([
    storeFile(pdfBufferEn, `quotes/${quote.id}`, filenameEn),
    storeFile(pdfBufferAr, `quotes/${quote.id}`, filenameAr),
  ])

  await prisma.quoteRequest.update({
    where: { id: quote.id },
    data: {
      pdfPath: storedEn.relativePath,
      pdfPathEn: storedEn.relativePath,
      pdfPathAr: storedAr.relativePath,
    },
  })

  return {
    quoteId: quote.id,
    quoteNumber: quote.quoteNumber,
    downloadUrl: storedEn.relativePath,
    downloadUrlEn: storedEn.relativePath,
    downloadUrlAr: storedAr.relativePath,
    subtotalAmount,
    discountAmount,
    totalAmount: grandTotal,
  }
})
