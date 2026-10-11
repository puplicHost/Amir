// Phase 2e integration test suite: roles, permissions, staff panel scoping,
// safety guards, and notification audiences.
//
// Run: node scripts/verify-2e.mjs
// Prerequisites: local dev server running (http://localhost:3000) & PostgreSQL reachable.
//
// Safety guarantee:
// - All test users use emails ending in '@test.invalid'.
// - All test bookings use customerName starting with 'TEST-2E-'.
// - All test data is completely cleaned up in a finally block.
// - Real users and bookings are never modified.
import { readFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const prisma = new PrismaClient()

function envVal(key, fallback) {
  const m = readFileSync('.env', 'utf8').match(new RegExp(`^${key}=(.*)$`, 'm'))
  return (m ? m[1].trim().replace(/^"|"$/g, '') : fallback)
}

let pass = 0
let fail = 0
function check(name, cond) {
  if (cond) { pass++; console.log(`ok   ${name}`) }
  else { fail++; console.log(`FAIL ${name}`) }
}

async function loginUser(email, password) {
  const res = await fetch(`${BASE}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const cookie = res.headers.get('set-cookie')?.split(';')[0] || ''
  return { status: res.status, ok: res.ok, cookie }
}

function client(cookie) {
  return (url, opts = {}) => fetch(`${BASE}${url}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...(opts.headers || {}),
    },
  })
}

