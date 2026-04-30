/**
 * Tests for navigation configuration and utilities
 */

import {
  DASHBOARD_NAVIGATION,
  DASHBOARD_MOBILE_NAV,
  TENANT_NAVIGATION,
  ROUTE_CONFIGS,
  filterNavigation,
  getPathPermissions,
  getPathModules,
  getPathFeatures,
  getRouteConfig,
  canAccessRoute,
  type NavItem,
} from '@/lib/navigation/config'
import type { ModuleKey } from '@/lib/features'
import type { LucideIcon } from 'lucide-react'

describe('DASHBOARD_NAVIGATION', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(DASHBOARD_NAVIGATION)).toBe(true)
    expect(DASHBOARD_NAVIGATION.length).toBeGreaterThan(0)
  })

  it('has valid structure for every item', () => {
    for (const item of DASHBOARD_NAVIGATION) {
      expect(item.name).toBeTruthy()
      expect(typeof item.name).toBe('string')
      expect(item.href).toBeTruthy()
      expect(typeof item.href).toBe('string')
      expect(item.href.startsWith('/')).toBe(true)
      expect(item.icon).toBeDefined()
      expect(item.permission === null || typeof item.permission === 'string').toBe(true)
      expect(item.module === null || typeof item.module === 'string').toBe(true)
    }
  })

  it('contains the Dashboard item with no permission or module required', () => {
    const dashboard = DASHBOARD_NAVIGATION.find((item) => item.href === '/dashboard')
    expect(dashboard).toBeDefined()
    expect(dashboard!.permission).toBeNull()
    expect(dashboard!.module).toBeNull()
  })

  it('contains core PG modules', () => {
    const expectedHrefs = [
      '/properties',
      '/rooms',
      '/tenants',
      '/bills',
      '/payments',
      '/staff',
    ]
    for (const href of expectedHrefs) {
      const item = DASHBOARD_NAVIGATION.find((i) => i.href === href)
      expect(item).toBeDefined()
    }
  })

  it('contains library module items', () => {
    const libraryHrefs = [
      '/library',
      '/library-sections',
      '/library-seats',
      '/library-members',
      '/library-waitlist',
      '/library-attendance',
      '/library-lockers',
      '/library-payments',
      '/library-reports',
      '/library-plans',
    ]
    for (const href of libraryHrefs) {
      const item = DASHBOARD_NAVIGATION.find((i) => i.href === href)
      expect(item).toBeDefined()
    }
  })

  it('has library items gated behind specific module keys', () => {
    const libraryItem = DASHBOARD_NAVIGATION.find((i) => i.href === '/library')
    expect(libraryItem?.module).toBe('members')

    const sectionsItem = DASHBOARD_NAVIGATION.find((i) => i.href === '/library-sections')
    expect(sectionsItem?.module).toBe('sections')

    const seatsItem = DASHBOARD_NAVIGATION.find((i) => i.href === '/library-seats')
    expect(seatsItem?.module).toBe('seats')

    const attendanceItem = DASHBOARD_NAVIGATION.find((i) => i.href === '/library-attendance')
    expect(attendanceItem?.module).toBe('attendance')
  })

  it('has dividerBefore on the first library item', () => {
    const libraryItem = DASHBOARD_NAVIGATION.find((item) => item.href === '/library')
    expect(libraryItem).toBeDefined()
    expect(libraryItem!.dividerBefore).toBe(true)
  })

  it('contains module-gated items', () => {
    const modulGatedItems = DASHBOARD_NAVIGATION.filter(
      (item) => item.module !== null
    )
    expect(modulGatedItems.length).toBeGreaterThan(0)
  })

  it('has no duplicate hrefs', () => {
    const hrefs = DASHBOARD_NAVIGATION.map((item) => item.href)
    const uniqueHrefs = new Set(hrefs)
    expect(uniqueHrefs.size).toBe(hrefs.length)
  })
})

describe('DASHBOARD_MOBILE_NAV', () => {
  it('has exactly 5 items', () => {
    expect(DASHBOARD_MOBILE_NAV).toHaveLength(5)
  })

  it('has valid structure', () => {
    for (const item of DASHBOARD_MOBILE_NAV) {
      expect(item.name).toBeTruthy()
      expect(item.href).toBeTruthy()
      expect(item.icon).toBeDefined()
    }
  })

  it('includes Dashboard, Tenants, Payments, Bills, and More', () => {
    const names = DASHBOARD_MOBILE_NAV.map((item) => item.name)
    expect(names).toContain('Home')
    expect(names).toContain('Tenants')
    expect(names).toContain('Payments')
    expect(names).toContain('Bills')
    expect(names).toContain('More')
  })
})

