/**
 * Payments Management Types
 *
 * Types for payments, payment methods, and related data.
 */

import { Person } from "./people.types"

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

export type PaymentMethod = "cash" | "upi" | "bank_transfer" | "cheque" | "card" | "paytm" | "dd" | "credit" | "other"

export const PAYMENT_METHOD_CONFIG: Record<PaymentMethod, { label: string; icon: string }> = {
  cash: { label: "Cash", icon: "Banknote" },
  upi: { label: "UPI", icon: "Smartphone" },
  bank_transfer: { label: "Bank Transfer", icon: "Building2" },
  cheque: { label: "Cheque", icon: "FileText" },
  card: { label: "Card", icon: "CreditCard" },
  paytm: { label: "Paytm", icon: "Smartphone" },
  dd: { label: "Demand Draft", icon: "FileText" },
  credit: { label: "Credit", icon: "Wallet" },
  other: { label: "Other", icon: "Wallet" },
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface Payment {
  id: string
  owner_id: string
  tenant_id: string
  property_id: string
  bill_id: string | null
  charge_type_id: string | null
  amount: number
  payment_date: string
  payment_method: PaymentMethod
  receipt_number: string | null
  for_period: string | null
  transaction_reference: string | null
  notes: string | null
  created_at: string
  updated_at: string

  // Audit fields
  created_by?: string | null
  deleted_at?: string | null
  deleted_by?: string | null

  // Joined fields
  tenant?: {
    id: string
    name: string
    phone?: string
    person_id?: string
    person?: Pick<Person, "id" | "photo_url"> | null
  } | null
  property?: { id: string; name: string } | null
  bill?: { id: string; bill_number: string; total_amount?: number; balance_due?: number } | null
  charge_type?: { id: string; name: string } | null
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

export interface PaymentFormData {
  tenant_id: string
  property_id: string
  bill_id?: string
  charge_type_id?: string
  amount: number
  payment_date: string
  payment_method: PaymentMethod
  for_period?: string
  transaction_reference?: string
  notes?: string
}

// ============================================================================
// LIST VIEW TYPES
// ============================================================================

export interface PaymentListItem extends Payment {
  payment_month?: string
  payment_year?: string
}

// ============================================================================
// DUES TYPES
// ============================================================================

/** Tenant with computed overdue dues — used on the payment reminders page */
export interface TenantWithRentDues {
  id: string
  name: string
  phone: string
  email: string | null
  monthly_rent: number
  check_in_date: string
  property: {
    id: string
    name: string
  }
  room: {
    id: string
    room_number: string
  }
  totalPaid: number
  expectedRent: number
  pendingDues: number
  monthsActive: number
  lastPaymentDate: string | null
}

/** Tenant/bill row with outstanding balance — used on the bulk payment page */
export interface TenantWithBillDues {
  tenant_id: string
  tenant_name: string
  phone: string
  property_id: string
  property_name: string
  room_number: string
  bill_id: string
  bill_number: string
  for_month: string
  balance_due: number
}
