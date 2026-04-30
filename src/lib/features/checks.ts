// Module & Feature Check Utilities
//
// Use these functions for runtime checks throughout the app.
// Server-side: checkModuleEnabled() for API routes.
// Client-side: use useFeatures() hook instead.

import { SupabaseClient } from "@supabase/supabase-js"
import type { ModuleKey, WorkspaceModuleConfig, ModuleState } from './types'
import { MODULES_CATALOG } from './modules-catalog'

/** Returns true if the module is enabled in the given config */
export function isModuleEnabled(
  config: WorkspaceModuleConfig | undefined | null,
  module: ModuleKey
): boolean {
  if (!config) return false
  return config[module]?.enabled === true
}

/** Returns true if a specific feature within a module is enabled */
export function isFeatureEnabled(
  config: WorkspaceModuleConfig | undefined | null,
  module: ModuleKey,
  feature: string
): boolean {
  if (!isModuleEnabled(config, module)) return false
  return config![module]?.features?.[feature] === true
}

/** Returns the default module config — all modules disabled, empty features */
export function getDefaultModuleConfig(): WorkspaceModuleConfig {
  return {}
}

/** Enable a module (with empty features) if not already present */
export function enableModule(
  config: WorkspaceModuleConfig,
  module: ModuleKey
): WorkspaceModuleConfig {
  return {
    ...config,
    [module]: { enabled: true, features: { ...(config[module]?.features ?? {}) } },
  }
}

/** Disable a module entirely */
export function disableModule(
  config: WorkspaceModuleConfig,
  module: ModuleKey
): WorkspaceModuleConfig {
  const next = { ...config }
  if (next[module]) {
    next[module] = { ...next[module]!, enabled: false }
  }
  return next
}

/** Toggle a feature flag within a module */
export function toggleFeature(
  config: WorkspaceModuleConfig,
  module: ModuleKey,
  feature: string,
  enabled: boolean
): WorkspaceModuleConfig {
  const moduleState: ModuleState = {
    enabled: config[module]?.enabled ?? false,
    features: { ...(config[module]?.features ?? {}), [feature]: enabled },
  }
  return { ...config, [module]: moduleState }
}

/**
 * Migrate old flat feature flags format to new nested module config.
 * Called when legacy owner_config.feature_flags is detected.
 * All features default OFF — only module-level enabled state is preserved.
 */
export function migrateOldFlagsToModuleConfig(
  oldFlags: Record<string, boolean>
): WorkspaceModuleConfig {
  const config: WorkspaceModuleConfig = {}

  // Direct 1-to-1 mappings
  const directMap: Partial<Record<string, ModuleKey>> = {
    expenses:     'expenses',
    exitClearance:'exitClearance',
    visitors:     'visitors',
    complaints:   'complaints',
    notices:      'notices',
    reports:      'reports',
    activityLog:  'activityLog',
    approvals:    'approvals',
    meterReadings:'meters',
  }

  for (const [flag, moduleKey] of Object.entries(directMap)) {
    if (oldFlags[flag] === true) {
      config[moduleKey as ModuleKey] = { enabled: true, features: {} }
    }
  }

  // Old 'library' flag enables all library-related modules
  if (oldFlags.library === true) {
    const libraryModules: ModuleKey[] = [
      'members', 'sections', 'seats', 'attendance',
      'lockers', 'waitlist', 'subscriptions', 'plans',
    ]
    for (const m of libraryModules) {
      config[m] = { enabled: true, features: {} }
    }
  }

  // Core modules that were always-on: force-enable them
  const alwaysOn: ModuleKey[] = [
    'properties', 'rooms', 'tenants', 'billing', 'payments',
    'refunds', 'staff', 'people', 'inquiries',
  ]
  for (const m of alwaysOn) {
    config[m] = { enabled: true, features: {} }
  }

  return config
}

/**
 * Detect whether a value is the old flat format (top-level boolean values)
 * vs. the new nested format (top-level objects with enabled + features).
 */
export function isOldFlatFormat(value: unknown): value is Record<string, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length === 0) return false
  // Old format: all values are booleans
  return entries.some(([, v]) => typeof v === 'boolean')
}

/** Get feature count for a module definition */
export function getModuleFeatureCount(moduleKey: ModuleKey): number {
  return MODULES_CATALOG.find((m) => m.key === moduleKey)?.features.length ?? 0
}

/** Count how many modules are enabled in a config */
export function countEnabledModules(config: WorkspaceModuleConfig): number {
  return Object.values(config).filter((s) => s?.enabled).length
}

/**
 * Server-side: check if a module is enabled for a workspace.
 * Use in API routes — do not call from client components.
 */
export async function checkModuleEnabled(
  supabase: SupabaseClient,
  workspaceId: string,
  module: ModuleKey
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('workspaces')
      .select('module_config')
      .eq('id', workspaceId)
      .single()

    if (error || !data) return false

    const config = data.module_config as WorkspaceModuleConfig | null
    return isModuleEnabled(config, module)
  } catch {
    return false
  }
}

/** Create a module-disabled error response for API routes */
export function moduleDisabledError(module: ModuleKey): {
  error: string
  code: string
  module: string
} {
  const def = MODULES_CATALOG.find((m) => m.key === module)
  return {
    error: `The "${def?.name ?? module}" module is not enabled for this workspace`,
    code: 'MODULE_DISABLED',
    module,
  }
}
