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
  getPathFeatures,
  getRouteConfig,
  canAccessRoute,
  type NavItem,
} from '@/lib/navigation/config'
import type { FeatureFlagKey } from '@/lib/features'

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
      // permission can be string or null
      expect(item.permission === null || typeof item.permission === 'string').toBe(true)
      // feature can be a feature flag key or null
      expect(item.feature === null || typeof item.feature === 'string').toBe(true)
    }
  })

  it('contains the Dashboard item with no permission required', () => {
    const dashboard = DASHBOARD_NAVIGATION.find((item) => item.href === '/dashboard')
    expect(dashboard).toBeDefined()
    expect(dashboard!.permission).toBeNull()
    expect(dashboard!.feature).toBeNull()
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

  it('has all library items gated behind the "library" feature flag', () => {
    const libraryItems = DASHBOARD_NAVIGATION.filter(
      (item) => item.href.startsWith('/library')
    )

    expect(libraryItems.length).toBeGreaterThan(0)
    for (const item of libraryItems) {
      expect(item.feature).toBe('library')
    }
  })

  it('has dividerBefore on the first library item', () => {
    const libraryItem = DASHBOARD_NAVIGATION.find((item) => item.href === '/library')
    expect(libraryItem).toBeDefined()
    expect(libraryItem!.dividerBefore).toBe(true)
  })

  it('contains feature-flagged items', () => {
    const featureFlaggedItems = DASHBOARD_NAVIGATION.filter(
      (item) => item.feature !== null
    )
    expect(featureFlaggedItems.length).toBeGreaterThan(0)
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
  // Create a minimal set of test nav items
  const testItems: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: {} as any, permission: null, feature: null },
    { name: 'Tenants', href: '/tenants', icon: {} as any, permission: 'tenants.view', feature: null },
    { name: 'Expenses', href: '/expenses', icon: {} as any, permission: 'expenses.view', feature: 'expenses' as FeatureFlagKey },
    { name: 'Visitors', href: '/visitors', icon: {} as any, permission: 'visitors.view', feature: 'visitors' as FeatureFlagKey },
    { name: 'Activity Log', href: '/activity', icon: {} as any, permission: null, feature: 'activityLog' as FeatureFlagKey },
  ]

  it('shows all items for platform admin with all features enabled', () => {
    const result = filterNavigation(testItems, {
      hasPermission: () => true,
      isFeatureEnabled: () => true,
      isPlatformAdmin: true,
    })

    expect(result).toHaveLength(5)
  })

  it('hides feature-disabled items even for platform admin', () => {
    const result = filterNavigation(testItems, {
      hasPermission: () => true,
      isFeatureEnabled: (feature) => feature !== 'expenses',
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
      isFeatureEnabled: () => true,
      isPlatformAdmin: false,
    })

    const hrefs = result.map((item) => item.href)
    expect(hrefs).toContain('/dashboard')
    expect(hrefs).toContain('/activity')
  })

  it('hides items when user lacks permission', () => {
    const result = filterNavigation(testItems, {
      hasPermission: (perm) => perm === 'tenants.view',
      isFeatureEnabled: () => true,
      isPlatformAdmin: false,
    })

    const hrefs = result.map((item) => item.href)
    expect(hrefs).toContain('/dashboard')
    expect(hrefs).toContain('/tenants')
    expect(hrefs).not.toContain('/expenses')
    expect(hrefs).not.toContain('/visitors')
    expect(hrefs).toContain('/activity') // no permission needed
  })

  it('hides items when feature is disabled even if user has permission', () => {
    const result = filterNavigation(testItems, {
      hasPermission: () => true,
      isFeatureEnabled: (feature) => feature !== 'visitors',
      isPlatformAdmin: false,
    })

    const hrefs = result.map((item) => item.href)
    expect(hrefs).not.toContain('/visitors')
    expect(hrefs).toContain('/expenses')
  })

  it('both feature and permission must pass for an item to show', () => {
    const result = filterNavigation(testItems, {
      hasPermission: (perm) => perm === 'expenses.view',
      isFeatureEnabled: (feature) => feature === 'expenses',
      isPlatformAdmin: false,
    })

    const hrefs = result.map((item) => item.href)
    expect(hrefs).toContain('/dashboard') // no perm, no feature
    expect(hrefs).not.toContain('/tenants') // has perm check, user lacks it
    expect(hrefs).toContain('/expenses') // feature enabled + has permission
    expect(hrefs).not.toContain('/visitors') // feature disabled
    expect(hrefs).not.toContain('/activity') // feature disabled
  })

  it('returns empty array when all items are filtered out', () => {
    // Use items that all require either a feature or permission
    const restrictedItems: NavItem[] = [
      { name: 'Tenants', href: '/tenants', icon: {} as any, permission: 'tenants.view', feature: null },
      { name: 'Expenses', href: '/expenses', icon: {} as any, permission: 'expenses.view', feature: 'expenses' as FeatureFlagKey },
    ]

    const result = filterNavigation(restrictedItems, {
      hasPermission: () => false,
      isFeatureEnabled: () => false,
      isPlatformAdmin: false,
    })

    expect(result).toEqual([])
  })

  it('platform admin bypasses permission check but not feature check', () => {
    const result = filterNavigation(testItems, {
      hasPermission: () => false, // would normally deny all
      isFeatureEnabled: () => true,
      isPlatformAdmin: true,
    })

    // Platform admin sees everything (features are all enabled)
    expect(result).toHaveLength(5)
  })

  it('works with the real DASHBOARD_NAVIGATION', () => {
    const result = filterNavigation(DASHBOARD_NAVIGATION, {
      hasPermission: () => true,
      isFeatureEnabled: () => true,
      isPlatformAdmin: false,
    })

    // All items should be visible when all permissions and features are available
    expect(result).toHaveLength(DASHBOARD_NAVIGATION.length)
  })

  it('filters real DASHBOARD_NAVIGATION correctly for limited staff', () => {
    const result = filterNavigation(DASHBOARD_NAVIGATION, {
      hasPermission: (perm) => ['tenants.view', 'payments.view'].includes(perm),
      isFeatureEnabled: () => true,
      isPlatformAdmin: false,
    })

    const hrefs = result.map((item) => item.href)
    // Should include items with matching permissions
    expect(hrefs).toContain('/tenants')
    expect(hrefs).toContain('/payments')
    // Should include items with null permission
    expect(hrefs).toContain('/dashboard')
    // Should not include items needing other permissions
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

    // Dashboard has null permission, should not be in the map
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
        feature: null,
        children: [
          { href: '/parent/child1', permission: 'child1.view', feature: null },
          { href: '/parent/child2', permission: 'child2.view', feature: null },
          { href: '/parent/child3', permission: null, feature: null },
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

describe('getPathFeatures', () => {
  it('returns a map of path to feature flag', () => {
    const result = getPathFeatures(DASHBOARD_NAVIGATION)

    expect(typeof result).toBe('object')
    expect(result['/expenses']).toBe('expenses')
    expect(result['/visitors']).toBe('visitors')
    expect(result['/meter-readings']).toBe('meterReadings')
  })

  it('excludes paths with null feature', () => {
    const result = getPathFeatures(DASHBOARD_NAVIGATION)

    // Items without feature flags should not be in the map
    expect(result['/dashboard']).toBeUndefined()
    expect(result['/properties']).toBeUndefined()
    expect(result['/rooms']).toBeUndefined()
  })

  it('includes library feature flags', () => {
    const result = getPathFeatures(DASHBOARD_NAVIGATION)

    expect(result['/library']).toBe('library')
    expect(result['/library-members']).toBe('library')
    expect(result['/library-seats']).toBe('library')
  })

  it('works with nested children', () => {
    const nestedItems = [
      {
        href: '/parent',
        permission: null,
        feature: 'parentFeature' as FeatureFlagKey,
        children: [
          { href: '/parent/child1', permission: null, feature: 'childFeature' as FeatureFlagKey },
          { href: '/parent/child2', permission: null, feature: null },
        ],
      },
    ]

    const result = getPathFeatures(nestedItems)

    expect(result['/parent']).toBe('parentFeature')
    expect(result['/parent/child1']).toBe('childFeature')
    expect(result['/parent/child2']).toBeUndefined()
  })

  it('returns empty object for empty array', () => {
    const result = getPathFeatures([])
    expect(result).toEqual({})
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
      expect(config.feature === null || typeof config.feature === 'string').toBe(true)
    }
  })

  it('has consistent data with DASHBOARD_NAVIGATION for shared paths', () => {
    // Check that route configs match navigation for overlapping entries
    for (const navItem of DASHBOARD_NAVIGATION) {
      const config = ROUTE_CONFIGS[navItem.href]
      if (config) {
        expect(config.permission).toBe(navItem.permission)
        expect(config.feature).toBe(navItem.feature)
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

  it('returns library config', () => {
    const config = getRouteConfig('/library')
    expect(config).toBeDefined()
    expect(config!.permission).toBe('library.view')
    expect(config!.feature).toBe('library')
  })
})

describe('canAccessRoute', () => {
  const allAccess = {
    hasPermission: () => true,
    isFeatureEnabled: () => true as boolean,
    isPlatformAdmin: false,
  }

  it('returns true for unknown routes', () => {
    expect(
      canAccessRoute('/nonexistent', {
        hasPermission: () => false,
        isFeatureEnabled: () => false,
        isPlatformAdmin: false,
      })
    ).toBe(true)
  })

  it('returns true when user has permission and feature is enabled', () => {
    expect(canAccessRoute('/tenants', allAccess)).toBe(true)
  })

  it('returns false when feature is disabled', () => {
    expect(
      canAccessRoute('/expenses', {
        hasPermission: () => true,
        isFeatureEnabled: () => false,
        isPlatformAdmin: false,
      })
    ).toBe(false)
  })

  it('returns false when user lacks permission', () => {
    expect(
      canAccessRoute('/tenants', {
        hasPermission: () => false,
        isFeatureEnabled: () => true,
        isPlatformAdmin: false,
      })
    ).toBe(false)
  })

  it('returns true for platform admin regardless of permission', () => {
    expect(
      canAccessRoute('/tenants', {
        hasPermission: () => false,
        isFeatureEnabled: () => true,
        isPlatformAdmin: true,
      })
    ).toBe(true)
  })

  it('returns false for platform admin when feature is disabled', () => {
    expect(
      canAccessRoute('/expenses', {
        hasPermission: () => true,
        isFeatureEnabled: (f) => f !== 'expenses',
        isPlatformAdmin: true,
      })
    ).toBe(false)
  })

  it('returns true for routes with no permission required', () => {
    expect(
      canAccessRoute('/dashboard', {
        hasPermission: () => false,
        isFeatureEnabled: () => true,
        isPlatformAdmin: false,
      })
    ).toBe(true)
  })

  it('checks feature for activity log (null permission, has feature)', () => {
    expect(
      canAccessRoute('/activity', {
        hasPermission: () => false,
        isFeatureEnabled: (f) => f === 'activityLog',
        isPlatformAdmin: false,
      })
    ).toBe(true)

    expect(
      canAccessRoute('/activity', {
        hasPermission: () => false,
        isFeatureEnabled: () => false,
        isPlatformAdmin: false,
      })
    ).toBe(false)
  })

  it('works for detail page paths', () => {
    expect(
      canAccessRoute('/tenants/some-id', {
        hasPermission: (p) => p === 'tenants.view',
        isFeatureEnabled: () => true,
        isPlatformAdmin: false,
      })
    ).toBe(true)
  })
})
