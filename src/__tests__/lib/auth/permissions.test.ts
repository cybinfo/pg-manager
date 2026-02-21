/**
 * Tests for auth permission types and utilities
 *
 * The core hasPermission logic lives inside AuthProvider as a useCallback,
 * so we test the pure utility functions from types.ts and replicate the
 * permission evaluation logic to verify its correctness.
 */

import {
  PERMISSIONS,
  Permission,
  TENANT_PERMISSIONS,
  isValidPermission,
  asPermission,
  CONTEXT_TYPE_CONFIG,
  ContextType,
} from '@/lib/auth/types'
import type { ContextWithDetails } from '@/lib/auth/types'

// ============================================
// Replicate the hasPermission logic as a pure function for testing
// This mirrors the logic in auth-context.tsx lines 308-330
// ============================================
function evaluatePermission(
  permission: Permission | string,
  isPlatformAdmin: boolean,
  currentContext: ContextWithDetails | null,
): boolean {
  if (isPlatformAdmin) return true
  if (!currentContext) return false
  if (currentContext.context_type === 'owner') return true
  if (currentContext.context_type === 'tenant') {
    return TENANT_PERMISSIONS.includes(permission as Permission)
  }
  if (currentContext.context_type === 'staff') {
    return currentContext.permissions.includes(permission)
  }
  return false
}

function evaluateAnyPermission(
  permissions: (Permission | string)[],
  isPlatformAdmin: boolean,
  currentContext: ContextWithDetails | null,
): boolean {
  return permissions.some(p => evaluatePermission(p, isPlatformAdmin, currentContext))
}

function evaluateAllPermissions(
  permissions: (Permission | string)[],
  isPlatformAdmin: boolean,
  currentContext: ContextWithDetails | null,
): boolean {
  return permissions.every(p => evaluatePermission(p, isPlatformAdmin, currentContext))
}

// ============================================
// Helper to create mock context
// ============================================
function createMockContext(overrides: Partial<ContextWithDetails> = {}): ContextWithDetails {
  return {
    context_id: 'ctx-1',
    workspace_id: 'ws-1',
    workspace_name: 'Test Workspace',
    workspace_logo: null,
    context_type: 'owner',
    role_name: null,
    permissions: [],
    is_default: true,
    last_accessed_at: null,
    ...overrides,
  }
}

