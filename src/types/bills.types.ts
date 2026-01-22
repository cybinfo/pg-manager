/**
 * Bills Management Types
 *
 * Types for bills, line items, and billing-related data.
 */

import { Person } from "./people.types"

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

export type BillStatus = "unpaid" | "partial" | "paid" | "overdue" | "cancelled"

export const BILL_STATUS_CONFIG = {
  unpaid: {
    label: "Unpaid",
    variant: "warning" as const,
  },
  partial: {
    label: "Partially Paid",
    variant: "info" as const,
  },
  paid: {
    label: "Paid",
    variant: "success" as const,
  },
  overdue: {
    label: "Overdue",
    variant: "error" as const,
  },
  cancelled: {
    label: "Cancelled",
    variant: "muted" as const,
  },
} as const

// ============================================================================
// INTERFACES
// ============================================================================

export interface BillLineItem {
  id: string
  description: string
  amount: number
  quantity?: number
  charge_type_id?: string
  charge_type_name?: string
}

export interface Bill {
  id: string
  owner_id: string
  tenant_id: string
  property_id: string
  bill_number: string
  bill_date: string
  due_date: string
  for_month: string
  total_amount: number
  paid_amount: number
  balance_due: number
  status: BillStatus
  line_items: BillLineItem[]
  notes: string | null
  created_at: string
  updated_at: string

  // Joined fields
  tenant?: {
    id: string
    name: string
    phone?: string
    email?: string
    person_id?: string
    person?: Pick<Person, "id" | "photo_url"> | null
  } | null
  property?: { id: string; name: string; address?: string } | null
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

export interface BillFormData {
  tenant_id: string
  property_id: string
  bill_date: string
  due_date: string
  for_month: string
  line_items: Omit<BillLineItem, "id">[]
  notes?: string
}

// ============================================================================
// LIST VIEW TYPES
// ============================================================================

export interface BillListItem extends Omit<Bill, "line_items"> {
  bill_month?: string
  bill_year?: string
}
