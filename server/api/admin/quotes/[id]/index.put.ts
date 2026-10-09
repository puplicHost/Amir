import { generateQuotePdf, type QuotePdfItem } from '../../../../utils/quote-pdf'
import { storeFile } from '../../../../utils/storage'
import { parseBody, quoteUpdateSchema } from '../../../../utils/validate'

const VALID_STATUSES = ['New', 'Reviewed', 'Closed', 'Pending', 'Accepted', 'Rejected', 'Expired']

export default defineEventHandler(async (event) => {
  const user = await requireQuotesManage(event)

  const id = event.context.params?.id
  const body = await parseBody(event, quoteUpdateSchema)
  const existing = await prisma.quoteRequest.findUnique({
    where: { id: id || '' },
    include: { items: true },
  })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Quote not found' })

  // ── Customer fields ──
  const data: Record<string, unknown> = {}
  if (body.companyName !== undefined) {
    const v = String(body.companyName || '').trim()
    if (!v) throw createError({ statusCode: 400, message: 'Company name is required' })
    data.companyName = v
  }
  if (body.contactName !== undefined) {
    const v = String(body.contactName || '').trim()
    if (!v) throw createError({ statusCode: 400, message: 'Contact name is required' })
    data.contactName = v
  }
  if (body.phone !== undefined) {
    const v = String(body.phone || '').trim()
    if (!/^01[0125][0-9]{8}$/.test(v)) throw createError({ statusCode: 400, message: 'Invalid Egyptian phone number' })
    data.phone = v
  }
  if (body.contactTitle !== undefined) data.contactTitle = body.contactTitle ? String(body.contactTitle).slice(0, 120) : null
  if (body.email !== undefined) data.email = body.email ? String(body.email).trim() : null
  if (body.notes !== undefined) data.notes = body.notes ? String(body.notes).trim() : null
  if (body.governorate !== undefined) data.governorate = body.governorate ? String(body.governorate).trim() : null
  if (body.adminNotes !== undefined) data.adminNotes = body.adminNotes ? String(body.adminNotes).trim() : null
  if (body.expiresAt !== undefined) {
    if (!body.expiresAt) {
      data.expiresAt = null
    }
    else {
      const d = new Date(body.expiresAt)
      if (Number.isNaN(d.getTime())) throw createError({ statusCode: 400, message: 'Invalid expiry date' })
      data.expiresAt = d
    }
  }
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) throw createError({ statusCode: 400, statusMessage: 'Invalid status' })
    data.status = body.status
  }

  // ── Quote-specific terms ──
  if (body.useDefaultTerms !== undefined) data.useDefaultTerms = body.useDefaultTerms === true
  const useDefaultTerms = (data.useDefaultTerms ?? existing.useDefaultTerms) !== false
  if (body.customTermsAr !== undefined) data.customTermsAr = body.customTermsAr ? String(body.customTermsAr) : null
  if (body.customTermsEn !== undefined) data.customTermsEn = body.customTermsEn ? String(body.customTermsEn) : null

  // ── Line items (full replace when provided) ──
  let totals = {
    subtotal: Number(existing.subtotalAmount),
    discountType: String(existing.discountType || 'none'),
    discountValue: Number(existing.discountValue || 0),
    discountAmount: Number(existing.discountAmount || 0),
    total: Number(existing.totalAmount),
  }
  let itemsForPdf: { en: QuotePdfItem[], ar: QuotePdfItem[] } | null = null

  if (Array.isArray(body.items)) {
    const rawItems = body.items
    if (!rawItems.length) throw createError({ statusCode: 400, message: 'At least one line item is required' })

    const catalogIds = rawItems.filter((i: any) => !i.isCustom && i.productId).map((i: any) => String(i.productId))
    const dbProducts = catalogIds.length
      ? await prisma.product.findMany({ where: { id: { in: catalogIds } } })
      : []
    const dbMap = new Map(dbProducts.map(p => [p.id, p]))

    let subtotal = 0
    const createData: any[] = []
    const pdfEn: QuotePdfItem[] = []
    const pdfAr: QuotePdfItem[] = []
    for (const raw of rawItems) {
      const qty = Math.max(1, Math.floor(Number(raw.quantity) || 1))
      const itemNotes = raw.notes ? String(raw.notes).trim() : null
      if (raw.isCustom) {
        const nameEn = String(raw.nameEn || raw.name || 'Custom item').trim()
        const nameAr = String(raw.nameAr || raw.name || nameEn).trim()
        const price = Math.max(0, Number(raw.price) || 0)
        const sub = Math.round(price * qty * 100) / 100
        subtotal += sub
        createData.push({
          productId: null, productNameSnapshot: nameEn, productNameEnSnapshot: nameEn,
          productNameArSnapshot: nameAr, priceSnapshot: price, quantity: qty,
          imagePath: raw.imagePath || null, notes: itemNotes, isCustom: true,
        })
        pdfEn.push({ name: nameEn, nameEn, nameAr, imagePath: raw.imagePath || null, notes: itemNotes, price, quantity: qty, subtotal: sub })
        pdfAr.push({ name: nameAr, nameEn, nameAr, imagePath: raw.imagePath || null, notes: itemNotes, price, quantity: qty, subtotal: sub })
      }
      else {
        const product = dbMap.get(String(raw.productId))
        if (product) {
          const price = Number((product as any).price)
          const sub = Math.round(price * qty * 100) / 100
          subtotal += sub
          createData.push({
            productId: (product as any).id,
            productNameSnapshot: (product as any).nameEn,
            productNameEnSnapshot: (product as any).nameEn,
            productNameArSnapshot: (product as any).nameAr,
            priceSnapshot: price, quantity: qty, imagePath: null, notes: itemNotes, isCustom: false,
          })
          pdfEn.push({ name: (product as any).nameEn, nameEn: (product as any).nameEn, nameAr: (product as any).nameAr, imagePath: null, notes: itemNotes, price, quantity: qty, subtotal: sub })
          pdfAr.push({ name: (product as any).nameAr, nameEn: (product as any).nameEn, nameAr: (product as any).nameAr, imagePath: null, notes: itemNotes, price, quantity: qty, subtotal: sub })
        }
        else {
          // Fallback: product removed from the catalog (or legacy item without
          // productId). Preserve the line from the submitted snapshot instead of
          // dropping it, so edits never silently delete line items.
          const fbNameEn = String(raw.nameEn || raw.name || 'Item').trim()
          const fbNameAr = String(raw.nameAr || raw.name || fbNameEn).trim()
          const fbPrice = Math.max(0, Number(raw.price) || 0)
          const fbSub = Math.round(fbPrice * qty * 100) / 100
          subtotal += fbSub
          createData.push({
            productId: null,
            productNameSnapshot: fbNameEn,
            productNameEnSnapshot: fbNameEn,
            productNameArSnapshot: fbNameAr,
            priceSnapshot: fbPrice, quantity: qty,
            imagePath: raw.imagePath || null, notes: itemNotes, isCustom: false,
          })
          pdfEn.push({ name: fbNameEn, nameEn: fbNameEn, nameAr: fbNameAr, imagePath: raw.imagePath || null, notes: itemNotes, price: fbPrice, quantity: qty, subtotal: fbSub })
          pdfAr.push({ name: fbNameAr, nameEn: fbNameEn, nameAr: fbNameAr, imagePath: raw.imagePath || null, notes: itemNotes, price: fbPrice, quantity: qty, subtotal: fbSub })
        }
      }
    }
    if (!createData.length) throw createError({ statusCode: 400, message: 'Valid line items are required' })

    const discountType = body.discountType !== undefined && ['percentage', 'fixed'].includes(body.discountType)
      ? body.discountType
      : (totals.discountType === 'percentage' || totals.discountType === 'fixed' ? totals.discountType : 'none')
    const discountValue = body.discountValue !== undefined ? Math.max(0, Number(body.discountValue) || 0) : totals.discountValue
    let discountAmount = 0
    if (discountType === 'percentage' && discountValue > 0) {
      discountAmount = Math.round(((subtotal * discountValue) / 100) * 100) / 100
    }
    else if (discountType === 'fixed' && discountValue > 0) {
      discountAmount = Math.min(subtotal, discountValue)
    }
    totals = { subtotal, discountType, discountValue, discountAmount, total: Math.max(0, subtotal - discountAmount) }
    data.subtotalAmount = subtotal
    data.discountType = discountType
    data.discountValue = discountValue
    data.discountAmount = discountAmount
    data.totalAmount = totals.total
    itemsForPdf = { en: pdfEn, ar: pdfAr }

    await prisma.$transaction([
      prisma.quoteRequestItem.deleteMany({ where: { quoteRequestId: existing.id } }),
      prisma.quoteRequestItem.createMany({ data: createData.map(c => ({ ...c, quoteRequestId: existing.id })) }),
    ])
  }
  else if (body.discountType !== undefined || body.discountValue !== undefined) {
    // Totals-only adjustment on existing items
    const subtotal = totals.subtotal
    const discountType = body.discountType !== undefined && ['percentage', 'fixed'].includes(body.discountType)
      ? body.discountType : totals.discountType
    const discountValue = body.discountValue !== undefined ? Math.max(0, Number(body.discountValue) || 0) : totals.discountValue
    let discountAmount = 0
    if (discountType === 'percentage' && discountValue > 0) discountAmount = Math.round(((subtotal * discountValue) / 100) * 100) / 100
    else if (discountType === 'fixed' && discountValue > 0) discountAmount = Math.min(subtotal, discountValue)
    totals = { ...totals, discountType, discountValue, discountAmount, total: Math.max(0, subtotal - discountAmount) }
    data.discountType = discountType
    data.discountValue = discountValue
    data.discountAmount = discountAmount
    data.totalAmount = totals.total
  }

  const quote = await prisma.quoteRequest.update({
    where: { id: existing.id },
    data,
    include: { items: true },
  })

  // Regenerate PDFs so downloads reflect the edit (uses per-quote terms choice)
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } })
    const buildItems = (locale: 'en' | 'ar'): QuotePdfItem[] => {
      if (itemsForPdf) return locale === 'en' ? itemsForPdf.en : itemsForPdf.ar
      return quote.items.map(i => ({
        name: locale === 'en' ? (i.productNameEnSnapshot || i.productNameSnapshot) : (i.productNameArSnapshot || i.productNameSnapshot),
        nameEn: i.productNameEnSnapshot || i.productNameSnapshot,
        nameAr: i.productNameArSnapshot || i.productNameSnapshot,
        imagePath: i.imagePath,
        notes: i.notes,
        price: Number(i.priceSnapshot),
        quantity: i.quantity,
        subtotal: Number(i.priceSnapshot) * i.quantity,
      }))
    }
    const termsFor = (locale: 'en' | 'ar') => {
      if (useDefaultTerms) return locale === 'en' ? (settings as any)?.quoteTermsEn : (settings as any)?.quoteTermsAr
      return locale === 'en'
        ? ((data.customTermsEn as string | undefined) ?? quote.customTermsEn)
        : ((data.customTermsAr as string | undefined) ?? quote.customTermsAr)
    }
    const [pdfEn, pdfAr] = await Promise.all([
      generateQuotePdf({
        quoteNumber: quote.quoteNumber, companyName: quote.companyName, contactName: quote.contactName,
        contactTitle: quote.contactTitle, phone: quote.phone, email: quote.email, notes: quote.notes,
        createdAt: quote.createdAt, items: buildItems('en'),
        subtotalAmount: totals.subtotal, discountType: totals.discountType, discountValue: totals.discountValue,
        discountAmount: totals.discountAmount, totalAmount: totals.total, locale: 'en',
        termsText: termsFor('en'), accountRepEmail: quote.accountRepEmail, accountRepPhone: quote.accountRepPhone,
        siteSettings: settings || undefined,
      }),
      generateQuotePdf({
        quoteNumber: quote.quoteNumber, companyName: quote.companyName, contactName: quote.contactName,
        contactTitle: quote.contactTitle, phone: quote.phone, email: quote.email, notes: quote.notes,
        createdAt: quote.createdAt, items: buildItems('ar'),
        subtotalAmount: totals.subtotal, discountType: totals.discountType, discountValue: totals.discountValue,
        discountAmount: totals.discountAmount, totalAmount: totals.total, locale: 'ar',
        termsText: termsFor('ar'), accountRepEmail: quote.accountRepEmail, accountRepPhone: quote.accountRepPhone,
        siteSettings: settings || undefined,
      }),
    ])
    const [storedEn, storedAr] = await Promise.all([
      storeFile(pdfEn, `quotes/${quote.id}`, `Quotation-${quote.quoteNumber}-EN.pdf`),
      storeFile(pdfAr, `quotes/${quote.id}`, `Quotation-${quote.quoteNumber}-AR.pdf`),
    ])
    await prisma.quoteRequest.update({
      where: { id: quote.id },
      data: { pdfPath: storedEn.relativePath, pdfPathEn: storedEn.relativePath, pdfPathAr: storedAr.relativePath },
    })
  }
  catch {
    // PDF regeneration is best-effort; the data update above already succeeded.
  }

  return { quote }
})
