/**
 * Tenant Journey - Type Definitions
 *
 * Types for the tenant lifecycle journey feature including:
 * - Event categorization and normalization
 * - Journey analytics and financial summary
 * - Predictive insights (churn risk, payment reliability)
 * - Visitor linkage
 */

// ============================================
// Event Categories
// ============================================

export const EventCategory = {
  ONBOARDING: 'onboarding',
  FINANCIAL: 'financial',
  ACCOMMODATION: 'accommodation',
  COMPLAINT: 'complaint',
  EXIT: 'exit',
  VISITOR: 'visitor',
  DOCUMENT: 'document',
  COMMUNICATION: 'communication',
  SYSTEM: 'system',
} as const

export type EventCategoryType = typeof EventCategory[keyof typeof EventCategory]

// ============================================
// Event Types by Category
// ============================================

export const EventType = {
  // Onboarding
  TENANT_CREATED: 'tenant_created',
  CHECK_IN: 'check_in',
  AGREEMENT_SIGNED: 'agreement_signed',
  DOCUMENT_UPLOADED: 'document_uploaded',
  POLICE_VERIFICATION: 'police_verification',

  // Financial
  BILL_GENERATED: 'bill_generated',
  PAYMENT_RECEIVED: 'payment_received',
  CHARGE_CREATED: 'charge_created',
  REFUND_PROCESSED: 'refund_processed',
  DEPOSIT_RECEIVED: 'deposit_received',
  LATE_FEE_APPLIED: 'late_fee_applied',

  // Accommodation
  ROOM_TRANSFER: 'room_transfer',
  BED_CHANGE: 'bed_change',
  METER_READING: 'meter_reading',

  // Complaint
  COMPLAINT_RAISED: 'complaint_raised',
  COMPLAINT_ACKNOWLEDGED: 'complaint_acknowledged',
  COMPLAINT_RESOLVED: 'complaint_resolved',

  // Exit
  NOTICE_GIVEN: 'notice_given',
  EXIT_INITIATED: 'exit_initiated',
  CHECKOUT_COMPLETED: 'checkout_completed',
  REJOINED: 'rejoined',

  // Visitor
  VISITOR_LOGGED: 'visitor_logged',
  PRE_TENANT_VISIT: 'pre_tenant_visit',

  // Document
  ID_DOCUMENT_ADDED: 'id_document_added',
  RECEIPT_GENERATED: 'receipt_generated',

  // Communication
  WHATSAPP_SENT: 'whatsapp_sent',
  EMAIL_SENT: 'email_sent',
  SMS_SENT: 'sms_sent',
  NOTICE_SENT: 'notice_sent',

  // System
  STATUS_CHANGE: 'status_change',
  PROFILE_UPDATED: 'profile_updated',
  RENT_UPDATED: 'rent_updated',
} as const

export type EventTypeValue = typeof EventType[keyof typeof EventType]

// ============================================
// Status Colors
// ============================================

export type StatusColor = 'success' | 'warning' | 'error' | 'info' | 'primary' | 'muted'

// ============================================
// Unified Journey Event
// ============================================

export interface JourneyEvent {
  id: string
  timestamp: string
  category: EventCategoryType
  type: EventTypeValue | string
  title: string
  description: string

  // Source tracking
  source_table: string
  source_id: string

  // Financial data (optional)
  amount?: number
  amount_type?: 'credit' | 'debit' | 'neutral'

  // Status information
  status?: string
  status_color?: StatusColor

  // Related entities
  related_entities?: {
    property_id?: string
    property_name?: string
    room_id?: string
    room_number?: string
    bill_id?: string
    bill_number?: string
    payment_id?: string
    complaint_id?: string
    stay_id?: string
  }

  // Rich metadata for expanded view
  metadata?: Record<string, unknown>

  // Actor information
  actor?: {
    id: string
    name?: string
    email?: string
    type: 'owner' | 'staff' | 'tenant' | 'system'
  }

  // UI hints
  icon?: string
  action_url?: string
  quick_actions?: QuickAction[]
}

