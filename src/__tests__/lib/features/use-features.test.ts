/**
 * Tests for feature flags system
 *
 * Tests the pure functions from the features index module
 * (getDefaultFeatureFlags, isFeatureEnabled, getFeaturesByCategory, featureDisabledError,
 * checkFeatureEnabled) and the cache invalidation from use-features.
 */

import {
  FEATURE_FLAGS,
  getDefaultFeatureFlags,
  isFeatureEnabled,
  getFeaturesByCategory,
  CATEGORY_LABELS,
  featureDisabledError,
  checkFeatureEnabled,
} from '@/lib/features/index'

import type { FeatureFlags, FeatureFlagKey } from '@/lib/features/index'

describe('Feature Flags System', () => {
  describe('FEATURE_FLAGS', () => {
    it('is defined', () => {
      expect(FEATURE_FLAGS).toBeDefined()
    })

    it('contains expected feature keys', () => {
      const expectedKeys: FeatureFlagKey[] = [
        'approvals',
        'architectureView',
        'food',
        'whatsappSummaries',
        'meterReadings',
        'publicWebsite',
        'exitClearance',
        'visitors',
        'notices',
        'complaints',
        'expenses',
        'reports',
        'activityLog',
        'autoBilling',
        'emailReminders',
        'demoMode',
        'library',
      ]

      expectedKeys.forEach((key) => {
        expect(FEATURE_FLAGS).toHaveProperty(key)
      })
    })

    it('each feature has required properties', () => {
      Object.entries(FEATURE_FLAGS).forEach(([, config]) => {
        expect(config).toHaveProperty('key')
        expect(config).toHaveProperty('name')
        expect(config).toHaveProperty('description')
        expect(config).toHaveProperty('defaultEnabled')
        expect(config).toHaveProperty('category')
        expect(typeof config.key).toBe('string')
        expect(typeof config.name).toBe('string')
        expect(typeof config.description).toBe('string')
        expect(typeof config.defaultEnabled).toBe('boolean')
        expect(typeof config.category).toBe('string')
      })
    })

    it('feature keys match their key property', () => {
      Object.entries(FEATURE_FLAGS).forEach(([key, config]) => {
        expect(config.key).toBe(key)
      })
    })

    it('core features are enabled by default', () => {
      const coreFeatures: FeatureFlagKey[] = [
        'approvals',
        'architectureView',
        'meterReadings',
        'publicWebsite',
        'exitClearance',
        'visitors',
        'notices',
        'complaints',
        'expenses',
        'reports',
        'activityLog',
        'library',
      ]

      coreFeatures.forEach((key) => {
        expect(FEATURE_FLAGS[key].defaultEnabled).toBe(true)
      })
    })

    it('optional features are disabled by default', () => {
      expect(FEATURE_FLAGS.food.defaultEnabled).toBe(false)
      expect(FEATURE_FLAGS.whatsappSummaries.defaultEnabled).toBe(false)
      expect(FEATURE_FLAGS.demoMode.defaultEnabled).toBe(false)
    })
  })

  describe('getDefaultFeatureFlags', () => {
    it('returns an object with all feature keys', () => {
      const defaults = getDefaultFeatureFlags()

      Object.keys(FEATURE_FLAGS).forEach((key) => {
        expect(defaults).toHaveProperty(key)
      })
    })

    it('returns correct default values', () => {
      const defaults = getDefaultFeatureFlags()

      expect(defaults.approvals).toBe(true)
      expect(defaults.food).toBe(false)
      expect(defaults.whatsappSummaries).toBe(false)
      expect(defaults.demoMode).toBe(false)
      expect(defaults.library).toBe(true)
      expect(defaults.expenses).toBe(true)
    })

    it('returns a new object each time', () => {
      const defaults1 = getDefaultFeatureFlags()
      const defaults2 = getDefaultFeatureFlags()

      expect(defaults1).not.toBe(defaults2)
      expect(defaults1).toEqual(defaults2)
    })

    it('all values are booleans', () => {
      const defaults = getDefaultFeatureFlags()

      Object.values(defaults).forEach((value) => {
        expect(typeof value).toBe('boolean')
      })
    })
  })

  describe('isFeatureEnabled', () => {
    it('returns true for enabled features', () => {
      const flags: FeatureFlags = { approvals: true, food: false }

      expect(isFeatureEnabled(flags, 'approvals')).toBe(true)
    })

    it('returns false for disabled features', () => {
      const flags: FeatureFlags = { approvals: true, food: false }

      expect(isFeatureEnabled(flags, 'food')).toBe(false)
    })

    it('falls back to default when feature not in flags', () => {
      const flags: FeatureFlags = {}

      // approvals defaults to true
      expect(isFeatureEnabled(flags, 'approvals')).toBe(true)
      // food defaults to false
      expect(isFeatureEnabled(flags, 'food')).toBe(false)
    })

    it('falls back to default when flags is undefined', () => {
      expect(isFeatureEnabled(undefined, 'approvals')).toBe(true)
      expect(isFeatureEnabled(undefined, 'food')).toBe(false)
    })

    it('overrides default when flag is explicitly set', () => {
      // food defaults to false, but override to true
      const flags: FeatureFlags = { food: true }
      expect(isFeatureEnabled(flags, 'food')).toBe(true)

      // approvals defaults to true, but override to false
      const flags2: FeatureFlags = { approvals: false }
      expect(isFeatureEnabled(flags2, 'approvals')).toBe(false)
    })

    it('handles complete flags object', () => {
      const flags = getDefaultFeatureFlags()
      flags.food = true
      flags.demoMode = true

      expect(isFeatureEnabled(flags, 'food')).toBe(true)
      expect(isFeatureEnabled(flags, 'demoMode')).toBe(true)
      expect(isFeatureEnabled(flags, 'approvals')).toBe(true)
    })
  })

  describe('getFeaturesByCategory', () => {
    it('returns categories as an object', () => {
      const categories = getFeaturesByCategory()

      expect(typeof categories).toBe('object')
      expect(categories).not.toBeNull()
    })

    it('contains core category', () => {
      const categories = getFeaturesByCategory()

      expect(categories).toHaveProperty('core')
      expect(Array.isArray(categories.core)).toBe(true)
      expect(categories.core.length).toBeGreaterThan(0)
    })

    it('contains optional category', () => {
      const categories = getFeaturesByCategory()

      expect(categories).toHaveProperty('optional')
      expect(Array.isArray(categories.optional)).toBe(true)
      expect(categories.optional.length).toBeGreaterThan(0)
    })

    it('contains billing category', () => {
      const categories = getFeaturesByCategory()

      expect(categories).toHaveProperty('billing')
      expect(Array.isArray(categories.billing)).toBe(true)
    })

    it('contains notifications category', () => {
      const categories = getFeaturesByCategory()

      expect(categories).toHaveProperty('notifications')
      expect(Array.isArray(categories.notifications)).toBe(true)
    })

    it('contains special category', () => {
      const categories = getFeaturesByCategory()

      expect(categories).toHaveProperty('special')
      expect(Array.isArray(categories.special)).toBe(true)
    })

    it('total features across categories equals total FEATURE_FLAGS', () => {
      const categories = getFeaturesByCategory()
      const totalInCategories = Object.values(categories).reduce(
        (sum: number, features) => sum + features.length,
        0
      )

      expect(totalInCategories).toBe(Object.keys(FEATURE_FLAGS).length)
    })

    it('food is in optional category', () => {
      const categories = getFeaturesByCategory()

      const optionalKeys = categories.optional.map((f) => f.key)
      expect(optionalKeys).toContain('food')
    })

    it('autoBilling is in billing category', () => {
      const categories = getFeaturesByCategory()

      const billingKeys = categories.billing.map((f) => f.key)
      expect(billingKeys).toContain('autoBilling')
    })

    it('demoMode is in special category', () => {
      const categories = getFeaturesByCategory()

      const specialKeys = categories.special.map((f) => f.key)
      expect(specialKeys).toContain('demoMode')
    })
  })

  describe('CATEGORY_LABELS', () => {
    it('is defined', () => {
      expect(CATEGORY_LABELS).toBeDefined()
    })

    it('has labels for all categories used', () => {
      expect(CATEGORY_LABELS.core).toBe('Core Features')
      expect(CATEGORY_LABELS.optional).toBe('Optional Features')
      expect(CATEGORY_LABELS.billing).toBe('Billing & Payments')
      expect(CATEGORY_LABELS.notifications).toBe('Notifications')
      expect(CATEGORY_LABELS.special).toBe('Special Features')
    })

    it('all labels are non-empty strings', () => {
      Object.values(CATEGORY_LABELS).forEach((label) => {
        expect(typeof label).toBe('string')
        expect(label.length).toBeGreaterThan(0)
      })
    })

    it('has a label for every category used in FEATURE_FLAGS', () => {
      const usedCategories = new Set(
        Object.values(FEATURE_FLAGS).map((f) => f.category)
      )

      usedCategories.forEach((category) => {
        expect(CATEGORY_LABELS).toHaveProperty(category)
      })
    })
  })

  describe('featureDisabledError', () => {
    it('returns error object with correct structure', () => {
      const result = featureDisabledError('food')

      expect(result).toHaveProperty('error')
      expect(result).toHaveProperty('code')
      expect(result).toHaveProperty('feature')
    })

    it('returns FEATURE_DISABLED code', () => {
      const result = featureDisabledError('food')

      expect(result.code).toBe('FEATURE_DISABLED')
    })

    it('includes feature key', () => {
      const result = featureDisabledError('food')

      expect(result.feature).toBe('food')
    })

    it('includes feature name in error message', () => {
      const result = featureDisabledError('food')

      expect(result.error).toContain('Food & Meals')
    })

    it('works for different features', () => {
      const approvalResult = featureDisabledError('approvals')
      expect(approvalResult.feature).toBe('approvals')
      expect(approvalResult.error).toContain('Approvals Hub')

      const libraryResult = featureDisabledError('library')
      expect(libraryResult.feature).toBe('library')
      expect(libraryResult.error).toContain('Library Management')
    })

    it('error message follows expected format', () => {
      const result = featureDisabledError('demoMode')

      expect(result.error).toMatch(/The ".*" feature is not enabled for this workspace/)
    })
  })

  describe('checkFeatureEnabled', () => {
    function makeSupabase(result: unknown) {
      const proxy: Record<string, jest.Mock> = {}
      proxy.from = jest.fn().mockReturnValue(proxy)
      proxy.select = jest.fn().mockReturnValue(proxy)
      proxy.eq = jest.fn().mockReturnValue(proxy)
      proxy.single = jest.fn().mockResolvedValue(result)
      return proxy as unknown as import('@supabase/supabase-js').SupabaseClient
    }

    it('returns true when feature flag is enabled in workspace settings', async () => {
      const supabase = makeSupabase({ data: { settings: { features: { food: true } } }, error: null })
      const result = await checkFeatureEnabled(supabase, 'ws-1', 'food')
      expect(result).toBe(true)
    })

    it('returns false when feature flag is disabled in workspace settings', async () => {
      const supabase = makeSupabase({ data: { settings: { features: { approvals: false } } }, error: null })
      const result = await checkFeatureEnabled(supabase, 'ws-1', 'approvals')
      expect(result).toBe(false)
    })

    it('falls back to default when feature not in settings', async () => {
      const supabase = makeSupabase({ data: { settings: { features: {} } }, error: null })
      // approvals defaults to true
      expect(await checkFeatureEnabled(supabase, 'ws-1', 'approvals')).toBe(true)
      // food defaults to false
      expect(await checkFeatureEnabled(supabase, 'ws-1', 'food')).toBe(false)
    })

    it('falls back to default when workspace not found (error)', async () => {
      const supabase = makeSupabase({ data: null, error: { message: 'not found' } })
      // approvals defaults to true
      expect(await checkFeatureEnabled(supabase, 'ws-missing', 'approvals')).toBe(true)
    })

    it('falls back to default when workspace data is null', async () => {
      const supabase = makeSupabase({ data: null, error: null })
      expect(await checkFeatureEnabled(supabase, 'ws-1', 'food')).toBe(false)
    })

    it('falls back to default when settings.features is null', async () => {
      const supabase = makeSupabase({ data: { settings: null }, error: null })
      expect(await checkFeatureEnabled(supabase, 'ws-1', 'approvals')).toBe(true)
    })

    it('returns false on thrown exception (fallback)', async () => {
      const proxy = {
        from: jest.fn().mockImplementation(() => { throw new Error('db crash') }),
      } as unknown as import('@supabase/supabase-js').SupabaseClient
      // food defaults to false
      expect(await checkFeatureEnabled(proxy, 'ws-1', 'food')).toBe(false)
    })
  })

  describe('invalidateFeatureCache', () => {
    it('is exported and callable', async () => {
      const { invalidateFeatureCache } = await import('@/lib/features/use-features')

      expect(typeof invalidateFeatureCache).toBe('function')
      expect(() => invalidateFeatureCache()).not.toThrow()
    })

    it('can be called multiple times without error', async () => {
      const { invalidateFeatureCache } = await import('@/lib/features/use-features')

      expect(() => {
        invalidateFeatureCache()
        invalidateFeatureCache()
        invalidateFeatureCache()
      }).not.toThrow()
    })
  })
})
