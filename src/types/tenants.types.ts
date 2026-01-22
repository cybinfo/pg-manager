/**
 * Tenant Management Types
 *
 * Types for tenants, stays, and related tenant data.
 */

import { Person, EmergencyContact } from "./people.types"

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

export type TenantStatus = "active" | "notice_period" | "checked_out" | "moved_out"

export type PoliceVerificationStatus = "pending" | "submitted" | "verified"

export const TENANT_STATUS_CONFIG = {
  active: {
    label: "Active",
    variant: "success" as const,
  },
  notice_period: {
    label: "Notice Period",
    variant: "warning" as const,
  },
  checked_out: {
    label: "Checked Out",
    variant: "muted" as const,
  },
  moved_out: {
    label: "Moved Out",
    variant: "muted" as const,
  },
} as const

export const POLICE_VERIFICATION_CONFIG = {
  pending: {
    label: "Pending",
    variant: "warning" as const,
  },
  submitted: {
    label: "Submitted",
    variant: "info" as const,
  },
  verified: {
    label: "Verified",
    variant: "success" as const,
  },
} as const

// ============================================================================
// INTERFACES
// ============================================================================

export interface Tenant {
  id: string
  owner_id: string
  person_id: string | null
  property_id: string
  room_id: string | null
  name: string
  email: string | null
  phone: string
  photo_url: string | null
  profile_photo: string | null
  check_in_date: string
  check_out_date: string | null
  expected_exit_date: string | null
  notice_date: string | null
  monthly_rent: number
  security_deposit: number
  status: TenantStatus
  police_verification_status: PoliceVerificationStatus
  agreement_signed: boolean
  notes: string | null
  custom_fields: Record<string, string>
  guardian_contacts: EmergencyContact[] | null
  created_at: string
  updated_at: string

  // Joined fields
  property?: { id: string; name: string; address?: string } | null
  room?: { id: string; room_number: string; room_type?: string } | null
  person?: Person | null
}

export interface TenantStay {
  id: string
  owner_id: string
  tenant_id: string
  property_id: string
  room_id: string
  join_date: string
  exit_date: string | null
  monthly_rent: number
  security_deposit: number
  status: "active" | "completed" | "transferred"
  stay_number: number
  exit_reason: string | null
  created_at: string

  // Joined fields
  property?: { name: string } | null
  room?: { room_number: string } | null
}

export interface RoomTransfer {
  id: string
  owner_id: string
  tenant_id: string
  from_property_id: string
  from_room_id: string
  to_property_id: string
  to_room_id: string
  transfer_date: string
  reason: string | null
  notes: string | null
  old_rent: number
  new_rent: number
  created_at: string

  // Joined fields
  from_property?: { name: string } | null
  from_room?: { room_number: string } | null
  to_property?: { name: string } | null
  to_room?: { room_number: string } | null
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

export interface TenantFormData {
  person_id?: string
  property_id: string
  room_id: string
  name: string
  email?: string
  phone: string
  check_in_date: string
  monthly_rent: number
  security_deposit: number
  notes?: string
  guardian_contacts?: EmergencyContact[]
}

export interface RoomTransferFormData {
  to_room_id: string
  new_rent?: number
  reason?: string
  notes?: string
}

export interface NoticeFormData {
  notice_date: string
  expected_exit_date: string
  notice_notes?: string
}

// ============================================================================
// LIST VIEW TYPES
// ============================================================================

export interface TenantListItem extends Omit<Tenant, "person"> {
  person?: Pick<Person, "id" | "photo_url"> | null
  checkin_month?: string
  checkin_year?: string
}
