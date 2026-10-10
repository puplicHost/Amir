import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@mango-electronics.com').trim().toLowerCase()
  const password = process.env.SEED_ADMIN_PASSWORD || 'MangoAdmin123!'

  if (password.length < 8) throw new Error('SEED_ADMIN_PASSWORD must be at least 8 characters')

  await prisma.adminUser.upsert({
    where: { email },
    update: {
      passwordHash: await bcrypt.hash(password, 10),
    },
    create: {
      email,
      name: 'Super Admin',
      passwordHash: await bcrypt.hash(password, 10),
      isSuper: true,
      isActive: true,
    },
  })

  console.log(`✅ Super admin seeded: ${email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())