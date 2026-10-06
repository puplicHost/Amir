import { createHash, randomBytes } from 'node:crypto'

export const ACCESS_TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24h
export type AccessResourceType = 'order' | 'quote'

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Issue a short-lived single-resource token bound to one order/quote. Returns the plain token (shown once). */
export async function issueAccessToken(resourceType: AccessResourceType, resourceId: string): Promise<string> {
  const token = randomBytes(32).toString('hex')
  await prisma.customerAccessToken.create({
    data: {
      tokenHash: hashToken(token),
      resourceType,
      resourceId,
      expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_MS),
    },
  })
  return token
}

/** True when the token exists, matches this resource, and has not expired. */
export async function verifyAccessToken(
  resourceType: AccessResourceType,
  resourceId: string,
  token: unknown,
): Promise<boolean> {
  if (typeof token !== 'string' || !token) return false
  const row = await prisma.customerAccessToken.findUnique({
    where: { tokenHash: hashToken(token) },
  })
  if (!row) return false
  if (row.resourceType !== resourceType || row.resourceId !== resourceId) return false
  if (row.expiresAt.getTime() <= Date.now()) return false
  return true
}
