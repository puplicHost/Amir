import fs from 'fs'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'services.view')
  const requestId = event.context.params?.id
  const fileId = event.context.params?.fileId

  const attachment = await prisma.serviceRequestAttachment.findUnique({
    where: { id: fileId },
  })

  if (!attachment) throw createError({ statusCode: 404, message: 'Attachment not found' })
  // Scope check: the file must belong to the request in the path (IDOR guard).
  if (attachment.requestId !== requestId) {
    throw createError({ statusCode: 404, message: 'Attachment not found' })
  }

  const { stream, mimeType, size } = await getFileStream(attachment.filePath)
  
  setResponseHeader(event, 'Content-Type', mimeType)
  setResponseHeader(event, 'Content-Length', size.toString())
  setResponseHeader(event, 'Content-Disposition', `inline; filename="${encodeURIComponent(attachment.originalName)}"`)
  
  return stream
})
