/**
 * Exit Clearance Types
 *
 * Types for tenant checkout process, settlements, and related data.
 */

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

export type ExitClearanceStatus = "initiated" | "pending_payment" | "cleared"

export const EXIT_CLEARANCE_STATUS_CONFIG = {
  initiated: {
    label: "Initiated",
    variant: "info" as const,
  },
  pending_payment: {
    label: "Pending Payment",
    variant: "warning" as const,
  },
  cleared: {
    label: "Cleared",
    variant: "success" as const,
  },
} as const

// ============================================================================
// INTERFACES
// ============================================================================

export interface Deduction {
  reason: string
  amount: number
}

export interface ExitClearance {
  id: string
  owner_id: string
  tenant_id: string
  property_id: string
  room_id: string
  notice_given_date: string | null
  expected_exit_date: string
  actual_exit_date: string | null
  total_dues: number
  total_refundable: number
  deductions: Deduction[]
  final_amount: number
  settlement_status: ExitClearanceStatus
  room_inspection_done: boolean
  room_condition_notes: string | null
  key_returned: boolean
  created_at: string
  updated_at: string
  completed_at: string | null

  // Joined fields
  tenant?: {
    id: string
    name: string
    phone: string
    monthly_rent: number
    check_in_date: string
  } | null
  property?: {
    id: string
    name: string
    address: string | null
    city: string
  } | null
  room?: {
    id: string
    room_number: string
    deposit_amount: number
  } | null
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

export interface ExitClearanceFormData {
  actual_exit_date: string
  room_inspection_done: boolean
  key_returned: boolean
  room_condition_notes: string
}

// ============================================================================
// LIST VIEW TYPES
// ============================================================================

export interface ExitClearanceListItem extends ExitClearance {
  created_month?: string
  created_year?: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function calculateFinalAmount(
  totalDues: number,
  totalRefundable: number,
  deductions: Deduction[]
): number {
  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0)
  return totalDues - totalRefundable + totalDeductions
}

export function isRefundDue(finalAmount: number): boolean {
  return finalAmount < 0
}

export function getDaysStayed(checkInDate: string, exitDate: string): number {
  const checkIn = new Date(checkInDate)
  const checkOut = new Date(exitDate)
  return Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
}
