/**
 * Centralized form option arrays for Select/Combobox components.
 *
 * Domain-specific option lists that are used across multiple pages.
 * Payment modes, unit types, and status options live in @/lib/status — import from there.
 */

import {
  LIBRARY_LOCKER_SIZE_LABELS,
  LIBRARY_LOCKER_STATUS_LABELS,
  LIBRARY_SEAT_STATUS_LABELS,
  COMPLAINT_PRIORITY,
  TENANT_STATUS,
  labelsToOptions,
} from "@/lib/status"
import {
  GENDER_LABELS,
  BLOOD_GROUPS,
  INDIAN_STATES,
  RELATIONS,
} from "@/types/people.types"

// ============================================================================
// LIBRARY — LOCKER
// ============================================================================

/** Locker size options (small / medium / large) */
export const LOCKER_SIZE_OPTIONS = labelsToOptions(LIBRARY_LOCKER_SIZE_LABELS)

/** Locker status options (available / occupied / maintenance) */
export const LOCKER_STATUS_OPTIONS = labelsToOptions(LIBRARY_LOCKER_STATUS_LABELS)

// ============================================================================
// LIBRARY — SEAT
// ============================================================================

/** Seat status options (available / occupied / reserved / maintenance) */
export const SEAT_STATUS_OPTIONS = labelsToOptions(LIBRARY_SEAT_STATUS_LABELS)

// ============================================================================
// LIBRARY — MEMBER
// ============================================================================

/**
 * Member status options for bulk-update selects.
 * Excludes "expired" since that is set automatically by cron.
 */
export const LIBRARY_MEMBER_STATUS_UPDATE_OPTIONS = [
  { value: "", label: "Update Status..." },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "cancelled", label: "Cancelled" },
]

// ============================================================================
// COMPLAINTS
// ============================================================================

/** Complaint priority options (low / medium / high / urgent) */
export const COMPLAINT_PRIORITY_OPTIONS = labelsToOptions(
  Object.fromEntries(Object.entries(COMPLAINT_PRIORITY).map(([k, v]) => [k, v.label]))
)

// ============================================================================
// TENANTS
// ============================================================================

/**
 * Tenant status options for the edit form.
 * Only statuses staff can set manually — "moved_out" is system-set.
 */
export const TENANT_STATUS_OPTIONS = labelsToOptions({
  active: TENANT_STATUS.active.label,
  notice_period: TENANT_STATUS.notice_period.label,
  checked_out: TENANT_STATUS.checked_out.label,
})

// ============================================================================
// ROOM TRANSFER
// ============================================================================

/** Reason options for the room transfer modal */
export const ROOM_TRANSFER_REASON_OPTIONS = [
  { value: "upgrade", label: "Upgrade" },
  { value: "downgrade", label: "Downgrade" },
  { value: "request", label: "Tenant Request" },
  { value: "maintenance", label: "Maintenance" },
  { value: "other", label: "Other" },
]

// ============================================================================
// PEOPLE — derived from @/types/people.types
// ============================================================================

/** Gender select options with empty sentinel for placeholder */
export const GENDER_OPTIONS = [
  { value: "", label: "Select gender" },
  ...Object.entries(GENDER_LABELS).map(([value, label]) => ({ value, label })),
]

/** Blood group select options with empty sentinel for placeholder */
export const BLOOD_GROUP_OPTIONS = [
  { value: "", label: "Select blood group" },
  ...BLOOD_GROUPS.map((bg) => ({ value: bg, label: bg })),
]

/** Indian state select options with empty sentinel for placeholder */
export const INDIAN_STATE_OPTIONS = [
  { value: "", label: "Select state" },
  ...INDIAN_STATES.map((state) => ({ value: state, label: state })),
]

/** Emergency contact relation options with empty sentinel for placeholder */
export const RELATION_OPTIONS = [
  { value: "", label: "Select relation" },
  ...RELATIONS.map((rel) => ({ value: rel, label: rel })),
]

