/**
 * Common Filter Options
 *
 * Centralized filter option arrays for use across list pages.
 * Import from here instead of defining inline in pages.
 *
 * @example
 * import { PAYMENT_METHOD_OPTIONS, STATUS_OPTIONS } from "@/lib/filters/common-filters"
 *
 * const filters: FilterConfig[] = [
 *   { id: "payment_method", options: PAYMENT_METHOD_OPTIONS },
 * ]
 */

import { FilterConfig } from "@/components/ui/list-page-filters"

// ============================================================================
// TYPES
// ============================================================================

export interface FilterOption {
  value: string
  label: string
}

// ============================================================================
// PAYMENT METHOD OPTIONS
// ============================================================================

export const PAYMENT_METHOD_OPTIONS: FilterOption[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
]

// ============================================================================
// METER TYPE OPTIONS
// ============================================================================

export const METER_TYPE_OPTIONS: FilterOption[] = [
  { value: "electricity", label: "Electricity" },
  { value: "water", label: "Water" },
  { value: "gas", label: "Gas" },
]

// ============================================================================
// TENANT STATUS OPTIONS
// ============================================================================

export const TENANT_STATUS_OPTIONS: FilterOption[] = [
  { value: "active", label: "Active" },
  { value: "notice_period", label: "Notice Period" },
  { value: "checked_out", label: "Moved Out" },
]

// ============================================================================
// COMPLAINT STATUS OPTIONS
// ============================================================================

export const COMPLAINT_STATUS_OPTIONS: FilterOption[] = [
  { value: "open", label: "Open" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
]

// ============================================================================
// COMPLAINT PRIORITY OPTIONS
// ============================================================================

export const PRIORITY_OPTIONS: FilterOption[] = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
]

// ============================================================================
// BILL STATUS OPTIONS
// ============================================================================

export const BILL_STATUS_OPTIONS: FilterOption[] = [
  { value: "pending", label: "Pending" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
]

// ============================================================================
// REFUND STATUS OPTIONS
// ============================================================================

export const REFUND_STATUS_OPTIONS: FilterOption[] = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
]

// ============================================================================
// REFUND TYPE OPTIONS
// ============================================================================

export const REFUND_TYPE_OPTIONS: FilterOption[] = [
  { value: "deposit_refund", label: "Deposit Refund" },
  { value: "overpayment", label: "Overpayment" },
  { value: "adjustment", label: "Adjustment" },
  { value: "other", label: "Other" },
]

// ============================================================================
// EXIT CLEARANCE STATUS OPTIONS
// ============================================================================

export const EXIT_CLEARANCE_STATUS_OPTIONS: FilterOption[] = [
  { value: "initiated", label: "Initiated" },
  { value: "pending_payment", label: "Pending Payment" },
  { value: "cleared", label: "Cleared" },
]

// ============================================================================
// VISITOR STATUS OPTIONS
// ============================================================================

export const VISITOR_STATUS_OPTIONS: FilterOption[] = [
  { value: "checked_in", label: "Inside" },
  { value: "checked_out", label: "Left" },
]

// ============================================================================
// VISITOR TYPE OPTIONS
// ============================================================================

export const VISITOR_TYPE_OPTIONS: FilterOption[] = [
  { value: "tenant_visitor", label: "Tenant Visitor" },
  { value: "enquiry", label: "Enquiry" },
  { value: "service_provider", label: "Service Provider" },
  { value: "general", label: "General" },
]

// ============================================================================
// APPROVAL STATUS OPTIONS
// ============================================================================

export const APPROVAL_STATUS_OPTIONS: FilterOption[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
]

// ============================================================================
// NOTICE TYPE OPTIONS
// ============================================================================

export const NOTICE_TYPE_OPTIONS: FilterOption[] = [
  { value: "general", label: "General" },
  { value: "maintenance", label: "Maintenance" },
  { value: "payment_reminder", label: "Payment Reminder" },
  { value: "emergency", label: "Emergency" },
]

// ============================================================================
// ACTIVE STATUS OPTIONS (for staff, etc.)
// ============================================================================

export const ACTIVE_STATUS_OPTIONS: FilterOption[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
]

// ============================================================================
// METER STATUS OPTIONS
// ============================================================================

export const METER_STATUS_OPTIONS: FilterOption[] = [
  { value: "active", label: "Active" },
  { value: "faulty", label: "Faulty" },
  { value: "replaced", label: "Replaced" },
  { value: "retired", label: "Retired" },
]

// ============================================================================
// ROOM STATUS OPTIONS
// ============================================================================

export const ROOM_STATUS_OPTIONS: FilterOption[] = [
  { value: "available", label: "Available" },
  { value: "occupied", label: "Occupied" },
  { value: "partially_occupied", label: "Partially Occupied" },
  { value: "maintenance", label: "Maintenance" },
]

// ============================================================================
// TIME SLOT OPTIONS — used by library-members and library-subscriptions
// ============================================================================

export const TIME_SLOT_OPTIONS: FilterOption[] = [
  { value: "Morning", label: "Morning" },
  { value: "Evening", label: "Evening" },
  { value: "Night", label: "Night" },
  { value: "24 Hours", label: "24 Hours" },
]

// ============================================================================
// INQUIRY STATUS OPTIONS
// ============================================================================

export const INQUIRY_STATUS_OPTIONS: FilterOption[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "converted", label: "Converted" },
  { value: "closed", label: "Closed" },
]

// ============================================================================
// COMMON FILTER CONFIGS (Ready-to-use FilterConfig objects)
// ============================================================================

/**
 * Property filter config (options loaded from database)
 */
export const PROPERTY_FILTER: FilterConfig = {
  id: "property",
  label: "Property",
  type: "select",
  placeholder: "All Properties",
}

/**
 * Date range filter configs for common date fields
 */
export const DATE_RANGE_FILTERS = {
  created: {
    id: "created_at",
    label: "Created Date",
    type: "date-range" as const,
  },
  payment: {
    id: "payment_date",
    label: "Payment Date",
    type: "date-range" as const,
  },
  checkIn: {
    id: "check_in_date",
    label: "Check-in Date",
    type: "date-range" as const,
  },
  expectedExit: {
    id: "expected_exit_date",
    label: "Exit Date",
    type: "date-range" as const,
  },
  reading: {
    id: "reading_date",
    label: "Reading Date",
    type: "date-range" as const,
  },
}

// ============================================================================
// COMPUTED FIELD HELPERS
// ============================================================================

/**
 * Helper to create month/year computed fields from a date field
 * Eliminates duplicate computedFields across 8+ list configs
 *
 * @example
 * computedFields: (item) => ({
 *   ...createMonthYearFields(item.payment_date, "payment"),
 * })
 */
export function createMonthYearFields(
  dateValue: string | null | undefined,
  prefix: string
): Record<string, string> {
  if (!dateValue) {
    return {
      [`${prefix}_month`]: "Unknown",
      [`${prefix}_year`]: "Unknown",
    }
  }

  const date = new Date(dateValue)
  return {
    [`${prefix}_month`]: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    [`${prefix}_year`]: date.getFullYear().toString(),
  }
}

/**
 * Standard month/year field names for grouping
 */
export const MONTH_YEAR_GROUP_OPTIONS = [
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
]
