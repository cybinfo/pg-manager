/**
 * Enhanced Expense Module Types
 *
 * Types for:
 * - Products & Categories (Kitchen/Daily Spend)
 * - Daily Spend Entries
 * - Vendors & Bill Payments
 * - Service Providers & Service Payments
 * - Budgets & Analytics
 *
 * Part of the India-first expense management system with AI features.
 */

import type { AuditableEntity } from "./audit.types"

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

/**
 * Payment modes available in India
 */
export type PaymentMode = "cash" | "upi" | "bank_transfer" | "card" | "cheque" | "credit" | "dd"

export const PAYMENT_MODE_CONFIG = {
  cash: { label: "Cash", labelHi: "नकद", icon: "Banknote" },
  upi: { label: "UPI", labelHi: "यूपीआई", icon: "Smartphone" },
  bank_transfer: { label: "Bank Transfer", labelHi: "बैंक ट्रांसफर", icon: "Building" },
  card: { label: "Card", labelHi: "कार्ड", icon: "CreditCard" },
  cheque: { label: "Cheque", labelHi: "चेक", icon: "FileText" },
  credit: { label: "Credit", labelHi: "उधार", icon: "Clock" },
  dd: { label: "Demand Draft", labelHi: "डिमांड ड्राफ्ट", icon: "FileCheck" },
} as const

/**
 * UPI Apps popular in India
 */
export type UpiApp = "gpay" | "phonepe" | "paytm" | "bhim" | "bank" | "other"

export const UPI_APP_CONFIG = {
  gpay: { label: "Google Pay", icon: "gpay" },
  phonepe: { label: "PhonePe", icon: "phonepe" },
  paytm: { label: "Paytm", icon: "paytm" },
  bhim: { label: "BHIM", icon: "bhim" },
  bank: { label: "Bank UPI", icon: "bank" },
  other: { label: "Other", icon: "smartphone" },
} as const

/**
 * Bill payment status
 */
export type BillPaymentStatus = "pending" | "partial" | "paid" | "overdue"

export const BILL_STATUS_CONFIG = {
  pending: { label: "Pending", labelHi: "बाकी", variant: "warning" as const },
  partial: { label: "Partial", labelHi: "आंशिक", variant: "info" as const },
  paid: { label: "Paid", labelHi: "भुगतान", variant: "success" as const },
  overdue: { label: "Overdue", labelHi: "विलंबित", variant: "error" as const },
} as const

/**
 * TDS Sections for service payments
 */
export type TdsSection = "194C" | "194J" | "194I" | "194H"

export const TDS_SECTION_CONFIG = {
  "194C": { label: "194C - Contractor", rate: 1.0, description: "Payments to contractors" },
  "194J": { label: "194J - Professional", rate: 10.0, description: "Professional/technical fees" },
  "194I": { label: "194I - Rent", rate: 10.0, description: "Rent payments" },
  "194H": { label: "194H - Commission", rate: 5.0, description: "Commission/brokerage" },
} as const

/**
 * Kitchen wastage reasons
 */
export type WastageReason = "over_prepared" | "spoiled" | "expired" | "damaged" | "other"

export const WASTAGE_REASON_CONFIG = {
  over_prepared: { label: "Over Prepared", labelHi: "ज्यादा बनाया" },
  spoiled: { label: "Spoiled", labelHi: "खराब हो गया" },
  expired: { label: "Expired", labelHi: "समाप्त हो गया" },
  damaged: { label: "Damaged", labelHi: "टूट/फूट" },
  other: { label: "Other", labelHi: "अन्य" },
} as const

/**
 * Budget types
 */
export type BudgetType = "daily_spend" | "bills" | "services" | "total"

export const BUDGET_TYPE_CONFIG = {
  daily_spend: { label: "Daily Spend", labelHi: "रोज़ का खर्च", icon: "ShoppingCart" },
  bills: { label: "Bills", labelHi: "बिल", icon: "Receipt" },
  services: { label: "Services", labelHi: "सेवाएं", icon: "Wrench" },
  total: { label: "Total", labelHi: "कुल", icon: "Calculator" },
} as const

/**
 * Budget period types
 */
export type BudgetPeriodType = "monthly" | "quarterly" | "yearly"

// ============================================================================
// PRODUCT & CATEGORY TYPES
// ============================================================================

/**
 * Product category for kitchen items
 */
export interface ProductCategory {
  id: string
  workspace_id: string
  name: string
  name_hi: string | null
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  created_by: string | null
}

