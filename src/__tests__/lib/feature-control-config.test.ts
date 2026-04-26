import {
  DOMAIN_MODULES,
  getModuleFeatureKeys,
  isModuleFullyEnabled,
  isModulePartiallyEnabled,
  getDependentFeatures,
  countEnabledFeatures,
  type CoreModule,
  type DomainModule,
} from '@/lib/features/feature-control-config'
import type { FeatureFlagKey } from '@/lib/features'

// ============================================================
// DOMAIN_MODULES structure
// ============================================================

describe('DOMAIN_MODULES', () => {
  it('exports exactly 3 domains', () => {
    expect(DOMAIN_MODULES).toHaveLength(3)
  })

  it('domains have expected ids in order', () => {
    const ids = DOMAIN_MODULES.map((d) => d.id)
    expect(ids).toEqual(['pg', 'library', 'platform'])
  })

  it('every domain has required fields', () => {
    for (const domain of DOMAIN_MODULES) {
      expect(typeof domain.id).toBe('string')
      expect(typeof domain.name).toBe('string')
      expect(typeof domain.description).toBe('string')
      expect(typeof domain.tagline).toBe('string')
      expect(Array.isArray(domain.modules)).toBe(true)
      expect(domain.modules.length).toBeGreaterThan(0)
    }
  })

  it('every module has required fields', () => {
    for (const domain of DOMAIN_MODULES) {
      for (const mod of domain.modules) {
        expect(typeof mod.id).toBe('string')
        expect(typeof mod.name).toBe('string')
        expect(typeof mod.description).toBe('string')
        expect(Array.isArray(mod.features)).toBe(true)
        expect(mod.features.length).toBeGreaterThan(0)
      }
    }
  })

  it('every feature has key, name, and description', () => {
    for (const domain of DOMAIN_MODULES) {
      for (const mod of domain.modules) {
        for (const feature of mod.features) {
          expect(typeof feature.key).toBe('string')
          expect(typeof feature.name).toBe('string')
          expect(typeof feature.description).toBe('string')
        }
      }
    }
  })

  it('PG domain has 5 modules', () => {
    const pg = DOMAIN_MODULES.find((d) => d.id === 'pg')!
    expect(pg.modules).toHaveLength(5)
  })

  it('Library domain has 1 module with the library flag', () => {
    const lib = DOMAIN_MODULES.find((d) => d.id === 'library')!
    expect(lib.modules).toHaveLength(1)
    expect(lib.modules[0].features.some((f) => f.key === 'library')).toBe(true)
  })

  it('Platform domain has 2 modules', () => {
    const platform = DOMAIN_MODULES.find((d) => d.id === 'platform')!
    expect(platform.modules).toHaveLength(2)
  })

  it('total feature count across all domains is 17', () => {
    let count = 0
    for (const domain of DOMAIN_MODULES) {
      for (const mod of domain.modules) {
        count += mod.features.length
      }
    }
    expect(count).toBe(17)
  })

  it('no duplicate feature keys across all domains', () => {
    const keys: string[] = []
    for (const domain of DOMAIN_MODULES) {
      for (const mod of domain.modules) {
        for (const feature of mod.features) {
          keys.push(feature.key)
        }
      }
    }
    const unique = new Set(keys)
    expect(unique.size).toBe(keys.length)
  })
})

// ============================================================
// getModuleFeatureKeys
// ============================================================

describe('getModuleFeatureKeys', () => {
  const mockModule: CoreModule = {
    id: 'test',
    name: 'Test',
    description: 'Test module',
    features: [
      { key: 'approvals', name: 'Approvals', description: '' },
      { key: 'food', name: 'Food', description: '' },
    ],
  }

  it('returns all feature keys from a module', () => {
    expect(getModuleFeatureKeys(mockModule)).toEqual(['approvals', 'food'])
  })

  it('returns empty array for module with no features', () => {
    const empty: CoreModule = { ...mockModule, features: [] }
    expect(getModuleFeatureKeys(empty)).toEqual([])
  })
})

// ============================================================
// isModuleFullyEnabled
// ============================================================

