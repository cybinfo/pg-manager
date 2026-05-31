/**
 * Library Module Types
 *
 * Types for study libraries, members, seats, attendance, lockers, and payments.
 * Libraries are study spaces where members pay for hours of access.
 */

import type { AuditableEntity } from "./audit.types"
import type { Person } from "./people.types"

// ============================================================================
// NARROW VIEW TYPES
// ============================================================================

export type LibraryOption = { id: string; name: string; code?: string | null }
export type LibraryPlanOption = {
  id: string
  name: string
  hours_included: number | null
  validity_days: number
  base_price: number
}

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

export type LibraryMemberStatus = "active" | "expired" | "suspended" | "cancelled"

export type LibrarySeatStatus = "available" | "occupied" | "reserved" | "maintenance"

export type LibraryLockerStatus = "available" | "occupied" | "maintenance"

export type LibraryLockerSize = "small" | "medium" | "large"

export type LibraryMembershipStatus = "active" | "expired" | "cancelled" | "upgraded"

export type LibraryPaymentType = "subscription" | "locker_rent" | "locker_deposit" | "fine" | "other"

export type LibraryPaymentMethod = "cash" | "upi" | "card" | "bank_transfer" | "cheque" | "paytm" | "other"

export type LibraryPaymentStatus = "completed" | "pending" | "refunded"

export type LibraryTimeSlot = "Morning" | "Evening" | "Night" | "24 Hours"

// Re-export status configs from canonical source (lib/status/library)
export {
  LIBRARY_MEMBER_STATUS_CONFIG,
  LIBRARY_SEAT_STATUS_CONFIG,
  LIBRARY_LOCKER_STATUS_CONFIG,
  LIBRARY_LOCKER_SIZE_CONFIG,
  LIBRARY_MEMBERSHIP_STATUS_CONFIG,
  LIBRARY_PAYMENT_TYPE_CONFIG,
  LIBRARY_PAYMENT_METHOD_CONFIG,
  LIBRARY_PAYMENT_STATUS_CONFIG,
} from "@/lib/status/library"

export const TIME_SLOTS: { value: LibraryTimeSlot; label: string }[] = [
  { value: "Morning", label: "Morning (6 AM - 2 PM)" },
  { value: "Evening", label: "Evening (2 PM - 10 PM)" },
  { value: "Night", label: "Night (10 PM - 6 AM)" },
  { value: "24 Hours", label: "24 Hours" },
]

export const TIME_SLOT_OPTIONS: { value: string; label: string }[] = TIME_SLOTS.map(
  (slot) => ({ value: slot.value, label: slot.label })
)

// ============================================================================
// LIBRARY INTERFACE
// ============================================================================

export interface LibrarySettings {
  time_slots?: string[]
  default_hours_per_month?: number
  grace_period_minutes?: number
  has_ac?: boolean
  has_wifi?: boolean
  has_lockers?: boolean
  has_parking?: boolean
}

export interface Library extends AuditableEntity {
  id: string
  owner_id: string
  workspace_id: string
  name: string
  code: string | null
  address: string | null
  city: string | null
  state: string
  pincode: string | null
  phone: string | null
  email: string | null
  total_sections: number
  total_seats: number
  occupied_seats: number
  opening_time: string | null
  closing_time: string | null
  has_ac: boolean
  has_wifi: boolean
  has_lockers: boolean
  has_parking: boolean
  settings: LibrarySettings
  is_active: boolean
}

// ============================================================================
// LIBRARY SECTION INTERFACE
// ============================================================================

export interface LibrarySection extends AuditableEntity {
  id: string
  owner_id: string
  workspace_id: string
  entity_id: string
  name: string
  section_number: string | null
  floor: number
  total_seats: number
  occupied_seats: number
  is_ac: boolean
  has_power_outlets: boolean
  hourly_rate: number | null
  monthly_rate: number | null
  is_active: boolean

  // Joined fields
  library?: Pick<Library, "id" | "name"> | null
}

// ============================================================================
// LIBRARY SEAT INTERFACE
// ============================================================================

export interface LibrarySeat extends AuditableEntity {
  id: string
  owner_id: string
  workspace_id: string
  section_id: string
  seat_number: string
  row_number: string | null
  has_power_outlet: boolean
  has_lamp: boolean
  is_window_seat: boolean
  status: LibrarySeatStatus
  current_member_id: string | null

