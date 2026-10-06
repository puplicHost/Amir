/**
 * Sequential document numbering backed by SiteSettings counters.
 * Quote numbers look like QT-1000, invoice numbers like INV-0001.
 */

async function ensureSettings() {
  let settings = await prisma.siteSettings.findUnique({ where: { id: 1 } })
  if (!settings) {
    settings = await prisma.siteSettings.create({
      data: { id: 1, siteNameAr: 'مانجو إلكترونيكس', siteNameEn: 'Mango Electronics' },
    })
  }
  return settings
}

export async function nextQuoteNumber(): Promise<string> {
  const settings = await ensureSettings()
  const next = Math.max(Number((settings as any).quoteSequenceNext ?? 1000) || 1000, 1)
  await prisma.siteSettings.update({ where: { id: 1 }, data: { quoteSequenceNext: next + 1 } })
  return `QT-${next}`
}

export async function nextInvoiceNumber(): Promise<string> {
  const settings = await ensureSettings()
  const next = Math.max(Number((settings as any).invoiceSequenceNext ?? 1) || 1, 1)
  await prisma.siteSettings.update({ where: { id: 1 }, data: { invoiceSequenceNext: next + 1 } })
  return `INV-${String(next).padStart(4, '0')}`
}

export function quoteExpiryDate(validityDays?: number | null): Date {
  const days = Math.max(1, Number(validityDays) || 30)
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}
