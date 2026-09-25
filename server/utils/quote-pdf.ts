import path from 'node:path'
import printerModule from 'pdfmake-rtl/js/Printer.js'

const PdfPrinter = printerModule.default?.default || printerModule.default || printerModule

export interface QuotePdfData {
  quoteNumber: string
  companyName: string
  contactName: string
  phone: string
  email?: string | null
  notes?: string | null
  createdAt: Date
  items: Array<{
    name: string
    categoryName?: string
    price: number
    quantity: number
    subtotal: number
  }>
  totalAmount: number
  locale?: string
  siteSettings?: {
    siteNameAr?: string
    siteNameEn?: string
    contactPhone1?: string
    contactEmail?: string
    contactAddressAr?: string
    contactAddressEn?: string
  }
}

export async function generateQuotePdf(data: QuotePdfData): Promise<Buffer> {
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

  const isAr = data.locale === 'ar' || !data.locale
  const dateFormatted = new Date(data.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const tableBody: any[] = [
    [
      { text: isAr ? '#' : '#', style: 'tableHeader', alignment: 'center' },
      { text: isAr ? 'المنتج والمواصفات' : 'Product & Description', style: 'tableHeader' },
      { text: isAr ? 'الكمية' : 'Qty', style: 'tableHeader', alignment: 'center' },
      { text: isAr ? 'سعر الوحدة' : 'Unit Price', style: 'tableHeader', alignment: 'center' },
      { text: isAr ? 'الإجمالي' : 'Subtotal', style: 'tableHeader', alignment: 'center' },
    ],
  ]

  data.items.forEach((item, index) => {
    tableBody.push([
      { text: String(index + 1), alignment: 'center', margin: [0, 5, 0, 5] },
      {
        stack: [
          { text: item.name, bold: true },
          ...(item.categoryName ? [{ text: item.categoryName, fontSize: 9, color: '#64748b' }] : []),
        ],
        margin: [0, 5, 0, 5],
      },
      { text: String(item.quantity), alignment: 'center', margin: [0, 5, 0, 5], bold: true },
      { text: `${item.price.toLocaleString()} EGP`, alignment: 'center', margin: [0, 5, 0, 5] },
      { text: `${item.subtotal.toLocaleString()} EGP`, alignment: 'center', margin: [0, 5, 0, 5], bold: true, color: '#2B71AE' },
    ])
  })

  // Grand Total Row
  tableBody.push([
    { text: isAr ? 'الإجمالي الكلي' : 'Grand Total', colSpan: 4, bold: true, alignment: 'right', margin: [0, 6, 10, 6] },
    {},
    {},
    {},
    { text: `${data.totalAmount.toLocaleString()} EGP`, bold: true, alignment: 'center', margin: [0, 6, 0, 6], color: '#2B71AE', fontSize: 11 },
  ])

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [36, 40, 36, 40],
    defaultStyle: {
      font: 'Cairo',
      fontSize: 10,
      color: '#0f172a',
    },
    content: [
      // Top Header with Branding
      {
        columns: [
          {
            stack: [
              { text: isAr ? 'مانجو إلكترونيكس' : 'Mango Electronics', fontSize: 18, bold: true, color: '#2B71AE' },
              { text: isAr ? 'اعملها صح، اعملها بذكاء' : 'Do It Right, Do It Smart', fontSize: 10, color: '#64748b', margin: [0, 2, 0, 0] },
              { text: isAr ? 'حلول هندسية متكاملة وتوريد مكونات صناعية' : 'Integrated Industrial Engineering & Electronics', fontSize: 9, color: '#94a3b8' },
            ],
          },
          {
            stack: [
              { text: isAr ? 'عرض أسعار رسمي' : 'Official Price Quotation', fontSize: 16, bold: true, alignment: 'right', color: '#0f172a' },
              { text: `${isAr ? 'رقم العرض:' : 'Quote #:'} ${data.quoteNumber}`, fontSize: 11, bold: true, color: '#2B71AE', alignment: 'right', margin: [0, 2, 0, 0] },
              { text: `${isAr ? 'التاريخ:' : 'Date:'} ${dateFormatted}`, fontSize: 9, color: '#64748b', alignment: 'right' },
              { text: `${isAr ? 'الصلاحية: 30 يوماً من تاريخ الإصدار' : 'Validity: 30 Days from issue'}`, fontSize: 9, color: '#F59E0B', alignment: 'right', bold: true },
            ],
          },
        ],
        margin: [0, 0, 0, 20],
      },

      // Divider Line
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 523, y2: 0, lineWidth: 1.5, lineColor: '#2B71AE' }],
        margin: [0, 0, 0, 16],
      },

      // Client / Company Information Box
      {
        style: 'infoBox',
        table: {
          widths: ['*'],
          body: [
            [
              {
                stack: [
                  { text: isAr ? 'بيانات العميل والجهة الطالبة:' : 'Quotation Issued To:', fontSize: 11, bold: true, color: '#2B71AE', margin: [0, 0, 0, 6] },
                  {
                    columns: [
                      {
                        stack: [
                          { text: `${isAr ? 'الشركة / المنشأة:' : 'Company:'} ${data.companyName}`, bold: true },
                          { text: `${isAr ? 'المسؤول:' : 'Contact Person:'} ${data.contactName}`, margin: [0, 2, 0, 0] },
                        ],
                      },
                      {
                        stack: [
                          { text: `${isAr ? 'الهاتف:' : 'Phone:'} ${data.phone}`, bold: true },
                          ...(data.email ? [{ text: `${isAr ? 'البريد:' : 'Email:'} ${data.email}`, margin: [0, 2, 0, 0] }] : []),
                        ],
                      },
                    ],
                  },
                  ...(data.notes ? [
                    { text: `${isAr ? 'ملاحظات:' : 'Notes:'} ${data.notes}`, fontSize: 9, color: '#475569', margin: [0, 6, 0, 0] },
                  ] : []),
                ],
                fillColor: '#F8FAFC',
                margin: [10, 8, 10, 8],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => '#E2E8F0',
          vLineColor: () => '#E2E8F0',
        },
        margin: [0, 0, 0, 20],
      },

      // Table of Products
      {
        table: {
          headerRows: 1,
          widths: [24, '*', 45, 80, 85],
          body: tableBody,
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length ? 1.5 : 0.5),
          vLineWidth: () => 0,
          hLineColor: (i: number, node: any) => (i === 0 || i === 1 ? '#2B71AE' : '#E2E8F0'),
          fillColor: (i: number) => {
            if (i === 0) return '#2B71AE'
            return i % 2 === 0 ? '#F8FAFC' : null
          },
        },
        margin: [0, 0, 0, 24],
      },

      // Terms & Guarantee Note
      {
        stack: [
          { text: isAr ? 'الشروط والضمان الفني:' : 'Terms & Technical Guarantee:', fontSize: 10, bold: true, color: '#0f172a', margin: [0, 0, 0, 4] },
          { text: isAr ? '• جميع المكونات والأجهزة أصلية 100% ومرفقة معها كتيبات المواصفات الفنية المعتمدة.' : '• All components and modules are 100% genuine with verified technical datasheets.', fontSize: 8.5, color: '#64748b' },
          { text: isAr ? '• الأسعار الموضحة بالجنيه المصري وسارية لمدة 30 يوماً من تاريخ هذا العرض.' : '• Prices are in Egyptian Pounds (EGP) and valid for 30 calendar days from issue date.', fontSize: 8.5, color: '#64748b' },
          { text: isAr ? '• التوريد متاح لجميع المحافظات مع إمكانية الفحص الفني عند الاستلام.' : '• Nationwide delivery across Egypt with on-delivery inspection support.', fontSize: 8.5, color: '#64748b' },
        ],
        margin: [0, 0, 0, 24],
      },

      // Official Footer
      {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 523, y2: 0, lineWidth: 0.8, lineColor: '#E2E8F0' }],
        margin: [0, 0, 0, 10],
      },
      {
        columns: [
          {
            text: `${data.siteSettings?.siteNameAr || 'مانجو إلكترونيكس'} - ${data.siteSettings?.contactPhone1 || '01000000000'}`,
            fontSize: 8.5,
            color: '#64748b',
          },
          {
            text: `${data.siteSettings?.contactEmail || 'info@mango-electronics.com'} | www.mango-electronics.com`,
            fontSize: 8.5,
            color: '#64748b',
            alignment: 'right',
          },
        ],
      },
    ],
    styles: {
      tableHeader: {
        fontSize: 10,
        bold: true,
        color: '#FFFFFF',
        margin: [0, 5, 0, 5],
      },
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
