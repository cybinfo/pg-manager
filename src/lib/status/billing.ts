/**
 * Billing-related Status Configurations
 * Refund, Exit Clearance, Payment Methods, etc.
 */

import { Megaphone, AlertTriangle, Wrench, CreditCard, type LucideIcon } from "lucide-react"
import type { StatusConfig } from "./shared"

export const REFUND_STATUS: Record<string, StatusConfig> = {
  pending: { label: "Pending", variant: "warning" },
  processing: { label: "Processing", variant: "muted" },
  completed: { label: "Completed", variant: "success" },
  failed: { label: "Failed", variant: "error" },
  cancelled: { label: "Cancelled", variant: "error" },
}

export const EXIT_CLEARANCE_STATUS: Record<string, StatusConfig> = {
  initiated: { label: "Initiated", variant: "muted" },
  pending_payment: { label: "Pending", variant: "warning" },
  cleared: { label: "Cleared", variant: "success" },
}

export const PAYMENT_METHODS: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  paytm: "Paytm",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
  card: "Card",
  dd: "Demand Draft",
  credit: "Credit",
  other: "Other",
}

export const DOCUMENT_STATUS: Record<string, StatusConfig> = {
  pending: { label: "Pending Review", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "error" },
}

export const POLICE_VERIFICATION_STATUS: Record<string, StatusConfig> = {
  pending: { label: "Pending", variant: "warning" },
  submitted: { label: "Submitted", variant: "default" },
  verified: { label: "Verified", variant: "success" },
  na: { label: "N/A", variant: "muted" },
}

export const POLICE_VERIFICATION_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "submitted", label: "Submitted" },
  { value: "verified", label: "Verified" },
  { value: "na", label: "N/A" },
]

export const REFUND_TYPE_LABELS: Record<string, string> = {
  security_deposit: "Security Deposit",
  advance_rent: "Advance Rent",
  deposit_refund: "Deposit Refund",
  overpayment: "Overpayment",
  adjustment: "Adjustment",
  other: "Other",
}

export const REFUND_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
}

export const NOTICE_TYPES: Record<string, { label: string; color: string; bgColor: string }> = {
  general: { label: "General", color: "text-info", bgColor: "bg-info/10" },
  maintenance: { label: "Maintenance", color: "text-warning", bgColor: "bg-warning/10" },
  payment_reminder: { label: "Payment Reminder", color: "text-success", bgColor: "bg-success/10" },
  emergency: { label: "Emergency", color: "text-destructive", bgColor: "bg-destructive/10" },
}

export const NOTICE_AUDIENCES: Record<string, string> = {
  all: "All Residents",
  tenants_only: "Tenants Only",
  specific_rooms: "Specific Rooms",
}

export const NOTICE_TYPE_LABELS: Record<string, string> = {
  general: "General",
  maintenance: "Maintenance",
  payment_reminder: "Payment Reminder",
  emergency: "Emergency",
}

export const METER_TYPES: Record<string, { label: string; color: string; bgColor: string; unit: string }> = {
  electricity: { label: "Electricity", color: "text-warning", bgColor: "bg-warning/10", unit: "kWh" },
  water: { label: "Water", color: "text-info", bgColor: "bg-info/10", unit: "L" },
  gas: { label: "Gas", color: "text-warning", bgColor: "bg-warning/10", unit: "m³" },
}

export const METER_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  faulty: "Faulty",
  replaced: "Replaced",
  retired: "Retired",
}

export const METER_TYPE_LABELS: Record<string, string> = {
  electricity: "Electricity",
  water: "Water",
  gas: "Gas",
}

export const PERSON_TAG_COLORS: Record<string, string> = {
  tenant: "bg-info/10 text-info",
  staff: "bg-success/10 text-success",
  visitor: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  service_provider: "bg-warning/10 text-warning",
  frequent: "bg-warning/10 text-warning",
  vip: "bg-warning/10 text-warning",
}

