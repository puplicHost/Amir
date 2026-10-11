// scripts/generate-brand-assets.mjs
// Generates transparent logos, favicons, and OG image for AMIR using sharp.
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()
const SOURCE_DIR = path.join(ROOT, 'public/brand/source')
const BRAND_DIR = path.join(ROOT, 'public/brand')
const FAVICON_DIR = path.join(BRAND_DIR, 'favicons')
const PUBLIC_DIR = path.join(ROOT, 'public')

const COLOR_BLACK_BG = { r: 5, g: 8, b: 8, alpha: 1 } // #050808
const COLOR_BLACK_RGB = [5, 8, 8]
const COLOR_WHITE_RGB = [255, 255, 255]

function makeIco(pngBuffers) {
  // pngBuffers: array of { width, height, buffer }
  const count = pngBuffers.length
  const headerSize = 6 + count * 16
  let currentOffset = headerSize

  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // ICO format
  header.writeUInt16LE(count, 4)

  const entries = []
  for (const item of pngBuffers) {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(item.width === 256 ? 0 : item.width, 0)
    entry.writeUInt8(item.height === 256 ? 0 : item.height, 1)
    entry.writeUInt8(0, 2) // palette colors
    entry.writeUInt8(0, 3) // reserved
    entry.writeUInt16LE(1, 4) // color planes
    entry.writeUInt16LE(32, 6) // bits per pixel
    entry.writeUInt32LE(item.buffer.length, 8)
    entry.writeUInt32LE(currentOffset, 12)
    entries.push(entry)
    currentOffset += item.buffer.length
  }

  return Buffer.concat([header, ...entries, ...pngBuffers.map(p => p.buffer)])
}

