/**
 * Rooms Management Types
 *
 * Types for rooms, beds, and related data.
 */

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

export type RoomType = "single" | "double" | "triple" | "quad" | "dormitory"
export type RoomStatus = "available" | "occupied" | "maintenance" | "unavailable"

export const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "double", label: "Double" },
  { value: "triple", label: "Triple" },
  { value: "quad", label: "Quad" },
  { value: "dormitory", label: "Dormitory" },
]

export const ROOM_STATUS_CONFIG = {
  available: {
    label: "Available",
    variant: "success" as const,
  },
  occupied: {
    label: "Occupied",
    variant: "warning" as const,
  },
  maintenance: {
    label: "Maintenance",
    variant: "info" as const,
  },
  unavailable: {
    label: "Unavailable",
    variant: "muted" as const,
  },
} as const

// ============================================================================
// INTERFACES
// ============================================================================

export interface Room {
  id: string
  owner_id: string
  property_id: string
  room_number: string
  room_type: RoomType
  floor: number
  total_beds: number
  occupied_beds: number
  rent_amount: number
  deposit_amount: number | null
  status: string
  has_ac: boolean
  has_attached_bathroom: boolean
  has_balcony: boolean
  amenities: string[]
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string

  // Joined fields
  property?: { id: string; name: string; address?: string | null } | null
}

export interface Bed {
  id: string
  owner_id: string
  room_id: string
  bed_number: string
  is_occupied: boolean
  tenant_id: string | null
  rent_amount: number | null
  notes: string | null
  created_at: string
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

export interface RoomFormData {
  property_id: string
  room_number: string
  room_type: RoomType
  floor: number
  total_beds: number
  rent_amount: number
  has_ac?: boolean
  has_attached_bathroom?: boolean
  has_balcony?: boolean
  amenities?: string[]
  notes?: string
}

// ============================================================================
// LIST VIEW TYPES
// ============================================================================

export interface RoomListItem extends Room {
  ac_label?: string
  bathroom_label?: string
  beds_label?: string
  floor_label?: string
}

// ============================================================================
// COMPUTED HELPERS
// ============================================================================

export function getRoomStatus(room: Room): RoomStatus {
  if (room.occupied_beds >= room.total_beds) return "occupied"
  if (room.occupied_beds > 0) return "occupied"
  return "available"
}

export function getAvailableBeds(room: Room): number {
  return room.total_beds - room.occupied_beds
}

// ============================================================================
// ROOM DETAIL RELATED TYPES
// ============================================================================

export interface RoomTenant {
  id: string
  name: string
  phone: string
  email: string | null
  photo_url: string | null
  profile_photo: string | null
  monthly_rent: number
  status: string
  check_in_date: string
  person: { id: string; photo_url: string | null } | null
}

export interface RoomMeterAssignment {
  id: string
  meter_id: string
  start_date: string
  start_reading: number
  meter: {
    id: string
    meter_number: string
    meter_type: string
    status: string
  } | null
}

export interface RoomComplaint {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  created_at: string
  tenant: { id: string; name: string } | null
}
