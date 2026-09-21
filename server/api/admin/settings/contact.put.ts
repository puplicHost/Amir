import { defineEventHandler, readBody } from 'h3'
import { requirePermission } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'settings.manage')
  const body = await readBody(event)
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {
      contactPhone1: body.contactPhone1,
      contactPhone2: body.contactPhone2,
      contactWhatsapp: body.contactWhatsapp,
      contactEmail: body.contactEmail,
      contactAddressAr: body.contactAddressAr,
      contactAddressEn: body.contactAddressEn,
      socialFacebook: body.socialFacebook,
      socialInstagram: body.socialInstagram,
      googleMapsEmbedUrl: body.googleMapsEmbedUrl,
    },
    create: {
      siteNameAr: 'مانجو إلكترونيكس',
      siteNameEn: 'Mango Electronics',
    }
  })
  return { success: true }
})
