import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@amir.com').trim().toLowerCase()
  const password = process.env.SEED_ADMIN_PASSWORD || 'AmirAdmin123!'
  if (password.length < 8) throw new Error('SEED_ADMIN_PASSWORD must be at least 8 characters')

  await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: 'Super Admin',
      passwordHash: await bcrypt.hash(password, 10),
      isSuper: true,
      isActive: true,
    },
  })

  
  const existingSettings = await prisma.siteSettings.findFirst();
  if (!existingSettings) {
    await prisma.siteSettings.create({
      data: {
        siteNameAr: 'أمير',
        siteNameEn: 'Amir',
        taglineAr: 'اعملها صح، اعملها بذكاء',
        taglineEn: 'Do It Right, Do It Smart',
        contactPhone1: '01000000000',
        contactWhatsapp: '01000000000',
        contactEmail: 'info@amir.com',
        bannerTextAr: 'خصم 20% على جميع خدمات الصيانة',
        bannerTextEn: '20% off all maintenance services',
        bannerButtonTextAr: 'احجز الآن',
        bannerButtonTextEn: 'Book Now',
        bannerButtonUrl: '/services'
      }
    });
  } else {
    await prisma.siteSettings.update({
      where: { id: existingSettings.id },
      data: {
        contactPhone1: '01000000000',
        contactWhatsapp: '01000000000',
        contactEmail: 'info@amir.com',
        bannerTextAr: 'خصم 20% على جميع خدمات الصيانة',
        bannerTextEn: '20% off all maintenance services',
        bannerButtonTextAr: 'احجز الآن',
        bannerButtonTextEn: 'Book Now',
        bannerButtonUrl: '/services'
      }
    });
  }
