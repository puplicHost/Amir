import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function test() {
  const reqs = await prisma.serviceRequest.findMany({
    include: { values: true }
  })
  console.log(JSON.stringify(reqs, null, 2))
}
test().finally(() => prisma.$disconnect())