async function main() {
  const testUserIds = []
  let serviceId = null
  const testBookingIds = []

  try {
    console.log('=== Setting up Phase 2e test fixtures ===')
    const passHash = await bcrypt.hash('TestPass123!', 10)

    // Create test service
    const service = await prisma.service.create({
      data: {
        slug: 'service-temp-2e',
        section: 'DAMEN',
        name: 'Test 2E Service',
        priceAbCents: 4000,
        durationMin: 30,
        needsDurationReview: false,
        isActive: true,
      },
    })
    serviceId = service.id

    // Create test users
    const adminUser = await prisma.adminUser.create({
      data: {
        email: 'admin-temp@test.invalid',
        name: 'Test Admin',
        passwordHash: passHash,
        role: 'ADMIN',
        isActive: true,
      },
    })
    testUserIds.push(adminUser.id)

    const managerUser = await prisma.adminUser.create({
      data: {
        email: 'manager-temp@test.invalid',
        name: 'Test Manager',
        passwordHash: passHash,
        role: 'MANAGER',
        isActive: true,
      },
    })
    testUserIds.push(managerUser.id)

    const staff1 = await prisma.adminUser.create({
      data: {
        email: 'staff1-temp@test.invalid',
        name: 'Test Staff One',
        passwordHash: passHash,
        role: 'STAFF',
        isActive: true,
      },
    })
    testUserIds.push(staff1.id)

    const staff2 = await prisma.adminUser.create({
      data: {
        email: 'staff2-temp@test.invalid',
        name: 'Test Staff Two',
        passwordHash: passHash,
        role: 'STAFF',
        isActive: true,
      },
    })
    testUserIds.push(staff2.id)

    // Staff with extra grant 'bookings.assign'
    const staffExtra = await prisma.adminUser.create({
      data: {
        email: 'staff-extra@test.invalid',
        name: 'Test Staff Extra',
        passwordHash: passHash,
        role: 'STAFF',
        isActive: true,
        permissions: {
          create: [{ permission: 'bookings.assign' }],
        },
      },
    })
    testUserIds.push(staffExtra.id)

    // Deactivated user
    const staffDeact = await prisma.adminUser.create({
      data: {
        email: 'staff-deact@test.invalid',
        name: 'Test Staff Deactivated',
        passwordHash: passHash,
        role: 'STAFF',
        isActive: false,
      },
    })
    testUserIds.push(staffDeact.id)

    // Test bookings
    const futureTime1 = new Date(Date.now() + 86400000 * 2)
    const futureTime2 = new Date(Date.now() + 86400000 * 3)
    const futureTime3 = new Date(Date.now() + 86400000 * 4)

    const booking1 = await prisma.booking.create({
      data: {
        bookingNumber: 'BK-2E-001',
        serviceId: service.id,
        customerName: 'TEST-2E-Customer1',
        customerPhone: '+491711111111',
        startsAt: futureTime1,
        durationMinSnapshot: 30,
        priceSnapshotCents: 4000,
        depositCents: 2000,
        paymentProvider: 'stripe',
        paymentStatus: 'PAID',
        idempotencyKey: 'idemp-2e-001',
        publicToken: 'pub-tok-2e-001',
        status: 'ASSIGNED',
        assignedStaffId: staff1.id,
      },
    })
    testBookingIds.push(booking1.id)

    const booking2 = await prisma.booking.create({
      data: {
        bookingNumber: 'BK-2E-002',
        serviceId: service.id,
        customerName: 'TEST-2E-Customer2',
        customerPhone: '+491712222222',
        startsAt: futureTime2,
        durationMinSnapshot: 30,
        priceSnapshotCents: 4000,
        depositCents: 2000,
        paymentProvider: 'stripe',
        paymentStatus: 'PAID',
        idempotencyKey: 'idemp-2e-002',
        publicToken: 'pub-tok-2e-002',
        status: 'ASSIGNED',
        assignedStaffId: staff2.id,
      },
    })
    testBookingIds.push(booking2.id)

    const booking3 = await prisma.booking.create({
      data: {
        bookingNumber: 'BK-2E-003',
        serviceId: service.id,
        customerName: 'TEST-2E-Customer3',
        customerPhone: '+491713333333',
        startsAt: futureTime3,
        durationMinSnapshot: 30,
        priceSnapshotCents: 4000,
        depositCents: 2000,
        paymentProvider: 'stripe',
        paymentStatus: 'PAID',
        idempotencyKey: 'idemp-2e-003',
        publicToken: 'pub-tok-2e-003',
        status: 'UNASSIGNED',
      },
    })
    testBookingIds.push(booking3.id)

    // Initial assignment history row for booking1
    await prisma.bookingAssignment.create({
      data: {
        bookingId: booking1.id,
        staffId: staff1.id,
        assignedById: adminUser.id,
      },
    })

    console.log('=== Fixtures ready. Running assertions ===\n')

    // ── 1. STAFF Scoping & 404 on others' bookings ──
    const staff1Login = await loginUser('staff1-temp@test.invalid', 'TestPass123!')
    check('Staff 1 login succeeds', staff1Login.ok)
    const staff1Api = client(staff1Login.cookie)

    const staff1ListRes = await staff1Api('/api/admin/bookings')
    const staff1List = await staff1ListRes.json()
    check('Staff 1 sees only their own booking in list',
      staff1List.bookings.length === 1 && staff1List.bookings[0].id === booking1.id)

    const staff1GetOther = await staff1Api(`/api/admin/bookings/${booking2.id}`)
    check('Staff 1 gets 404 when requesting another staff member\'s booking',
      staff1GetOther.status === 404)

    const staff1GetOwn = await staff1Api(`/api/admin/bookings/${booking1.id}`)
    check('Staff 1 gets 200 on their own booking',
      staff1GetOwn.status === 200)

    // ── 2. STAFF gets 403 on assign, refund-handled, and users endpoints ──
    const staff1Assign = await staff1Api(`/api/admin/bookings/${booking3.id}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ staffId: staff1.id }),
    })
    check('Staff gets 403 on assign endpoint', staff1Assign.status === 403)

    const staff1Refund = await staff1Api(`/api/admin/bookings/${booking1.id}/refund-handled`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
    check('Staff gets 403 on refund-handled endpoint', staff1Refund.status === 403)

    const staff1Users = await staff1Api('/api/admin/users')
    check('Staff gets 403 on users endpoint', staff1Users.status === 403)

    // ── 3. MANAGER can assign but gets 403 on payment settings and users ──
    const managerLogin = await loginUser('manager-temp@test.invalid', 'TestPass123!')
    check('Manager login succeeds', managerLogin.ok)
    const managerApi = client(managerLogin.cookie)

    const managerAssign = await managerApi(`/api/admin/bookings/${booking3.id}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ staffId: staff1.id }),
    })
    check('Manager can assign a booking (200)', managerAssign.status === 200)

    const managerPayment = await managerApi('/api/admin/settings/payment')
    check('Manager gets 403 on payment settings endpoint', managerPayment.status === 403)

    const managerUsers = await managerApi('/api/admin/users')
    check('Manager gets 403 on users endpoint', managerUsers.status === 403)

    // ── 4. ADMIN can do everything ──
    const adminLogin = await loginUser('admin-temp@test.invalid', 'TestPass123!')
    check('Admin login succeeds', adminLogin.ok)
    const adminApi = client(adminLogin.cookie)

    const adminUsers = await adminApi('/api/admin/users')
    check('Admin can list users (200)', adminUsers.status === 200)

    const adminPayment = await adminApi('/api/admin/settings/payment')
    check('Admin can access payment settings (200)', adminPayment.status === 200)

    const adminRefund = await adminApi(`/api/admin/bookings/${booking1.id}/refund-handled`, {
      method: 'POST',
      body: JSON.stringify({ note: 'Handled in test' }),
    })
    check('Admin can handle refunds (200)', adminRefund.status === 200)

    const adminReassign = await adminApi(`/api/admin/bookings/${booking3.id}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ staffId: staff2.id }),
    })
    check('Admin can reassign booking (200)', adminReassign.status === 200)

    // ── 5. Extra grant on STAFF takes effect ──
    const extraLogin = await loginUser('staff-extra@test.invalid', 'TestPass123!')
    check('Staff with extra grant login succeeds', extraLogin.ok)
    const extraApi = client(extraLogin.cookie)

    // Unassign booking3 first so it can be assigned
    await prisma.booking.update({
      where: { id: booking3.id },
      data: { status: 'UNASSIGNED', assignedStaffId: null },
    })
    const extraAssign = await extraApi(`/api/admin/bookings/${booking3.id}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ staffId: staff1.id }),
    })
    check('Staff with extra grant bookings.assign CAN assign (200)', extraAssign.status === 200)

    const extraPayment = await extraApi('/api/admin/settings/payment')
    check('Staff with extra grant still gets 403 on payment settings', extraPayment.status === 403)

    // ── 6. Deactivated user is rejected ──
    const deactLogin = await loginUser('staff-deact@test.invalid', 'TestPass123!')
    check('Deactivated user login rejected (401)', deactLogin.status === 401)

    // Test instant session revocation: active user gets deactivated via API
    const userToDeact = await prisma.adminUser.create({
      data: {
        email: 'revocation-test@test.invalid',
        name: 'Revocation Test',
        passwordHash: passHash,
        role: 'STAFF',
        isActive: true,
      },
    })
    testUserIds.push(userToDeact.id)
    const activeLogin = await loginUser('revocation-test@test.invalid', 'TestPass123!')
    const activeApi = client(activeLogin.cookie)
    const beforeDeact = await activeApi('/api/admin/bookings')
    check('User with active session can call API (200)', beforeDeact.status === 200)

    // Admin deactivates this user
    const deactRes = await adminApi(`/api/admin/users/${userToDeact.id}`, {
      method: 'PUT',
      body: JSON.stringify({ isActive: false }),
    })
    check('Admin deactivates user (200)', deactRes.status === 200)

    // Subsequence request with old session cookie must be rejected (401)
    const afterDeact = await activeApi('/api/admin/bookings')
    check('Deactivated user session immediately rejected on next request (401)', afterDeact.status === 401)

    // ── 7. Last active ADMIN protection ──
    // Admin cannot deactivate self
    const selfDeact = await adminApi(`/api/admin/users/${adminUser.id}`, {
      method: 'PUT',
      body: JSON.stringify({ isActive: false }),
    })
    check('Admin cannot deactivate self (400)', selfDeact.status === 400)

    // Admin cannot change own role
    const selfRole = await adminApi(`/api/admin/users/${adminUser.id}`, {
      method: 'PUT',
      body: JSON.stringify({ role: 'STAFF' }),
    })
    check('Admin cannot demote own role (400)', selfRole.status === 400)

    // Admin cannot delete self
    const deleteAdminSelf = await adminApi(`/api/admin/users/${adminUser.id}`, { method: 'DELETE' })
    check('Admin cannot delete self (403)', deleteAdminSelf.status === 403)

    // Create second active temporary admin
    const adminTwo = await prisma.adminUser.create({
      data: {
        email: 'admin-two@test.invalid',
        name: 'Admin Two',
        passwordHash: passHash,
        role: 'ADMIN',
        isActive: true,
      },
    })
    testUserIds.push(adminTwo.id)

    // With two active admins, demoting one succeeds (200)
    const demoteOne = await adminApi(`/api/admin/users/${adminTwo.id}`, {
      method: 'PUT',
      body: JSON.stringify({ role: 'STAFF' }),
    })
    check('With two active admins, demoting one succeeds (200)', demoteOne.status === 200)

    // Restore role
    await adminApi(`/api/admin/users/${adminTwo.id}`, {
      method: 'PUT',
      body: JSON.stringify({ role: 'ADMIN' }),
    })

    // With two active admins, deactivating one succeeds (200)
    const deactOne = await adminApi(`/api/admin/users/${adminTwo.id}`, {
      method: 'PUT',
      body: JSON.stringify({ isActive: false }),
    })
    check('With two active admins, deactivating one succeeds (200)', deactOne.status === 200)

    // Reactivate
    await adminApi(`/api/admin/users/${adminTwo.id}`, {
      method: 'PUT',
      body: JSON.stringify({ isActive: true }),
    })

    // With two active admins, deleting one succeeds (200)
    const deleteOne = await adminApi(`/api/admin/users/${adminTwo.id}`, { method: 'DELETE' })
    check('With two active admins, deleting one succeeds (200)', deleteOne.status === 200)

    // Now adminUser is the last remaining active regular admin.
    // Operating via super-admin to test demote/deactivate/delete on the last remaining active admin:
    const superLogin = await loginUser(envVal('SEED_ADMIN_EMAIL', 'admin@amir.com'), envVal('SEED_ADMIN_PASSWORD', 'AmirAdmin123!'))
    const superApi = client(superLogin.cookie)

    const demoteLastAdmin = await superApi(`/api/admin/users/${adminUser.id}`, {
      method: 'PUT',
      body: JSON.stringify({ role: 'STAFF' }),
    })
    check('Demoting the last remaining active admin fails with 400', demoteLastAdmin.status === 400)

    const deactLastAdmin = await superApi(`/api/admin/users/${adminUser.id}`, {
      method: 'PUT',
      body: JSON.stringify({ isActive: false }),
    })
    check('Deactivating the last remaining active admin fails with 400', deactLastAdmin.status === 400)

    const deleteLastAdmin = await superApi(`/api/admin/users/${adminUser.id}`, { method: 'DELETE' })
    check('Deleting the last remaining active admin fails with 400', deleteLastAdmin.status === 400)

    // ── 8. Notification recipients & sanitized payload ──
    // Staff cancels booking1
    const staff1Cancel = await staff1Api('/api/admin/bookings/staff-cancel', {
      method: 'POST',
      body: JSON.stringify({ bookingIds: [booking1.id], reason: 'Sick leave' }),
    })
    check('Staff 1 cancels own booking (200)', staff1Cancel.status === 200)

    // Check notification for booking_cancelled_by_staff was delivered to manager and admin
    const cancelNotifs = await prisma.adminNotification.findMany({
      where: {
        type: 'booking_cancelled_by_staff',
        relatedEntityId: booking1.id,
      },
    })
    const notifUserIds = cancelNotifs.map(n => n.adminUserId)
    check('Cancellation notification delivered to manager', notifUserIds.includes(managerUser.id))
    check('Cancellation notification delivered to admin', notifUserIds.includes(adminUser.id))
    check('Cancellation notification NOT delivered to staff 2', !notifUserIds.includes(staff2.id))

    // Check notification payload has NO customer PII (no phone, email, or customer name)
    const sampleNotif = cancelNotifs[0]
    if (sampleNotif) {
      const containsPhone = sampleNotif.bodyEn.includes('1111') || sampleNotif.titleEn.includes('1111')
      const containsEmail = sampleNotif.bodyEn.includes('@') || sampleNotif.titleEn.includes('@')
      const containsCustomer = sampleNotif.bodyEn.includes('Customer1') || sampleNotif.titleEn.includes('Customer1')
      check('Notification contains NO customer phone', !containsPhone)
      check('Notification contains NO customer email', !containsEmail)
      check('Notification contains NO customer name', !containsCustomer)
      check('Notification contains booking reference', sampleNotif.bodyEn.includes('BK-2E-001'))
    }

    // Check booking_assigned notification when manager assigned booking3 to staff2
    const assignNotifs = await prisma.adminNotification.findMany({
      where: {
        type: 'booking_assigned',
        adminUserId: staff2.id,
      },
    })
    check('Assigned staff member received booking_assigned notification', assignNotifs.length > 0)
    if (assignNotifs.length > 0) {
      const aNotif = assignNotifs[0]
      check('Staff notification deep link points to /admin/my-bookings', aNotif.url === '/admin/my-bookings')
    }

    const managerCancelNotif = cancelNotifs.find(n => n.adminUserId === managerUser.id)
    if (managerCancelNotif) {
      check('Manager notification deep link points to /admin/bookings/<id>', managerCancelNotif.url === `/admin/bookings/${booking1.id}`)
    }

  } finally {
    console.log('\n=== Cleaning up Phase 2e test fixtures ===')
    if (testBookingIds.length) {
      await prisma.bookingAssignment.deleteMany({ where: { bookingId: { in: testBookingIds } } })
      await prisma.booking.deleteMany({ where: { id: { in: testBookingIds } } })
      console.log('Cleaned up test bookings and assignments')
    }
    if (serviceId) {
      await prisma.service.delete({ where: { id: serviceId } }).catch(() => null)
      console.log('Cleaned up test service')
    }
    if (testUserIds.length) {
      await prisma.adminNotification.deleteMany({ where: { adminUserId: { in: testUserIds } } })
      await prisma.adminDeviceToken.deleteMany({ where: { adminUserId: { in: testUserIds } } })
      await prisma.adminPermission.deleteMany({ where: { userId: { in: testUserIds } } })
      await prisma.adminUser.deleteMany({ where: { id: { in: testUserIds } } })
      console.log('Cleaned up test users, tokens, permissions, notifications')
    }
    // Also delete any dangling test users with @test.invalid
    await prisma.adminUser.deleteMany({ where: { email: { endsWith: '@test.invalid' } } }).catch(() => null)
    await prisma.$disconnect()
  }

  console.log(`\nPhase 2e integration tests: ${pass} passed, ${fail} failed`)
  process.exit(fail ? 1 : 0)
}

main().catch(async (e) => {
  console.error('Test script crashed:', e)
  await prisma.adminUser.deleteMany({ where: { email: { endsWith: '@test.invalid' } } }).catch(() => null)
  await prisma.$disconnect()
  process.exit(1)
})
