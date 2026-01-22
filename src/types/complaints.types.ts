/**
 * Complaints Management Types
 *
 * Types for complaints, categories, and related data.
 */

import { Person } from "./people.types"

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

export type ComplaintStatus = "open" | "in_progress" | "resolved" | "closed"
export type ComplaintPriority = "low" | "medium" | "high" | "urgent"
export type ComplaintCategory =
  | "maintenance"
  | "cleanliness"
  | "noise"
  | "security"
  | "amenities"
  | "billing"
  | "other"

export const COMPLAINT_STATUS_CONFIG = {
  open: {
    label: "Open",
    variant: "warning" as const,
  },
  in_progress: {
    label: "In Progress",
    variant: "info" as const,
  },
  resolved: {
    label: "Resolved",
    variant: "success" as const,
  },
  closed: {
    label: "Closed",
    variant: "muted" as const,
  },
} as const

export const COMPLAINT_PRIORITY_CONFIG = {
  low: {
    label: "Low",
    variant: "muted" as const,
  },
  medium: {
    label: "Medium",
    variant: "warning" as const,
  },
  high: {
    label: "High",
    variant: "error" as const,
  },
  urgent: {
    label: "Urgent",
    variant: "error" as const,
  },
} as const

export const COMPLAINT_CATEGORIES: { value: ComplaintCategory; label: string }[] = [
  { value: "maintenance", label: "Maintenance" },
  { value: "cleanliness", label: "Cleanliness" },
  { value: "noise", label: "Noise" },
  { value: "security", label: "Security" },
  { value: "amenities", label: "Amenities" },
  { value: "billing", label: "Billing" },
  { value: "other", label: "Other" },
]

// ============================================================================
// INTERFACES
// ============================================================================

export interface Complaint {
  id: string
  owner_id: string
  tenant_id: string
  property_id: string
  room_id: string | null
  title: string
  description: string
  category: ComplaintCategory
  priority: ComplaintPriority
  status: ComplaintStatus
  assigned_to: string | null
  resolution_notes: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string

  // Joined fields
  tenant?: {
    id: string
    name: string
    phone?: string
    person?: Pick<Person, "id" | "photo_url"> | null
  } | null
  property?: { id: string; name: string; address?: string | null; city?: string } | null
  room?: { id: string; room_number: string } | null
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

export interface ComplaintFormData {
  tenant_id: string
  property_id: string
  room_id?: string
  title: string
  description: string
  category: ComplaintCategory
  priority: ComplaintPriority
}

// ============================================================================
// LIST VIEW TYPES
// ============================================================================

export interface ComplaintListItem extends Complaint {
  created_month?: string
  created_year?: string
}
