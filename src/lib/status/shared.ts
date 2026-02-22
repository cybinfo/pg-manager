/**
 * Shared Status Configurations & Helper Functions
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
// SHARED STATUS CONFIGS
// ============================================================================

export const ACTIVE_STATUS: Record<string, StatusConfig> = {
  active: { label: "Active", variant: "success" },
  inactive: { label: "Inactive", variant: "muted" },
}

export const VISITOR_STATUS: Record<string, StatusConfig> = {
  checked_in: { label: "Inside", variant: "success" },
  checked_out: { label: "Left", variant: "muted" },
}

// ============================================================================
// INQUIRY STATUS & SOURCE
// ============================================================================

export const INQUIRY_STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  converted: "Converted",
  closed: "Closed",
}

export const INQUIRY_SOURCE_LABELS: Record<string, string> = {
  website: "Website Form",
  whatsapp: "WhatsApp",
  phone: "Phone Call",
}

export const INQUIRY_STATUS_COLORS: Record<string, string> = {
  new: "bg-info/10 text-info",
  contacted: "bg-warning/10 text-warning",
  converted: "bg-success/10 text-success",
  closed: "bg-muted text-foreground",
}

export const INQUIRY_SOURCE_COLORS: Record<string, string> = {
  website: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  whatsapp: "bg-success/10 text-success",
  phone: "bg-warning/10 text-warning",
}

// ============================================================================
// OCCUPANCY STATUS COLORS (CSS classes for seat/locker/section status)
// ============================================================================

export const OCCUPANCY_STATUS_COLORS: Record<string, string> = {
  available: "bg-success/10 text-success",
  occupied: "bg-info/10 text-info",
  reserved: "bg-warning/10 text-warning",
  maintenance: "bg-muted text-muted-foreground",
}

export const PG_ROOM_STATUS_COLORS: Record<string, string> = {
  available: "bg-success/10 text-success",
  occupied: "bg-destructive/10 text-destructive",
  partially_occupied: "bg-warning/10 text-warning",
  maintenance: "bg-muted text-muted-foreground",
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

import { TENANT_STATUS, APPROVAL_STATUS } from "./tenant"
import { COMPLAINT_STATUS, COMPLAINT_PRIORITY } from "./complaint"
import { REFUND_STATUS, EXIT_CLEARANCE_STATUS, DOCUMENT_STATUS, POLICE_VERIFICATION_STATUS } from "./billing"

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
 */
export function getStatusInfo(
  entityType: keyof typeof STATUS_CONFIGS,
  status: string
): { status: StatusDotVariant; label: string } {
  const config = getStatusConfig(entityType, status)
  const dotVariant: StatusDotVariant = config.variant === "default" ? "muted" : config.variant
  return { status: dotVariant, label: config.label }
}
