import { generateQuotePdf } from '../../utils/quote-pdf'
import { storeFile } from '../../utils/storage'
import { nextQuoteNumber, quoteExpiryDate } from '../../utils/numbering'
import { parseBody, quoteCreateSchema } from '../../utils/validate'

export default defineEventHandler(async (event) => {
  // Rate limited by server/middleware/rate-limit.ts (10 req/min).
  const body = await parseBody(event, quoteCreateSchema)

  const companyName = String(body.companyName || '').trim()
  const contactName = String(body.contactName || '').trim()
  const contactTitle = body.contactTitle ? String(body.contactTitle).trim().slice(0, 120) : null
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
      images: { where: { isCover: true }, take: 1, select: { path: true } },
    },
  })

  if (dbProducts.length === 0) {
    throw createError({ statusCode: 400, message: 'Selected products are unavailable or inactive.' })
  }

  // Sequential quote number: QT-{sequence} (configurable start in quote settings)
  const quoteNumber = await nextQuoteNumber()
  const governorate = body.governorate ? String(body.governorate).trim() : null

  let grandTotal = 0
  const quoteItemsData: any[] = []
  const pdfItemsEn: any[] = []
  const pdfItemsAr: any[] = []

  for (const raw of rawItems) {
    const product = dbProducts.find(p => p.id === raw.productId)
    if (!product) continue

    const qty = Math.max(1, Number(raw.quantity) || 1)
    const price = Number(product.price)
    const subtotal = price * qty
    grandTotal += subtotal
    const imagePath = product.images?.[0]?.path || null

    quoteItemsData.push({
      productId: product.id,
      productNameSnapshot: product.nameEn,
      productNameEnSnapshot: product.nameEn,
      productNameArSnapshot: product.nameAr,
      priceSnapshot: price,
      quantity: qty,
      imagePath,
      isCustom: false,
    })

    pdfItemsEn.push({
      name: product.nameEn,
      nameEn: product.nameEn,
      nameAr: product.nameAr,
      imagePath,
      price,
      quantity: qty,
      subtotal,
    })

    pdfItemsAr.push({
      name: product.nameAr,
      nameEn: product.nameEn,
      nameAr: product.nameAr,
      imagePath,
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
      contactTitle,
      phone,
      email,
      notes,
      governorate,
      expiresAt: quoteExpiryDate((siteSettings as any)?.quoteValidityDays ?? 30),
      subtotalAmount: grandTotal,
      totalAmount: grandTotal,
      status: 'New',
      accountRepEmail: siteSettings?.contactEmail || 'sales@mango-electronics.com',
      accountRepPhone: siteSettings?.contactPhone1 || '01000000000',
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
      contactTitle: quote.contactTitle,
      phone: quote.phone,
      email: quote.email,
      notes: quote.notes,
      createdAt: quote.createdAt,
      items: pdfItemsEn,
      subtotalAmount: grandTotal,
      totalAmount: grandTotal,
      locale: 'en',
      termsText: siteSettings?.quoteTermsEn,
      accountRepEmail: quote.accountRepEmail,
      accountRepPhone: quote.accountRepPhone,
      siteSettings: siteSettings || undefined,
    }),
    generateQuotePdf({
      quoteNumber: quote.quoteNumber,
      companyName: quote.companyName,
      contactName: quote.contactName,
      contactTitle: quote.contactTitle,
      phone: quote.phone,
      email: quote.email,
      notes: quote.notes,
      createdAt: quote.createdAt,
      items: pdfItemsAr,
      subtotalAmount: grandTotal,
      totalAmount: grandTotal,
      locale: 'ar',
      termsText: siteSettings?.quoteTermsAr,
      accountRepEmail: quote.accountRepEmail,
      accountRepPhone: quote.accountRepPhone,
      siteSettings: siteSettings || undefined,
    }),
  ])

  // Save both PDFs to storage
  const filenameEn = `Quotation-${quote.quoteNumber}-EN.pdf`
  const filenameAr = `Quotation-${quote.quoteNumber}-AR.pdf`

  const [storedEn, storedAr] = await Promise.all([
    storeFile(pdfBufferEn, `quotes/${quote.id}`, filenameEn),
    storeFile(pdfBufferAr, `quotes/${quote.id}`, filenameAr),
  ])

  const initialDownload = locale === 'ar' ? storedAr.relativePath : storedEn.relativePath

  // Update quote with pdfPath, pdfPathEn, pdfPathAr
  await prisma.quoteRequest.update({
    where: { id: quote.id },
    data: {
      pdfPath: initialDownload,
      pdfPathEn: storedEn.relativePath,
      pdfPathAr: storedAr.relativePath,
    },
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

  await sendMetaCapiEvent({
    eventName: 'Lead',
    eventId: quote.quoteNumber,
    email: quote.email,
    phone: quote.phone,
    clientIp: getRequestIP(event, { xForwardedFor: true }) || undefined,
    clientUa: getRequestHeader(event, 'user-agent') || undefined,
    value: grandTotal,
    currency: 'EGP',
  })

  // Issue a short-lived access token for this quote's PDF/PII reads.
  const { issueAccessToken } = await import('../../utils/access-tokens')
  const accessToken = await issueAccessToken('quote', quote.id)

  return {
    quoteId: quote.id,
    quoteNumber: quote.quoteNumber,
    downloadUrl: initialDownload,
    downloadUrlEn: storedEn.relativePath,
    downloadUrlAr: storedAr.relativePath,
    totalAmount: grandTotal,
    accessToken,
    message: (siteSettings as any)?.quoteAutoMessage || null,
  }
})
