import fs from 'node:fs'
import path from 'node:path'
import printerModule from 'pdfmake-rtl/js/Printer.js'
import sharp from 'sharp'

const PdfPrinter = printerModule.default?.default || printerModule.default || printerModule

export interface QuotePdfItem {
  name: string
  nameAr?: string
  nameEn?: string
  imagePath?: string | null
  notes?: string | null
  price: number
  quantity: number
  subtotal: number
}

export interface QuotePdfData {
  quoteNumber: string
  companyName: string
  contactName: string
  contactTitle?: string | null
  phone: string
  email?: string | null
  notes?: string | null
  createdAt: Date | string
  items: QuotePdfItem[]
  subtotalAmount?: number
  discountType?: 'percentage' | 'fixed' | 'none' | string | null
  discountValue?: number | null
  discountAmount?: number | null
  totalAmount: number
  locale: 'ar' | 'en'
  termsText?: string | null
  accountRepEmail?: string | null
  accountRepPhone?: string | null
  siteSettings?: {
    siteNameAr?: string
    siteNameEn?: string
    taglineAr?: string
    taglineEn?: string
    contactPhone1?: string
    contactEmail?: string
  }
}

const DEFAULT_TERMS_EN = [
  'Standard terms and conditions (Editable/Modifiable as needed).',
  'All components and industrial modules are 100% genuine with verified technical datasheets.',
  'Prices are quoted in Egyptian Pounds (EGP) and valid for 30 calendar days from issue date.',
  'Standard technical warranty and preventative maintenance terms apply per manufacturer specs.',
]

