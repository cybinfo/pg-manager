/**
 * Centralized Status Configurations
 *
 * Single source of truth for status labels, variants, and colors across the application.
 * Import from here instead of defining inline in pages.
 *
 * @example
 * import { TENANT_STATUS, COMPLAINT_STATUS, getStatusConfig } from "@/lib/status-config"
 *
 * // Direct usage
 * const config = TENANT_STATUS.active // { label: "Active", variant: "success" }
 *
 * // With helper function
 * const config = getStatusConfig("tenant", status)
 */

// ============================================================================
// TYPES
// ============================================================================

// StatusDot component only supports these variants (no "default")
export type StatusDotVariant = "success" | "warning" | "error" | "muted"

// TableBadge component supports all variants including "default"
export type StatusVariant = "success" | "warning" | "error" | "muted" | "default"

export interface StatusConfig {
  label: string
  variant: StatusVariant
}

export interface StatusConfigWithIcon extends StatusConfig {
  icon?: React.ComponentType<{ className?: string }>
  color?: string
  bgColor?: string
}

// ============================================================================
// TENANT STATUS
// ============================================================================

export const TENANT_STATUS: Record<string, StatusConfig> = {
  active: { label: "Active", variant: "success" },
  notice_period: { label: "Notice", variant: "warning" },
  checked_out: { label: "Moved Out", variant: "muted" },
  moved_out: { label: "Moved Out", variant: "muted" },
}

// ============================================================================
// COMPLAINT STATUS & PRIORITY
// ============================================================================

export const COMPLAINT_STATUS: Record<string, StatusConfig> = {
  open: { label: "Open", variant: "error" },
  acknowledged: { label: "Acknowledged", variant: "warning" },
  in_progress: { label: "In Progress", variant: "warning" },
  resolved: { label: "Resolved", variant: "success" },
  closed: { label: "Closed", variant: "muted" },
}

export const COMPLAINT_PRIORITY: Record<string, StatusConfig> = {
  low: { label: "Low", variant: "muted" },
  medium: { label: "Medium", variant: "default" },
  high: { label: "High", variant: "warning" },
  urgent: { label: "Urgent", variant: "error" },
}

export const COMPLAINT_CATEGORIES: Record<string, string> = {
  electrical: "Electrical",
  plumbing: "Plumbing",
  furniture: "Furniture",
  cleanliness: "Cleanliness",
  appliances: "Appliances",
  security: "Security",
  noise: "Noise",
  other: "Other",
}

// ============================================================================
// REFUND STATUS
// ============================================================================

export const REFUND_STATUS: Record<string, StatusConfig> = {
  pending: { label: "Pending", variant: "warning" },
  processing: { label: "Processing", variant: "muted" },
  completed: { label: "Completed", variant: "success" },
  failed: { label: "Failed", variant: "error" },
  cancelled: { label: "Cancelled", variant: "error" },
}

// ============================================================================
// EXIT CLEARANCE STATUS
// ============================================================================

export const EXIT_CLEARANCE_STATUS: Record<string, StatusConfig> = {
  initiated: { label: "Initiated", variant: "muted" },
  pending_payment: { label: "Pending", variant: "warning" },
  cleared: { label: "Cleared", variant: "success" },
}

// ============================================================================
// APPROVAL STATUS
// ============================================================================

export const APPROVAL_STATUS: Record<string, StatusConfig> = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "error" },
  cancelled: { label: "Cancelled", variant: "muted" },
}

export const APPROVAL_PRIORITY: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-rose-100 text-rose-700",
}

// ============================================================================
// VISITOR STATUS
// ============================================================================

export const VISITOR_STATUS: Record<string, StatusConfig> = {
  checked_in: { label: "Inside", variant: "success" },
  checked_out: { label: "Left", variant: "muted" },
}

// ============================================================================
// NOTICE TYPES
// ============================================================================

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

// ============================================================================
// METER TYPES
// ============================================================================

export const METER_TYPES: Record<string, { label: string; color: string; bgColor: string; unit: string }> = {
  electricity: { label: "Electricity", color: "text-yellow-700", bgColor: "bg-yellow-100", unit: "kWh" },
  water: { label: "Water", color: "text-blue-700", bgColor: "bg-blue-100", unit: "L" },
  gas: { label: "Gas", color: "text-orange-700", bgColor: "bg-orange-100", unit: "m³" },
}

// ============================================================================
// STAFF/PERSON STATUS
// ============================================================================

export const ACTIVE_STATUS: Record<string, StatusConfig> = {
  active: { label: "Active", variant: "success" },
  inactive: { label: "Inactive", variant: "muted" },
}

export const PERSON_TAG_COLORS: Record<string, string> = {
  tenant: "bg-blue-100 text-blue-700",
  staff: "bg-green-100 text-green-700",
  visitor: "bg-purple-100 text-purple-700",
  service_provider: "bg-orange-100 text-orange-700",
  frequent: "bg-yellow-100 text-yellow-700",
  vip: "bg-amber-100 text-amber-700",
}

// ============================================================================
// PAYMENT METHODS (shared between payments and expenses)
// ============================================================================

export const PAYMENT_METHODS: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
  card: "Card",
  other: "Other",
}

// ============================================================================
// DOCUMENT STATUS
// ============================================================================

export const DOCUMENT_STATUS: Record<string, StatusConfig> = {
  pending: { label: "Pending Review", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "error" },
}

// ============================================================================
// POLICE VERIFICATION STATUS
// ============================================================================

export const POLICE_VERIFICATION_STATUS: Record<string, StatusConfig> = {
  pending: { label: "Pending", variant: "warning" },
  submitted: { label: "Submitted", variant: "default" },
  verified: { label: "Verified", variant: "success" },
}

