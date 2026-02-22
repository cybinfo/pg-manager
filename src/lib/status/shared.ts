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
  website: "Website",
  whatsapp: "WhatsApp",
  phone: "Phone",
}

export const INQUIRY_STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  converted: "bg-green-100 text-green-700",
  closed: "bg-muted text-foreground",
}

export const INQUIRY_SOURCE_COLORS: Record<string, string> = {
  website: "bg-purple-100 text-purple-700",
  whatsapp: "bg-green-100 text-green-700",
  phone: "bg-orange-100 text-orange-700",
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
