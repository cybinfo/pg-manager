/**
 * Staff Management Types
 *
 * Types for staff members, roles, and permissions.
 */

import { Person } from "./people.types"

// ============================================================================
// INTERFACES
// ============================================================================

export interface StaffMember {
  id: string
  owner_id: string
  person_id: string | null
  name: string
  email: string
  phone: string | null
  is_active: boolean
  user_id: string | null
  created_at: string
  updated_at: string

  // Joined fields
  person?: Pick<Person, "id" | "photo_url"> | null
}

export interface Role {
  id: string
  owner_id: string
  name: string
  description: string | null
  is_system_role: boolean
  permissions: string[]
  created_at: string
}

export interface UserRole {
  id: string
  owner_id: string
  staff_member_id: string
  role_id: string
  property_id: string | null
  created_at: string

  // Joined fields
  role?: Pick<Role, "id" | "name" | "description"> | null
  property?: { id: string; name: string } | null
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

export interface StaffFormData {
  name: string
  email: string
  phone?: string
  role_id: string
  property_id?: string
}

export interface RoleFormData {
  name: string
  description?: string
  permissions: string[]
}

export interface RoleAssignmentFormData {
  role_id: string
  property_id?: string
}

// ============================================================================
// LIST VIEW TYPES
// ============================================================================

export interface StaffListItem extends StaffMember {
  roles?: UserRole[]
  primary_role?: string
  account_status?: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const STAFF_STATUS_CONFIG = {
  active: {
    label: "Active",
    variant: "success" as const,
  },
  inactive: {
    label: "Inactive",
    variant: "muted" as const,
  },
} as const

export const ACCOUNT_STATUS_CONFIG = {
  has_login: {
    label: "Has Login",
    variant: "success" as const,
  },
  pending_invite: {
    label: "Pending Invite",
    variant: "warning" as const,
  },
} as const
