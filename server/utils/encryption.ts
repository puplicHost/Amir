import crypto from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key || key.length !== 64) { // 32 bytes in hex
    throw createError({ statusCode: 500, statusMessage: 'Server misconfigured: ENCRYPTION_KEY missing or invalid' })
  }
  return Buffer.from(key, 'hex')
}

export function encryptData(data: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decryptData(encryptedString: string): string {
  if (!encryptedString) return ''
  const parts = encryptedString.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted data format')
  const [ivHex, authTagHex, encryptedHex] = parts
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(ivHex!, 'hex'))
  decipher.setAuthTag(Buffer.from(authTagHex!, 'hex'))
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedHex!, 'hex')), decipher.final()])
  return decrypted.toString('utf8')
}
