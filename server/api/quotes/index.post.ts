import { generateQuotePdf } from '../../utils/quote-pdf'
import { storeFile } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const companyName = String(body.companyName || '').trim()
  const contactName = String(body.contactName || '').trim()
  const phone = String(body.phone || '').trim()
  const email = body.email ? String(body.email).trim() : null
  const notes = body.notes ? String(body.notes).trim() : null
  const locale = body.locale === 'en' ? 'en' : 'ar'

  if (!companyName || !contactName || !phone) {
    throw createError({ statusCode: 400, message: 'Company name, contact name, and phone are required.' })
  }

  // Egyptian phone validation
  if (!/^01[0125][0-9]{8}$/.test(phone)) {
    throw createError({ statusCode: 400, message: 'Invalid Egyptian phone number (e.g. 01012345678).' })
  }

  const rawItems = Array.isArray(body.items) ? body.items : []
  if (rawItems.length === 0) {
    throw createError({ statusCode: 400, message: 'Please select at least one product for the quote.' })
  }

  // Extract unique product IDs and fetch verified prices from database
  const productIds = rawItems.map((i: any) => String(i.productId)).filter(Boolean)
  const dbProducts = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    include: {
      category: { select: { nameAr: true, nameEn: true } },
    },
  })

  if (dbProducts.length === 0) {
    throw createError({ statusCode: 400, message: 'Selected products are unavailable or inactive.' })
  }

  // Generate unique quote number: QT-YYYYMM-XXXX
  const datePrefix = new Date().toISOString().slice(0, 7).replace('-', '')
  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  const quoteNumber = `QT-${datePrefix}-${randomSuffix}`

  // Match items with real DB prices
  let grandTotal = 0
  const quoteItemsData: any[] = []
  const pdfItems: any[] = []

  for (const raw of rawItems) {
    const product = dbProducts.find(p => p.id === raw.productId)
    if (!product) continue

    const qty = Math.max(1, Number(raw.quantity) || 1)
    const price = Number(product.price)
    const subtotal = price * qty
    grandTotal += subtotal

    const name = locale === 'ar' ? product.nameAr : product.nameEn
    const categoryName = product.category ? (locale === 'ar' ? product.category.nameAr : product.category.nameEn) : ''

    quoteItemsData.push({
      productId: product.id,
      productNameSnapshot: name,
      priceSnapshot: price,
      quantity: qty,
    })

    pdfItems.push({
      name,
      categoryName,
      price,
      quantity: qty,
      subtotal,
    })
  }

  // Fetch site settings for official contact info in the PDF footer
  const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 1 } })

  // Create Quote in database
  const quote = await prisma.quoteRequest.create({
    data: {
      quoteNumber,
      companyName,
      contactName,
      phone,
      email,
      notes,
      totalAmount: grandTotal,
      status: 'New',
      items: {
        create: quoteItemsData,
      },
    },
  })

  // Generate PDF buffer
  const pdfBuffer = await generateQuotePdf({
    quoteNumber: quote.quoteNumber,
    companyName: quote.companyName,
    contactName: quote.contactName,
    phone: quote.phone,
    email: quote.email,
    notes: quote.notes,
    createdAt: quote.createdAt,
    items: pdfItems,
    totalAmount: grandTotal,
    locale,
    siteSettings: siteSettings ? {
      siteNameAr: siteSettings.siteNameAr,
      siteNameEn: siteSettings.siteNameEn,
      contactPhone1: siteSettings.contactPhone1,
      contactEmail: siteSettings.contactEmail,
      contactAddressAr: siteSettings.contactAddressAr,
      contactAddressEn: siteSettings.contactAddressEn,
    } : undefined,
  })

  // Save PDF to storage
  const filename = `Quotation-${quote.quoteNumber}.pdf`
  const { relativePath } = await storeFile(pdfBuffer, `quotes/${quote.id}`, filename)

  // Update quote with pdfPath
  await prisma.quoteRequest.update({
    where: { id: quote.id },
    data: { pdfPath: relativePath },
  })

  await notifyAdmins({
    type: 'new_quote',
    relatedEntityId: quote.id,
    url: `/admin/quotes/${quote.id}`,
    titleEn: `New quote request ${quote.quoteNumber}`,
    titleAr: `طلب عرض سعر جديد ${quote.quoteNumber}`,
    bodyEn: `${quote.companyName} · ${grandTotal} EGP`,
    bodyAr: `${quote.companyName} · ${grandTotal} ج.م`,
  })

  return {
    quoteId: quote.id,
    quoteNumber: quote.quoteNumber,
    downloadUrl: relativePath,
    totalAmount: grandTotal,
  }
})
