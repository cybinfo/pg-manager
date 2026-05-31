// Business Hierarchy Types
// Three-layer model: Business → Location → Operation

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
  locations?: Location[]
}

export interface Location {
  id: string
  business_id: string
  workspace_id: string
  owner_id: string

  // Identity
  name: string
  description: string | null

  // Address
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  country: string
  latitude: number | null
  longitude: number | null

  // Contact
  phone: string | null
  email: string | null

  // Schedule
  opening_time: string | null
  closing_time: string | null
  operating_days: string[] | null

  // Meta
  is_active: boolean
  is_primary: boolean

  // Audit
  created_at: string
  created_by: string | null
  deleted_at: string | null
  deleted_by: string | null

  // Joins
  business?: Pick<Business, "id" | "name">
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

export const OPERATING_DAYS_OPTIONS = [
  { value: "mon", label: "Monday" },
  { value: "tue", label: "Tuesday" },
  { value: "wed", label: "Wednesday" },
  { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" },
  { value: "sat", label: "Saturday" },
  { value: "sun", label: "Sunday" },
]
