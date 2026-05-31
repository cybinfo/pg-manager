/**
 * Entity Types
 *
 * Unified entity type replacing the separate Property and Library top-level types.
 * An Entity is any physical operational unit owned by a Business:
 * PG, Hostel, Library, Gym, Hospital, School, Hotel, etc.
 *
 * Module-specific sub-types (rooms, tenants, members, sections…) live in their
 * own type files and reference entity_id instead of property_id / library_id.
 */

import type { AuditableEntity } from "./audit.types"

// ============================================================================
// ENTITY TYPE DISCRIMINATOR
// ============================================================================

export type EntityType = "pg" | "library" | "gym" | "hospital" | "school" | "hotel"

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  pg: "PG / Hostel",
  library: "Library",
  gym: "Gym",
  hospital: "Hospital",
  school: "School / Coaching",
  hotel: "Hotel",
}

export const ENTITY_TYPE_OPTIONS: { value: EntityType; label: string }[] = [
  { value: "pg", label: "PG / Hostel" },
  { value: "library", label: "Library" },
  { value: "gym", label: "Gym" },
  { value: "hospital", label: "Hospital" },
  { value: "school", label: "School / Coaching" },
  { value: "hotel", label: "Hotel" },
]

// ============================================================================
// ENTITY SETTINGS (type-specific JSONB)
// ============================================================================

export interface PGSettings {
  rent_due_day?: number
  notice_period?: number
  grace_period?: number
}

export interface LibraryEntitySettings {
  has_ac?: boolean
  has_wifi?: boolean
  has_lockers?: boolean
  has_parking?: boolean
  time_slots?: string[]
  default_hours_per_month?: number
  grace_period_minutes?: number
}

export type EntitySettings = PGSettings | LibraryEntitySettings | Record<string, unknown>

// ============================================================================
// ENTITY INTERFACE
// ============================================================================

export interface Entity extends AuditableEntity {
  id: string
  workspace_id: string | null
  owner_id: string
  business_id: string | null

  // Identity
  name: string
  type: EntityType
  code: string | null
  description: string | null

  // Location
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null

  // Contact
  phone: string | null
  email: string | null
  manager_name: string | null
  manager_phone: string | null

  // Hours
  opening_time: string | null
  closing_time: string | null

  // Media
  cover_image: string | null
  photos: string[] | null

  // Status
  is_active: boolean
  is_under_maintenance: boolean

  // Library-type computed stats
  total_sections: number
  total_seats: number
  occupied_seats: number

  // Type-specific config
  settings: EntitySettings

  // PG-specific (flat for query convenience)
  tenant_features: Record<string, boolean> | null
  website_slug: string | null
  website_enabled: boolean
  website_config: Record<string, unknown> | null

  // Joined
  business?: { id: string; name: string; legal_name?: string | null } | null
  workspace?: { id: string; name: string; type?: string | null } | null
}

// ============================================================================
// NARROW / OPTION TYPES
// ============================================================================

export type EntityOption = {
  value: string
  label: string
  type: EntityType
}

// ============================================================================
// FORM DATA
// ============================================================================

export interface EntityFormData {
  name: string
  type: EntityType
  business_id: string
  code: string
  description: string
  address: string
  city: string
  state: string
  pincode: string
  phone: string
  email: string
  manager_name: string
  manager_phone: string
  opening_time: string
  closing_time: string
  is_active: boolean
  is_under_maintenance: boolean
  settings: EntitySettings
}
