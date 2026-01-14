/**
 * Visitor Management System Types
 * Supporting: tenant visitors, enquiries, service providers, and general visitors
 */

// ============================================
// Visitor Types Enum
// ============================================
export type VisitorType = 'tenant_visitor' | 'enquiry' | 'service_provider' | 'general'

export type EnquiryStatus = 'pending' | 'follow_up' | 'converted' | 'lost'

export type EnquirySource = 'walk_in' | 'referral' | 'online' | 'social_media' | 'other'

// ============================================
// Main Visitor Interface
// ============================================
export interface Visitor {
  id: string
  owner_id: string
  property_id: string
  tenant_id: string | null
  visitor_type: VisitorType
  visitor_name: string
  visitor_phone: string | null
  relation: string | null
  purpose: string | null
  check_in_time: string
  check_out_time: string | null
  is_overnight: boolean
  overnight_charge: number | null
  num_nights: number
  charge_per_night: number | null
  expected_checkout_date: string | null
  bill_id: string | null

  // Service provider fields
  company_name: string | null
  service_type: string | null

  // Enquiry tracking fields
  enquiry_status: EnquiryStatus | null
  enquiry_source: EnquirySource | null
  rooms_interested: string[] | null
  follow_up_date: string | null
  converted_tenant_id: string | null

  // General visitor fields
  notes: string | null
  id_type: string | null
  id_number: string | null
  vehicle_number: string | null
  photo_url: string | null
  badge_number: string | null
  host_name: string | null
  department: string | null

  created_at: string

  // Joined fields
  property?: { id: string; name: string }
  tenant?: { id: string; name: string } | null
}

// ============================================
// Form Input Type
// ============================================
export interface VisitorFormData {
  visitor_type: VisitorType
  property_id: string
  tenant_id?: string
  visitor_name: string
  visitor_phone?: string
  relation?: string
  purpose?: string
  is_overnight: boolean
  num_nights: number
  charge_per_night?: number
  expected_checkout_date?: string

  // Service provider fields
  company_name?: string
  service_type?: string

  // Enquiry fields
  enquiry_source?: EnquirySource
  rooms_interested?: string[]
  follow_up_date?: string

  // General fields
  notes?: string
  id_type?: string
  id_number?: string
  vehicle_number?: string
  host_name?: string
  department?: string
}

// ============================================
// Labels and Constants
// ============================================
export const VISITOR_TYPE_LABELS: Record<VisitorType, string> = {
  tenant_visitor: 'Tenant Visitor',
  enquiry: 'Enquiry',
  service_provider: 'Service Provider',
  general: 'General Visitor',
}

export const VISITOR_TYPE_DESCRIPTIONS: Record<VisitorType, string> = {
  tenant_visitor: 'Visiting an existing tenant',
  enquiry: 'Prospective tenant viewing the PG',
  service_provider: 'Plumber, electrician, delivery, etc.',
  general: 'Any other visitor',
}

export const VISITOR_TYPE_COLORS: Record<VisitorType, string> = {
  tenant_visitor: 'blue',
  enquiry: 'purple',
  service_provider: 'orange',
  general: 'slate',
}

export const ENQUIRY_STATUS_LABELS: Record<EnquiryStatus, string> = {
  pending: 'Pending',
  follow_up: 'Follow Up',
  converted: 'Converted',
  lost: 'Lost',
}

export const ENQUIRY_STATUS_COLORS: Record<EnquiryStatus, string> = {
  pending: 'yellow',
  follow_up: 'blue',
  converted: 'green',
  lost: 'red',
}

export const ENQUIRY_SOURCE_LABELS: Record<EnquirySource, string> = {
  walk_in: 'Walk-in',
  referral: 'Referral',
  online: 'Online',
  social_media: 'Social Media',
  other: 'Other',
}

export const SERVICE_TYPES = [
  'Plumber',
  'Electrician',
  'Carpenter',
  'Internet/Cable',
  'Delivery',
  'Pest Control',
  'Cleaning',
  'AC Repair',
  'Appliance Repair',
  'Security',
  'Other',
] as const

export const ID_TYPES = [
  'Aadhaar Card',
  'PAN Card',
  'Driving License',
  'Passport',
  'Voter ID',
  'Employee ID',
  'Other',
] as const

export const VISITOR_RELATIONS = [
  'Family',
  'Friend',
  'Relative',
  'Colleague',
  'Guardian',
  'Other',
] as const