// ============================================================================
// TDS (Tax Deducted at Source) — used in service providers and service payments
// ============================================================================

/** TDS section options for service providers (all supported sections) */
export const TDS_SECTION_OPTIONS: { value: string; label: string }[] = [
  { value: "194C", label: "194C - Contractor (1%)" },
  { value: "194J", label: "194J - Professional (10%)" },
  { value: "194I", label: "194I - Rent (10%)" },
  { value: "194H", label: "194H - Commission (5%)" },
]

/** TDS section options for service payments (contractor + professional only) */
export const TDS_SECTION_SERVICE_OPTIONS: { value: string; label: string }[] = [
  { value: "194C", label: "194C - Contractor (1%)" },
  { value: "194J", label: "194J - Professional (10%)" },
]

/** Default TDS rates by section code */
export const TDS_RATES: Record<string, number> = {
  "194C": 1.0,
  "194J": 10.0,
  "194I": 10.0,
  "194H": 5.0,
}

// ============================================================================
// NOTICES
// ============================================================================

/** Priority options for notices (low / normal / high / urgent) */
export const NOTICE_PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
]

// ============================================================================
// NOTICE / TENANT DEFAULTS
// ============================================================================

/** Notice period options for tenant checkout notice (days) */
export const NOTICE_PERIOD_OPTIONS = [
  { value: "7", label: "7 days" },
  { value: "15", label: "15 days" },
  { value: "30", label: "30 days (1 month)" },
  { value: "60", label: "60 days (2 months)" },
]

// ============================================================================
// BILLING
// ============================================================================

/** Food / charge billing frequency options */
export const BILLING_FREQUENCY_OPTIONS: { value: "daily" | "weekly" | "monthly"; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
]

/** Days-before-due-date reminder options — labelled as "N days before" */
export const REMINDER_DAYS_OPTIONS = [1, 2, 3, 5, 7, 10].map((days) => ({
  value: days.toString(),
  label: `${days} day${days > 1 ? "s" : ""} before`,
}))

/** Days-before-due-date reminder options — labelled as "N days before due date" */
export const REMINDER_DAYS_BEFORE_DUE_OPTIONS = [1, 2, 3, 5, 7, 10].map((days) => ({
  value: days.toString(),
  label: `${days} day${days > 1 ? "s" : ""} before due date`,
}))

/** Overdue alert frequency options */
export const ALERT_FREQUENCY_OPTIONS: { value: "daily" | "weekly"; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
]

/** Utility charge split options */
export const UTILITY_SPLIT_OPTIONS = [
  { value: "occupants", label: "Per Occupant" },
  { value: "room", label: "Per Room" },
]

/** Bill due-date offset options (days after bill date) */
export const DUE_DAY_OFFSET_OPTIONS = [5, 7, 10, 15, 20, 30].map((days) => ({
  value: days.toString(),
  label: `${days} days after bill date`,
}))

/** Grace period options (days after due date before marking overdue) */
export const GRACE_PERIOD_OPTIONS = [0, 3, 5, 7, 10, 15, 30].map((days) => ({
  value: days.toString(),
  label: days === 0 ? "No grace period" : `${days} days after due date`,
}))

// ============================================================================
// PROPERTY
// ============================================================================

/** Property type options for public website configuration */
export const PROPERTY_TYPE_OPTIONS = [
  { value: "pg", label: "PG (Paying Guest)" },
  { value: "hostel", label: "Hostel" },
  { value: "coliving", label: "Co-Living Space" },
]

// ============================================================================
// VISITORS
// ============================================================================

/** Visitor type filter options (includes an "All" entry) */
export const VISITOR_TYPE_FILTER_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "tenant_visitor", label: "Tenant Visitors" },
  { value: "enquiry", label: "Enquiries" },
  { value: "service_provider", label: "Service Providers" },
  { value: "general", label: "General" },
]

/** Visitor contact status filter options */
export const VISITOR_CONTACT_STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "frequent", label: "Frequent Visitors" },
  { value: "blocked", label: "Blocked" },
]