/**
 * Product master for daily spend tracking
 */
export interface Product extends AuditableEntity {
  id: string
  workspace_id: string
  name: string
  name_hi: string | null
  category_id: string | null
  default_unit: string | null
  default_rate: number | null
  is_active: boolean

  // Joined fields
  category?: Pick<ProductCategory, "id" | "name" | "name_hi"> | null
}

/**
 * Product form data
 */
export interface ProductFormData {
  name: string
  name_hi?: string
  category_id?: string
  default_unit?: string
  default_rate?: number
  is_active?: boolean
}

// ============================================================================
// DAILY SPEND TYPES
// ============================================================================

/**
 * Daily spend entry (kitchen purchases)
 */
export interface DailySpend extends AuditableEntity {
  id: string
  workspace_id: string
  property_id: string | null
  spend_date: string
  product_id: string | null
  product_name: string
  category_id: string | null
  category_name: string | null
  quantity: number
  unit: string
  rate: number
  total: number
  vendor_name: string | null
  notes: string | null
  receipt_url: string | null
  payment_mode: PaymentMode
  upi_ref_number: string | null
  upi_app: UpiApp | null
  payment_reference: string | null

  // Joined fields
  property?: { id: string; name: string } | null
  product?: Pick<Product, "id" | "name" | "name_hi" | "default_unit"> | null
  category?: Pick<ProductCategory, "id" | "name" | "name_hi"> | null
}

/**
 * Daily spend form data
 */
export interface DailySpendFormData {
  property_id?: string
  spend_date: string
  product_id?: string
  product_name: string
  category_name?: string
  quantity: number
  unit: string
  rate: number
  total?: number // Auto-calculated
  vendor_name?: string
  notes?: string
  payment_mode?: PaymentMode
  payment_reference?: string
}

/**
 * Bulk daily spend entry (multiple items at once)
 */
export interface DailySpendBulkItem {
  product_id?: string
  product_name: string
  category_name?: string
  quantity: number
  unit: string
  rate: number
}

/**
 * Daily spend summary for dashboard
 */
export interface DailySpendSummary {
  date: string
  total_items: number
  total_amount: number
  by_category: Record<string, number>
}

// ============================================================================
// VENDOR & BILL PAYMENT TYPES
// ============================================================================

/**
 * Bill category
 */
export interface BillCategory {
  id: string
  workspace_id: string
  name: string
  name_hi: string | null
  description: string | null
  sort_order: number
  is_active: boolean
  is_recurring: boolean
  typical_due_day: number | null
  created_at: string
  created_by: string | null
}

/**
 * Vendor (bill payment party)
 */
export interface Vendor extends AuditableEntity {
  id: string
  workspace_id: string
  name: string
  category_id: string | null

  // Contact info
  contact_name: string | null
  phone: string | null
  email: string | null
  address: string | null

  // India-specific
  gstin: string | null
  pan: string | null
  upi_id: string | null

  // Bank details
  bank_name: string | null
  bank_account: string | null
  bank_ifsc: string | null

  is_active: boolean
  notes: string | null

  // Joined fields
  category?: Pick<BillCategory, "id" | "name" | "name_hi"> | null

  // Computed fields
  total_paid?: number
  last_payment_date?: string
}

/**
 * Vendor form data
 */
export interface VendorFormData {
  name: string
  category_id?: string
  contact_name?: string
  phone?: string
  email?: string
  address?: string
  gstin?: string
  pan?: string
  upi_id?: string
  bank_name?: string
  bank_account?: string
  bank_ifsc?: string
  is_active?: boolean
  notes?: string
}

/**
 * Bill payment
 */
export interface BillPayment extends AuditableEntity {
  id: string
  workspace_id: string
  property_id: string | null
  vendor_id: string | null
  vendor_name: string
  category_id: string | null
  category_name: string | null

  // Bill details
  bill_number: string | null
  bill_period: string | null
  bill_date: string | null
  due_date: string | null

  // Amounts
  bill_amount: number

  // GST breakdown
  base_amount: number | null
  gst_amount: number | null
  cgst: number | null
  sgst: number | null
  igst: number | null
  hsn_code: string | null

  // Payment
  paid_amount: number | null
  payment_date: string | null
  payment_mode: PaymentMode | null
  payment_reference: string | null

  status: BillPaymentStatus

  receipt_url: string | null
  invoice_url: string | null
  notes: string | null

