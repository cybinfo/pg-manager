/**
 * Notices Management Types
 *
 * Types for notices, announcements, and related data.
 */

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

export type NoticeType = "general" | "maintenance" | "payment_reminder" | "emergency"
export type NoticeAudience = "all" | "property" | "room" | "individual"

export const NOTICE_TYPE_CONFIG = {
  general: {
    label: "General",
    variant: "info" as const,
    icon: "Info",
  },
  maintenance: {
    label: "Maintenance",
    variant: "warning" as const,
    icon: "Wrench",
  },
  payment_reminder: {
    label: "Payment Reminder",
    variant: "error" as const,
    icon: "CreditCard",
  },
  emergency: {
    label: "Emergency",
    variant: "error" as const,
    icon: "AlertTriangle",
  },
} as const

export const NOTICE_TYPES: { value: NoticeType; label: string }[] = [
  { value: "general", label: "General" },
  { value: "maintenance", label: "Maintenance" },
  { value: "payment_reminder", label: "Payment Reminder" },
  { value: "emergency", label: "Emergency" },
]

export const NOTICE_AUDIENCES: { value: NoticeAudience; label: string }[] = [
  { value: "all", label: "All Tenants" },
  { value: "property", label: "Property-specific" },
  { value: "room", label: "Room-specific" },
  { value: "individual", label: "Individual" },
]

// ============================================================================
// INTERFACES
// ============================================================================

export interface Notice {
  id: string
  owner_id: string
  property_id: string | null
  title: string
  content: string
  type: NoticeType
  target_audience: string
  target_rooms: string[] | null
  is_active: boolean
  is_pinned: boolean
  publish_date: string | null
  expires_at: string | null
  created_at: string
  updated_at: string

  // Joined fields
  property?: { id: string; name: string } | null
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

export interface NoticeFormData {
  property_id?: string
  title: string
  content: string
  type: NoticeType
  audience: NoticeAudience
  is_pinned?: boolean
  publish_date?: string
  expires_at?: string
  target_tenant_ids?: string[]
  target_room_ids?: string[]
}

// ============================================================================
// LIST VIEW TYPES
// ============================================================================

export interface NoticeListItem extends Notice {
  created_month?: string
  created_year?: string
  active_label?: string
  type_label?: string
  is_expired?: boolean
}