describe('TENANT_NAVIGATION', () => {
  it('is a non-empty array', () => {
    expect(TENANT_NAVIGATION.length).toBeGreaterThan(0)
  })

  it('has tenant portal routes starting with /tenant', () => {
    for (const item of TENANT_NAVIGATION) {
      expect(item.href.startsWith('/tenant')).toBe(true)
    }
  })

  it('includes expected tenant portal pages', () => {
    const hrefs = TENANT_NAVIGATION.map((item) => item.href)
    expect(hrefs).toContain('/tenant')
    expect(hrefs).toContain('/tenant/profile')
    expect(hrefs).toContain('/tenant/bills')
    expect(hrefs).toContain('/tenant/payments')
  })
})

describe('filterNavigation', () => {
  const testItems: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: {} as LucideIcon, permission: null, module: null },
    { name: 'Tenants', href: '/tenants', icon: {} as LucideIcon, permission: 'tenants.view', module: null },
    { name: 'Expenses', href: '/expenses', icon: {} as LucideIcon, permission: 'expenses.view', module: 'expenses' as ModuleKey },
    { name: 'Visitors', href: '/visitors', icon: {} as LucideIcon, permission: 'visitors.view', module: 'visitors' as ModuleKey },
    { name: 'Activity Log', href: '/activity', icon: {} as LucideIcon, permission: null, module: 'activityLog' as ModuleKey },
  ]

  it('shows all items for platform admin with all modules enabled', () => {
    const result = filterNavigation(testItems, {
      hasPermission: () => true,
      isModuleEnabled: () => true,
      isPlatformAdmin: true,
    })

    expect(result).toHaveLength(5)
  })

  it('hides module-disabled items even for platform admin', () => {
    const result = filterNavigation(testItems, {
      hasPermission: () => true,
      isModuleEnabled: (module) => module !== 'expenses',
      isPlatformAdmin: true,
    })

    const hrefs = result.map((item) => item.href)
    expect(hrefs).not.toContain('/expenses')
    expect(hrefs).toContain('/tenants')
    expect(hrefs).toContain('/visitors')
  })

  it('shows items without permission for any user', () => {
    const result = filterNavigation(testItems, {
      hasPermission: () => false,
      isModuleEnabled: () => true,
      isPlatformAdmin: false,
    })

    const hrefs = result.map((item) => item.href)
    expect(hrefs).toContain('/dashboard')
    expect(hrefs).toContain('/activity')
  })

  it('hides items when user lacks permission', () => {
    const result = filterNavigation(testItems, {
      hasPermission: (perm) => perm === 'tenants.view',
      isModuleEnabled: () => true,
      isPlatformAdmin: false,
    })

    const hrefs = result.map((item) => item.href)
    expect(hrefs).toContain('/dashboard')
    expect(hrefs).toContain('/tenants')
    expect(hrefs).not.toContain('/expenses')
    expect(hrefs).not.toContain('/visitors')
    expect(hrefs).toContain('/activity') // no permission needed
  })

  it('hides items when module is disabled even if user has permission', () => {
    const result = filterNavigation(testItems, {
      hasPermission: () => true,
      isModuleEnabled: (module) => module !== 'visitors',
      isPlatformAdmin: false,
    })

    const hrefs = result.map((item) => item.href)
    expect(hrefs).not.toContain('/visitors')
    expect(hrefs).toContain('/expenses')
  })

  it('both module and permission must pass for an item to show', () => {
    const result = filterNavigation(testItems, {
      hasPermission: (perm) => perm === 'expenses.view',
      isModuleEnabled: (module) => module === 'expenses',
      isPlatformAdmin: false,
    })

    const hrefs = result.map((item) => item.href)
    expect(hrefs).toContain('/dashboard') // no perm, no module
    expect(hrefs).not.toContain('/tenants') // has perm check, user lacks it
    expect(hrefs).toContain('/expenses') // module enabled + has permission
    expect(hrefs).not.toContain('/visitors') // module disabled
    expect(hrefs).not.toContain('/activity') // module disabled
  })

  it('returns empty array when all items are filtered out', () => {
    const restrictedItems: NavItem[] = [
      { name: 'Tenants', href: '/tenants', icon: {} as LucideIcon, permission: 'tenants.view', module: null },
      { name: 'Expenses', href: '/expenses', icon: {} as LucideIcon, permission: 'expenses.view', module: 'expenses' as ModuleKey },
    ]

    const result = filterNavigation(restrictedItems, {
      hasPermission: () => false,
      isModuleEnabled: () => false,
      isPlatformAdmin: false,
    })

    expect(result).toEqual([])
  })

  it('platform admin bypasses permission check but not module check', () => {
    const result = filterNavigation(testItems, {
      hasPermission: () => false,
      isModuleEnabled: () => true,
      isPlatformAdmin: true,
    })

    expect(result).toHaveLength(5)
  })

  it('works with the real DASHBOARD_NAVIGATION', () => {
    const result = filterNavigation(DASHBOARD_NAVIGATION, {
      hasPermission: () => true,
      isModuleEnabled: () => true,
      isPlatformAdmin: false,
    })

    expect(result).toHaveLength(DASHBOARD_NAVIGATION.length)
  })

  it('filters real DASHBOARD_NAVIGATION correctly for limited staff', () => {
    const result = filterNavigation(DASHBOARD_NAVIGATION, {
      hasPermission: (perm) => ['tenants.view', 'payments.view'].includes(perm),
      isModuleEnabled: () => true,
      isPlatformAdmin: false,
    })

    const hrefs = result.map((item) => item.href)
    expect(hrefs).toContain('/tenants')
    expect(hrefs).toContain('/payments')
    expect(hrefs).toContain('/dashboard')
    expect(hrefs).not.toContain('/rooms')
    expect(hrefs).not.toContain('/staff')
  })
})