  // Joined fields
  property?: { id: string; name: string } | null
  vendor?: Pick<Vendor, "id" | "name" | "upi_id"> | null
  category?: Pick<BillCategory, "id" | "name" | "name_hi"> | null
}

/**
 * Bill payment form data
 */
export interface BillPaymentFormData {
  property_id?: string
  vendor_id?: string
  vendor_name: string
  category_id?: string
  category_name?: string

  bill_number?: string
  bill_period?: string
  bill_date?: string
  due_date?: string

  bill_amount: number

  // GST (optional)
  base_amount?: number
  gst_amount?: number
  cgst?: number
  sgst?: number
  igst?: number
  hsn_code?: string

  paid_amount?: number
  payment_date?: string
  payment_mode?: PaymentMode
  payment_reference?: string

  status?: BillPaymentStatus
  notes?: string
}

// ============================================================================
// SERVICE PROVIDER & PAYMENT TYPES
// ============================================================================

/**
 * Service category
 */
export interface ServiceCategory {
  id: string
  workspace_id: string
  name: string
  name_hi: string | null
  description: string | null
  sort_order: number
  is_active: boolean
  default_tds_section: TdsSection | null
  default_tds_rate: number | null
  created_at: string
  created_by: string | null
}

/**
 * Service provider
 */
export interface ServiceProvider extends AuditableEntity {
  id: string
  workspace_id: string
  name: string
  category_id: string | null

  // Contact info
  phone: string | null
  alternate_phone: string | null
  email: string | null
  address: string | null

  // India-specific (for TDS)
  pan: string | null
  gstin: string | null
  upi_id: string | null

  // TDS settings
  tds_applicable: boolean
  tds_section: TdsSection | null
  tds_rate: number | null

  // Rating & stats
  rating: number | null
  total_jobs: number
  is_active: boolean
  notes: string | null

  // Joined fields
  category?: Pick<ServiceCategory, "id" | "name" | "name_hi"> | null
}

/**
 * Service provider form data
 */
export interface ServiceProviderFormData {
  name: string
  category_id?: string
  phone?: string
  alternate_phone?: string
  email?: string
  address?: string
  pan?: string
  gstin?: string
  upi_id?: string
  tds_applicable?: boolean
  tds_section?: TdsSection
  tds_rate?: number
  is_active?: boolean
  notes?: string
}

/**
 * Service payment
 */
export interface ServicePayment extends AuditableEntity {
  id: string
  workspace_id: string
  property_id: string | null
  room_id: string | null
  provider_id: string | null
  provider_name: string
  category_id: string | null
  category_name: string | null

  service_date: string
  description: string

  // Amounts with TDS
  gross_amount: number
  tds_applicable: boolean
  tds_section: TdsSection | null
  tds_rate: number | null
  tds_amount: number
  net_amount: number

  payment_mode: PaymentMode | null
  payment_reference: string | null
  payment_date: string | null

  // Warranty
  warranty_months: number
  warranty_expiry: string | null

  // Documentation
  photos: string[]
  receipt_url: string | null
  notes: string | null

  // Link to complaint
  complaint_id: string | null

  // Joined fields
  property?: { id: string; name: string } | null
  room?: { id: string; room_number: string } | null
  provider?: Pick<ServiceProvider, "id" | "name" | "phone" | "rating"> | null
  category?: Pick<ServiceCategory, "id" | "name" | "name_hi"> | null
  complaint?: { id: string; title: string } | null
}

/**
 * Service payment form data
 */
export interface ServicePaymentFormData {
  property_id?: string
  room_id?: string
  provider_id?: string
  provider_name: string
  category_id?: string
  category_name?: string

  service_date: string
  description: string

  gross_amount: number
  tds_applicable?: boolean
  tds_section?: TdsSection
  tds_rate?: number
  tds_amount?: number // Auto-calculated
  net_amount?: number // Auto-calculated

  payment_mode?: PaymentMode
  payment_reference?: string
  payment_date?: string

  warranty_months?: number

  photos?: string[]
  notes?: string

  complaint_id?: string
}

// ============================================================================
// BUDGET & ANALYTICS TYPES
// ============================================================================

/**
 * Expense budget
 */
export interface ExpenseBudget {
  id: string
  workspace_id: string
  property_id: string | null
  budget_type: BudgetType
  category_id: string | null

  period_type: BudgetPeriodType
  fiscal_year: string
  month: number | null
  quarter: number | null

