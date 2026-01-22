/**
 * Properties Management Types
 *
 * Types for properties and related data.
 */

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

export type PropertyType = "pg" | "hostel" | "apartment" | "house"

export const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "pg", label: "Paying Guest" },
  { value: "hostel", label: "Hostel" },
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
]

export const PROPERTY_TYPE_CONFIG: Record<PropertyType, { label: string; icon: string }> = {
  pg: { label: "Paying Guest", icon: "Building2" },
  hostel: { label: "Hostel", icon: "Building" },
  apartment: { label: "Apartment", icon: "Home" },
  house: { label: "House", icon: "House" },
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface Property {
  id: string
  owner_id: string
  name: string
  address: string | null
  city: string
  state: string | null
  pincode: string | null
  phone: string | null
  email: string | null
  property_type: PropertyType
  description: string | null
  amenities: string[]
  rules: string[]
  total_floors: number
  is_active: boolean
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
  manager_name: string | null
  manager_phone: string | null
  website_slug: string | null
  website_enabled: boolean

  // Computed fields
  room_count?: number
  tenant_count?: number
}

export interface PropertySettings {
  billing_day: number
  due_day: number
  late_fee_percentage: number
  notice_period_days: number
  security_deposit_months: number
  allow_overnight_visitors: boolean
  visitor_overnight_charge: number
  electricity_rate: number
  water_rate: number
  gas_rate: number
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

export interface PropertyFormData {
  name: string
  address: string
  city: string
  state: string
  pincode: string
  phone?: string
  email?: string
  property_type: PropertyType
  description?: string
  amenities?: string[]
  rules?: string[]
  total_floors?: number
}

// ============================================================================
// LIST VIEW TYPES
// ============================================================================

export interface PropertyListItem extends Property {
  rooms?: { id: string }[]
  tenants?: { id: string }[]
}

// ============================================================================
// PROPERTY DETAIL RELATED TYPES
// ============================================================================

export interface PropertyRoom {
  id: string
  room_number: string
  room_type: string
  floor: number
  rent_amount: number
  total_beds: number
  occupied_beds: number
  status: string
  has_ac: boolean
  has_attached_bathroom: boolean
}

export interface PropertyTenant {
  id: string
  name: string
  phone: string
  photo_url: string | null
  profile_photo: string | null
  monthly_rent: number
  status: string
  check_in_date: string | null
  room: { id: string; room_number: string } | null
  person: { id: string; photo_url: string | null } | null
}

export interface PropertyBill {
  id: string
  bill_number: string
  bill_date: string
  total_amount: number
  balance_due: number
  status: string
  tenant: { id: string; name: string } | null
}

export interface PropertyPayment {
  id: string
  amount: number
  payment_date: string
  payment_method: string
  tenant: { id: string; name: string } | null
}

export interface PropertyExpense {
  id: string
  amount: number
  expense_date: string
  description: string | null
  expense_type: { name: string } | null
}

export interface PropertyComplaint {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  created_at: string
  tenant: { id: string; name: string } | null
  room: { id: string; room_number: string } | null
}

export interface PropertyVisitor {
  id: string
  visitor_name: string
  purpose: string | null
  check_in_time: string
  check_out_time: string | null
  is_overnight: boolean
  tenant: { id: string; name: string } | null
}