  // Joined fields
  section?: (Pick<LibrarySection, "id" | "name"> & {
    library?: Pick<Library, "id" | "name"> | null
  }) | null
  current_member?: (Pick<LibraryMember, "id" | "name" | "member_code" | "phone"> & {
    person?: Pick<Person, "id" | "name" | "photo_url" | "phone"> | null
  }) | null
}

// ============================================================================
// LIBRARY MEMBER INTERFACE
// ============================================================================

export interface LibraryMember extends AuditableEntity {
  id: string
  owner_id: string
  workspace_id: string
  entity_id: string
  person_id: string | null
  name: string
  phone: string | null
  email: string | null
  member_code: string | null
  id_proof_type: string | null
  id_proof_number: string | null
  id_proof_photo_url: string | null
  current_subscription_id: string | null
  assigned_seat_id: string | null
  hours_balance: number
  hours_used: number
  preferred_slot: string | null
  status: LibraryMemberStatus
  join_date: string
  expiry_date: string | null
  left_date: string | null
  locker_id: string | null
  notes: string | null

  // Joined fields (CRITICAL: use person.name for live data)
  person?: Person | null
  library?: Pick<Library, "id" | "name"> | null
  assigned_seat?: (Pick<LibrarySeat, "id" | "seat_number"> & {
    section?: Pick<LibrarySection, "id" | "name"> | null
  }) | null
  locker?: Pick<LibraryLocker, "id" | "locker_number"> | null
  current_subscription?: LibraryMembership | null
}

// ============================================================================
// LIBRARY MEMBERSHIP INTERFACE (Subscriptions)
// ============================================================================

export interface LibraryMembership extends AuditableEntity {
  id: string
  owner_id: string
  workspace_id: string
  member_id: string
  plan_id: string | null
  plan_name: string
  hours_included: number | null
  amount: number
  discount_amount: number
  final_amount: number
  time_slot: string | null
  start_date: string
  end_date: string
  hours_remaining: number | null
  hours_used: number
  status: LibraryMembershipStatus
  payment_id: string | null

  // Joined fields
  member?: Pick<LibraryMember, "id" | "name" | "member_code"> | null
  payment?: Pick<LibraryPayment, "id" | "receipt_number" | "amount"> | null
}

// ============================================================================
// LIBRARY ATTENDANCE INTERFACE
// ============================================================================

export interface LibraryAttendance extends AuditableEntity {
  id: string
  owner_id: string
  workspace_id: string
  member_id: string
  membership_id: string | null
  attendance_date: string
  check_in_time: string
  check_out_time: string | null
  hours_spent: number | null
  seat_id: string | null
  notes: string | null

  // Joined fields
  member?: (Pick<LibraryMember, "id" | "name" | "member_code"> & {
    person?: Pick<Person, "id" | "name" | "photo_url"> | null
  }) | null
  seat?: Pick<LibrarySeat, "id" | "seat_number"> | null
}

// ============================================================================
// LIBRARY LOCKER INTERFACE
// ============================================================================

export interface LibraryLocker extends AuditableEntity {
  id: string
  owner_id: string
  workspace_id: string
  entity_id: string
  locker_number: string
  size: LibraryLockerSize
  floor: number
  section: string | null
  monthly_rent: number | null
  deposit_amount: number | null
  status: LibraryLockerStatus
  current_member_id: string | null
  assigned_from: string | null
  assigned_until: string | null

  // Joined fields
  library?: Pick<Library, "id" | "name"> | null
  current_member?: (Pick<LibraryMember, "id" | "name" | "member_code" | "phone"> & {
    person?: Pick<Person, "id" | "name" | "photo_url" | "phone"> | null
  }) | null
}

// ============================================================================
// LIBRARY LOCKER ASSIGNMENT INTERFACE
// ============================================================================

export interface LibraryLockerAssignment extends AuditableEntity {
  id: string
  owner_id: string
  workspace_id: string
  locker_id: string
  member_id: string
  start_date: string
  end_date: string | null
  rent_amount: number | null
  deposit_amount: number | null
  deposit_returned: boolean
  status: "active" | "ended"

  // Joined fields
  locker?: Pick<LibraryLocker, "id" | "locker_number" | "size"> | null
  member?: Pick<LibraryMember, "id" | "name" | "member_code"> | null
}

// ============================================================================
// LIBRARY PAYMENT INTERFACE
// ============================================================================

export interface LibraryPayment extends AuditableEntity {
  id: string
  owner_id: string
  workspace_id: string
  member_id: string
  receipt_number: string | null
  payment_date: string
  amount: number
  payment_type: LibraryPaymentType
  payment_method: LibraryPaymentMethod
  payment_reference: string | null
  membership_id: string | null
  locker_assignment_id: string | null
  notes: string | null
  status: LibraryPaymentStatus

