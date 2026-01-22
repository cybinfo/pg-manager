/**
 * Refunds Types
 *
 * Types for refund processing and tracking.
 */

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

export type RefundStatus = "pending" | "processing" | "completed" | "failed" | "cancelled"
export type RefundType = "security_deposit" | "advance_rent" | "overpayment" | "other"
export type PaymentMode = "cash" | "upi" | "bank_transfer" | "cheque"

export const REFUND_STATUS_CONFIG = {
  pending: {
    label: "Pending",
    variant: "warning" as const,
  },
  processing: {
    label: "Processing",
    variant: "info" as const,
  },
  completed: {
    label: "Completed",
    variant: "success" as const,
  },
  failed: {
    label: "Failed",
    variant: "error" as const,
  },
  cancelled: {
    label: "Cancelled",
    variant: "muted" as const,
  },
} as const

export const REFUND_TYPE_LABELS: Record<RefundType, string> = {
  security_deposit: "Security Deposit",
  advance_rent: "Advance Rent",
  overpayment: "Overpayment",
  other: "Other",
}

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface Refund {
  id: string
  owner_id: string
  tenant_id: string
  property_id: string | null
  exit_clearance_id: string | null
  refund_type: RefundType
  amount: number
  payment_mode: PaymentMode
  reference_number: string | null
  status: RefundStatus
  refund_date: string | null
  due_date: string | null
  reason: string | null
  notes: string | null
  processed_by: string | null
  processed_at: string | null
  created_at: string
  updated_at: string

  // Joined fields
  tenant?: {
    id: string
    name: string
    phone: string
    photo_url: string | null
    profile_photo: string | null
    person?: { id: string; photo_url: string | null } | null
  } | null
  property?: { id: string; name: string } | null
  exit_clearance?: {
    id: string
    expected_exit_date: string
    actual_exit_date: string | null
    settlement_status: string
  } | null
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

export interface RefundFormData {
  tenant_id: string
  property_id?: string
  exit_clearance_id?: string
  refund_type: RefundType
  amount: number
  payment_mode: PaymentMode
  reference_number?: string
  due_date?: string
  reason?: string
  notes?: string
}

export interface RefundUpdateData {
  status: RefundStatus
  refund_date?: string
  reference_number?: string
  notes?: string
}

// ============================================================================
// LIST VIEW TYPES
// ============================================================================

export interface RefundListItem extends Refund {
  created_month?: string
  created_year?: string
}
