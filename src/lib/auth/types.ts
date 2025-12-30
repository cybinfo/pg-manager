// ============================================
// Unified Identity System - Type Definitions
// ============================================

export type ContextType = 'owner' | 'staff' | 'tenant'

export interface Workspace {
  id: string
  name: string
  slug: string | null
  logo_url: string | null
  type: 'pg_manager' | 'shop_manager' | 'rent_manager' | 'society_manager'
  owner_user_id: string
  settings: WorkspaceSettings
  is_active: boolean
  created_at: string
}

export interface WorkspaceSettings {
  timezone: string
  currency: string
  date_format: string
  allow_staff_invite: boolean
  allow_tenant_portal: boolean
}

export interface UserProfile {
  id: string
  user_id: string
  name: string
  email: string | null
  phone: string | null
  profile_photo: string | null
  preferences: UserPreferences
  last_login_at: string | null
  created_at: string
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  default_context_id: string | null
  notifications: {
    email: boolean
    sms: boolean
    push: boolean
    payment_reminders: boolean
    complaint_updates: boolean
  }
}

export interface UserContext {
  id: string
  user_id: string
  workspace_id: string
  context_type: ContextType
  role_id: string | null
  entity_id: string | null
  is_active: boolean
  is_default: boolean
  last_accessed_at: string | null
  access_count: number
  metadata: Record<string, unknown>
  created_at: string

  // Joined data
  workspace?: Workspace
  role?: Role
}

export interface Role {
  id: string
  name: string
  description: string | null
  permissions: string[]
  is_system_role: boolean
}

export interface ContextWithDetails {
  context_id: string
  workspace_id: string
  workspace_name: string
  workspace_logo: string | null
  context_type: ContextType
  role_name: string | null
  permissions: string[]
  is_default: boolean
  last_accessed_at: string | null
}

export interface Invitation {
  id: string
  workspace_id: string
  invited_by: string
  email: string | null
  phone: string | null
  name: string | null
  context_type: ContextType
  role_id: string | null
  entity_id: string | null
  token: string
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  message: string | null
  expires_at: string
  sent_at: string | null
  sent_via: string[] | null
  accepted_at: string | null
  created_at: string
}

export interface IdentityConflict {
  source_type: 'staff' | 'tenant' | 'invitation'
  source_id: string
  name: string | null
  email: string | null
  phone: string | null
  has_user_id: boolean
  workspace_name: string
}

// Permission constants
export const PERMISSIONS = {
  // Properties
  PROPERTIES_VIEW: 'properties.view',
  PROPERTIES_CREATE: 'properties.create',
  PROPERTIES_EDIT: 'properties.edit',
  PROPERTIES_DELETE: 'properties.delete',

  // Rooms
  ROOMS_VIEW: 'rooms.view',
  ROOMS_CREATE: 'rooms.create',
  ROOMS_EDIT: 'rooms.edit',
  ROOMS_DELETE: 'rooms.delete',

  // Tenants
  TENANTS_VIEW: 'tenants.view',
  TENANTS_CREATE: 'tenants.create',
  TENANTS_EDIT: 'tenants.edit',
  TENANTS_DELETE: 'tenants.delete',

  // Payments
  PAYMENTS_VIEW: 'payments.view',
  PAYMENTS_CREATE: 'payments.create',
  PAYMENTS_EDIT: 'payments.edit',
  PAYMENTS_DELETE: 'payments.delete',

  // Bills
  BILLS_VIEW: 'bills.view',
  BILLS_CREATE: 'bills.create',
  BILLS_EDIT: 'bills.edit',
  BILLS_DELETE: 'bills.delete',

  // Meter Readings
  METER_READINGS_VIEW: 'meter_readings.view',
  METER_READINGS_CREATE: 'meter_readings.create',
  METER_READINGS_EDIT: 'meter_readings.edit',

  // Complaints
  COMPLAINTS_VIEW: 'complaints.view',
  COMPLAINTS_CREATE: 'complaints.create',
  COMPLAINTS_EDIT: 'complaints.edit',
  COMPLAINTS_RESOLVE: 'complaints.resolve',

  // Notices
  NOTICES_VIEW: 'notices.view',
  NOTICES_CREATE: 'notices.create',
  NOTICES_EDIT: 'notices.edit',
  NOTICES_DELETE: 'notices.delete',

  // Visitors
  VISITORS_VIEW: 'visitors.view',
  VISITORS_CREATE: 'visitors.create',

  // Reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',

  // Exit Clearance
  EXIT_CLEARANCE_INITIATE: 'exit_clearance.initiate',
  EXIT_CLEARANCE_PROCESS: 'exit_clearance.process',
  EXIT_CLEARANCE_APPROVE: 'exit_clearance.approve',

  // Staff
  STAFF_VIEW: 'staff.view',
  STAFF_CREATE: 'staff.create',
  STAFF_EDIT: 'staff.edit',
  STAFF_DELETE: 'staff.delete',

  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',

  // Profile (for tenants)
  PROFILE_VIEW: 'profile.view',
  PROFILE_EDIT: 'profile.edit',
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

// Tenant fixed permissions
export const TENANT_PERMISSIONS: Permission[] = [
  PERMISSIONS.PROFILE_VIEW,
  PERMISSIONS.PROFILE_EDIT,
  PERMISSIONS.PAYMENTS_VIEW,
  PERMISSIONS.COMPLAINTS_VIEW,
  PERMISSIONS.COMPLAINTS_CREATE,
  PERMISSIONS.NOTICES_VIEW,
]

// Context type labels and icons
export const CONTEXT_TYPE_CONFIG: Record<ContextType, { label: string; icon: string; color: string }> = {
  owner: { label: 'Owner', icon: '👑', color: 'text-amber-600 bg-amber-50' },
  staff: { label: 'Staff', icon: '👤', color: 'text-blue-600 bg-blue-50' },
  tenant: { label: 'Tenant', icon: '🏠', color: 'text-emerald-600 bg-emerald-50' },
}
