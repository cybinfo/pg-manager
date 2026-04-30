// Module & Feature Type System
//
// Two-level control: Module (on/off) → Features within module (each on/off).
// All features default OFF. Module enabled = module is available; feature enabled = sub-capability active.

export type BusinessType =
  | 'pg'
  | 'hostel'
  | 'gym'
  | 'library'
  | 'school'
  | 'hospital'
  | 'hotel'
  | 'coworking'
  | 'other'

export type ModuleKey =
  | 'properties'
  | 'rooms'
  | 'tenants'
  | 'members'
  | 'people'
  | 'billing'
  | 'payments'
  | 'refunds'
  | 'subscriptions'
  | 'plans'
  | 'expenses'
  | 'meters'
  | 'attendance'
  | 'seats'
  | 'sections'
  | 'lockers'
  | 'waitlist'
  | 'complaints'
  | 'notices'
  | 'visitors'
  | 'staff'
  | 'reports'
  | 'approvals'
  | 'exitClearance'
  | 'activityLog'
  | 'inquiries'

export interface ModuleState {
  enabled: boolean
  features: Record<string, boolean>
}

export type WorkspaceModuleConfig = Partial<Record<ModuleKey, ModuleState>>

export interface FeatureDefinition {
  key: string
  name: string
  description: string
  /** Other feature keys in the same module that must be enabled */
  dependsOn?: string[]
}

export interface ModuleDefinition {
  key: ModuleKey
  name: string
  description: string
  features: FeatureDefinition[]
}

export type ModuleCatalog = ModuleDefinition[]