export interface QuickAction {
  id: string
  label: string
  icon?: string
  variant?: 'default' | 'gradient' | 'outline' | 'ghost'
  href?: string
}

// ============================================
// Journey Analytics
// ============================================

export interface JourneyAnalytics {
  // Duration metrics
  total_stay_days: number
  current_stay_days: number
  total_stays: number
  average_stay_duration: number

  // Financial metrics
  total_revenue: number
  total_payments: number
  total_bills_generated: number
  total_bills_paid: number
  bills_paid_on_time: number
  bills_paid_late: number
  average_days_to_pay: number

  // Engagement metrics
  total_complaints: number
  complaints_resolved: number
  total_room_transfers: number
  total_visitors: number

  // Compliance
  documents_submitted: number
  documents_verified: number
  police_verification_status: string
  agreement_status: string
}

// ============================================
// Financial Summary
// ============================================

export interface FinancialSummary {
  // Deposits
  security_deposit_paid: number
  security_deposit_expected: number
  advance_amount: number
  advance_balance: number

  // Bills & Payments
  total_billed: number
  total_paid: number
  total_outstanding: number
  total_overdue: number

  // Breakdown by charge type
  breakdown: ChargeTypeBreakdown[]

  // Refunds
  total_refunds_processed: number
  pending_refunds: number

  // Current status
  current_monthly_rent: number
  next_due_date: string | null
  next_due_amount: number | null
}

export interface ChargeTypeBreakdown {
  charge_type: string
  charge_type_code: string
  total_billed: number
  total_paid: number
  balance: number
}

// ============================================
// Predictive Insights
// ============================================

export interface PredictiveInsights {
  // Payment reliability (0-100)
  payment_reliability_score: number
  payment_reliability_level: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  payment_reliability_trend: 'improving' | 'stable' | 'declining'
  predicted_payment_behavior: 'on_time' | 'slightly_late' | 'significantly_late'

  // Churn risk (0-100)
  churn_risk_score: number
  churn_risk_level: 'low' | 'medium' | 'high' | 'critical'
  churn_risk_factors: string[]

  // Satisfaction
  satisfaction_level: 'high' | 'medium' | 'low'
  satisfaction_factors: string[]

  // Risk alerts
  active_alerts: RiskAlert[]

  // Recommendations
  recommendations: Recommendation[]

  // Confidence
  confidence: 'high' | 'medium' | 'low'
  data_points_analyzed: number
}

export interface RiskAlert {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  created_at: string
  action_url?: string
}

export interface Recommendation {
  type: 'retention' | 'collection' | 'engagement' | 'verification' | 'general'
  priority: 'high' | 'medium' | 'low'
  message: string
  action_url?: string
}

// ============================================
// Visitor Linkage
// ============================================

export interface LinkedVisitor {
  visitor_id: string
  visitor_name: string
  visit_date: string
  relationship: string
  matched_by: 'phone' | 'email' | 'name' | 'manual'
}

export interface PreTenantVisit {
  visitor_id: string
  visited_tenant_name: string
  visit_date: string
  days_before_joining: number
  property_name?: string
}

// ============================================
// Complete Journey Data
// ============================================

export interface TenantJourneyData {
  tenant_id: string
  tenant_name: string
  tenant_status: string
  tenant_photo_url?: string
  check_in_date: string

  // Property & Room
  property?: {
    id: string
    name: string
    address?: string
  }
  room?: {
    id: string
    room_number: string
    room_type?: string
  }

  // Timeline
  events: JourneyEvent[]
  total_events: number
  has_more_events: boolean

  // Analytics
  analytics: JourneyAnalytics

  // Financial
  financial: FinancialSummary

  // Insights
  insights: PredictiveInsights

  // Visitor linkage
  linked_visitors: LinkedVisitor[]
  pre_tenant_visits: PreTenantVisit[]

  // Metadata
  generated_at: string
}

// ============================================
// Journey Filters
// ============================================

