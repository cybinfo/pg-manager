/**
 * Expenses Management Types (Basic)
 *
 * Core types for expenses, expense types, and related data.
 * These cover the original expense module (general expenses with status tracking).
 *
 * For the enhanced expense system (daily spend, vendors, bill payments,
 * service providers, budgets, kitchen wastage, misc transactions, and
 * India-specific features like UPI/TDS/GST), see `./expense-enhanced.types.ts`.
 */

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

export type ExpenseStatus = "pending" | "approved" | "paid" | "rejected"

export const EXPENSE_STATUS_CONFIG = {
  pending: {
    label: "Pending",
    variant: "warning" as const,
  },
  approved: {
    label: "Approved",
    variant: "info" as const,
  },
  paid: {
    label: "Paid",
    variant: "success" as const,
  },
  rejected: {
    label: "Rejected",
    variant: "error" as const,
  },
} as const

// ============================================================================
// INTERFACES
// ============================================================================

export interface ExpenseType {
  id: string
  owner_id: string
  name: string
  code: string
  description: string | null
  is_active: boolean
  created_at: string
}

export interface Expense {
  id: string
  owner_id: string
  property_id: string | null
  expense_type_id: string | null
  amount: number
  expense_date: string
  description: string
  vendor_name: string | null
  reference_number: string | null
  payment_method: string | null
  receipt_url: string | null
  notes: string | null
  status: ExpenseStatus
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string

  // Audit fields
  created_by?: string | null
  deleted_at?: string | null
  deleted_by?: string | null

  // Joined fields
  property?: { id: string; name: string } | null
  expense_type?: Pick<ExpenseType, "id" | "name" | "code"> | null
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

export interface ExpenseFormData {
  property_id?: string
  expense_type_id?: string
  amount: number
  expense_date: string
  description: string
  vendor_name?: string
  reference_number?: string
  payment_method?: string
  notes?: string
}

// ============================================================================
// LIST VIEW TYPES
// ============================================================================

export interface ExpenseListItem extends Expense {
  expense_month?: string
  expense_year?: string
}
