
export default defineEventHandler(async (event) => {
  const serviceId = event.context.params?.serviceId
  if (!serviceId) throw createError({ statusCode: 400, message: 'Missing serviceId' })

  const service = await prisma.service.findFirst({
    where: { 
      isActive: true,
      OR: [
        { id: serviceId },
        { slug: serviceId },
      ]
    },
    include: { formFields: true }
  })
  if (!service) throw createError({ statusCode: 404, message: 'Service not found or inactive' })

  const multipartData = await readMultipartFormData(event)
  if (!multipartData) throw createError({ statusCode: 400, message: 'Expected multipart/form-data' })

  const fields: Record<string, string> = {}
  const files: { fieldId: string, filename: string, data: Buffer, mimetype: string }[] = []

  for (const part of multipartData) {
    const name = part.name
    if (!name) continue

    if (part.filename) {
      files.push({
        fieldId: name,
        filename: part.filename,
        data: part.data,
        mimetype: part.type || 'application/octet-stream'
      })
    } else {
      fields[name] = part.data.toString('utf-8')
    }
  }

  // Validate required fields
  for (const field of service.formFields) {
    if (field.isRequired) {
      if (field.fieldType === 'file') {
        const hasFile = files.some(f => f.fieldId === field.id)
        if (!hasFile) throw createError({ statusCode: 400, message: `Field ${field.labelEn} is required.` })
      } else {
        const val = fields[field.id]
        if (!val || val.trim() === '') {
          throw createError({ statusCode: 400, message: `Field ${field.labelEn} is required.` })
        }
      }
    }
    
    // Egyptian phone validation for 'phone' type fields
    if (field.fieldType === 'phone') {
      const val = fields[field.id]
      if (val && !/^01[0125][0-9]{8}$/.test(val.trim())) {
        throw createError({ statusCode: 400, message: `Invalid Egyptian phone number for field ${field.labelEn}` })
      }
    }
  }

  // Create Request in DB
  const request = await prisma.serviceRequest.create({
    data: {
      serviceId: service.id,
      status: 'New'
    }
  })

  // Save values
  const valuesData = Object.entries(fields).map(([fieldId, value]) => ({
    requestId: request.id,
    fieldId,
    value
  }))
  if (valuesData.length > 0) {
    await prisma.serviceRequestValue.createMany({
      data: valuesData
    })
  }

  // Save files
  for (const file of files) {
    if (file.mimetype && !file.mimetype.startsWith('image/') && file.mimetype !== 'application/pdf') {
       throw createError({ statusCode: 400, message: `Invalid file type for ${file.filename}. Only images and PDF allowed.` })
    }
    if (file.data.length > 5 * 1024 * 1024) {
       throw createError({ statusCode: 400, message: `File ${file.filename} exceeds 5MB limit.` })
    }

    const { relativePath } = await storeFile(file.data, `service-requests/${request.id}`, file.filename)
    
    await prisma.serviceRequestAttachment.create({
      data: {
        requestId: request.id,
        filePath: relativePath,
        originalName: file.filename
      }
    })
  }

  await notifyAdmins({
    type: 'new_service_request',
    relatedEntityId: request.id,
    url: `/admin/services/requests/${request.id}`,
    titleEn: 'New service request',
    titleAr: 'طلب خدمة جديد',
    bodyEn: `${service.nameEn} — #${request.id.slice(-6).toUpperCase()}`,
    bodyAr: `${service.nameAr} — #${request.id.slice(-6).toUpperCase()}`,
  })

  await sendMetaCapiEvent({
    eventName: 'Lead',
    eventId: request.id,
    clientIp: getRequestIP(event, { xForwardedFor: true }) || undefined,
    clientUa: getRequestHeader(event, 'user-agent') || undefined,
  })

  return { requestId: request.id, message: 'Request submitted successfully' }
})
