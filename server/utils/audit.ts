import type { SessionUser } from './auth'

export type AuditEntityType = 'product' | 'category' | 'service' | 'booking'
export type AuditAction = 'created' | 'updated' | 'deleted' | 'media'

interface AuditEntry {
  entityType: AuditEntityType
  entityId: string
  entityName: string
  action: AuditAction
  details?: string | null
  user?: SessionUser | null
}

/**
 * Best-effort audit logging. Never throws — audit must not break the main flow.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        entityType: entry.entityType,
        entityId: entry.entityId,
        entityName: entry.entityName,
        action: entry.action,
        details: entry.details || null,
        userId: entry.user?.userId || null,
        userName: entry.user?.name || 'System',
      },
    })
  }
  catch {
    // Audit failures are swallowed by design.
  }
}

export function createdLabel(entityType: AuditEntityType): string {
  return entityType === 'product' ? 'Product created' : entityType === 'category' ? 'Category created' : 'Service created'
}

export function deletedLabel(entityType: AuditEntityType): string {
  return entityType === 'product' ? 'Product deleted' : entityType === 'category' ? 'Category deleted' : 'Service deleted'
}