async function main() {
  await fs.mkdir(BRAND_DIR, { recursive: true })
  await fs.mkdir(FAVICON_DIR, { recursive: true })

  // 1. Source canonical files
  const blackSrc = path.join(SOURCE_DIR, 'logo-black-on-white.png')
  const whiteSrc = path.join(SOURCE_DIR, 'logo-white-on-black.png')
  const graySrc = path.join(SOURCE_DIR, 'logo-white-on-gray.png')

  console.log('1. Using canonical brand sources: logo-black-on-white.png, logo-white-on-black.png, logo-white-on-gray.png')

  // 2. Black transparent logo (alpha from darkness of black-on-white)
  const imgBlack = sharp(blackSrc)
  const { data: rawB, info: infoB } = await imgBlack.raw().toBuffer({ resolveWithObject: true })
  const outB = Buffer.alloc(infoB.width * infoB.height * 4)

  for (let i = 0; i < infoB.width * infoB.height; i++) {
    const r = rawB[i * infoB.channels]
    const g = rawB[i * infoB.channels + 1]
    const b = rawB[i * infoB.channels + 2]
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    const alpha = Math.max(0, Math.min(255, Math.round(255 - lum)))
    outB[i * 4] = COLOR_BLACK_RGB[0]
    outB[i * 4 + 1] = COLOR_BLACK_RGB[1]
    outB[i * 4 + 2] = COLOR_BLACK_RGB[2]
    outB[i * 4 + 3] = alpha
  }

  const trimmedBlackBuffer = await sharp(outB, { raw: { width: infoB.width, height: infoB.height, channels: 4 } })
    .trim()
    .png()
    .toBuffer()

  // Save black transparent logos (high-res 1200px wide, and compact 400px wide)
  await sharp(trimmedBlackBuffer)
    .resize(1200)
    .png()
    .toFile(path.join(BRAND_DIR, 'logo-black-transparent.png'))

  await sharp(trimmedBlackBuffer)
    .resize(400)
    .png()
    .toFile(path.join(BRAND_DIR, 'logo-black-transparent-small.png'))

  // Default public/logo.png is black transparent logo (for light mode)
  await sharp(trimmedBlackBuffer)
    .resize(800)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'logo.png'))

  console.log('2. Black transparent logos generated.')

  // 3. White transparent logo (alpha from brightness of white-on-black)
  const imgWhite = sharp(whiteSrc)
  const { data: rawW, info: infoW } = await imgWhite.raw().toBuffer({ resolveWithObject: true })
  const outW = Buffer.alloc(infoW.width * infoW.height * 4)

  for (let i = 0; i < infoW.width * infoW.height; i++) {
    const r = rawW[i * infoW.channels]
    const g = rawW[i * infoW.channels + 1]
    const b = rawW[i * infoW.channels + 2]
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    // Eliminate subtle JPEG compression noise near pure black
    const alpha = lum < 10 ? 0 : Math.min(255, Math.round((lum - 10) * (255 / 245)))
    outW[i * 4] = COLOR_WHITE_RGB[0]
    outW[i * 4 + 1] = COLOR_WHITE_RGB[1]
    outW[i * 4 + 2] = COLOR_WHITE_RGB[2]
    outW[i * 4 + 3] = alpha
  }

  const trimmedWhiteBuffer = await sharp(outW, { raw: { width: infoW.width, height: infoW.height, channels: 4 } })
    .trim()
    .png()
    .toBuffer()

  // Save white transparent logos
  await sharp(trimmedWhiteBuffer)
    .resize(1200)
    .png()
    .toFile(path.join(BRAND_DIR, 'logo-white-transparent.png'))

  await sharp(trimmedWhiteBuffer)
    .resize(400)
    .png()
    .toFile(path.join(BRAND_DIR, 'logo-white-transparent-small.png'))

  // Default public/logo-dark.png is white transparent logo (for dark mode)
  await sharp(trimmedWhiteBuffer)
    .resize(800)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'logo-dark.png'))

  console.log('3. White transparent logos generated.')

  // 4. Favicon set: extract letter "A" from the high-res black logo on white,
  // inverted to white and centered on #050808 black square background.
  const trimmedFullB = await sharp(outB, { raw: { width: infoB.width, height: infoB.height, channels: 4 } })
    .trim()
    .toBuffer({ resolveWithObject: true })

  const W = trimmedFullB.info.width
  const H = trimmedFullB.info.height
  const d = trimmedFullB.data
  const topH = Math.round(H * 0.65)

  // Find gap between A and M
  let minVal = Infinity
  let minX = 828
  for (let x = Math.round(W * 0.2); x < Math.round(W * 0.35); x++) {
    let colSum = 0
    for (let y = 0; y < topH; y++) {
      colSum += d[(y * W + x) * 4 + 3]
    }
    if (colSum < minVal) {
      minVal = colSum
      minX = x
    }
  }

  // Extract letter A and convert its color to white (#FFFFFF)
  const letterARaw = await sharp(d, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: 0, top: 0, width: minX, height: topH })
    .trim()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const letterAWhite = Buffer.alloc(letterARaw.info.width * letterARaw.info.height * 4)
  for (let i = 0; i < letterARaw.info.width * letterARaw.info.height; i++) {
    const a = letterARaw.data[i * 4 + 3]
    letterAWhite[i * 4] = 255
    letterAWhite[i * 4 + 1] = 255
    letterAWhite[i * 4 + 2] = 255
    letterAWhite[i * 4 + 3] = a
  }

  const letterAPng = await sharp(letterAWhite, {
    raw: { width: letterARaw.info.width, height: letterARaw.info.height, channels: 4 },
  }).png().toBuffer()

  // Helper to build square icon with padding on #050808 background
  async function makeSquareIcon(size, paddingRatio = 0.2) {
    const innerSize = Math.round(size * (1 - paddingRatio * 2))
    const resizedLetter = await sharp(letterAPng)
      .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer()

    return sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: COLOR_BLACK_BG,
      },
    })
      .composite([{ input: resizedLetter, gravity: 'center' }])
      .png()
      .toBuffer()
  }

  const buf16 = await makeSquareIcon(16, 0.15)
  const buf32 = await makeSquareIcon(32, 0.18)
  const buf180 = await makeSquareIcon(180, 0.2)
  const buf512 = await makeSquareIcon(512, 0.22)

  await fs.writeFile(path.join(FAVICON_DIR, 'favicon-16x16.png'), buf16)
  await fs.writeFile(path.join(FAVICON_DIR, 'favicon-32x32.png'), buf32)
  await fs.writeFile(path.join(FAVICON_DIR, 'apple-touch-icon.png'), buf180)
  await fs.writeFile(path.join(FAVICON_DIR, 'android-chrome-512x512.png'), buf512)

  // Root public copies
  await fs.writeFile(path.join(PUBLIC_DIR, 'favicon-16x16.png'), buf16)
  await fs.writeFile(path.join(PUBLIC_DIR, 'favicon-32x32.png'), buf32)
  await fs.writeFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'), buf180)
  await fs.writeFile(path.join(PUBLIC_DIR, 'android-chrome-512x512.png'), buf512)
  await fs.writeFile(path.join(PUBLIC_DIR, 'favicon.png'), buf180)

  // Standard multi-resolution ICO (16x16 and 32x32)
  const icoBuf = makeIco([
    { width: 16, height: 16, buffer: buf16 },
    { width: 32, height: 32, buffer: buf32 },
  ])
  await fs.writeFile(path.join(FAVICON_DIR, 'favicon.ico'), icoBuf)
  await fs.writeFile(path.join(PUBLIC_DIR, 'favicon.ico'), icoBuf)

  console.log('4. Favicons (16, 32, 180, 512, .ico) generated on #050808 background.')

  // 5. Open Graph Image: 1200x630, white logo centered on #050808
  const ogLogoWidth = 720
  const ogLogo = await sharp(trimmedWhiteBuffer)
    .resize(ogLogoWidth)
    .toBuffer()

  const ogBuffer = await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: COLOR_BLACK_BG,
    },
  })
    .composite([{ input: ogLogo, gravity: 'center' }])
    .png()
    .toBuffer()

  await fs.writeFile(path.join(BRAND_DIR, 'og-image.png'), ogBuffer)
  await fs.writeFile(path.join(PUBLIC_DIR, 'og-image.png'), ogBuffer)

  console.log('5. Open Graph image 1200x630 generated.')
}

main().catch((err) => {
  console.error('Error generating brand assets:', err)
  process.exit(1)
})
