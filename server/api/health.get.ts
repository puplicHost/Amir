import { prisma } from '../utils/prisma'

export default defineEventHandler(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'ok', database: 'connected' }
  }
  catch {
    throw createError({ statusCode: 503, statusMessage: 'Database unreachable' })
  }
})
