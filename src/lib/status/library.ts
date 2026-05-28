/**
 * Library Module Status Configurations
 *
 * Canonical source for all library status configs (with variant info).
 * Label-only Records are derived from the full configs for backward compatibility.
 */

import type { StatusConfig } from "./shared"

// ============================================================================
// FULL STATUS CONFIGS (with variant)
// ============================================================================

/**
 * Library Member Status Definitions:
 * - active:    Currently enrolled, subscription valid. Auto-set on enrollment/renewal.
 * - expired:   Subscription ended naturally, member may renew. Auto-set by cron when end_date passes.
 * - suspended: Member explicitly left / voluntarily stopped attending. Set manually by staff.
 * - cancelled: Permanently removed / banned (rule violations, refund cases). Set manually by staff.
 */
export const LIBRARY_MEMBER_STATUS_CONFIG: Record<string, StatusConfig> = {
  active: { label: "Active", variant: "success" },
  expired: { label: "Expired", variant: "warning" },
  suspended: { label: "Suspended", variant: "error" },
  cancelled: { label: "Cancelled", variant: "muted" },
}

export const LIBRARY_SEAT_STATUS_CONFIG: Record<string, StatusConfig> = {
  available: { label: "Available", variant: "success" },
  occupied: { label: "Occupied", variant: "warning" },
  reserved: { label: "Reserved", variant: "muted" },
  maintenance: { label: "Maintenance", variant: "error" },
}

export const LIBRARY_LOCKER_STATUS_CONFIG: Record<string, StatusConfig> = {
  available: { label: "Available", variant: "success" },
  occupied: { label: "Occupied", variant: "warning" },
  maintenance: { label: "Maintenance", variant: "muted" },
}

export const LIBRARY_LOCKER_SIZE_CONFIG: Record<string, StatusConfig> = {
  small: { label: "Small", variant: "muted" },
  medium: { label: "Medium", variant: "warning" },
  large: { label: "Large", variant: "success" },
}

export const LIBRARY_MEMBERSHIP_STATUS_CONFIG: Record<string, StatusConfig> = {
  active: { label: "Active", variant: "success" },
  expired: { label: "Expired", variant: "warning" },
  cancelled: { label: "Cancelled", variant: "muted" },
  upgraded: { label: "Upgraded", variant: "success" },
}

export const LIBRARY_PAYMENT_TYPE_CONFIG: Record<string, StatusConfig> = {
  subscription: { label: "Subscription", variant: "success" },
  locker_rent: { label: "Locker Rent", variant: "warning" },
  locker_deposit: { label: "Locker Deposit", variant: "muted" },
  fine: { label: "Fine", variant: "error" },
  other: { label: "Other", variant: "muted" },
}

export const LIBRARY_PAYMENT_METHOD_CONFIG: Record<string, StatusConfig> = {
  cash: { label: "Cash", variant: "success" },
  upi: { label: "UPI", variant: "success" },
  card: { label: "Card", variant: "warning" },
  bank_transfer: { label: "Bank Transfer", variant: "muted" },
}

export const LIBRARY_PAYMENT_STATUS_CONFIG: Record<string, StatusConfig> = {
  completed: { label: "Completed", variant: "success" },
  pending: { label: "Pending", variant: "warning" },
  refunded: { label: "Refunded", variant: "muted" },
}

export const LIBRARY_WAITLIST_STATUS_CONFIG: Record<string, StatusConfig> = {
  waiting: { label: "Waiting", variant: "warning" },
  contacted: { label: "Contacted", variant: "muted" },
  converted: { label: "Converted", variant: "success" },
  cancelled: { label: "Cancelled", variant: "error" },
}

// ============================================================================
// LABEL-ONLY RECORDS (derived from configs for backward compatibility)
// ============================================================================

const toLabels = (config: Record<string, StatusConfig>): Record<string, string> =>
  Object.fromEntries(Object.entries(config).map(([k, v]) => [k, v.label]))

export const LIBRARY_SEAT_STATUS_LABELS: Record<string, string> = toLabels(LIBRARY_SEAT_STATUS_CONFIG)

export const LIBRARY_MEMBER_STATUS_LABELS: Record<string, string> = toLabels(LIBRARY_MEMBER_STATUS_CONFIG)

export const LIBRARY_MEMBERSHIP_STATUS_LABELS: Record<string, string> = toLabels(LIBRARY_MEMBERSHIP_STATUS_CONFIG)

export const LIBRARY_LOCKER_STATUS_LABELS: Record<string, string> = toLabels(LIBRARY_LOCKER_STATUS_CONFIG)

export const LIBRARY_LOCKER_SIZE_LABELS: Record<string, string> = toLabels(LIBRARY_LOCKER_SIZE_CONFIG)

export const LIBRARY_WAITLIST_STATUS_LABELS: Record<string, string> = toLabels(LIBRARY_WAITLIST_STATUS_CONFIG)

export const LIBRARY_PAYMENT_TYPE_LABELS: Record<string, string> = toLabels(LIBRARY_PAYMENT_TYPE_CONFIG)

export const LIBRARY_PAYMENT_STATUS_LABELS: Record<string, string> = toLabels(LIBRARY_PAYMENT_STATUS_CONFIG)

export const LIBRARY_PAYMENT_METHOD_LABELS: Record<string, string> = toLabels(LIBRARY_PAYMENT_METHOD_CONFIG)

// ============================================================================
// FORM OPTION ARRAYS (derived from label maps above)
// ============================================================================

import { labelsToOptions } from "./billing"

/** Library member status options for forms */
export const LIBRARY_MEMBER_STATUS_OPTIONS = labelsToOptions(LIBRARY_MEMBER_STATUS_LABELS)

/** Library payment method options for forms (4 common modes) */
export const LIBRARY_PAYMENT_METHOD_OPTIONS = labelsToOptions(LIBRARY_PAYMENT_METHOD_LABELS)

/** Library payment method options including cheque (5 modes, for member registration) */
export const LIBRARY_PAYMENT_METHOD_FULL_OPTIONS = labelsToOptions({
  ...LIBRARY_PAYMENT_METHOD_LABELS,
  cheque: "Cheque",
})

/** Library payment type options for forms */
export const LIBRARY_PAYMENT_TYPE_OPTIONS = labelsToOptions(LIBRARY_PAYMENT_TYPE_LABELS)

/** Library payment status options for forms */
export const LIBRARY_PAYMENT_STATUS_OPTIONS = labelsToOptions(LIBRARY_PAYMENT_STATUS_LABELS)

/** Library waitlist status options for forms */
export const LIBRARY_WAITLIST_STATUS_OPTIONS = labelsToOptions(LIBRARY_WAITLIST_STATUS_LABELS)
