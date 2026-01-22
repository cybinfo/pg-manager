/**
 * Payments Management Types
 *
 * Types for payments, payment methods, and related data.
 */

import { Person } from "./people.types"

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

export type PaymentMethod = "cash" | "upi" | "bank_transfer" | "cheque" | "card" | "other"

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
]

export const PAYMENT_METHOD_CONFIG: Record<PaymentMethod, { label: string; icon: string }> = {
  cash: { label: "Cash", icon: "Banknote" },
  upi: { label: "UPI", icon: "Smartphone" },
  bank_transfer: { label: "Bank Transfer", icon: "Building2" },
  cheque: { label: "Cheque", icon: "FileText" },
  card: { label: "Card", icon: "CreditCard" },
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