console.log(`Seeded super-admin: ${email}`)

  const services = [
    {
      nameAr: 'فحص وإصلاح وصيانة المعدات',
      nameEn: 'Machinery Repair & Maintenance',
      descriptionAr: 'تشخيص دقيق، إصلاح الأعطال، وصيانة دورية لضمان استمرارية خطوط الإنتاج والآلات الصناعية.',
      descriptionEn: 'Comprehensive diagnostics, component troubleshooting, and overhaul maintenance for production machinery.',
      sortOrder: 1,
      formFields: [
        { labelAr: 'اسم العميل', labelEn: 'Customer Name', fieldType: 'text', isRequired: true, sortOrder: 1 },
        { labelAr: 'رقم الهاتف', labelEn: 'Phone', fieldType: 'phone', isRequired: true, sortOrder: 2 },
        { labelAr: 'المحافظة', labelEn: 'Governorate', fieldType: 'select', isRequired: true, sortOrder: 3, options: "[]" },
        { labelAr: 'اسم الماكينة / المعدة', labelEn: 'Machine/Equipment Name', fieldType: 'text', isRequired: true, sortOrder: 4 },
        { labelAr: 'وصف العطل', labelEn: 'Fault Description', fieldType: 'textarea', isRequired: false, sortOrder: 5 },
        { labelAr: 'الموعد المتاح للمعاينة', labelEn: 'Available Date for Inspection', fieldType: 'text', isRequired: false, sortOrder: 6 },
        { labelAr: 'تقارير الصيانة / أكواد الأعطال', labelEn: 'Maintenance Reports / Fault Codes', fieldType: 'file', isRequired: false, sortOrder: 7 },
        { labelAr: 'صور الماكينة', labelEn: 'Machine Photos', fieldType: 'file', isRequired: false, sortOrder: 8 },
      ]
    },
    {
      nameAr: 'تركيب وتصميم أنظمة التحكم الذكية',
      nameEn: 'IoT Systems Design & Installation',
      descriptionAr: 'حلول إنترنت الأشياء والتحكم الذكي والمراقبة السحابية للمزارع والمنشآت والمشروعات الحديثة.',
      descriptionEn: 'Custom telemetry, remote environmental monitoring, and smart automation for farms and facilities.',
      sortOrder: 2,
      formFields: [
        { labelAr: 'اسم العميل', labelEn: 'Customer Name', fieldType: 'text', isRequired: true, sortOrder: 1 },
        { labelAr: 'رقم الهاتف', labelEn: 'Phone', fieldType: 'phone', isRequired: true, sortOrder: 2 },
        { labelAr: 'المحافظة', labelEn: 'Governorate', fieldType: 'select', isRequired: true, sortOrder: 3, options: '[]' },
        { labelAr: 'نوع المشروع', labelEn: 'Project Type', fieldType: 'select', isRequired: true, sortOrder: 4, options: JSON.stringify([
          {valueAr: 'صوبة زراعية', valueEn: 'Greenhouse'},
          {valueAr: 'مزرعة دواجن', valueEn: 'Poultry Farm'},
          {valueAr: 'مزرعة حيوانية', valueEn: 'Animal Farm'},
          {valueAr: 'أرض زراعية', valueEn: 'Agricultural Land'},
          {valueAr: 'منزل ذكي', valueEn: 'Smart Home'},
          {valueAr: 'مراقبة عن بعد', valueEn: 'Remote Monitoring'},
          {valueAr: 'مشروع تخرج', valueEn: 'Graduation Project'},
          {valueAr: 'مشروع متخصص', valueEn: 'Specialized Project'},
        ]) },
        { labelAr: 'اسم المشروع (إن وجد)', labelEn: 'Project Name', fieldType: 'text', isRequired: false, sortOrder: 5 },
        { labelAr: 'الوظائف المطلوبة / وصف النظام', labelEn: 'Required Functions / System Description', fieldType: 'textarea', isRequired: false, sortOrder: 6 },
        { labelAr: 'الموقع والمساحة / عدد الحساسات', labelEn: 'Location & Area / Number of Sensors', fieldType: 'text', isRequired: false, sortOrder: 7 },
        { labelAr: 'صور الموقع أو الرسومات', labelEn: 'Site Photos or Drawings', fieldType: 'file', isRequired: false, sortOrder: 8 },
      ]
    },
    {
      nameAr: 'تركيب وإنشاء وصيانة أنظمة PLC',
      nameEn: 'PLC Systems',
      descriptionAr: 'برمجة وتصميم لوحات التحكم الصناعية، وشاشات HMI، ودمج الأنظمة الآلية لزيادة كفاءة الإنتاج.',
      descriptionEn: 'Industrial programming, control panel assembly, SCADA architecture, and line modernization.',
      sortOrder: 3,
      formFields: [
        { labelAr: 'اسم العميل', labelEn: 'Customer Name', fieldType: 'text', isRequired: true, sortOrder: 1 },
        { labelAr: 'رقم الهاتف', labelEn: 'Phone', fieldType: 'phone', isRequired: true, sortOrder: 2 },
        { labelAr: 'المحافظة', labelEn: 'Governorate', fieldType: 'select', isRequired: true, sortOrder: 3, options: '[]' },
        { labelAr: 'اسم الماكينة / الخط أو وصف التصميم', labelEn: 'Machine / Line Name or PLC Design Description', fieldType: 'text', isRequired: false, sortOrder: 4 },
        { labelAr: 'وصف العطل أو التعديل', labelEn: 'Fault or Modification Description', fieldType: 'textarea', isRequired: false, sortOrder: 5 },
        { labelAr: 'نوع PLC / HMI / Inverter', labelEn: 'PLC / HMI / Inverter Type', fieldType: 'text', isRequired: false, sortOrder: 6 },
        { labelAr: 'صور لوحة التحكم / مخططات التوصيل', labelEn: 'Control Panel Photos / Connection Diagrams', fieldType: 'file', isRequired: false, sortOrder: 7 },
        { labelAr: 'البرامج أو الرسومات المتاحة', labelEn: 'Available Programs or Drawings', fieldType: 'file', isRequired: false, sortOrder: 8 },
      ]
    },
    {
      nameAr: 'تصميم وتركيب أنظمة الحريق والإنذار',
      nameEn: 'Fire Alarm & Fire Systems',
      descriptionAr: 'تصميم وتنفيذ شبكات الإنذار المبكر ومكافحة الحريق بأعلى معايير السلامة والأمان للمنشآت.',
      descriptionEn: 'Certified early fire detection, emergency alarm networks, and safety engineering compliance.',
      sortOrder: 4,
      formFields: [
        { labelAr: 'اسم العميل', labelEn: 'Customer Name', fieldType: 'text', isRequired: true, sortOrder: 1 },
        { labelAr: 'رقم الهاتف', labelEn: 'Phone', fieldType: 'phone', isRequired: true, sortOrder: 2 },
        { labelAr: 'المحافظة / موقع المشروع', labelEn: 'Governorate / Project Location', fieldType: 'select', isRequired: true, sortOrder: 3, options: '[]' },
        { labelAr: 'اسم الشركة / المنشأة', labelEn: 'Company / Facility Name', fieldType: 'text', isRequired: false, sortOrder: 4 },
        { labelAr: 'نوع المشروع', labelEn: 'Project Type', fieldType: 'select', isRequired: false, sortOrder: 5, options: JSON.stringify([
          {valueAr: 'سكني', valueEn: 'residential'},
          {valueAr: 'تجاري', valueEn: 'commercial'},
          {valueAr: 'صناعي', valueEn: 'industrial'},
          {valueAr: 'مخزن', valueEn: 'warehouse'},
          {valueAr: 'أخرى', valueEn: 'other'},
        ]) },
        { labelAr: 'مساحة المكان وعدد الطوابق', labelEn: 'Space Area and Number of Floors', fieldType: 'text', isRequired: false, sortOrder: 6 },
        { labelAr: 'الخدمة المطلوبة', labelEn: 'Required Service', fieldType: 'select', isRequired: false, sortOrder: 7, options: JSON.stringify([
          {valueAr: 'تصميم', valueEn: 'Design'},
          {valueAr: 'توريد', valueEn: 'Supply'},
          {valueAr: 'تركيب', valueEn: 'Installation'},
          {valueAr: 'صيانة', valueEn: 'Maintenance'},
          {valueAr: 'اختبار', valueEn: 'Testing'},
        ]) },
        { labelAr: 'مخططات الموقع أو الصور', labelEn: 'Site Plans or Photos', fieldType: 'file', isRequired: false, sortOrder: 8 },
      ]
    },
    {
      nameAr: 'تصميم وتركيب وصيانة الأنظمة الهوائية',
      nameEn: 'Pneumatic Systems',
      descriptionAr: 'تصميم دوائر الهواء المضغوط وصيانة الصمامات والسلندرات الهوائية لرفع الكفاءة التشغيلية.',
      descriptionEn: 'Compressed air circuit optimization, solenoid valve maintenance, and pneumatic cylinder retrofits.',
      sortOrder: 5,
      formFields: [
        { labelAr: 'اسم العميل', labelEn: 'Customer Name', fieldType: 'text', isRequired: true, sortOrder: 1 },
        { labelAr: 'رقم الهاتف', labelEn: 'Phone', fieldType: 'phone', isRequired: true, sortOrder: 2 },
        { labelAr: 'المحافظة / موقع المشروع', labelEn: 'Governorate / Project Location', fieldType: 'select', isRequired: true, sortOrder: 3, options: '[]' },
        { labelAr: 'اسم الماكينة / المعدة / الخط', labelEn: 'Machine / Equipment / Line Name', fieldType: 'text', isRequired: false, sortOrder: 4 },
        { labelAr: 'نوع الخدمة', labelEn: 'Service Type', fieldType: 'select', isRequired: false, sortOrder: 5, options: JSON.stringify([
          {valueAr: 'تصميم', valueEn: 'Design'},
          {valueAr: 'تركيب', valueEn: 'Installation'},
          {valueAr: 'صيانة', valueEn: 'Maintenance'},
          {valueAr: 'إصلاح', valueEn: 'Repair'},
          {valueAr: 'تطوير', valueEn: 'Development'},
          {valueAr: 'دمج مع PLC', valueEn: 'PLC Integration'},
        ]) },
        { labelAr: 'وصف المشكلة أو المتطلبات', labelEn: 'Problem Description or Requirements', fieldType: 'textarea', isRequired: false, sortOrder: 6 },
        { labelAr: 'صور الماكينة / الدائرة / المكونات', labelEn: 'Machine / Circuit / Component Photos', fieldType: 'file', isRequired: false, sortOrder: 7 },
        { labelAr: 'رسومات أو ملفات البيانات', labelEn: 'Drawings or Datasheets', fieldType: 'file', isRequired: false, sortOrder: 8 },
        { labelAr: 'الموعد المفضل للمعاينة', labelEn: 'Preferred Date for Inspection', fieldType: 'text', isRequired: false, sortOrder: 9 },
      ]
    },
    {
      nameAr: 'خدمة البحث وتوفير منتج خاص',
      nameEn: 'Product Search Service',
      descriptionAr: 'توفير واستيراد القطع النادرة، والرقائق الإلكترونية المتخصصة، والبدائل المعتمدة لصيانة أجهزتك.',
      descriptionEn: 'Direct procurement of rare chips, obsolete components, and specialized industrial hardware.',
      sortOrder: 6,
      formFields: [
        { labelAr: 'اسم العميل', labelEn: 'Customer Name', fieldType: 'text', isRequired: true, sortOrder: 1 },
        { labelAr: 'رقم الهاتف', labelEn: 'Phone', fieldType: 'phone', isRequired: true, sortOrder: 2 },
        { labelAr: 'المحافظة', labelEn: 'Governorate', fieldType: 'select', isRequired: true, sortOrder: 3, options: '[]' },
        { labelAr: 'اسم المنتج أو رقم الموديل', labelEn: 'Product Name or Model Number', fieldType: 'text', isRequired: false, sortOrder: 4 },
        { labelAr: 'صورة المنتج أو المواصفات', labelEn: 'Product Photo or Specification', fieldType: 'file', isRequired: false, sortOrder: 5 },
      ]
    },
    {
      nameAr: 'خدمة التوريدات العامة للشركات',
      nameEn: 'Bulk Supply for Companies',
      descriptionAr: 'عقود توريد دورية وكميات متكاملة للشركات والمصانع ومشاريع التخرج بأسعار تنافسية.',
      descriptionEn: 'Contract supply schedules, volume pricing, and reliable procurement for factories and businesses.',
      sortOrder: 7,
      formFields: [
        { labelAr: 'اسم الشركة', labelEn: 'Company Name', fieldType: 'text', isRequired: true, sortOrder: 1 },
        { labelAr: 'اسم مسؤول التواصل', labelEn: 'Contact Person Name', fieldType: 'text', isRequired: true, sortOrder: 2 },
        { labelAr: 'رقم الهاتف', labelEn: 'Phone', fieldType: 'phone', isRequired: true, sortOrder: 3 },
        { labelAr: 'موقع التسليم', labelEn: 'Delivery Location', fieldType: 'text', isRequired: true, sortOrder: 4 },
        { labelAr: 'التاريخ المطلوب', labelEn: 'Required Date', fieldType: 'text', isRequired: false, sortOrder: 5 },
        { labelAr: 'نوع التوريد', labelEn: 'Supply Type', fieldType: 'select', isRequired: false, sortOrder: 6, options: JSON.stringify([
          {valueAr: 'مرة واحدة', valueEn: 'One-time'},
          {valueAr: 'دوري', valueEn: 'Recurring'},
        ]) },
        { labelAr: 'قائمة المنتجات (اكسيل أو PDF)', labelEn: 'Products List', fieldType: 'file', isRequired: false, sortOrder: 7 },
        { labelAr: 'تفاصيل المنتجات / ملاحظات', labelEn: 'Product Details / Notes', fieldType: 'textarea', isRequired: false, sortOrder: 8 },
      ]
    },
  ];

  const existingServicesCount = await prisma.service.count();
  if (existingServicesCount === 0) {
    for (const service of services) {
      const createdService = await prisma.service.create({
        data: {
          nameAr: service.nameAr,
          nameEn: service.nameEn,
          descriptionAr: service.descriptionAr,
          descriptionEn: service.descriptionEn,
          sortOrder: service.sortOrder,
        }
      });
      for (const field of service.formFields) {
        await prisma.serviceFormField.create({
          data: {
            serviceId: createdService.id,
            labelAr: field.labelAr,
            labelEn: field.labelEn,
            fieldType: field.fieldType,
            isRequired: field.isRequired,
            sortOrder: field.sortOrder,
            options: field.options ? JSON.parse(field.options) : null,
          }
        });
      }
    }
    console.log('Seeded 7 default services');
  } else {
    // Update existing services with rich descriptions if missing
    for (const service of services) {
      const existing = await prisma.service.findFirst({
        where: { sortOrder: service.sortOrder }
      });
      if (existing && (!existing.descriptionAr || !existing.descriptionEn)) {
        await prisma.service.update({
          where: { id: existing.id },
          data: {
            descriptionAr: service.descriptionAr,
            descriptionEn: service.descriptionEn,
          }
        });
      }
    }
  }

}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
