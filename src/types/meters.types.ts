/**
 * Meter Management Types
 *
 * Types for the meter management system including meters,
 * meter assignments, and related interfaces.
 */

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

export type MeterType = "electricity" | "water" | "gas"
export type MeterStatus = "active" | "faulty" | "replaced" | "retired"
export type AssignmentReason = "initial" | "replacement" | "transfer" | "repair" | "upgrade"

export const METER_TYPES: { value: MeterType; label: string }[] = [
  { value: "electricity", label: "Electricity" },
  { value: "water", label: "Water" },
  { value: "gas", label: "Gas" },
]

export const METER_STATUSES: { value: MeterStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "faulty", label: "Faulty" },
  { value: "replaced", label: "Replaced" },
  { value: "retired", label: "Retired" },
]

export const ASSIGNMENT_REASONS: { value: AssignmentReason; label: string }[] = [
  { value: "initial", label: "Initial Installation" },
  { value: "replacement", label: "Replacement" },
  { value: "transfer", label: "Transferred from another room" },
  { value: "repair", label: "Back from repair" },
  { value: "upgrade", label: "Upgrade" },
]

export const METER_TYPE_CONFIG = {
  electricity: {
    label: "Electricity",
    unit: "kWh",
    icon: "Zap",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
  },
  water: {
    label: "Water",
    unit: "L",
    icon: "Droplets",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  gas: {
    label: "Gas",
    unit: "m³",
    icon: "Gauge",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
  },
} as const

export const METER_STATUS_CONFIG = {
  active: {
    label: "Active",
    variant: "success" as const,
  },
  faulty: {
    label: "Faulty",
    variant: "error" as const,
  },
  replaced: {
    label: "Replaced",
    variant: "warning" as const,
  },
  retired: {
    label: "Retired",
    variant: "muted" as const,
  },
} as const

// ============================================================================
// INTERFACES
// ============================================================================

export interface Meter {
  id: string
  owner_id: string
  property_id: string
  meter_number: string
  meter_type: MeterType
  status: MeterStatus
  initial_reading: number
  make?: string | null
  model?: string | null
  installation_date?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface MeterWithRelations extends Meter {
  property?: {
    id: string
    name: string
  } | null
  current_assignment?: MeterAssignment | null
  assignments?: MeterAssignment[]
}

export interface MeterAssignment {
  id: string
  owner_id: string
  meter_id: string
  room_id: string
  start_date: string
  end_date?: string | null
  start_reading: number
  end_reading?: number | null
  reason?: AssignmentReason | null
  notes?: string | null
  created_at: string
}

export interface MeterAssignmentWithRelations extends MeterAssignment {
  meter?: Meter | null
  room?: {
    id: string
    room_number: string
  } | null
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

export interface MeterFormData {
  property_id: string
  meter_number: string
  meter_type: MeterType
  initial_reading: string
  make?: string
  model?: string
  installation_date?: string
  notes?: string
  // For immediate assignment
  assign_to_room?: boolean
  room_id?: string
  assignment_reason?: AssignmentReason
}

export interface AssignMeterFormData {
  meter_id: string
  room_id: string
  start_date: string
  start_reading: string
  reason: AssignmentReason
  notes?: string
}

export interface EndAssignmentFormData {
  assignment_id: string
  end_date: string
  end_reading: string
  new_status?: MeterStatus
  notes?: string
}

// ============================================================================
// LIST VIEW TYPES
// ============================================================================

export interface MeterListItem extends Meter {
  property?: {
    id: string
    name: string
  } | null
  current_room?: {
    id: string
    room_number: string
  } | null
  last_reading?: {
    reading_date: string
    reading_value: number
  } | null
}

// ============================================================================
// DETAIL PAGE TYPES
// ============================================================================

export interface MeterDetailReading {
  id: string
  reading_date: string
  reading_value: number
  units_consumed: number | null
}

export interface MeterDetailRoom {
  id: string
  room_number: string
}
