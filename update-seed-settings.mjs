import fs from 'fs';

let content = fs.readFileSync('prisma/seed.mjs', 'utf8');

const settingsCode = `
  const existingSettings = await prisma.siteSettings.findFirst();
  if (!existingSettings) {
    await prisma.siteSettings.create({
      data: {
        siteNameAr: 'مانجو إلكترونيكس',
        siteNameEn: 'Mango Electronics',
        taglineAr: 'اعملها صح، اعملها بذكاء',
        taglineEn: 'Do It Right, Do It Smart',
        contactPhone1: '01000000000',
        contactWhatsapp: '01000000000',
        contactEmail: 'info@mango-electronics.com',
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
        contactEmail: 'info@mango-electronics.com',
        bannerTextAr: 'خصم 20% على جميع خدمات الصيانة',
        bannerTextEn: '20% off all maintenance services',
        bannerButtonTextAr: 'احجز الآن',
        bannerButtonTextEn: 'Book Now',
        bannerButtonUrl: '/services'
      }
    });
  }
`;

if (!content.includes('bannerTextAr')) {
  content = content.replace(/const settings = await prisma.siteSettings.findFirst\(\)\s+if \(!settings\) \{[\s\S]*?\}\s+/, settingsCode);
  fs.writeFileSync('prisma/seed.mjs', content);
}
