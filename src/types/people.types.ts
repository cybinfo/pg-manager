/**
 * People Module Types
 * Central identity management - single source of truth for all persons
 */

// ============================================
// Enums and Constants
// ============================================

export type Gender = 'male' | 'female' | 'other'

export type PersonType = 'individual' | 'company' | 'organization'

export type PersonRoleType =
  | 'tenant'
  | 'staff'
  | 'visitor'
  | 'service_provider'
  | 'emergency_contact'
  | 'guardian'
  | 'reference'

export type PersonSource = 'tenant' | 'staff' | 'visitor' | 'manual' | 'import'

export type IDDocumentType =
  | 'aadhaar'
  | 'pan'
  | 'driving_license'
  | 'passport'
  | 'voter_id'
  | 'employee_id'
  | 'other'

// ============================================
// ID Document Interface
// ============================================

export interface IDDocument {
  type: IDDocumentType
  number: string
  verified?: boolean
  verified_at?: string
  file_url?: string
  expiry?: string
  notes?: string
}

// ============================================
// Phone Number Interface
// ============================================

export interface PhoneNumber {
  number: string
  type: 'personal' | 'work' | 'home' | 'emergency' | 'other'
  is_whatsapp?: boolean
  is_primary?: boolean
}

// ============================================
// Emergency Contact Interface
// ============================================

export interface EmergencyContact {
  name: string
  phone: string
  relation: string
  person_id?: string  // Link to another person in the system
  email?: string
  address?: string
}

// ============================================
// Main Person Interface
// ============================================

export interface Person {
  id: string
  owner_id: string

  // Core Identity
  name: string
  phone: string | null
  email: string | null
  photo_url: string | null
  date_of_birth: string | null
  gender: Gender | null

  // Secondary Phones
  phone_numbers: PhoneNumber[]

  // ID Documents
  aadhaar_number: string | null
  pan_number: string | null
  id_documents: IDDocument[]

  // Address
  permanent_address: string | null
  permanent_city: string | null
  permanent_state: string | null
  permanent_pincode: string | null
  current_address: string | null
  current_city: string | null

  // Professional Info
  occupation: string | null
  company_name: string | null
  designation: string | null

  // Emergency Contacts
  emergency_contacts: EmergencyContact[]

  // Classification
  tags: string[]
  person_type: PersonType

  // Verification
  is_verified: boolean
  verified_at: string | null
  verified_by: string | null
  verification_notes: string | null

  // Status
  is_active: boolean
  is_blocked: boolean
  blocked_reason: string | null
  blocked_at: string | null

  // Additional
  blood_group: string | null
  notes: string | null
  custom_fields: Record<string, unknown>

  // Metadata
  source: PersonSource | null
  source_id: string | null

  // Timestamps
  created_at: string
  updated_at: string
}

// ============================================
// Person Role Interface
// ============================================

export interface PersonRole {
  id: string
  person_id: string
  owner_id: string
  role_type: PersonRoleType
  reference_table: string | null
  reference_id: string | null
  metadata: Record<string, unknown>
  is_active: boolean
  started_at: string
  ended_at: string | null
  created_at: string
}

// ============================================
// Person Search Result (Enhanced for person-centric architecture)
// ============================================

export interface PersonSearchResult {
  id: string
  name: string
  phone: string | null
  email: string | null
  photo_url: string | null
  tags: string[]
  is_verified: boolean
  is_blocked: boolean
  created_at: string
  // Enhanced fields for person-centric architecture
  id_documents?: IDDocument[]
  company_name?: string | null
  occupation?: string | null
  emergency_contacts?: EmergencyContact[]
  permanent_address?: string | null
  permanent_city?: string | null
  current_address?: string | null
}

// ============================================
// Person 360 View (from get_person_360 function)
// ============================================

export interface PersonTenantHistory {
  id: string
  property_name: string
  room_number: string
  check_in_date: string
  check_out_date: string | null
  status: string
  monthly_rent: number
}

export interface PersonVisitHistory {
  id: string
  check_in_time: string
  check_out_time: string | null
  visitor_type: string
  purpose: string | null
  property_name: string
}

export interface Person360Summary {
  total_stays: number
  total_visits: number
  is_current_tenant: boolean
  is_staff: boolean
}

export interface Person360View {
  person: Person
  roles: PersonRole[]
  tenant_history: PersonTenantHistory[]
  visit_history: PersonVisitHistory[]
  summary: Person360Summary
}

// ============================================
// Form Input Type
// ============================================

export interface PersonFormData {
  name: string
  phone?: string
  email?: string
  photo_url?: string
  date_of_birth?: string
  gender?: Gender

  // ID Documents
  aadhaar_number?: string
  pan_number?: string

  // Address
  permanent_address?: string
  permanent_city?: string
  permanent_state?: string
  permanent_pincode?: string
  current_address?: string
  current_city?: string

  // Professional Info
  occupation?: string
  company_name?: string
  designation?: string

  // Emergency Contacts
  emergency_contacts?: EmergencyContact[]

  // Classification
  tags?: string[]
  person_type?: PersonType

  // Additional
  blood_group?: string
  notes?: string
}

// ============================================
// Labels and Constants
// ============================================

export const PERSON_ROLE_LABELS: Record<PersonRoleType, string> = {
  tenant: 'Tenant',
  staff: 'Staff',
  visitor: 'Visitor',
  service_provider: 'Service Provider',
  emergency_contact: 'Emergency Contact',
  guardian: 'Guardian',
  reference: 'Reference',
}

export const PERSON_ROLE_COLORS: Record<PersonRoleType, string> = {
  tenant: 'blue',
  staff: 'green',
  visitor: 'purple',
  service_provider: 'orange',
  emergency_contact: 'red',
  guardian: 'yellow',
  reference: 'slate',
}

export const GENDER_LABELS: Record<Gender, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
}

export const PERSON_TYPE_LABELS: Record<PersonType, string> = {
  individual: 'Individual',
  company: 'Company',
  organization: 'Organization',
}

export const ID_DOCUMENT_LABELS: Record<IDDocumentType, string> = {
  aadhaar: 'Aadhaar Card',
  pan: 'PAN Card',
  driving_license: 'Driving License',
  passport: 'Passport',
  voter_id: 'Voter ID',
  employee_id: 'Employee ID',
  other: 'Other',
}

export const PERSON_TAGS = [
  'tenant',
  'staff',
  'visitor',
  'service_provider',
  'frequent',
  'vip',
  'blocked',
  'verified',
] as const

export const BLOOD_GROUPS = [
  'A+', 'A-',
  'B+', 'B-',
  'AB+', 'AB-',
  'O+', 'O-',
] as const

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Puducherry',
  'Chandigarh',
] as const

export const RELATIONS = [
  'Father',
  'Mother',
  'Spouse',
  'Brother',
  'Sister',
  'Son',
  'Daughter',
  'Guardian',
  'Friend',
  'Colleague',
  'Relative',
  'Other',
] as const