  budget_amount: number
  alert_threshold: number

  created_at: string
  updated_at: string
  created_by: string | null

  // Computed fields
  actual_amount?: number
  usage_percentage?: number
  status?: "on_track" | "warning" | "over_budget"
}

/**
 * Budget form data
 */
export interface ExpenseBudgetFormData {
  property_id?: string
  budget_type: BudgetType
  category_id?: string
  period_type: BudgetPeriodType
  fiscal_year: string
  month?: number
  quarter?: number
  budget_amount: number
  alert_threshold?: number
}

/**
 * Product price history
 */
export interface ProductPriceHistory {
  id: string
  workspace_id: string
  product_id: string
  recorded_date: string
  rate: number
  vendor_name: string | null
  quantity: number | null
  source_type: "daily_spend" | "manual" | "import"
  source_id: string | null
  created_at: string
}

/**
 * Kitchen wastage entry
 */
export interface KitchenWastage {
  id: string
  workspace_id: string
  property_id: string | null
  wastage_date: string
  product_id: string | null
  product_name: string
  quantity: number
  unit: string
  estimated_value: number
  reason: WastageReason | null
  notes: string | null
  created_at: string
  created_by: string | null

  // Joined fields
  property?: { id: string; name: string } | null
  product?: Pick<Product, "id" | "name"> | null
}

/**
 * Wastage form data
 */
export interface KitchenWastageFormData {
  property_id?: string
  wastage_date: string
  product_id?: string
  product_name: string
  quantity: number
  unit: string
  estimated_value: number
  reason?: WastageReason
  notes?: string
}

/**
 * UPI payment details
 */
export interface PaymentUpiDetails {
  id: string
  entity_type: "daily_spend" | "bill_payment" | "service_payment" | "expense"
  entity_id: string
  upi_app: UpiApp | null
  upi_id: string | null
  transaction_id: string | null
  screenshot_url: string | null
  created_at: string
}

// ============================================================================
// ANALYTICS & REPORT TYPES
// ============================================================================

/**
 * Unified expense view (combining all expense types)
 */
export interface UnifiedExpense {
  id: string
  source: "daily_spend" | "bill_payment" | "service_payment" | "expense"
  date: string
  category: string
  description: string
  amount: number
  property_id: string | null
  property_name: string | null
  vendor: string | null
}

/**
 * Expense summary by period
 */
export interface ExpenseSummary {
  period: string // "2026-01", "2025-26-Q4", "2025-26"
  period_type: BudgetPeriodType
  daily_spend_total: number
  bills_total: number
  services_total: number
  expenses_total: number // From existing expense module
  grand_total: number
  by_category: Record<string, number>
  by_property: Record<string, number>
}

/**
 * Per-person cost calculation
 */
export interface PerPersonCost {
  period: string
  property_id: string
  property_name: string
  total_tenants: number
  total_kitchen_spend: number
  per_person_per_day: number
  per_person_per_month: number
  industry_benchmark: number | null
  variance: number | null
}

/**
 * Price trend for a product
 */
export interface ProductPriceTrend {
  product_id: string
  product_name: string
  current_rate: number
  average_rate_30d: number
  average_rate_90d: number
  min_rate: number
  max_rate: number
  price_change_percent: number
  trend: "up" | "down" | "stable"
}

// ============================================================================
// LIST ITEM TYPES (for DataTable)
// ============================================================================

export interface DailySpendListItem extends DailySpend {
  spend_month?: string
  spend_year?: string
}

export interface BillPaymentListItem extends BillPayment {
  payment_month?: string
  payment_year?: string
  days_until_due?: number
}

export interface ServicePaymentListItem extends ServicePayment {
  service_month?: string
  service_year?: string
  warranty_status?: "active" | "expired" | "none"
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface DailySpendFilters {
  property_id?: string
  category_id?: string
  vendor_name?: string
  date_from?: string
  date_to?: string
  payment_mode?: PaymentMode
}

export interface BillPaymentFilters {
  property_id?: string
  vendor_id?: string
  category_id?: string
  status?: BillPaymentStatus
  date_from?: string
  date_to?: string
  due_date_from?: string
  due_date_to?: string
}

export interface ServicePaymentFilters {
  property_id?: string
  provider_id?: string
  category_id?: string
  date_from?: string
  date_to?: string
  has_warranty?: boolean
  linked_to_complaint?: boolean
}