// ============================================================================
// NOTICE TYPE LABELS (for list page computed fields)
// ============================================================================

export const NOTICE_TYPE_LABELS: Record<string, string> = {
  general: "General",
  maintenance: "Maintenance",
  payment_reminder: "Payment Reminder",
  emergency: "Emergency",
}

// ============================================================================
// REFUND TYPE LABELS
// ============================================================================

export const REFUND_TYPE_LABELS: Record<string, string> = {
  deposit_refund: "Deposit Refund",
  overpayment: "Overpayment",
  adjustment: "Adjustment",
  other: "Other",
}

// ============================================================================
// REFUND STATUS LABELS (simple string labels extracted from REFUND_STATUS)
// ============================================================================

export const REFUND_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
}

// ============================================================================
// METER STATUS & TYPE LABELS
// ============================================================================

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

// ============================================================================
// INQUIRY STATUS & SOURCE LABELS
// ============================================================================

export const INQUIRY_STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  converted: "Converted",
  closed: "Closed",
}

export const INQUIRY_SOURCE_LABELS: Record<string, string> = {
  website: "Website",
  whatsapp: "WhatsApp",
  phone: "Phone",
}

// ============================================================================
// KITCHEN WASTAGE REASON LABELS (with Hindi)
// ============================================================================

export const KITCHEN_WASTAGE_REASON_LABELS: Record<string, { label: string; labelHi: string }> = {
  over_prepared: { label: "Over Prepared", labelHi: "ज्यादा बनाया" },
  spoiled: { label: "Spoiled", labelHi: "खराब हो गया" },
  expired: { label: "Expired", labelHi: "समाप्त हो गया" },
  damaged: { label: "Damaged", labelHi: "टूट/फूट" },
  other: { label: "Other", labelHi: "अन्य" },
}

// ============================================================================
// BILL PAYMENT STATUS LABELS (with Hindi, for enhanced expense module)
// ============================================================================

export const BILL_PAYMENT_STATUS_LABELS: Record<string, { label: string; labelHi: string }> = {
  pending: { label: "Pending", labelHi: "बाकी" },
  partial: { label: "Partial", labelHi: "आंशिक" },
  paid: { label: "Paid", labelHi: "भुगतान" },
  overdue: { label: "Overdue", labelHi: "विलंबित" },
}

// ============================================================================
// LIBRARY SEAT STATUS LABELS
// ============================================================================

export const LIBRARY_SEAT_STATUS_LABELS: Record<string, string> = {
  available: "Available",
  occupied: "Occupied",
  reserved: "Reserved",
  maintenance: "Maintenance",
}

// ============================================================================
// LIBRARY MEMBER STATUS LABELS
// ============================================================================

export const LIBRARY_MEMBER_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  expired: "Expired",
  suspended: "Suspended",
  cancelled: "Cancelled",
}

// ============================================================================
// LIBRARY MEMBERSHIP STATUS LABELS
// ============================================================================

export const LIBRARY_MEMBERSHIP_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  expired: "Expired",
  cancelled: "Cancelled",
  upgraded: "Upgraded",
}

// ============================================================================
// LIBRARY LOCKER STATUS & SIZE LABELS
// ============================================================================

export const LIBRARY_LOCKER_STATUS_LABELS: Record<string, string> = {
  available: "Available",
  occupied: "Occupied",
  maintenance: "Maintenance",
}

export const LIBRARY_LOCKER_SIZE_LABELS: Record<string, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
}

// ============================================================================
// LIBRARY PAYMENT LABELS
// ============================================================================

export const LIBRARY_PAYMENT_TYPE_LABELS: Record<string, string> = {
  subscription: "Subscription",
  locker_rent: "Locker Rent",
  locker_deposit: "Locker Deposit",
  fine: "Fine",
  other: "Other",
}

export const LIBRARY_PAYMENT_STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  pending: "Pending",
  refunded: "Refunded",
}

export const LIBRARY_PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
  paytm: "Paytm",
  other: "Other",
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const STATUS_CONFIGS: Record<string, Record<string, StatusConfig>> = {
  tenant: TENANT_STATUS,
  complaint: COMPLAINT_STATUS,
  complaint_priority: COMPLAINT_PRIORITY,
  refund: REFUND_STATUS,
  exit_clearance: EXIT_CLEARANCE_STATUS,
  approval: APPROVAL_STATUS,
  visitor: VISITOR_STATUS,
  active: ACTIVE_STATUS,
  document: DOCUMENT_STATUS,
  police_verification: POLICE_VERIFICATION_STATUS,
}

/**
 * Get status configuration for a given entity type and status value
 *
 * @example
 * const config = getStatusConfig("tenant", "active") // { label: "Active", variant: "success" }
 */
export function getStatusConfig(
  entityType: keyof typeof STATUS_CONFIGS,
  status: string
): StatusConfig {
  const config = STATUS_CONFIGS[entityType]?.[status]
  return config || { label: status, variant: "muted" }
}

/**
 * Get status info in the format used by StatusDot component
 * Maps "default" variant to "muted" since StatusDot doesn't support "default"
 *
 * @example
 * const { status, label } = getStatusInfo("tenant", tenantStatus)
 * <StatusDot status={status} label={label} />
 */
export function getStatusInfo(
  entityType: keyof typeof STATUS_CONFIGS,
  status: string
): { status: StatusDotVariant; label: string } {
  const config = getStatusConfig(entityType, status)
  // StatusDot doesn't support "default", map it to "muted"
  const dotVariant: StatusDotVariant = config.variant === "default" ? "muted" : config.variant
  return { status: dotVariant, label: config.label }
}