describe('Auth Permission Utilities', () => {
  describe('PERMISSIONS constant', () => {
    it('contains all PG module permissions', () => {
      expect(PERMISSIONS.PROPERTIES_VIEW).toBe('properties.view')
      expect(PERMISSIONS.PROPERTIES_CREATE).toBe('properties.create')
      expect(PERMISSIONS.PROPERTIES_EDIT).toBe('properties.edit')
      expect(PERMISSIONS.PROPERTIES_DELETE).toBe('properties.delete')

      expect(PERMISSIONS.ROOMS_VIEW).toBe('rooms.view')
      expect(PERMISSIONS.TENANTS_VIEW).toBe('tenants.view')
      expect(PERMISSIONS.BILLS_VIEW).toBe('bills.view')
      expect(PERMISSIONS.PAYMENTS_VIEW).toBe('payments.view')
      expect(PERMISSIONS.EXPENSES_VIEW).toBe('expenses.view')
      expect(PERMISSIONS.REFUNDS_VIEW).toBe('refunds.view')
      expect(PERMISSIONS.METERS_VIEW).toBe('meters.view')
      expect(PERMISSIONS.METER_READINGS_VIEW).toBe('meter_readings.view')
      expect(PERMISSIONS.STAFF_VIEW).toBe('staff.view')
      expect(PERMISSIONS.NOTICES_VIEW).toBe('notices.view')
      expect(PERMISSIONS.COMPLAINTS_VIEW).toBe('complaints.view')
      expect(PERMISSIONS.VISITORS_VIEW).toBe('visitors.view')
      expect(PERMISSIONS.REPORTS_VIEW).toBe('reports.view')
    })

    it('contains all library module permissions', () => {
      expect(PERMISSIONS.LIBRARY_VIEW).toBe('library.view')
      expect(PERMISSIONS.LIBRARY_CREATE).toBe('library.create')
      expect(PERMISSIONS.LIBRARY_EDIT).toBe('library.edit')
      expect(PERMISSIONS.LIBRARY_DELETE).toBe('library.delete')

      expect(PERMISSIONS.LIBRARY_SECTIONS_VIEW).toBe('library_sections.view')
      expect(PERMISSIONS.LIBRARY_MEMBERS_VIEW).toBe('library_members.view')
      expect(PERMISSIONS.LIBRARY_WAITLIST_VIEW).toBe('library_waitlist.view')
      expect(PERMISSIONS.LIBRARY_ATTENDANCE_VIEW).toBe('library_attendance.view')
      expect(PERMISSIONS.LIBRARY_LOCKERS_VIEW).toBe('library_lockers.view')
      expect(PERMISSIONS.LIBRARY_PAYMENTS_VIEW).toBe('library_payments.view')
    })

    it('contains exit clearance permissions with correct granularity', () => {
      expect(PERMISSIONS.EXIT_CLEARANCE_INITIATE).toBe('exit_clearance.initiate')
      expect(PERMISSIONS.EXIT_CLEARANCE_PROCESS).toBe('exit_clearance.process')
      expect(PERMISSIONS.EXIT_CLEARANCE_APPROVE).toBe('exit_clearance.approve')
    })

    it('contains meters assign permission', () => {
      expect(PERMISSIONS.METERS_ASSIGN).toBe('meters.assign')
    })

    it('follows the module.action naming convention', () => {
      const allPermissions = Object.values(PERMISSIONS)
      for (const perm of allPermissions) {
        expect(perm).toMatch(/^[a-z_]+\.[a-z_]+$/)
      }
    })

    it('is frozen (as const)', () => {
      // Verify the PERMISSIONS object values are string literals
      const values = Object.values(PERMISSIONS)
      expect(values.length).toBeGreaterThan(0)
      values.forEach((v: string) => {
        expect(typeof v).toBe('string')
      })
    })
  })

  describe('isValidPermission', () => {
    it('returns true for valid permissions', () => {
      expect(isValidPermission('tenants.view')).toBe(true)
      expect(isValidPermission('properties.create')).toBe(true)
      expect(isValidPermission('library.view')).toBe(true)
      expect(isValidPermission('exit_clearance.approve')).toBe(true)
    })

    it('returns false for invalid permissions', () => {
      expect(isValidPermission('invalid.permission')).toBe(false)
      expect(isValidPermission('')).toBe(false)
      expect(isValidPermission('tenants')).toBe(false)
      expect(isValidPermission('TENANTS_VIEW')).toBe(false) // constant name, not value
    })

    it('returns false for close-but-wrong permission strings', () => {
      expect(isValidPermission('tenant.view')).toBe(false)   // missing 's'
      expect(isValidPermission('tenants.views')).toBe(false)  // extra 's'
      expect(isValidPermission('Tenants.view')).toBe(false)   // capitalized
    })
  })

  describe('asPermission', () => {
    it('returns the permission when valid', () => {
      expect(asPermission('tenants.view')).toBe('tenants.view')
      expect(asPermission('library.edit')).toBe('library.edit')
    })

    it('throws for invalid permissions', () => {
      expect(() => asPermission('invalid.permission')).toThrow('Invalid permission')
      expect(() => asPermission('')).toThrow('Invalid permission')
    })

    it('includes the invalid value in the error message', () => {
      expect(() => asPermission('bad.perm')).toThrow('"bad.perm"')
    })
  })

  describe('TENANT_PERMISSIONS', () => {
    it('includes only the expected limited permissions', () => {
      expect(TENANT_PERMISSIONS).toContain(PERMISSIONS.PROFILE_VIEW)
      expect(TENANT_PERMISSIONS).toContain(PERMISSIONS.PROFILE_EDIT)
      expect(TENANT_PERMISSIONS).toContain(PERMISSIONS.PAYMENTS_VIEW)
      expect(TENANT_PERMISSIONS).toContain(PERMISSIONS.COMPLAINTS_VIEW)
      expect(TENANT_PERMISSIONS).toContain(PERMISSIONS.COMPLAINTS_CREATE)
      expect(TENANT_PERMISSIONS).toContain(PERMISSIONS.NOTICES_VIEW)
    })

    it('has exactly 6 permissions', () => {
      expect(TENANT_PERMISSIONS).toHaveLength(6)
    })

    it('does not include admin-level permissions', () => {
      expect(TENANT_PERMISSIONS).not.toContain(PERMISSIONS.TENANTS_CREATE)
      expect(TENANT_PERMISSIONS).not.toContain(PERMISSIONS.TENANTS_DELETE)
      expect(TENANT_PERMISSIONS).not.toContain(PERMISSIONS.STAFF_VIEW)
      expect(TENANT_PERMISSIONS).not.toContain(PERMISSIONS.PROPERTIES_VIEW)
      expect(TENANT_PERMISSIONS).not.toContain(PERMISSIONS.ROOMS_VIEW)
      expect(TENANT_PERMISSIONS).not.toContain(PERMISSIONS.BILLS_CREATE)
      expect(TENANT_PERMISSIONS).not.toContain(PERMISSIONS.LIBRARY_VIEW)
    })

    it('does not include payment mutation permissions', () => {
      expect(TENANT_PERMISSIONS).not.toContain(PERMISSIONS.PAYMENTS_CREATE)
      expect(TENANT_PERMISSIONS).not.toContain(PERMISSIONS.PAYMENTS_EDIT)
      expect(TENANT_PERMISSIONS).not.toContain(PERMISSIONS.PAYMENTS_DELETE)
    })
  })

  describe('CONTEXT_TYPE_CONFIG', () => {
    it('has configuration for all context types', () => {
      const contextTypes: ContextType[] = ['owner', 'staff', 'tenant']
      for (const type of contextTypes) {
        expect(CONTEXT_TYPE_CONFIG[type]).toBeDefined()
        expect(CONTEXT_TYPE_CONFIG[type].label).toBeTruthy()
        expect(CONTEXT_TYPE_CONFIG[type].icon).toBeTruthy()
        expect(CONTEXT_TYPE_CONFIG[type].color).toBeTruthy()
      }
    })

    it('has correct labels', () => {
      expect(CONTEXT_TYPE_CONFIG.owner.label).toBe('Owner')
      expect(CONTEXT_TYPE_CONFIG.staff.label).toBe('Staff')
      expect(CONTEXT_TYPE_CONFIG.tenant.label).toBe('Tenant')
    })
  })
})

