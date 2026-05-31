// Business Types
// Two-layer model: Business → Entities (Properties + Libraries)

export interface Business {
  id: string
  workspace_id: string
  owner_id: string

  // Identity
  name: string
  legal_name: string | null
  slug: string | null
  description: string | null
  logo_url: string | null
  cover_url: string | null

  // Legal / Tax
  gst_number: string | null
  pan_number: string | null
  registration_number: string | null
  business_type: BusinessEntityType | null

  // Registered address
  reg_address: string | null
  reg_city: string | null
  reg_state: string | null
  reg_pincode: string | null

  // Contact
  phone: string | null
  email: string | null
  website: string | null

  // Meta
  is_active: boolean
  tags: string[]

  // Audit
  created_at: string
  created_by: string | null
  deleted_at: string | null
  deleted_by: string | null

  // Joins
  workspace?: {
    id: string
    name: string
    type: string
    logo_url: string | null
    is_active: boolean
  }
  properties?: Array<{ id: string; name: string; city: string | null; is_active: boolean; created_at: string }>
  libraries?: Array<{ id: string; name: string; city: string | null; is_active: boolean; created_at: string }>
}

export type BusinessEntityType =
  | "proprietorship"
  | "partnership"
  | "pvt_ltd"
  | "llp"
  | "trust"
  | "other"

export const BUSINESS_ENTITY_TYPE_LABELS: Record<BusinessEntityType, string> = {
  proprietorship: "Sole Proprietorship",
  partnership: "Partnership",
  pvt_ltd: "Private Limited",
  llp: "LLP",
  trust: "Trust / NGO",
  other: "Other",
}

export const BUSINESS_ENTITY_TYPE_OPTIONS = Object.entries(BUSINESS_ENTITY_TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
)