export const KITCHEN_WASTAGE_REASON_LABELS: Record<string, { label: string; labelHi: string }> = {
  over_prepared: { label: "Over Prepared", labelHi: "ज्यादा बनाया" },
  spoiled: { label: "Spoiled", labelHi: "खराब हो गया" },
  expired: { label: "Expired", labelHi: "समाप्त हो गया" },
  damaged: { label: "Damaged", labelHi: "टूट/फूट" },
  other: { label: "Other", labelHi: "अन्य" },
}

export const BILL_PAYMENT_STATUS_LABELS: Record<string, { label: string; labelHi: string }> = {
  pending: { label: "Pending", labelHi: "बाकी" },
  partial: { label: "Partial", labelHi: "आंशिक" },
  paid: { label: "Paid", labelHi: "भुगतान" },
  overdue: { label: "Overdue", labelHi: "विलंबित" },
}

// ============================================================================
// NOTICE TYPE CONFIG (with icons for display)
// ============================================================================

export const NOTICE_TYPE_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  general: { label: "General", color: "text-info", bgColor: "bg-info/10", icon: "Megaphone" },
  maintenance: { label: "Maintenance", color: "text-warning", bgColor: "bg-warning/10", icon: "Wrench" },
  payment_reminder: { label: "Payment Reminder", color: "text-success", bgColor: "bg-success/10", icon: "CreditCard" },
  emergency: { label: "Emergency", color: "text-destructive", bgColor: "bg-destructive/10", icon: "AlertTriangle" },
}

export const NOTICE_TYPE_DISPLAY_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: LucideIcon }> = {
  general: { label: "General", color: "text-info", bgColor: "bg-info/10", icon: Megaphone },
  maintenance: { label: "Maintenance", color: "text-warning", bgColor: "bg-warning/10", icon: Wrench },
  payment_reminder: { label: "Payment Reminder", color: "text-success", bgColor: "bg-success/10", icon: CreditCard },
  emergency: { label: "Emergency", color: "text-destructive", bgColor: "bg-destructive/10", icon: AlertTriangle },
}

// ============================================================================
// METER READING TYPE CONFIG (with icons for display)
// ============================================================================

export const METER_READING_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string; bgColor: string; unit: string }> = {
  electricity: { label: "Electricity", icon: "Zap", color: "text-warning", bgColor: "bg-warning/10", unit: "kWh" },
  water: { label: "Water", icon: "Droplets", color: "text-info", bgColor: "bg-info/10", unit: "L" },
  gas: { label: "Gas", icon: "Gauge", color: "text-warning", bgColor: "bg-warning/10", unit: "m\u00b3" },
}

// ============================================================================
// PERSON TAG ICONS (icon name strings for use with lucide-react)
// ============================================================================

export const PERSON_TAG_ICONS: Record<string, string> = {
  tenant: "Home",
  staff: "Briefcase",
  visitor: "UserCircle",
  service_provider: "Wrench",
  frequent: "Star",
  vip: "Star",
}

// ============================================================================
// BILL STATUS VARIANT CONFIG (for StatusBadge, TableBadge)
// ============================================================================

export const BILL_STATUS: Record<string, StatusConfig> = {
  unpaid: { label: "Unpaid", variant: "warning" },
  pending: { label: "Pending", variant: "warning" },
  partial: { label: "Partial", variant: "muted" },
  paid: { label: "Paid", variant: "success" },
  overdue: { label: "Overdue", variant: "error" },
  cancelled: { label: "Cancelled", variant: "muted" },
}

export const BILL_STATUS_TEXT_COLORS: Record<string, string> = {
  paid: "text-success",
  pending: "text-warning",
  partial: "text-info",
  overdue: "text-destructive",
}

// ============================================================================
// ROOM STATUS VARIANT CONFIG
// ============================================================================

export const ROOM_STATUS: Record<string, StatusConfig> = {
  available: { label: "Available", variant: "success" },
  occupied: { label: "Occupied", variant: "error" },
  partially_occupied: { label: "Partially Occupied", variant: "warning" },
  maintenance: { label: "Maintenance", variant: "muted" },
}

// ============================================================================
// HELPER: Convert Record<string, string> label maps to {value, label}[] arrays
// ============================================================================