export interface JourneyFilters {
  categories: EventCategoryType[]
  event_types: string[]
  date_from: string | null
  date_to: string | null
  search_query: string
  amount_min?: number
  amount_max?: number
}

// ============================================
// Journey Service Options
// ============================================

export interface GetTenantJourneyOptions {
  tenant_id: string
  workspace_id: string

  // Pagination for events
  events_limit?: number
  events_offset?: number

  // Filters
  event_categories?: EventCategoryType[]
  date_from?: string
  date_to?: string

  // Include options
  include_analytics?: boolean
  include_financial?: boolean
  include_insights?: boolean
  include_visitors?: boolean
}

// ============================================
// Event Category Metadata
// ============================================

export const EVENT_CATEGORY_CONFIG: Record<EventCategoryType, {
  label: string
  color: StatusColor
  icon: string
  bgClass: string
  textClass: string
}> = {
  onboarding: {
    label: 'Onboarding',
    color: 'success',
    icon: 'UserPlus',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-600',
  },
  financial: {
    label: 'Financial',
    color: 'info',
    icon: 'CreditCard',
    bgClass: 'bg-sky-100',
    textClass: 'text-sky-600',
  },
  accommodation: {
    label: 'Accommodation',
    color: 'primary',
    icon: 'ArrowRightLeft',
    bgClass: 'bg-teal-100',
    textClass: 'text-teal-600',
  },
  complaint: {
    label: 'Complaint',
    color: 'error',
    icon: 'AlertCircle',
    bgClass: 'bg-rose-100',
    textClass: 'text-rose-600',
  },
  exit: {
    label: 'Exit',
    color: 'warning',
    icon: 'LogOut',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-600',
  },
  visitor: {
    label: 'Visitor',
    color: 'primary',
    icon: 'Users',
    bgClass: 'bg-violet-100',
    textClass: 'text-violet-600',
  },
  document: {
    label: 'Document',
    color: 'muted',
    icon: 'FileCheck',
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-600',
  },
  communication: {
    label: 'Communication',
    color: 'info',
    icon: 'MessageSquare',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-600',
  },
  system: {
    label: 'System',
    color: 'muted',
    icon: 'Settings',
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-500',
  },
}

// ============================================
// Default Values
// ============================================

export const DEFAULT_JOURNEY_FILTERS: JourneyFilters = {
  categories: [],
  event_types: [],
  date_from: null,
  date_to: null,
  search_query: '',
}

export function createDefaultAnalytics(): JourneyAnalytics {
  return {
    total_stay_days: 0,
    current_stay_days: 0,
    total_stays: 0,
    average_stay_duration: 0,
    total_revenue: 0,
    total_payments: 0,
    total_bills_generated: 0,
    total_bills_paid: 0,
    bills_paid_on_time: 0,
    bills_paid_late: 0,
    average_days_to_pay: 0,
    total_complaints: 0,
    complaints_resolved: 0,
    total_room_transfers: 0,
    total_visitors: 0,
    documents_submitted: 0,
    documents_verified: 0,
    police_verification_status: 'pending',
    agreement_status: 'pending',
  }
}

export function createDefaultFinancialSummary(): FinancialSummary {
  return {
    security_deposit_paid: 0,
    security_deposit_expected: 0,
    advance_amount: 0,
    advance_balance: 0,
    total_billed: 0,
    total_paid: 0,
    total_outstanding: 0,
    total_overdue: 0,
    breakdown: [],
    total_refunds_processed: 0,
    pending_refunds: 0,
    current_monthly_rent: 0,
    next_due_date: null,
    next_due_amount: null,
  }
}

export function createDefaultInsights(): PredictiveInsights {
  return {
    payment_reliability_score: 50,
    payment_reliability_level: 'fair',
    payment_reliability_trend: 'stable',
    predicted_payment_behavior: 'on_time',
    churn_risk_score: 20,
    churn_risk_level: 'low',
    churn_risk_factors: [],
    satisfaction_level: 'medium',
    satisfaction_factors: [],
    active_alerts: [],
    recommendations: [],
    confidence: 'low',
    data_points_analyzed: 0,
  }
}
