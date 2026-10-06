export default defineEventHandler(async (event) => {
  await requirePermission(event, 'financials.manage')
  const id = getRouterParam(event, 'id')
  await prisma.expense.delete({ where: { id: id || '' } })
  return { ok: true }
})