  // Joined fields
  member?: (Pick<LibraryMember, "id" | "name" | "member_code"> & {
    person?: Pick<Person, "id" | "name" | "photo_url"> | null
  }) | null
}

// ============================================================================
// LIBRARY PLAN INTERFACE
// ============================================================================

export interface LibraryPlan {
  id: string
  owner_id: string
  workspace_id: string
  name: string
  description: string | null
  hours_included: number | null
  validity_days: number
  base_price: number
  allowed_slots: string[] | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

export interface LibraryFormData {
  name: string
  code?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  phone?: string
  email?: string
  opening_time?: string
  closing_time?: string
  has_ac?: boolean
  has_wifi?: boolean
  has_lockers?: boolean
  has_parking?: boolean
  settings?: LibrarySettings
}

export interface LibrarySectionFormData {
  entity_id: string
  name: string
  section_number?: string
  floor?: number
  is_ac?: boolean
  has_power_outlets?: boolean
  hourly_rate?: number
  monthly_rate?: number
}

export interface LibrarySeatFormData {
  section_id: string
  seat_number: string
  row_number?: string
  has_power_outlet?: boolean
  has_lamp?: boolean
  is_window_seat?: boolean
}

export interface LibraryMemberFormData {
  entity_id: string
  person_id?: string
  name: string
  phone: string
  email?: string
  id_proof_type?: string
  id_proof_number?: string
  preferred_slot?: string
  notes?: string
  // Subscription
  plan_id?: string
  start_date: string
  hours_included?: number
  amount: number
  discount_amount?: number
  time_slot?: string
  payment_method: string
  payment_reference?: string
}

export interface LibraryLockerFormData {
  entity_id: string
  locker_number: string
  size?: LibraryLockerSize
  floor?: number
  section?: string
  monthly_rent?: number
  deposit_amount?: number
}

export interface LibraryPaymentFormData {
  member_id: string
  payment_date: string
  amount: number
  payment_type: LibraryPaymentType
  payment_method: LibraryPaymentMethod
  payment_reference?: string
  membership_id?: string
  locker_assignment_id?: string
  notes?: string
}

export interface LibraryPlanFormData {
  name: string
  description?: string
  hours_included?: number
  validity_days: number
  base_price: number
  allowed_slots?: string[]
}

export interface CheckInFormData {
  member_id: string
  seat_id?: string
  notes?: string
}

export interface CheckOutFormData {
  attendance_id: string
  notes?: string
}

// ============================================================================
// LIST VIEW TYPES
// ============================================================================

export interface LibraryListItem extends Library {
  available_seats?: number
}

export interface LibraryMemberListItem extends LibraryMember {
  display_name?: string // person.name || name
}

export interface LibraryAttendanceListItem extends LibraryAttendance {
  display_name?: string
  is_checked_in?: boolean
}

// ============================================================================
// DASHBOARD/SUMMARY TYPES
// ============================================================================

export interface LibraryAttendanceSummary {
  total_members: number
  active_members: number
  currently_checked_in: number
  total_check_ins_today: number
  available_seats: number
  occupied_seats: number
}

export interface LibraryMemberSummary {
  total_subscriptions: number
  total_hours_used: number
  total_paid: number
  active_locker: boolean
}

// ============================================================================
// WAITLIST TYPES
// ============================================================================

export type LibraryWaitlistStatus = "waiting" | "contacted" | "converted" | "cancelled"

// Re-export waitlist status config from canonical source
export { LIBRARY_WAITLIST_STATUS_CONFIG } from "@/lib/status/library"

export interface LibraryWaitlist extends AuditableEntity {
  id: string
  owner_id: string
  workspace_id: string
  entity_id: string
  name: string
  phone: string
  email: string | null
  person_id: string | null
  preferred_slot: string | null
  preferred_plan: string | null
  notes: string | null
  status: LibraryWaitlistStatus
  position: number | null
  queue_position: number | null
  last_contacted_at: string | null
  contact_notes: string | null
  converted_member_id: string | null
  converted_at: string | null

  // Joined fields
  library?: Pick<Library, "id" | "name"> | null
  person?: Person | null
  converted_member?: Pick<LibraryMember, "id" | "name" | "member_code"> | null
}

export interface LibraryWaitlistFormData {
  entity_id: string
  name: string
  phone: string
  email?: string
  person_id?: string
  preferred_slot?: string
  preferred_plan?: string
  notes?: string
}
