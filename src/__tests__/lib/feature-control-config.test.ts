/**
 * Tests for the new modules catalog system (replaces feature-control-config)
 */

import { MODULES_CATALOG, MODULE_MAP, ALL_MODULE_KEYS } from '@/lib/features/modules-catalog'
import { isModuleEnabled, isFeatureEnabled, enableModule, disableModule, toggleFeature, migrateOldFlagsToModuleConfig, isOldFlatFormat, countEnabledModules } from '@/lib/features/checks'
import type { ModuleKey, WorkspaceModuleConfig } from '@/lib/features/types'

// ============================================================
// MODULES_CATALOG structure
// ============================================================

describe('MODULES_CATALOG', () => {
  it('exports exactly 28 modules', () => {
    expect(MODULES_CATALOG).toHaveLength(28)
  })

  it('every module has required fields', () => {
    for (const mod of MODULES_CATALOG) {
      expect(typeof mod.key).toBe('string')
      expect(typeof mod.name).toBe('string')
      expect(typeof mod.description).toBe('string')
      expect(Array.isArray(mod.features)).toBe(true)
    }
  })

  it('every feature has key, name, and description', () => {
    for (const mod of MODULES_CATALOG) {
      for (const feature of mod.features) {
        expect(typeof feature.key).toBe('string')
        expect(typeof feature.name).toBe('string')
        expect(typeof feature.description).toBe('string')
      }
    }
  })

  it('no duplicate module keys', () => {
    const keys = MODULES_CATALOG.map((m) => m.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('includes all 28 expected module keys', () => {
    const expectedKeys: ModuleKey[] = [
      'properties', 'rooms', 'tenants', 'members', 'people',
      'billing', 'payments', 'refunds', 'subscriptions', 'plans',
      'expenses', 'meters', 'attendance', 'seats', 'sections',
      'lockers', 'waitlist', 'complaints', 'notices', 'visitors',
      'staff', 'reports', 'approvals', 'exitClearance', 'activityLog', 'inquiries',
      'businesses', 'locations',
    ]
    for (const key of expectedKeys) {
      expect(MODULES_CATALOG.some((m) => m.key === key)).toBe(true)
    }
  })
})

// ============================================================
// MODULE_MAP
// ============================================================

describe('MODULE_MAP', () => {
  it('has an entry for every module', () => {
    for (const mod of MODULES_CATALOG) {
      expect(MODULE_MAP.has(mod.key)).toBe(true)
    }
  })

  it('returns correct definition for a known key', () => {
    const def = MODULE_MAP.get('expenses')
    expect(def?.name).toBe('Expenses')
  })
})

// ============================================================
// ALL_MODULE_KEYS
// ============================================================

describe('ALL_MODULE_KEYS', () => {
  it('has same length as MODULES_CATALOG', () => {
    expect(ALL_MODULE_KEYS).toHaveLength(MODULES_CATALOG.length)
  })
})

// ============================================================
// isModuleEnabled
// ============================================================

describe('isModuleEnabled', () => {
  it('returns false for empty config', () => {
    expect(isModuleEnabled({}, 'expenses')).toBe(false)
  })

  it('returns false for null config', () => {
    expect(isModuleEnabled(null, 'expenses')).toBe(false)
  })

  it('returns true when module is enabled', () => {
    const config: WorkspaceModuleConfig = { expenses: { enabled: true, features: {} } }
    expect(isModuleEnabled(config, 'expenses')).toBe(true)
  })

  it('returns false when module is explicitly disabled', () => {
    const config: WorkspaceModuleConfig = { expenses: { enabled: false, features: {} } }
    expect(isModuleEnabled(config, 'expenses')).toBe(false)
  })
})

// ============================================================
// isFeatureEnabled
// ============================================================

describe('isFeatureEnabled', () => {
  it('returns false when module is disabled', () => {
    const config: WorkspaceModuleConfig = { billing: { enabled: false, features: { autoBilling: true } } }
    expect(isFeatureEnabled(config, 'billing', 'autoBilling')).toBe(false)
  })

  it('returns false when feature is not set', () => {
    const config: WorkspaceModuleConfig = { billing: { enabled: true, features: {} } }
    expect(isFeatureEnabled(config, 'billing', 'autoBilling')).toBe(false)
  })

  it('returns true when module is enabled and feature is true', () => {
    const config: WorkspaceModuleConfig = { billing: { enabled: true, features: { autoBilling: true } } }
    expect(isFeatureEnabled(config, 'billing', 'autoBilling')).toBe(true)
  })
})

// ============================================================
// enableModule / disableModule
// ============================================================

describe('enableModule', () => {
  it('adds module to config', () => {
    const result = enableModule({}, 'expenses')
    expect(result.expenses?.enabled).toBe(true)
  })

  it('preserves existing features when enabling', () => {
    const config: WorkspaceModuleConfig = { expenses: { enabled: false, features: { vendorManagement: true } } }
    const result = enableModule(config, 'expenses')
    expect(result.expenses?.enabled).toBe(true)
    expect(result.expenses?.features.vendorManagement).toBe(true)
  })
})

describe('disableModule', () => {
  it('sets enabled to false', () => {
    const config: WorkspaceModuleConfig = { expenses: { enabled: true, features: {} } }
    const result = disableModule(config, 'expenses')
    expect(result.expenses?.enabled).toBe(false)
  })

  it('does nothing for module not in config', () => {
    const result = disableModule({}, 'expenses')
    expect(result.expenses).toBeUndefined()
  })
})

// ============================================================
// toggleFeature
// ============================================================

describe('toggleFeature', () => {
  it('enables a feature', () => {
    const config: WorkspaceModuleConfig = { billing: { enabled: true, features: {} } }
    const result = toggleFeature(config, 'billing', 'autoBilling', true)
    expect(result.billing?.features.autoBilling).toBe(true)
  })

  it('disables a feature', () => {
    const config: WorkspaceModuleConfig = { billing: { enabled: true, features: { autoBilling: true } } }
    const result = toggleFeature(config, 'billing', 'autoBilling', false)
    expect(result.billing?.features.autoBilling).toBe(false)
  })
})

// ============================================================
// migrateOldFlagsToModuleConfig
// ============================================================

describe('migrateOldFlagsToModuleConfig', () => {
  it('maps expenses flag', () => {
    const result = migrateOldFlagsToModuleConfig({ expenses: true })
    expect(result.expenses?.enabled).toBe(true)
  })

  it('enables all library modules when library flag is true', () => {
    const result = migrateOldFlagsToModuleConfig({ library: true })
    expect(result.members?.enabled).toBe(true)
    expect(result.sections?.enabled).toBe(true)
    expect(result.seats?.enabled).toBe(true)
    expect(result.attendance?.enabled).toBe(true)
    expect(result.lockers?.enabled).toBe(true)
    expect(result.waitlist?.enabled).toBe(true)
    expect(result.subscriptions?.enabled).toBe(true)
    expect(result.plans?.enabled).toBe(true)
  })

  it('always enables core modules regardless of flags', () => {
    const result = migrateOldFlagsToModuleConfig({})
    expect(result.properties?.enabled).toBe(true)
    expect(result.rooms?.enabled).toBe(true)
    expect(result.tenants?.enabled).toBe(true)
    expect(result.billing?.enabled).toBe(true)
    expect(result.payments?.enabled).toBe(true)
  })
})

// ============================================================
// isOldFlatFormat
// ============================================================

describe('isOldFlatFormat', () => {
  it('detects old flat format', () => {
    expect(isOldFlatFormat({ expenses: true, library: false })).toBe(true)
  })

  it('returns false for new nested format', () => {
    expect(isOldFlatFormat({ expenses: { enabled: true, features: {} } })).toBe(false)
  })

  it('returns false for empty object', () => {
    expect(isOldFlatFormat({})).toBe(false)
  })

  it('returns false for null', () => {
    expect(isOldFlatFormat(null)).toBe(false)
  })
})

// ============================================================
// countEnabledModules
// ============================================================

describe('countEnabledModules', () => {
  it('returns 0 for empty config', () => {
    expect(countEnabledModules({})).toBe(0)
  })

  it('counts correctly', () => {
    const config: WorkspaceModuleConfig = {
      expenses: { enabled: true, features: {} },
      billing: { enabled: true, features: {} },
      rooms: { enabled: false, features: {} },
    }
    expect(countEnabledModules(config)).toBe(2)
  })
})