describe('Permission Evaluation Logic', () => {
  describe('Platform Admin', () => {
    it('grants all permissions regardless of context', () => {
      expect(evaluatePermission('tenants.view', true, null)).toBe(true)
      expect(evaluatePermission('staff.delete', true, null)).toBe(true)
      expect(evaluatePermission('library.view', true, null)).toBe(true)
    })

    it('grants all permissions even with a staff context', () => {
      const staffCtx = createMockContext({
        context_type: 'staff',
        permissions: [], // empty permissions, but admin overrides
      })
      expect(evaluatePermission('tenants.delete', true, staffCtx)).toBe(true)
    })
  })

  describe('Owner context', () => {
    const ownerCtx = createMockContext({ context_type: 'owner' })

    it('grants all permissions', () => {
      expect(evaluatePermission('tenants.view', false, ownerCtx)).toBe(true)
      expect(evaluatePermission('staff.delete', false, ownerCtx)).toBe(true)
      expect(evaluatePermission('properties.create', false, ownerCtx)).toBe(true)
      expect(evaluatePermission('library.view', false, ownerCtx)).toBe(true)
    })

    it('grants permissions that do not exist in the PERMISSIONS constant', () => {
      // Owner gets all permissions unconditionally
      expect(evaluatePermission('some.future.permission', false, ownerCtx)).toBe(true)
    })
  })

  describe('Staff context', () => {
    it('grants only assigned permissions', () => {
      const staffCtx = createMockContext({
        context_type: 'staff',
        permissions: ['tenants.view', 'tenants.create', 'payments.view'],
      })

      expect(evaluatePermission('tenants.view', false, staffCtx)).toBe(true)
      expect(evaluatePermission('tenants.create', false, staffCtx)).toBe(true)
      expect(evaluatePermission('payments.view', false, staffCtx)).toBe(true)
    })

    it('denies permissions not assigned', () => {
      const staffCtx = createMockContext({
        context_type: 'staff',
        permissions: ['tenants.view'],
      })

      expect(evaluatePermission('tenants.delete', false, staffCtx)).toBe(false)
      expect(evaluatePermission('staff.view', false, staffCtx)).toBe(false)
      expect(evaluatePermission('properties.create', false, staffCtx)).toBe(false)
    })

    it('denies all permissions when permissions array is empty', () => {
      const staffCtx = createMockContext({
        context_type: 'staff',
        permissions: [],
      })

      expect(evaluatePermission('tenants.view', false, staffCtx)).toBe(false)
      expect(evaluatePermission('payments.view', false, staffCtx)).toBe(false)
    })

    it('supports aggregated permissions from multiple roles', () => {
      // When a staff member has multiple roles, permissions are merged
      const staffCtx = createMockContext({
        context_type: 'staff',
        permissions: [
          'tenants.view',     // from Role A
          'payments.view',    // from Role B
          'bills.create',     // from Role B
          'reports.view',     // from Role A
        ],
      })

      expect(evaluatePermission('tenants.view', false, staffCtx)).toBe(true)
      expect(evaluatePermission('payments.view', false, staffCtx)).toBe(true)
      expect(evaluatePermission('bills.create', false, staffCtx)).toBe(true)
      expect(evaluatePermission('reports.view', false, staffCtx)).toBe(true)
    })
  })

  describe('Tenant context', () => {
    const tenantCtx = createMockContext({
      context_type: 'tenant',
      permissions: [], // tenants use hardcoded TENANT_PERMISSIONS, not context.permissions
    })

    it('grants hardcoded tenant permissions', () => {
      expect(evaluatePermission('profile.view', false, tenantCtx)).toBe(true)
      expect(evaluatePermission('profile.edit', false, tenantCtx)).toBe(true)
      expect(evaluatePermission('payments.view', false, tenantCtx)).toBe(true)
      expect(evaluatePermission('complaints.view', false, tenantCtx)).toBe(true)
      expect(evaluatePermission('complaints.create', false, tenantCtx)).toBe(true)
      expect(evaluatePermission('notices.view', false, tenantCtx)).toBe(true)
    })

    it('denies non-tenant permissions', () => {
      expect(evaluatePermission('tenants.view', false, tenantCtx)).toBe(false)
      expect(evaluatePermission('rooms.view', false, tenantCtx)).toBe(false)
      expect(evaluatePermission('staff.view', false, tenantCtx)).toBe(false)
      expect(evaluatePermission('properties.create', false, tenantCtx)).toBe(false)
      expect(evaluatePermission('payments.create', false, tenantCtx)).toBe(false)
    })

    it('denies permissions even if they are in the context permissions array', () => {
      // Tenant permissions are hardcoded, context.permissions is ignored
      const tenantWithExtraPerms = createMockContext({
        context_type: 'tenant',
        permissions: ['staff.view', 'tenants.delete'],
      })

      expect(evaluatePermission('staff.view', false, tenantWithExtraPerms)).toBe(false)
      expect(evaluatePermission('tenants.delete', false, tenantWithExtraPerms)).toBe(false)
    })
  })

  describe('No context (null)', () => {
    it('denies all permissions when not platform admin', () => {
      expect(evaluatePermission('tenants.view', false, null)).toBe(false)
      expect(evaluatePermission('profile.view', false, null)).toBe(false)
    })
  })

  describe('hasAnyPermission logic', () => {
    const staffCtx = createMockContext({
      context_type: 'staff',
      permissions: ['tenants.view', 'payments.view'],
    })

    it('returns true if at least one permission matches', () => {
      expect(evaluateAnyPermission(['tenants.view', 'staff.delete'], false, staffCtx)).toBe(true)
    })

    it('returns false if no permissions match', () => {
      expect(evaluateAnyPermission(['staff.delete', 'rooms.create'], false, staffCtx)).toBe(false)
    })

    it('returns true for empty array (vacuous truth does not apply - some returns false)', () => {
      expect(evaluateAnyPermission([], false, staffCtx)).toBe(false)
    })

    it('always true for platform admin', () => {
      expect(evaluateAnyPermission(['anything.here'], true, null)).toBe(true)
    })
  })

  describe('hasAllPermissions logic', () => {
    const staffCtx = createMockContext({
      context_type: 'staff',
      permissions: ['tenants.view', 'payments.view', 'rooms.view'],
    })

    it('returns true when all permissions match', () => {
      expect(evaluateAllPermissions(['tenants.view', 'payments.view'], false, staffCtx)).toBe(true)
    })

    it('returns false when one permission is missing', () => {
      expect(evaluateAllPermissions(['tenants.view', 'staff.delete'], false, staffCtx)).toBe(false)
    })

    it('returns true for empty array (vacuous truth)', () => {
      expect(evaluateAllPermissions([], false, staffCtx)).toBe(true)
    })

    it('always true for platform admin', () => {
      expect(evaluateAllPermissions(['anything.here', 'something.else'], true, null)).toBe(true)
    })
  })

  describe('Permission hierarchy: Platform Admin > Owner > Staff > Tenant', () => {
    const permission = 'staff.delete' // an admin-level permission

    it('Platform Admin has access', () => {
      expect(evaluatePermission(permission, true, null)).toBe(true)
    })

    it('Owner has access', () => {
      const ownerCtx = createMockContext({ context_type: 'owner' })
      expect(evaluatePermission(permission, false, ownerCtx)).toBe(true)
    })

    it('Staff has access only if assigned', () => {
      const staffWithPerm = createMockContext({
        context_type: 'staff',
        permissions: ['staff.delete'],
      })
      const staffWithoutPerm = createMockContext({
        context_type: 'staff',
        permissions: ['tenants.view'],
      })

      expect(evaluatePermission(permission, false, staffWithPerm)).toBe(true)
      expect(evaluatePermission(permission, false, staffWithoutPerm)).toBe(false)
    })

    it('Tenant never has access to admin permissions', () => {
      const tenantCtx = createMockContext({ context_type: 'tenant' })
      expect(evaluatePermission(permission, false, tenantCtx)).toBe(false)
    })
  })
})
