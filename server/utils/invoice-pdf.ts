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
  taxAmount: number
  totalAmount: number
  notes?: string | null
  locale: 'ar' | 'en'
  siteSettings?: {
    siteNameAr?: string
    siteNameEn?: string
    contactPhone1?: string
    contactPhone2?: string
    contactEmail?: string
    contactAddressAr?: string
    contactAddressEn?: string
  }
}

let cachedLogoDataUri: string | null = null

async function getLogoDataUri(): Promise<string | null> {
  if (cachedLogoDataUri) return cachedLogoDataUri
  try {
    const logoPath = path.resolve(process.cwd(), 'public/logo.png')
    if (!fs.existsSync(logoPath)) return null
    const buffer = await sharp(logoPath)
      .resize({ width: 240, height: 140, fit: 'inside' })
      .png()
      .toBuffer()
    cachedLogoDataUri = `data:image/png;base64,${buffer.toString('base64')}`
    return cachedLogoDataUri
  }
  catch {
    return null
  }
}

function fmtDate(d: Date | string | null | undefined, isAr: boolean): string {
  if (!d) return '-'
  const dt = new Date(d)
  const day = String(dt.getDate()).padStart(2, '0')
  const month = String(dt.getMonth() + 1).padStart(2, '0')
  const year = dt.getFullYear()
  return `${day}/${month}/${year}`
}

