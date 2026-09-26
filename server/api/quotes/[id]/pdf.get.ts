import fs from 'node:fs'
import { generateQuotePdf, type QuotePdfItem } from '../../../utils/quote-pdf'
import { resolveUploadPath, storeFile } from '../../../utils/storage'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, message: 'Missing quote ID' })

  const query = getQuery(event)
  const locale = query.locale === 'ar' ? 'ar' : 'en'

  const quote = await prisma.quoteRequest.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: {
            select: {
              nameAr: true,
              nameEn: true,
              images: { where: { isCover: true }, take: 1, select: { path: true } },
            },
          },
        },
      },
    },
  })
  if (!quote) {
    throw createError({ statusCode: 404, message: 'Quote not found' })
  }

  let targetPath = locale === 'ar' ? quote.pdfPathAr : quote.pdfPathEn
  if (!targetPath && quote.pdfPath) {
    targetPath = quote.pdfPath
  }

  // If path exists and file is present on disk, redirect to it
  if (targetPath) {
    const parts = targetPath.replace(/^\/uploads\//, '').split('/')
    const full = resolveUploadPath(parts)
    if (full && fs.existsSync(full)) {
      return sendRedirect(event, targetPath)
    }
  }

  // Regenerate on the fly if file is missing or new locale requested
  const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 1 } })

  const pdfItems: QuotePdfItem[] = quote.items.map((item) => {
    const nameEn = item.productNameEnSnapshot || item.product?.nameEn || item.productNameSnapshot
    const nameAr = item.productNameArSnapshot || item.product?.nameAr || item.productNameSnapshot
    const name = locale === 'ar' ? nameAr : nameEn
    const imagePath = item.imagePath || item.product?.images?.[0]?.path || null
    const price = Number(item.priceSnapshot)

    return {
      name,
      nameEn,
      nameAr,
      imagePath,
      notes: item.notes,
      price,
      quantity: item.quantity,
      subtotal: price * item.quantity,
    }
  })

  const subtotalAmount = Number(quote.subtotalAmount || quote.totalAmount)
  const totalAmount = Number(quote.totalAmount)

  const pdfBuffer = await generateQuotePdf({
    quoteNumber: quote.quoteNumber,
    companyName: quote.companyName,
    contactName: quote.contactName,
    contactTitle: quote.contactTitle ?? null,
    phone: quote.phone,
    email: quote.email,
    notes: quote.notes,
    createdAt: quote.createdAt,
    items: pdfItems,
    subtotalAmount,
    discountType: quote.discountType,
    discountValue: Number(quote.discountValue || 0),
    discountAmount: Number(quote.discountAmount || 0),
    totalAmount,
    locale,
    termsText: locale === 'ar' ? siteSettings?.quoteTermsAr : siteSettings?.quoteTermsEn,
    accountRepEmail: quote.accountRepEmail || siteSettings?.contactEmail,
    accountRepPhone: quote.accountRepPhone || siteSettings?.contactPhone1,
    siteSettings: siteSettings || undefined,
  })

  const filename = `Quotation-${quote.quoteNumber}-${locale.toUpperCase()}.pdf`
  const { relativePath } = await storeFile(pdfBuffer, `quotes/${quote.id}`, filename)

  await prisma.quoteRequest.update({
    where: { id: quote.id },
    data: locale === 'ar'
      ? { pdfPathAr: relativePath }
      : { pdfPathEn: relativePath, pdfPath: relativePath },
  })

  return sendRedirect(event, relativePath)
})