describe('getPathPermissions', () => {
  it('returns a map of path to permission', () => {
    const result = getPathPermissions(DASHBOARD_NAVIGATION)

    expect(typeof result).toBe('object')
    expect(result['/properties']).toBe('properties.view')
    expect(result['/tenants']).toBe('tenants.view')
    expect(result['/payments']).toBe('payments.view')
  })

  it('excludes paths with null permission', () => {
    const result = getPathPermissions(DASHBOARD_NAVIGATION)

    expect(result['/dashboard']).toBeUndefined()
  })

  it('includes library paths', () => {
    const result = getPathPermissions(DASHBOARD_NAVIGATION)

    expect(result['/library']).toBe('library.view')
    expect(result['/library-members']).toBe('library_members.view')
    expect(result['/library-attendance']).toBe('library_attendance.view')
  })

  it('works with nested children', () => {
    const nestedItems = [
      {
        href: '/parent',
        permission: 'parent.view',
        module: null as ModuleKey | null,
        children: [
          { href: '/parent/child1', permission: 'child1.view', module: null as ModuleKey | null },
          { href: '/parent/child2', permission: 'child2.view', module: null as ModuleKey | null },
          { href: '/parent/child3', permission: null, module: null as ModuleKey | null },
        ],
      },
    ]

    const result = getPathPermissions(nestedItems)

    expect(result['/parent']).toBe('parent.view')
    expect(result['/parent/child1']).toBe('child1.view')
    expect(result['/parent/child2']).toBe('child2.view')
    expect(result['/parent/child3']).toBeUndefined()
  })

  it('returns empty object for empty array', () => {
    const result = getPathPermissions([])
    expect(result).toEqual({})
  })
})

describe('getPathModules', () => {
  it('returns a map of path to module key', () => {
    const result = getPathModules(DASHBOARD_NAVIGATION)

    expect(typeof result).toBe('object')
    expect(result['/expenses']).toBe('expenses')
    expect(result['/visitors']).toBe('visitors')
    expect(result['/meter-readings']).toBe('meters')
  })

  it('excludes paths with null module', () => {
    const result = getPathModules(DASHBOARD_NAVIGATION)

    expect(result['/dashboard']).toBeUndefined()
  })

  it('includes library module keys', () => {
    const result = getPathModules(DASHBOARD_NAVIGATION)

    expect(result['/library']).toBe('members')
    expect(result['/library-members']).toBe('members')
    expect(result['/library-seats']).toBe('seats')
    expect(result['/library-sections']).toBe('sections')
    expect(result['/library-attendance']).toBe('attendance')
  })

  it('works with nested children', () => {
    const nestedItems = [
      {
        href: '/parent',
        permission: null as string | null,
        module: 'expenses' as ModuleKey,
        children: [
          { href: '/parent/child1', permission: null as string | null, module: 'billing' as ModuleKey },
          { href: '/parent/child2', permission: null as string | null, module: null as ModuleKey | null },
        ],
      },
    ]

    const result = getPathModules(nestedItems)

    expect(result['/parent']).toBe('expenses')
    expect(result['/parent/child1']).toBe('billing')
    expect(result['/parent/child2']).toBeUndefined()
  })

  it('returns empty object for empty array', () => {
    const result = getPathModules([])
    expect(result).toEqual({})
  })
})