function fmtMoney(n: number): string {
  return (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
  const logoDataUri = await getLogoDataUri()

  const statusAr = data.status === 'Paid' ? 'مدفوعة' : data.status === 'Cancelled' ? 'ملغية' : 'معلقة'
  const statusColor = data.status === 'Paid' ? '#047857' : data.status === 'Cancelled' ? '#64748B' : '#B45309'

  // ── Header row: logo (right in AR) + title block (left in AR) ──
  const logoBlock: any = logoDataUri
    ? { image: logoDataUri, width: 100, alignment: isAr ? 'right' : 'left' }
    : {
        stack: [
          { text: 'MANGO ELECTRONICS', fontSize: 13, bold: true, color: '#2B71AE' },
          { text: 'DO IT RIGHT, DO IT SMART', fontSize: 8, color: '#64748B' },
        ],
        alignment: isAr ? 'right' : 'left',
      }

  const titleBlock: any = {
    stack: [
      { text: isAr ? 'فاتورة ضريبية' : 'TAX INVOICE', fontSize: 20, bold: true, color: '#1F4E79', alignment: isAr ? 'left' : 'right' },
      { text: data.invoiceNumber, fontSize: 11, bold: true, color: '#2B71AE', alignment: isAr ? 'left' : 'right', margin: [0, 2, 0, 0] },
      {
        text: statusAr,
        fontSize: 9, bold: true, color: statusColor,
        alignment: isAr ? 'left' : 'right', margin: [0, 2, 0, 0],
      },
    ],
  }

  const headerRow = isAr
    ? { columns: [logoBlock, { text: '', width: '*' }, titleBlock], margin: [0, 0, 0, 12] }
    : { columns: [titleBlock, { text: '', width: '*' }, logoBlock], margin: [0, 0, 0, 12] }

  // ── Company (right) + Customer (left) info ──
  const companyInfo = {
    stack: [
      { text: isAr ? 'بيانات الشركة' : 'Company Details', bold: true, color: '#1F4E79', fontSize: 10, margin: [0, 0, 0, 4] },
      { text: isAr ? (s.siteNameAr || 'مانجو إلكترونيكس') : (s.siteNameEn || 'Mango Electronics'), fontSize: 9 },
      ...(s.contactAddressAr || s.contactAddressEn ? [{ text: isAr ? (s.contactAddressAr || '') : (s.contactAddressEn || ''), fontSize: 8.5, color: '#475569' }] : []),
      ...(s.contactPhone1 ? [{ text: `${s.contactPhone1}${s.contactPhone2 ? ` - ${s.contactPhone2}` : ''}`, fontSize: 8.5, color: '#475569' }] : []),
      ...(s.contactEmail ? [{ text: s.contactEmail, fontSize: 8.5, color: '#475569' }] : []),
    ],
    alignment: isAr ? 'right' : 'left',
  }
  const customerInfo = {
    stack: [
      { text: isAr ? 'بيانات العميل' : 'Bill To', bold: true, color: '#1F4E79', fontSize: 10, margin: [0, 0, 0, 4] },
      { text: data.customerName, fontSize: 9 },
      { text: `"${data.customerPhone}"`, fontSize: 8.5, color: '#475569' },
      ...(data.customerGovernorat ? [{ text: data.customerGovernorat, fontSize: 8.5, color: '#475569' }] : []),
      ...(data.customerAddress ? [{ text: data.customerAddress, fontSize: 8.5, color: '#475569' }] : []),
    ],
    alignment: isAr ? 'right' : 'left',
  }

  const partiesBlock = {
    table: {
      rtl: isAr,
      widths: ['*', '*'],
      body: [[companyInfo, customerInfo]],
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 2,
      paddingBottom: () => 2,
    },
    margin: [0, 0, 0, 6],
  }

  const datesBlock = {
    columns: isAr
      ? [
          { text: [{ text: isAr ? 'تاريخ الفاتورة: ' : 'Issue Date: ', bold: true, color: '#1F4E79' }, { text: fmtDate(data.createdAt, isAr) }], fontSize: 9, alignment: 'right' },
          { text: [{ text: isAr ? 'تاريخ الاستحقاق: ' : 'Due Date: ', bold: true, color: '#1F4E79' }, { text: fmtDate(data.dueDate || data.createdAt, isAr) }], fontSize: 9, alignment: 'right' },
        ]
      : [
          { text: [{ text: 'Issue Date: ', bold: true, color: '#1F4E79' }, { text: fmtDate(data.createdAt, isAr) }], fontSize: 9, alignment: 'left' },
          { text: [{ text: 'Due Date: ', bold: true, color: '#1F4E79' }, { text: fmtDate(data.dueDate || data.createdAt, isAr) }], fontSize: 9, alignment: 'left' },
        ],
    margin: [0, 0, 0, 10],
  }

  // ── Items table ──
  const itemHeader = isAr
    ? ['م', 'الصنف / الخدمة', 'الكمية', 'سعر الوحدة', 'الإجمالي']
    : ['#', 'Item / Service', 'Qty', 'Unit Price', 'Subtotal']
  const tableBody: any[] = [
    itemHeader.map(h => ({ text: h, style: 'tableHeader', alignment: 'center' })),
    ...data.items.map((item, idx) => [
      { text: String(idx + 1), alignment: 'center', fontSize: 9 },
      { text: item.name, fontSize: 9, alignment: isAr ? 'right' : 'left' },
      { text: String(item.quantity), alignment: 'center', fontSize: 9 },
      { text: `${fmtMoney(item.unitPrice)} EGP`, alignment: 'center', fontSize: 9 },
      { text: `${fmtMoney(item.subtotal)} EGP`, alignment: 'center', fontSize: 9, bold: true },
    ]),
  ]

  const totalsBlock = {
    columns: [
      { text: '', width: '*' },
      {
        table: {
          widths: [140, 110],
          body: [
            [
              { text: isAr ? 'الإجمالي قبل الضريبة' : 'Subtotal', fontSize: 9, color: '#475569', alignment: 'center' },
              { text: `${fmtMoney(data.subtotalAmount)} EGP`, fontSize: 9, bold: true, alignment: 'center' },
            ],
            [
              { text: isAr ? 'الضريبة' : 'Tax', fontSize: 9, color: '#475569', alignment: 'center' },
              { text: `${fmtMoney(data.taxAmount)} EGP`, fontSize: 9, bold: true, alignment: 'center' },
            ],
            [
              { text: isAr ? 'الإجمالي الكلي' : 'Grand Total', fontSize: 11, bold: true, color: '#1F4E79', alignment: 'center' },
              { text: `${fmtMoney(data.totalAmount)} EGP`, fontSize: 12, bold: true, color: '#1F4E79', alignment: 'center' },
            ],
          ],
        },
        layout: {
          hLineWidth: (i: number) => (i === 2 ? 1.2 : 0.6),
          vLineWidth: () => 0.6,
          hLineColor: () => '#8FAADC',
          vLineColor: () => '#8FAADC',
          fillColor: (i: number) => (i === 2 ? '#D9E1F2' : null),
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 4,
          paddingBottom: () => 4,
        },
      },
    ],
    margin: [0, 4, 0, 10],
  }

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [36, 28, 36, 40],
    defaultStyle: { font: 'Cairo', fontSize: 9.5, color: '#0F172A' },
    footer: (currentPage: number, pageCount: number) => ({
      stack: [
        {
          text: isAr
            ? 'شكراً لتعاملكم مع Mango Electronics'
            : 'Thank you for your business with Mango Electronics',
          fontSize: 9, bold: true, color: '#1F4E79', alignment: 'center', margin: [0, 0, 0, 2],
        },
        {
          text: `${s.contactPhone1 || ''}${s.contactEmail ? ` · ${s.contactEmail}` : ''} · ${currentPage}/${pageCount}`,
          fontSize: 7.5, color: '#64748B', alignment: 'center',
        },
      ],
      margin: [36, 0, 36, 0],
    }),
    content: [
      headerRow,
      partiesBlock,
      datesBlock,
      {
        table: { headerRows: 1, widths: [24, '*', 40, 80, 90], body: tableBody },
        layout: {
          hLineWidth: () => 0.8,
          vLineWidth: () => 0.8,
          hLineColor: () => '#8FAADC',
          vLineColor: () => '#8FAADC',
          fillColor: (i: number) => (i === 0 ? '#D9E1F2' : null),
        },
        margin: [0, 0, 0, 6],
      },
      totalsBlock,
      ...(data.notes
        ? [{
            stack: [
              { text: isAr ? 'ملاحظات:' : 'Notes:', bold: true, color: '#1F4E79', fontSize: 9.5, margin: [0, 0, 0, 2], alignment: isAr ? 'right' : 'left' },
              { text: data.notes, fontSize: 8.5, color: '#334155', alignment: isAr ? 'right' : 'left' },
            ],
            margin: [0, 0, 0, 6],
          }]
        : []),
      {
        text: [
          { text: isAr ? 'طريقة الدفع: ' : 'Payment: ', bold: true, color: '#1F4E79' },
          { text: data.paymentMethod === 'COD' ? (isAr ? 'الدفع عند الاستلام' : 'Cash on Delivery') : data.paymentMethod },
        ],
        fontSize: 9,
        alignment: isAr ? 'right' : 'left',
      },
    ],
    styles: {
      tableHeader: { fontSize: 9.5, bold: true, color: '#1F4E79', margin: [0, 4, 0, 4] },
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