/**
 * Convert a `Record<string, string>` label map to an array of `{ value, label }` options
 * suitable for Select/Combobox components.
 *
 * @param labels - e.g. PAYMENT_METHODS, REFUND_TYPE_LABELS
 * @param keys  - optional subset of keys to include (preserves given order)
 *
 * @example
 * labelsToOptions(PAYMENT_METHODS)                         // all options
 * labelsToOptions(PAYMENT_METHODS, ["cash", "upi", "card"]) // subset
 */
export function labelsToOptions(
  labels: Record<string, string>,
  keys?: string[],
): { value: string; label: string }[] {
  const entries = keys
    ? keys.filter((k) => k in labels).map((k) => [k, labels[k]] as const)
    : Object.entries(labels)
  return entries.map(([value, label]) => ({ value, label }))
}

// ============================================================================
// FORM OPTION ARRAYS (derived from label maps above)
// ============================================================================

/** Standard PG payment method options (5 common modes) */
export const PAYMENT_METHOD_OPTIONS = labelsToOptions(PAYMENT_METHODS, [
  "cash", "upi", "bank_transfer", "cheque", "card",
])

/** Refund payment mode options (4 modes — no card) */
export const REFUND_PAYMENT_MODE_OPTIONS = labelsToOptions(PAYMENT_METHODS, [
  "cash", "upi", "bank_transfer", "cheque",
])

/** Refund type options for forms */
export const REFUND_TYPE_OPTIONS = labelsToOptions(REFUND_TYPE_LABELS)

/** Expense payment mode options (5 standard) */
export const EXPENSE_PAYMENT_MODE_OPTIONS = labelsToOptions(PAYMENT_METHODS, [
  "cash", "upi", "bank_transfer", "card", "cheque",
])

/** Expense daily-spend payment mode options (includes credit) */
export const EXPENSE_DAILY_SPEND_PAYMENT_MODE_OPTIONS = labelsToOptions(PAYMENT_METHODS, [
  "cash", "upi", "card", "bank_transfer", "credit",
])

/** Expense misc payment mode options (full set) */
export const EXPENSE_MISC_PAYMENT_MODE_OPTIONS = labelsToOptions(PAYMENT_METHODS, [
  "cash", "upi", "paytm", "bank_transfer", "card", "cheque", "other",
])

/** Payment status options for payment records */
export const PAYMENT_STATUS_OPTIONS = [
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
]

/** Expense bill payment status options */
export const EXPENSE_BILL_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "partial", label: "Partial Payment" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
]

/** Notice type options for form selects */
export const NOTICE_TYPE_OPTIONS = labelsToOptions(NOTICE_TYPE_LABELS)

/** Notice audience options for form selects */
export const NOTICE_AUDIENCE_OPTIONS = labelsToOptions(NOTICE_AUDIENCES)

/** Meter status options for form selects */
export const METER_STATUS_OPTIONS = labelsToOptions(METER_STATUS_LABELS)

/** Meter type options for form selects */
export const METER_TYPE_OPTIONS = labelsToOptions(METER_TYPE_LABELS)

/** Boolean string options for active/inactive selects */
export const BOOLEAN_STRING_OPTIONS = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
]

/** Unit options for products and daily-spend expense entries */
export const UNIT_OPTIONS = [
  { value: "Kg", label: "Kilogram (Kg)" },
  { value: "g", label: "Gram (g)" },
  { value: "Ltr", label: "Litre (Ltr)" },
  { value: "ml", label: "Millilitre (ml)" },
  { value: "Pcs", label: "Pieces (Pcs)" },
  { value: "Dozen", label: "Dozen" },
  { value: "Packet", label: "Packet" },
  { value: "Box", label: "Box" },
  { value: "Bundle", label: "Bundle" },
  { value: "Bottle", label: "Bottle" },
  { value: "Bag", label: "Bag" },
  { value: "Meter", label: "Meter" },
  { value: "Feet", label: "Feet" },
  { value: "Set", label: "Set" },
  { value: "Pair", label: "Pair" },
  { value: "Other", label: "Other" },
]
