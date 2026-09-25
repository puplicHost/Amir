// One-time correction for Bug 4: restore "Machinery Repair & Maintenance"
// form fields to the seed definition (prisma/seed.mjs):
// - required text "Customer Name" (sortOrder 1) must exist
// - all file fields must be optional (a stray required "upload image"
//   field currently blocks text-only submissions).
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const service = await prisma.service.findFirst({
    where: { sortOrder: 1 },
    include: { formFields: { orderBy: { sortOrder: 'asc' } } },
  })
  if (!service || !service.nameEn.includes('Machinery')) {
    throw new Error('Machinery Repair service (sortOrder 1) not found — aborting, no changes made.')
  }
  console.log(`Service: ${service.nameEn} (${service.id})`)

  const hasCustomerName = service.formFields.some(
    (f) => f.labelEn.trim().toLowerCase() === 'customer name',
  )
  if (!hasCustomerName) {
    await prisma.serviceFormField.create({
      data: {
        serviceId: service.id,
        labelAr: 'اسم العميل',
        labelEn: 'Customer Name',
        fieldType: 'text',
        isRequired: true,
        sortOrder: 1,
      },
    })
    console.log('Added missing required field: Customer Name')
  } else {
    console.log('Customer Name field present — nothing to add')
  }

  const forced = await prisma.serviceFormField.updateMany({
    where: { serviceId: service.id, fieldType: 'file', isRequired: true },
    data: { isRequired: false },
  })
  console.log(`Set ${forced.count} file field(s) back to optional`)

  const finalFields = await prisma.serviceFormField.findMany({
    where: { serviceId: service.id },
    orderBy: { sortOrder: 'asc' },
    select: { labelEn: true, fieldType: true, isRequired: true, sortOrder: true },
  })
  console.log(JSON.stringify(finalFields, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
