/**
 * Billing-related Status Configurations
 * Refund, Exit Clearance, Payment Methods, etc.
 */

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
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
  card: "Card",
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
}

export const REFUND_TYPE_LABELS: Record<string, string> = {
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
  general: { label: "General", color: "text-blue-700", bgColor: "bg-blue-100" },
  maintenance: { label: "Maintenance", color: "text-orange-700", bgColor: "bg-orange-100" },
  payment_reminder: { label: "Payment Reminder", color: "text-green-700", bgColor: "bg-green-100" },
  emergency: { label: "Emergency", color: "text-red-700", bgColor: "bg-red-100" },
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
  electricity: { label: "Electricity", color: "text-yellow-700", bgColor: "bg-yellow-100", unit: "kWh" },
  water: { label: "Water", color: "text-blue-700", bgColor: "bg-blue-100", unit: "L" },
  gas: { label: "Gas", color: "text-orange-700", bgColor: "bg-orange-100", unit: "m³" },
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
  tenant: "bg-blue-100 text-blue-700",
  staff: "bg-green-100 text-green-700",
  visitor: "bg-purple-100 text-purple-700",
  service_provider: "bg-orange-100 text-orange-700",
  frequent: "bg-yellow-100 text-yellow-700",
  vip: "bg-amber-100 text-amber-700",
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
  general: { label: "General", color: "text-blue-700", bgColor: "bg-blue-100", icon: "Megaphone" },
  maintenance: { label: "Maintenance", color: "text-orange-700", bgColor: "bg-orange-100", icon: "Wrench" },
  payment_reminder: { label: "Payment Reminder", color: "text-green-700", bgColor: "bg-green-100", icon: "CreditCard" },
  emergency: { label: "Emergency", color: "text-red-700", bgColor: "bg-red-100", icon: "AlertTriangle" },
}

// ============================================================================
// METER READING TYPE CONFIG (with icons for display)
// ============================================================================

export const METER_READING_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string; bgColor: string; unit: string }> = {
  electricity: { label: "Electricity", icon: "Zap", color: "text-yellow-700 dark:text-yellow-300", bgColor: "bg-yellow-100 dark:bg-yellow-900", unit: "kWh" },
  water: { label: "Water", icon: "Droplets", color: "text-blue-700 dark:text-blue-300", bgColor: "bg-blue-100 dark:bg-blue-900", unit: "L" },
  gas: { label: "Gas", icon: "Gauge", color: "text-orange-700 dark:text-orange-300", bgColor: "bg-orange-100 dark:bg-orange-900", unit: "m\u00b3" },
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