const DEFAULT_TERMS_AR = [
  'الشروط والأحكام القياسية المعتمدة (قابلة للتعديل حسب متطلبات المشروع).',
  'جميع المكونات والوحدات الصناعية أصلية 100% ومرفق معها كتيبات المواصفات الفنية المعتمدة.',
  'الأسعار الموضحة بالجنيه المصري وسارية لمدة 30 يوماً تقويمياً من تاريخ إصدار هذا العرض.',
  'تطبق شروط الضمان الفني والصيانة الدورية المعتمدة وفقاً لمعايير الشركات المصنعة.',
]

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
  const isAr = data.locale === 'ar'

  // Date formatting: [Day], [DD/MM/YYYY]
  const d = new Date(data.createdAt)
  const dayName = d.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { weekday: 'long' })
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const dateFormatted = `${dayName}, ${day}/${month}/${year}`

  // Calculate Subtotal & Discount amounts
  const subtotal = Number(data.subtotalAmount || data.items.reduce((s, i) => s + i.subtotal, 0))
  const discountType = data.discountType || 'none'
  const discountVal = Number(data.discountValue || 0)
  let discountAmount = Number(data.discountAmount || 0)

  if (discountType === 'percentage' && discountVal > 0 && !discountAmount) {
    discountAmount = Math.round(((subtotal * discountVal) / 100) * 100) / 100
  }
  else if (discountType === 'fixed' && discountVal > 0 && !discountAmount) {
    discountAmount = Math.min(subtotal, discountVal)
  }

  const finalTotal = Number(data.totalAmount || Math.max(0, subtotal - discountAmount))

  // Pre-load logo image
  const logoDataUri = await getLogoDataUri()

  // Construct Table of Quote Details
  const tableBody: any[] = [
    [
      { text: '#', style: 'tableHeader', alignment: 'center' },
      { text: isAr ? 'وصف المنتج والمواصفات' : 'Product Description', style: 'tableHeader', alignment: isAr ? 'right' : 'left' },
      { text: isAr ? 'الكمية' : 'Quantity', style: 'tableHeader', alignment: 'center' },
      { text: isAr ? 'سعر الوحدة' : 'Unit Price', style: 'tableHeader', alignment: 'center' },
      { text: isAr ? 'الإجمالي' : 'Line Total', style: 'tableHeader', alignment: 'center' },
    ],
  ]

  data.items.forEach((item, index) => {
    const localizedName = isAr
      ? (item.nameAr || item.name)
      : (item.nameEn || item.name)

    const descCell: any = {
      stack: [
        { text: localizedName, bold: true, fontSize: 9.5, alignment: isAr ? 'right' : 'left' },
        ...(item.notes
          ? [{
              text: isAr ? `ملاحظات: ${item.notes}` : `Notes: ${item.notes}`,
              fontSize: 8,
              color: '#64748B',
              margin: [0, 2, 0, 0],
              alignment: isAr ? 'right' : 'left',
            }]
          : []),
      ],
      margin: [0, 4, 0, 4],
    }

    tableBody.push([
      { text: String(index + 1), alignment: 'center', margin: [0, 6, 0, 6], bold: true, fontSize: 9 },
      descCell,
      { text: String(item.quantity), alignment: 'center', margin: [0, 6, 0, 6], bold: true, fontSize: 9 },
      { text: `${item.price.toLocaleString()} EGP`, alignment: 'center', margin: [0, 6, 0, 6], fontSize: 9 },
      { text: `${item.subtotal.toLocaleString()} EGP`, alignment: 'center', margin: [0, 6, 0, 6], bold: true, fontSize: 9 },
    ])
  })

  // Discount Row (colSpan 3 across columns 2, 3, 4 matching Image 1)
  const discountLabel = discountType === 'percentage'
    ? `${discountVal}%`
    : `${discountVal.toLocaleString()} EGP`

  tableBody.push([
    {
      text: isAr ? 'الخصم' : 'Discount',
      bold: true,
      alignment: 'center',
      margin: [0, 5, 0, 5],
      fontSize: 9,
    },
    {
      text: isAr
        ? (discountAmount > 0 ? `خصم مطبق (${discountLabel})` : 'إذا كان مطبقاً - نسبة مئوية أو مبلغ ثابت')
        : (discountAmount > 0 ? `Applied discount (${discountLabel})` : '[If applicable - select discount percentage or fixed amount]'),
      colSpan: 3,
      margin: [0, 5, 0, 5],
      color: '#64748B',
      fontSize: 8.5,
      alignment: isAr ? 'right' : 'left',
    },
    {},
    {},
    {
      text: discountAmount > 0 ? `-${discountAmount.toLocaleString()} EGP` : '-',
      bold: true,
      alignment: 'center',
      margin: [0, 5, 0, 5],
      color: discountAmount > 0 ? '#D97706' : '#64748B',
      fontSize: 9,
    },
  ])

  // Grand Total Row (colSpan 3 across columns 2, 3, 4 matching Image 1)
  tableBody.push([
    {
      text: isAr ? 'الإجمالي الكلي' : 'Grand Total',
      bold: true,
      alignment: 'center',
      margin: [0, 6, 0, 6],
      fontSize: 9.5,
      color: '#1F4E79',
    },
    {
      text: isAr ? 'إجمالي جميع البنود بعد تطبيق الخصم' : 'Overall total of all items after applying discount',
      bold: true,
      colSpan: 3,
      margin: [0, 6, 0, 6],
      fontSize: 9,
      color: '#1F4E79',
      alignment: isAr ? 'right' : 'left',
    },
    {},
    {},
    {
      text: `${finalTotal.toLocaleString()} EGP`,
      bold: true,
      alignment: 'center',
      margin: [0, 6, 0, 6],
      color: '#1F4E79',
      fontSize: 10,
    },
  ])

  // Terms & Conditions resolution
  let termsLines: string[] = []
  if (data.termsText && data.termsText.trim()) {
    termsLines = data.termsText.split('\n').filter(l => l.trim().length > 0)
  }
  if (!termsLines.length) {
    termsLines = isAr ? DEFAULT_TERMS_AR : DEFAULT_TERMS_EN
  }

  // Account Representative contact info
  const repEmail = data.accountRepEmail || data.siteSettings?.contactEmail || 'admin@mango-electronics.com'
  const repPhone = data.accountRepPhone || data.siteSettings?.contactPhone1 || '+201206692076'

  // Top header: Contact Box (left in EN, right in AR)
  const contactBox: any = {
    table: {
      widths: [175],
      body: [
        [
          {
            stack: [
              {
                text: [
                  { text: isAr ? 'مانجو ' : 'MANGO ', color: '#F5A623', bold: true, fontSize: 10 },
                  { text: isAr ? 'إلكترونيكس' : 'ELECTRONICS', color: '#2B71AE', bold: true, fontSize: 10 },
                ],
                alignment: 'center',
              },
              {
                text: isAr ? 'مصر - الإسماعيلية' : 'Egypt - Ismailia',
                fontSize: 8.5,
                color: '#334155',
                alignment: 'center',
                decoration: 'underline',
                margin: [0, 1.5, 0, 1.5],
              },
              {
                text: '+201206692076 - +201145471933',
                fontSize: 8,
                color: '#475569',
                alignment: 'center',
              },
            ],
            margin: [4, 4, 4, 4],
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 1,
      vLineWidth: () => 1,
      hLineColor: () => '#8FAADC',
      vLineColor: () => '#8FAADC',
    },
  }

  // Top header: Logo Block (right in EN, left in AR)
  const logoBlock: any = logoDataUri
    ? {
        image: logoDataUri,
        width: 105,
        alignment: isAr ? 'left' : 'right',
      }
    : {
        stack: [
          { text: 'MANGO ELECTRONICS', fontSize: 13, bold: true, color: '#2B71AE' },
          { text: 'DO IT RIGHT, DO IT SMART', fontSize: 8, color: '#64748B' },
        ],
        alignment: isAr ? 'left' : 'right',
      }

  // Top header row
  const topHeaderRow = isAr
    ? {
        columns: [
          logoBlock,
          { text: '', width: '*' },
          contactBox,
        ],
        margin: [0, 0, 0, 10],
      }
    : {
        columns: [
          contactBox,
          { text: '', width: '*' },
          logoBlock,
        ],
        margin: [0, 0, 0, 10],
      }

  // Metadata block (Company Name, Contact Person, Phone, Email, Date, Reference Code)
  const companyVal = (data.companyName && data.companyName.trim()) ? data.companyName.trim() : '-'
  const contactNameVal = (data.contactName && data.contactName.trim()) ? data.contactName.trim() : '-'
  const contactTitleVal = (data.contactTitle && data.contactTitle.trim()) ? data.contactTitle.trim() : ''
  // Template field is "Contact Person Name and Title" — single combined value.
  // One text node (no split runs) so pdfmake-rtl bidi stays intact; no dangling separator when empty.
  const contactVal = contactTitleVal
    ? (isAr ? `${contactNameVal}، ${contactTitleVal}` : `${contactNameVal}, ${contactTitleVal}`)
    : contactNameVal
  const phoneVal = (data.phone && data.phone.trim()) ? `"${data.phone.trim()}"` : '-'
  const emailVal = (data.email && data.email.trim()) ? data.email.trim() : '-'

  const metadataBlock = {
    stack: [
      {
        table: {
          rtl: isAr,
          widths: ['*', '*'],
          body: [
            [
              {
                text: [
                  { text: isAr ? 'اسم الشركة: ' : 'Company Name: ', bold: true, color: '#1F4E79' },
                  { text: companyVal, color: '#0F172A' },
                ],
                alignment: isAr ? 'right' : 'left',
              },
              {
                text: [
                  { text: isAr ? 'الشخص المسؤول: ' : 'Contact Person: ', bold: true, color: '#1F4E79' },
                  { text: contactVal, color: '#0F172A' },
                ],
                alignment: isAr ? 'right' : 'left',
              },
            ],
            [
              {
                text: [
                  { text: isAr ? 'رقم الهاتف: ' : 'Phone number: ', bold: true, color: '#1F4E79' },
                  { text: phoneVal, color: '#0F172A' },
                ],
                alignment: isAr ? 'right' : 'left',
              },
              {
                text: [
                  { text: isAr ? 'البريد: ' : 'Email: ', bold: true, color: '#1F4E79' },
                  { text: emailVal, color: '#0F172A' },
                ],
                alignment: isAr ? 'right' : 'left',
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: (i: number) => (i === 0 ? 0 : 12),
          paddingRight: (i: number) => (i === 0 ? 12 : 0),
          paddingTop: () => 3,
          paddingBottom: () => 3,
        },
        margin: [0, 0, 0, 2],
      },
      {
        text: [
          { text: isAr ? 'التاريخ: ' : 'Date: ', bold: true, color: '#1F4E79' },
          { text: `${dateFormatted} ` },
          { text: isAr ? '(توليد تلقائي من النظام)' : '(Auto-generated by system)', italics: true, color: '#64748B', fontSize: 8.5 },
        ],
        margin: [0, 3, 0, 0],
        alignment: isAr ? 'right' : 'left',
      },
      {
        text: [
          { text: isAr ? 'الرمز المرجعي للعرض: ' : 'Quote Reference Code: ', bold: true, color: '#1F4E79' },
          { text: data.quoteNumber, bold: true, color: '#2B71AE' },
        ],
        margin: [0, 3, 0, 12],
        alignment: isAr ? 'right' : 'left',
      },
    ],
    fontSize: 9.5,
  }

  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [36, 28, 36, 28],
    defaultStyle: {
      font: 'Cairo',
      fontSize: 9.5,
      color: '#0F172A',
    },
    content: [
      // 1. Top Header Row: Contact Box & Logo
      topHeaderRow,

      // 2. Main Title: PRICE QUOTE / عرض سعر
      {
        text: isAr ? 'عرض سعر' : 'PRICE QUOTE',
        fontSize: 18,
        bold: true,
        color: '#1F4E79',
        alignment: 'center',
        margin: [0, 0, 0, 10],
      },

      // 3. Metadata Lines
      metadataBlock,

      // 4. Quote Details Table (styled exactly per template)
      {
        table: {
          headerRows: 1,
          widths: [20, '*', 50, 75, 80],
          body: tableBody,
        },
        layout: {
          hLineWidth: () => 0.8,
          vLineWidth: () => 0.8,
          hLineColor: () => '#8FAADC',
          vLineColor: () => '#8FAADC',
          fillColor: (i: number) => {
            if (i === 0) return '#D9E1F2' // pastel blue matching template
            return null
          },
        },
        margin: [0, 0, 0, 10],
      },

      // 5. Section Titles: Quote Details & Terms & Conditions
      {
        text: isAr ? 'تفاصيل عرض السعر' : 'Quote Details',
        fontSize: 10.5,
        bold: true,
        color: '#1F4E79',
        margin: [0, 4, 0, 2],
        alignment: isAr ? 'right' : 'left',
      },
      {
        text: isAr ? 'الشروط والأحكام' : 'Terms & Conditions',
        fontSize: 10.5,
        bold: true,
        color: '#1F4E79',
        margin: [0, 2, 0, 4],
        alignment: isAr ? 'right' : 'left',
      },

      // 6. Bulleted Terms List
      {
        stack: termsLines.map((line: string) => ({
          text: `• ${line.trim().replace(/^[•\-\*]\s*/, '')}`,
          fontSize: 8.5,
          color: '#334155',
          margin: [0, 1, 0, 1],
          alignment: isAr ? 'right' : 'left',
        })),
        margin: [0, 0, 0, 10],
      },

      // 7. Closing Thank You Line (Centered, matching Image 1)
      {
        text: isAr
          ? 'نشكركم على ثقتكم وتعاملكم معنا، ونتطلع للعمل معكم دائماً.'
          : 'Thank you for your trust and business. We look forward to working with you.',
        fontSize: 9.5,
        bold: true,
        color: '#1F4E79',
        alignment: 'center',
        margin: [0, 6, 0, 10],
      },

      // 8. Brand Signature (Centered, matching Image 1)
      {
        stack: [
          {
            text: [
              { text: isAr ? 'مانجو ' : 'MANGO ', color: '#F5A623', bold: true, fontSize: 11 },
              { text: isAr ? 'إلكترونيكس' : 'ELECTRONICS', color: '#2B71AE', bold: true, fontSize: 11 },
            ],
            alignment: 'center',
          },
          {
            text: isAr ? 'اعملها صح، اعملها بذكاء.' : 'Do it right, do it smart.',
            italics: true,
            color: '#2B71AE',
            fontSize: 8.5,
            alignment: 'center',
            margin: [0, 1, 0, 6],
          },
        ],
      },

      // 9. Account Representative Info
      {
        stack: [
          {
            text: [
              { text: isAr ? 'المسؤول عن الحساب: ' : 'Account Representative: ', bold: true, color: '#1F4E79' },
              { text: repEmail, color: '#0F172A' },
            ],
            fontSize: 9,
            alignment: isAr ? 'right' : 'left',
          },
          {
            text: [
              { text: isAr ? 'رقم الهاتف: ' : 'Phone Number: ', bold: true, color: '#1F4E79' },
              { text: repPhone, color: '#0F172A' },
            ],
            fontSize: 9,
            margin: [0, 2, 0, 0],
            alignment: isAr ? 'right' : 'left',
          },
        ],
      },
    ],
    styles: {
      tableHeader: {
        fontSize: 9.5,
        bold: true,
        color: '#1F4E79',
        margin: [0, 4, 0, 4],
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
