import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { requirePermission } from '../../../../utils/auth'
import { deleteReceiptFile, saveReceipt } from '../../../../utils/storage'
import { logAudit } from '../../../../utils/audit'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'expenses.manage')
  const id = getRouterParam(event, 'id') || ''
  const existing = await prisma.expense.findFirst({ where: { id, deletedAt: null } })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Expense not found' })

  const formData = await readMultipartFormData(event)
  const file = formData?.find(f => f.name === 'file' || f.filename)
  if (!file || !file.filename || !file.data) {
    throw createError({ statusCode: 400, message: 'Invalid file' })
  }
  // Content-validated: real PDF (magic bytes) or raster image (sniffed via sharp).
  const relativePath = await saveReceipt(id, file.data)
  const previousPath = existing.receiptPath
  const row = await prisma.expense.update({ where: { id }, data: { receiptPath: relativePath } })
  // AUDIT P3-06: the replacement is committed; best-effort removal of the old
  // file prevents unbounded growth of personal/financial documents. A failed
  // unlink is not allowed to fail the upload (the DB is already authoritative).
  if (previousPath && previousPath !== relativePath) {
    await deleteReceiptFile(previousPath).catch(() => null)
  }
  await logAudit({
    entityType: 'expense',
    entityId: id,
    entityName: `${existing.day} receipt`,
    action: 'media',
    details: previousPath ? 'Receipt replaced; previous file removed' : 'Receipt uploaded',
    user,
  })
  return { success: true, expense: row }
})
