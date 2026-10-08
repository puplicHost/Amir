import fs from 'node:fs'
import path from 'node:path'
import printerModule from 'pdfmake-rtl/js/Printer.js'
import sharp from 'sharp'

const PdfPrinter = printerModule.default?.default || printerModule.default || printerModule

export interface InvoicePdfItem {
  name: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface InvoicePdfData {
  invoiceNumber: string
  status: string
  paymentMethod: string
  type: string
  createdAt: Date | string
  dueDate?: Date | string | null
  customerName: string
  customerPhone: string
  customerGovernorat?: string | null
  customerAddress?: string | null
  items: InvoicePdfItem[]
  subtotalAmount: number
  discountAmount?: number
  taxAmount: number
  totalAmount: number
  notes?: string | null
  createdByName?: string | null
  locale: 'ar' | 'en'
  siteSettings?: {
    siteNameAr?: string
    siteNameEn?: string
    logoPath?: string | null
    contactPhone1?: string
    contactPhone2?: string
    contactEmail?: string
    contactAddressAr?: string
    contactAddressEn?: string
  }
}

const PRIMARY = '#2B71AE'
const ACCENT_YELLOW = '#F5CC07'
const BORDER_COLOR = '#e0e0e0'
const ZEBRA_BG = '#f9f9f9'

let cachedLogoDataUri: string | null = null
let cachedLogoKey: string | null = null
let cachedWatermarkDataUri: string | null = null
let cachedWatermarkKey: string | null = null

function resolveLogoFile(customPath?: string | null): string | null {
  const candidates: string[] = []
  if (customPath && customPath.startsWith('/uploads/')) {
    candidates.push(path.resolve(process.cwd(), 'storage', customPath.replace(/^\/uploads\//, '')))
  }
  if (customPath && !customPath.startsWith('/') && !customPath.startsWith('http')) {
    candidates.push(path.resolve(process.cwd(), customPath))
  }
  candidates.push(path.resolve(process.cwd(), 'public/logo.png'))
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c
    }
    catch { /* ignore */ }
  }
  return null
}

async function getLogoDataUri(logoFile: string | null): Promise<string | null> {
  if (!logoFile) return null
  if (cachedLogoDataUri && cachedLogoKey === logoFile) return cachedLogoDataUri
  try {
    const buffer = await sharp(logoFile)
      .resize({ width: 280, height: 160, fit: 'inside' })
      .png()
      .toBuffer()
    cachedLogoKey = logoFile
    cachedLogoDataUri = `data:image/png;base64,${buffer.toString('base64')}`
    return cachedLogoDataUri
  }
  catch {
    return null
  }
}

async function getWatermarkDataUri(logoFile: string | null): Promise<string | null> {
  if (!logoFile) return null
  if (cachedWatermarkDataUri && cachedWatermarkKey === logoFile) return cachedWatermarkDataUri
  try {
    const buffer = await sharp(logoFile)
      .resize({ width: 800, height: 800, fit: 'inside' })
      .png()
      .toBuffer()
    cachedWatermarkKey = logoFile
    cachedWatermarkDataUri = `data:image/png;base64,${buffer.toString('base64')}`
    return cachedWatermarkDataUri
  }
  catch {
    return null
  }
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '../../2026/'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '../../2026/'
  const day = String(dt.getDate()).padStart(2, '0')
  const month = String(dt.getMonth() + 1).padStart(2, '0')
  const year = dt.getFullYear()
  return `${day}/${month}/${year}/`
}

function fmtMoney(n: number): string {
  return (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function paymentLabel(method: string, isAr: boolean): string {
  if (method === 'COD') return isAr ? 'الدفع عند الاستلام' : 'Cash on Delivery'
  if (method === 'Card' || method === 'card') return isAr ? 'بطاقة' : 'Card'
  if (method === 'Transfer' || method === 'transfer') return isAr ? 'تحويل' : 'Transfer'
  return method || (isAr ? 'نقدي' : 'Cash')
}

interface Density { font: number; pad: number; padRows: number; compact: boolean }

function densityFor(n: number): Density {
  if (n <= 10) return { font: 9, pad: 5, padRows: 10, compact: false }
  if (n <= 18) return { font: 8.5, pad: 3, padRows: 0, compact: false }
  if (n <= 28) return { font: 8, pad: 2.2, padRows: 0, compact: true }
  if (n <= 45) return { font: 7, pad: 1.6, padRows: 0, compact: true }
  return { font: 6, pad: 1.2, padRows: 0, compact: true }
}

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Buffer> {
  const fontDir = path.resolve(process.cwd(), 'node_modules/pdfmake-rtl/build/fonts/Cairo')
  const fonts = {
    Cairo: {
      normal: path.join(fontDir, 'Cairo-Regular.ttf'),
      bold: path.join(fontDir, 'Cairo-Bold.ttf'),
      italics: path.join(fontDir, 'Cairo-Regular.ttf'),
      bolditalics: path.join(fontDir, 'Cairo-Bold.ttf'),
    },
  }
  const printer = new PdfPrinter(fonts)
  const isAr = data.locale === 'ar'
  const s = data.siteSettings || {}
  const logoFile = resolveLogoFile(s.logoPath)
  const logoDataUri = await getLogoDataUri(logoFile)
  const watermarkDataUri = await getWatermarkDataUri(logoFile)

  const companyName = isAr ? (s.siteNameAr || 'مانجو إلكترونيكس') : (s.siteNameEn || 'Mango Electronics')
  const companyAddress = isAr
    ? (s.contactAddressAr || s.contactAddressEn || 'الأسماعيلية — مصر')
    : (s.contactAddressEn || s.contactAddressAr || 'Ismailia — Egypt')
  const phones = [s.contactPhone1, s.contactPhone2].filter(Boolean).join(' - ') || '+201206692076 - +201145471933'

  const discount = Number(data.discountAmount ?? Math.max(0, Number(data.subtotalAmount) + Number(data.taxAmount) - Number(data.totalAmount))) || 0

  const d = densityFor(data.items.length)
  const compact = d.compact
  const infoSize = compact ? 8.5 : 9.5
  const gap = compact ? 4 : 6

  // ── Header: Top-left: company name + address + phones (stacked, RTL) | Top-right: Mango Electronics logo image ──
  // In pdfmake LTR column layout: [col0 = Left, col1 = Right]
  const companyBlock: any = {
    stack: [
      { text: companyName, fontSize: 13, bold: true, color: PRIMARY, alignment: 'left' },
      { text: companyAddress, fontSize: 9, color: '#334155', alignment: 'left', margin: [0, 2, 0, 0] },
      { text: phones, fontSize: 8.5, color: '#334155', alignment: 'left', margin: [0, 1, 0, 0] },
    ],
    alignment: 'left',
  }
  const logoBlock: any = logoDataUri
    ? { image: logoDataUri, width: compact ? 95 : 120, alignment: 'right' }
    : {
        stack: [
          { text: 'MANGO ELECTRONICS', fontSize: 13, bold: true, color: PRIMARY, alignment: 'right' },
          { text: 'DO IT RIGHT, DO IT SMART', fontSize: 8, color: '#64748B', alignment: 'right' },
        ],
        alignment: 'right',
      }

  const headerRow: any = {
    columns: [companyBlock, logoBlock],
    margin: [0, 0, 0, 6],
  }

  // ── Centered title: فاتورة شركة **مانجو إلكترونيكس** — "مانجو إلكترونيكس" in #2B71AE bold ──
  const titleBlock: any = isAr
    ? {
        text: [
          { text: 'فاتورة شركة ', fontSize: 17, bold: true, color: '#0F172A' },
          { text: 'مانجو إلكترونيكس', fontSize: 17, bold: true, color: PRIMARY },
        ],
        alignment: 'center',
        margin: [0, 6, 0, 6],
      }
    : {
        text: [
          { text: 'Invoice ', fontSize: 17, bold: true, color: '#0F172A' },
          { text: 'Mango Electronics', fontSize: 17, bold: true, color: PRIMARY },
        ],
        alignment: 'center',
        margin: [0, 6, 0, 6],
      }

  // ── Horizontal divider line (#2B71AE, full width) below the title ──
  const divider: any = {
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: 523, y2: 0, lineWidth: 2, lineColor: PRIMARY }],
    margin: [0, 0, 0, 10],
  }

  // ── Customer Info Block (2 columns, below divider):
  // Right column: اسم العميل/الشركة: ........................ / العنوان: ........................
  // Left column: التليفون: ........................ / التاريخ: ../../2026/ / طريقة الدفع: ........................ / رقم الفاتورة: ........................
  const dottedValue = (val: string, fallback = '........................') => ({
    text: val || fallback,
    color: val ? '#0F172A' : '#999999',
  })

  const rightInfo: any = {
    stack: [
      { text: [{ text: isAr ? 'اسم العميل/الشركة: ' : 'Customer/Company: ', bold: true, color: '#0F172A' }, dottedValue(data.customerName)], fontSize: infoSize, alignment: 'right', margin: [0, 0, 0, gap] },
      { text: [{ text: isAr ? 'العنوان: ' : 'Address: ', bold: true, color: '#0F172A' }, dottedValue(data.customerAddress || data.customerGovernorat || '')], fontSize: infoSize, alignment: 'right', margin: [0, 0, 0, 0] },
    ],
    alignment: 'right',
  }
  const leftInfo: any = {
    stack: [
      { text: [{ text: isAr ? 'التليفون: ' : 'Phone: ', bold: true, color: '#0F172A' }, dottedValue(data.customerPhone)], fontSize: infoSize, alignment: 'right', margin: [0, 0, 0, gap] },
      { text: [{ text: isAr ? 'التاريخ: ' : 'Date: ', bold: true, color: '#0F172A' }, { text: fmtDate(data.createdAt), color: '#0F172A' }], fontSize: infoSize, alignment: 'right', margin: [0, 0, 0, gap] },
      { text: [{ text: isAr ? 'طريقة الدفع: ' : 'Payment: ', bold: true, color: '#0F172A' }, dottedValue(paymentLabel(data.paymentMethod, isAr))], fontSize: infoSize, alignment: 'right', margin: [0, 0, 0, gap] },
      { text: [{ text: isAr ? 'رقم الفاتورة: ' : 'Invoice No: ', bold: true, color: '#0F172A' }, { text: data.invoiceNumber, bold: true, color: PRIMARY }], fontSize: infoSize, alignment: 'right', margin: [0, 0, 0, 0] },
    ],
    alignment: 'right',
  }

  const infoBlock: any = {
    columns: [leftInfo, rightInfo],
    columnGap: 24,
    margin: [0, 0, 0, 10],
  }

  // ── Items Table: Columns (RTL order): م | البيان | الكمية | سعر الوحدة | الإجمالي ──
  // Header row: #2B71AE background, white text, bold, centered
  // Data rows: 10 rows minimum (empty rows shown as blank lines if fewer items)
  // Alternating row bg: white / very light gray #f9f9f9
  // All borders: 1px solid #e0e0e0
  const itemHeader = isAr
    ? ['م', 'البيان', 'الكمية', 'سعر الوحدة', 'الإجمالي']
    : ['#', 'Description', 'Qty', 'Unit Price', 'Total']
  const tableBody: any[] = [
    itemHeader.map(h => ({ text: h, style: 'tableHeader', alignment: 'center' })),
  ]
  data.items.forEach((item, idx) => {
    tableBody.push([
      { text: String(idx + 1), alignment: 'center', fontSize: d.font },
      { text: item.name, fontSize: d.font, alignment: isAr ? 'right' : 'left' },
      { text: String(item.quantity), alignment: 'center', fontSize: d.font },
      { text: `${fmtMoney(item.unitPrice)}`, alignment: 'center', fontSize: d.font },
      { text: `${fmtMoney(item.subtotal)}`, alignment: 'center', fontSize: d.font, bold: true },
    ])
  })
  // Pad to minimum 10 rows with blank lines if fewer items
  for (let i = data.items.length; i < d.padRows; i++) {
    tableBody.push([
      { text: String(i + 1), alignment: 'center', fontSize: d.font, color: '#9CA3AF' },
      { text: ' ', fontSize: d.font },
      { text: ' ', fontSize: d.font },
      { text: ' ', fontSize: d.font },
      { text: ' ', fontSize: d.font },
    ])
  }

  const itemsTable: any = {
    table: {
      rtl: true,
      headerRows: 1,
      widths: [28, '*', 52, 84, 92],
      body: tableBody,
    },
    layout: {
      hLineWidth: () => 1,
      vLineWidth: () => 1,
      hLineColor: () => BORDER_COLOR,
      vLineColor: () => BORDER_COLOR,
      fillColor: (rowIndex: number) => {
        if (rowIndex === 0) return PRIMARY
        return rowIndex % 2 === 0 ? ZEBRA_BG : '#ffffff'
      },
      // Keep row background translucent so watermark shows through clearly
      fillOpacity: (rowIndex: number) => (rowIndex === 0 ? 1 : 0.65),
      paddingLeft: () => 6,
      paddingRight: () => 6,
      paddingTop: () => d.pad,
      paddingBottom: () => d.pad,
    },
    margin: [0, 0, 0, 8],
  }

  // ── Totals Block (bottom right): 4 rows in a bordered box ──
  // - الإجمالي: ........
  // - خصم: ........
  // - ضريبة القيمة المضافة: ........
  // - الصافي المستحق: [yellow #F5CC07 background, bold, larger text]
  const totalsBox: any = {
    table: {
      widths: [135, 95],
      body: [
        [
          { text: isAr ? 'الإجمالي:' : 'Subtotal:', fontSize: 9.5, alignment: 'center' },
          { text: fmtMoney(data.subtotalAmount), fontSize: 9.5, bold: true, alignment: 'center' },
        ],
        [
          { text: isAr ? 'خصم:' : 'Discount:', fontSize: 9.5, alignment: 'center' },
          { text: fmtMoney(discount), fontSize: 9.5, bold: true, alignment: 'center' },
        ],
        [
          { text: isAr ? 'ضريبة القيمة المضافة:' : 'VAT:', fontSize: 9.5, alignment: 'center' },
          { text: fmtMoney(data.taxAmount), fontSize: 9.5, bold: true, alignment: 'center' },
        ],
        [
          { text: isAr ? 'الصافي المستحق:' : 'Net Due:', fontSize: 11, bold: true, alignment: 'center' },
          { text: fmtMoney(data.totalAmount), fontSize: 12, bold: true, alignment: 'center' },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 1,
      vLineWidth: () => 1,
      hLineColor: () => BORDER_COLOR,
      vLineColor: () => BORDER_COLOR,
      fillColor: (rowIndex: number) => (rowIndex === 3 ? ACCENT_YELLOW : null),
      paddingLeft: () => 8,
      paddingRight: () => 8,
      paddingTop: () => 5,
      paddingBottom: () => 5,
    },
  }
  const totalsBlock: any = {
    columns: [{ text: '', width: '*' }, { ...totalsBox, width: 230 }],
    margin: [0, 0, 0, 8],
  }

  // ── Notes line: ملاحظات: ............................ ──
  const notesBlock: any = {
    text: [
      { text: isAr ? 'ملاحظات: ' : 'Notes: ', bold: true, color: '#0F172A' },
      { text: data.notes || '............................', color: data.notes ? '#0F172A' : '#999999' },
    ],
    fontSize: 9.5,
    alignment: isAr ? 'right' : 'left',
    margin: [0, 0, 0, compact ? 8 : 14],
  }

  // ── Footer (bottom, 2 columns):
  // Right: توقيع المستلم ......................
  // Left: ختم وتوقيع الشركة ......................
  // Centered below: المسؤول: "لي عمل الفاتورة من علي الموقع"
  const footerBlock: any = {
    stack: [
      {
        columns: [
          {
            stack: [
              { text: isAr ? 'ختم وتوقيع الشركة' : 'Company stamp & signature', bold: true, fontSize: 9.5, alignment: 'center' },
              { text: '......................', color: '#999999', fontSize: 9.5, alignment: 'center', margin: [0, 8, 0, 0] },
            ],
          },
          {
            stack: [
              { text: isAr ? 'توقيع المستلم' : 'Recipient signature', bold: true, fontSize: 9.5, alignment: 'center' },
              { text: '......................', color: '#999999', fontSize: 9.5, alignment: 'center', margin: [0, 8, 0, 0] },
            ],
          },
        ],
        columnGap: 24,
        margin: [0, 0, 0, 10],
      },
      {
        text: `المسؤول: "${data.createdByName || 'لي عمل الفاتورة من علي الموقع'}"`,
        fontSize: 9,
        color: '#475569',
        alignment: 'center',
      },
    ],
  }

  const docDefinition: any = {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [36, 28, 36, 36],
    defaultStyle: { font: 'Cairo', fontSize: 9.5, color: '#0F172A' },
    // Watermark: Mango Electronics logo centered behind table, clearly visible through rows (16%), large (420px)
    background: watermarkDataUri
      ? (_currentPage: number, _pageSize: any) => ({
          image: watermarkDataUri,
          width: 420,
          opacity: 0.16,
          alignment: 'center',
          margin: [0, 195, 0, 0],
        })
      : undefined,
    footer: (currentPage: number, pageCount: number) => ({
      stack: [
        {
          text: `${s.contactPhone1 || ''}${s.contactEmail ? ` · ${s.contactEmail}` : ''} · ${currentPage}/${pageCount}`,
          fontSize: 7.5, color: '#64748B', alignment: 'center',
        },
      ],
      margin: [36, 0, 36, 0],
    }),
    content: [
      headerRow,
      titleBlock,
      divider,
      infoBlock,
      itemsTable,
      totalsBlock,
      notesBlock,
      footerBlock,
    ],
    styles: {
      tableHeader: { fontSize: 9.5, bold: true, color: '#ffffff', margin: [0, 4, 0, 4] },
    },
  }

  const pdfDoc = await printer.createPdfKitDocument(docDefinition)
  const chunks: Buffer[] = []
  return new Promise((resolve, reject) => {
    pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk))
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)))
    pdfDoc.on('error', (err: any) => reject(err))
    pdfDoc.end()
  })
}
