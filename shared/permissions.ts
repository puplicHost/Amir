// Canonical permission catalog (Phase 2e).
// Single source of truth for permission keys, groups, and role default sets.
// Role defaults are augmented by extra grants stored in AdminPermission.

export const PERMISSION_GROUPS = {
  bookings: [
    'bookings.view_all',
    'bookings.view_own',
    'bookings.assign',
    'bookings.cancel_own',
    'bookings.refund_handle',
    'bookings.refund_issue',
    'bookings.complete',
  ],
  services: ['services.manage'],
  schedule: ['schedule.manage'],
  products: ['products.view', 'products.manage'],
  categories: ['categories.manage'],
  inbox: ['inbox.manage'],
  banners: ['banners.manage'],
  settings: ['settings.business', 'settings.payment', 'settings.meta'],
  users: ['users.manage'],
  notifications: ['notifications.view'],
  expenses: ['expenses.view', 'expenses.manage', 'expenses.export'],
} as const

export const ALL_PERMISSIONS: string[] = Object.values(PERMISSION_GROUPS).flat()

export type PermissionKey = (typeof ALL_PERMISSIONS)[number]
export type PermissionGroup = keyof typeof PERMISSION_GROUPS

export function isKnownPermission(p: string): boolean {
  return ALL_PERMISSIONS.includes(p)
}

/** Default permissions granted automatically by role. */
export const ROLE_DEFAULT_PERMISSIONS: Record<'ADMIN' | 'MANAGER' | 'STAFF', readonly string[]> = {
  ADMIN: ALL_PERMISSIONS,
  MANAGER: [
    'bookings.view_all',
    'bookings.view_own',
    'bookings.assign',
    'bookings.cancel_own',
    'bookings.refund_handle',
    'bookings.complete',
    'services.manage',
    'schedule.manage',
    'products.view',
    'products.manage',
    'categories.manage',
    'inbox.manage',
    'banners.manage',
    'notifications.view',
  ],
  STAFF: [
    'bookings.view_own',
    'bookings.cancel_own',
    'bookings.complete',
    'notifications.view',
  ],
}

/**
 * Compute the effective permission set for a user:
 * Role defaults + valid extra grants. Unknown stored keys are silently ignored.
 */
export function getEffectivePermissions(role: string, extraGrants: string[] = []): string[] {
  const roleDefaults = (ROLE_DEFAULT_PERMISSIONS as Record<string, readonly string[]>)[role] || []
  const validExtras = extraGrants.filter(p => typeof p === 'string' && isKnownPermission(p))
  return [...new Set([...roleDefaults, ...validExtras])]
}
