/**
 * Tenant & Approval Status Configurations
 */

import type { StatusConfig, StatusVariant } from "./shared"

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
// APPROVAL STATUS
// ============================================================================

export const APPROVAL_STATUS: Record<string, StatusConfig> = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "error" },
  cancelled: { label: "Cancelled", variant: "muted" },
}

export const APPROVAL_TYPE_LABELS: Record<string, string> = {
  name_change: "Name Change",
  address_change: "Address Change",
  phone_change: "Phone Change",
  email_change: "Email Change",
  room_change: "Room Transfer",
  complaint: "Complaint",
  other: "Other Request",
  bill_dispute: "Bill Dispute",
  payment_dispute: "Payment Dispute",
  tenancy_issue: "Tenancy Issue",
  room_issue: "Room Issue",
  lease_renewal: "Lease Renewal",
}

export const APPROVAL_PRIORITY: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-info/10 text-info",
  high: "bg-warning/10 text-warning",
  urgent: "bg-destructive/10 text-destructive",
}
