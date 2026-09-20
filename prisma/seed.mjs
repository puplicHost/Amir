import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@mango-electronics.com').trim().toLowerCase()
  const password = process.env.SEED_ADMIN_PASSWORD || 'MangoAdmin123!'
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

  const settings = await prisma.siteSettings.findFirst()
  if (!settings) {
    await prisma.siteSettings.create({
      data: {
        taglineAr: 'اعملها صح، اعملها بذكاء',
        taglineEn: 'Do It Right, Do It Smart',
      },
    })
  }

  console.log(`Seeded super-admin: ${email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