describe('getPathFeatures (deprecated shim)', () => {
  it('delegates to getPathModules', () => {
    const fromModules = getPathModules(DASHBOARD_NAVIGATION)
    const fromFeatures = getPathFeatures(DASHBOARD_NAVIGATION)
    expect(fromFeatures).toEqual(fromModules)
  })
})

describe('ROUTE_CONFIGS', () => {
  it('is a non-empty object', () => {
    const keys = Object.keys(ROUTE_CONFIGS)
    expect(keys.length).toBeGreaterThan(0)
  })

  it('has valid structure for every route config', () => {
    for (const [path, config] of Object.entries(ROUTE_CONFIGS)) {
      expect(config.path).toBe(path)
      expect(config.title).toBeTruthy()
      expect(config.icon).toBeDefined()
      expect(config.permission === null || typeof config.permission === 'string').toBe(true)
      expect(config.module === null || typeof config.module === 'string').toBe(true)
    }
  })

  it('has consistent data with DASHBOARD_NAVIGATION for shared paths', () => {
    for (const navItem of DASHBOARD_NAVIGATION) {
      const config = ROUTE_CONFIGS[navItem.href]
      if (config) {
        expect(config.permission).toBe(navItem.permission)
        expect(config.module).toBe(navItem.module)
      }
    }
  })
})

describe('getRouteConfig', () => {
  it('returns exact match for known paths', () => {
    const config = getRouteConfig('/tenants')
    expect(config).toBeDefined()
    expect(config!.title).toBe('Tenants')
    expect(config!.permission).toBe('tenants.view')
  })

  it('returns parent route config for detail pages', () => {
    const config = getRouteConfig('/tenants/123')
    expect(config).toBeDefined()
    expect(config!.path).toBe('/tenants')
  })

  it('returns undefined for completely unknown paths', () => {
    const config = getRouteConfig('/nonexistent-page')
    expect(config).toBeUndefined()
  })

  it('returns library config with module key', () => {
    const config = getRouteConfig('/library')
    expect(config).toBeDefined()
    expect(config!.permission).toBe('library.view')
    expect(config!.module).toBe('members')
  })
})

describe('canAccessRoute', () => {
  const allAccess = {
    hasPermission: () => true,
    isModuleEnabled: () => true as boolean,
    isPlatformAdmin: false,
  }

  it('returns true for unknown routes', () => {
    expect(
      canAccessRoute('/nonexistent', {
        hasPermission: () => false,
        isModuleEnabled: () => false,
        isPlatformAdmin: false,
      })
    ).toBe(true)
  })

  it('returns true when user has permission and module is enabled', () => {
    expect(canAccessRoute('/tenants', allAccess)).toBe(true)
  })

  it('returns false when module is disabled', () => {
    expect(
      canAccessRoute('/expenses', {
        hasPermission: () => true,
        isModuleEnabled: () => false,
        isPlatformAdmin: false,
      })
    ).toBe(false)
  })

  it('returns false when user lacks permission', () => {
    expect(
      canAccessRoute('/tenants', {
        hasPermission: () => false,
        isModuleEnabled: () => true,
        isPlatformAdmin: false,
      })
    ).toBe(false)
  })

  it('returns true for platform admin regardless of permission', () => {
    expect(
      canAccessRoute('/tenants', {
        hasPermission: () => false,
        isModuleEnabled: () => true,
        isPlatformAdmin: true,
      })
    ).toBe(true)
  })

  it('returns false for platform admin when module is disabled', () => {
    expect(
      canAccessRoute('/expenses', {
        hasPermission: () => true,
        isModuleEnabled: (m) => m !== 'expenses',
        isPlatformAdmin: true,
      })
    ).toBe(false)
  })

  it('returns true for routes with no permission required', () => {
    expect(
      canAccessRoute('/dashboard', {
        hasPermission: () => false,
        isModuleEnabled: () => true,
        isPlatformAdmin: false,
      })
    ).toBe(true)
  })

  it('checks module for activity log (null permission, has module)', () => {
    expect(
      canAccessRoute('/activity', {
        hasPermission: () => false,
        isModuleEnabled: (m) => m === 'activityLog',
        isPlatformAdmin: false,
      })
    ).toBe(true)

    expect(
      canAccessRoute('/activity', {
        hasPermission: () => false,
        isModuleEnabled: () => false,
        isPlatformAdmin: false,
      })
    ).toBe(false)
  })

  it('works for detail page paths', () => {
    expect(
      canAccessRoute('/tenants/some-id', {
        hasPermission: (p) => p === 'tenants.view',
        isModuleEnabled: () => true,
        isPlatformAdmin: false,
      })
    ).toBe(true)
  })
})