describe('isModuleFullyEnabled', () => {
  const billingMod: CoreModule = {
    id: 'billing',
    name: 'Billing',
    description: '',
    features: [
      { key: 'autoBilling', name: 'Auto Billing', description: '' },
      { key: 'expenses', name: 'Expenses', description: '' },
    ],
  }

  it('returns true when all features are absent from flags (treated as enabled by default)', () => {
    expect(isModuleFullyEnabled(billingMod, {})).toBe(true)
  })

  it('returns true when all features are explicitly true', () => {
    expect(isModuleFullyEnabled(billingMod, { autoBilling: true, expenses: true })).toBe(true)
  })

  it('returns false when any feature is explicitly false', () => {
    expect(isModuleFullyEnabled(billingMod, { autoBilling: false, expenses: true })).toBe(false)
  })

  it('returns false when all features are disabled', () => {
    expect(isModuleFullyEnabled(billingMod, { autoBilling: false, expenses: false })).toBe(false)
  })
})

// ============================================================
// isModulePartiallyEnabled
// ============================================================

describe('isModulePartiallyEnabled', () => {
  const opsMod: CoreModule = {
    id: 'ops',
    name: 'Operations',
    description: '',
    features: [
      { key: 'approvals', name: 'Approvals', description: '' },
      { key: 'food', name: 'Food', description: '' },
    ],
  }

  it('returns true when all features are missing from flags (defaults to on)', () => {
    expect(isModulePartiallyEnabled(opsMod, {})).toBe(true)
  })

  it('returns true when at least one feature is enabled', () => {
    expect(isModulePartiallyEnabled(opsMod, { approvals: true, food: false })).toBe(true)
  })

  it('returns false when all features are explicitly false', () => {
    expect(isModulePartiallyEnabled(opsMod, { approvals: false, food: false })).toBe(false)
  })
})

// ============================================================
// getDependentFeatures
// ============================================================

describe('getDependentFeatures', () => {
  const domain: DomainModule = {
    id: 'pg',
    name: 'PG',
    description: '',
    tagline: '',
    modules: [
      {
        id: 'mod1',
        name: 'Mod 1',
        description: '',
        features: [
          { key: 'autoBilling', name: 'Auto Billing', description: '' },
          {
            key: 'emailReminders',
            name: 'Email Reminders',
            description: '',
            dependsOn: ['autoBilling'],
          },
          {
            key: 'whatsappSummaries',
            name: 'WhatsApp',
            description: '',
            dependsOn: ['autoBilling'],
          },
        ],
      },
      {
        id: 'mod2',
        name: 'Mod 2',
        description: '',
        features: [{ key: 'library', name: 'Library', description: '' }],
      },
    ],
  }

  it('returns features that depend on the given key', () => {
    const dependents = getDependentFeatures('autoBilling', domain)
    expect(dependents).toHaveLength(2)
    expect(dependents.map((d) => d.key)).toContain('emailReminders')
    expect(dependents.map((d) => d.key)).toContain('whatsappSummaries')
  })

  it('returns empty array when no features depend on the key', () => {
    const dependents = getDependentFeatures('library', domain)
    expect(dependents).toHaveLength(0)
  })

  it('searches across all modules in the domain', () => {
    const crossDomain: DomainModule = {
      ...domain,
      modules: [
        ...domain.modules,
        {
          id: 'mod3',
          name: 'Mod 3',
          description: '',
          features: [
            {
              key: 'reports',
              name: 'Reports',
              description: '',
              dependsOn: ['autoBilling'],
            },
          ],
        },
      ],
    }
    const dependents = getDependentFeatures('autoBilling', crossDomain)
    expect(dependents).toHaveLength(3)
  })

  it('returns empty for a key with no dependsOn defined anywhere', () => {
    expect(getDependentFeatures('demoMode' as FeatureFlagKey, domain)).toHaveLength(0)
  })
})

// ============================================================
// countEnabledFeatures
// ============================================================

describe('countEnabledFeatures', () => {
  it('counts all as enabled when flags is empty (defaults to on)', () => {
    const { enabled, total } = countEnabledFeatures({})
    expect(total).toBe(17)
    expect(enabled).toBe(17)
  })

  it('counts correctly when some features are disabled', () => {
    const { enabled, total } = countEnabledFeatures({
      approvals: false,
      food: false,
      library: false,
    })
    expect(total).toBe(17)
    expect(enabled).toBe(14) // 17 - 3 disabled
  })

  it('counts zero enabled when all known flags are false', () => {
    const allOff: Record<string, boolean> = {}
    for (const domain of DOMAIN_MODULES) {
      for (const mod of domain.modules) {
        for (const feature of mod.features) {
          allOff[feature.key] = false
        }
      }
    }
    const { enabled, total } = countEnabledFeatures(allOff)
    expect(total).toBe(17)
    expect(enabled).toBe(0)
  })

  it('ignores unknown keys in flags', () => {
    const { total } = countEnabledFeatures({ unknownKey: true, anotherKey: false })
    expect(total).toBe(17)
  })
})
