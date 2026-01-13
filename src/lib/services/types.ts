/**
 * Centralized Service Layer - Type Definitions
 *
 * Common types, interfaces, and utilities used across all services.
 * This provides a consistent contract for service operations.
 */

// ============================================
// Service Response Types
// ============================================

export interface ServiceResult<T> {
  success: boolean
  data?: T
  error?: ServiceError
}

export interface ServiceError {
  code: string
  message: string
  details?: Record<string, unknown>
  originalError?: unknown
}

// ============================================
// Audit Event Types
// ============================================

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'status_change'
  | 'approve'
  | 'reject'
  | 'assign'
  | 'complete'
  | 'cancel'
  | 'view'
  | 'export'
  | 'bulk_update'

export type EntityType =
  | 'tenant'
  | 'property'
  | 'room'
  | 'bill'
  | 'payment'
  | 'expense'
  | 'complaint'
  | 'notice'
  | 'visitor'
  | 'staff'
  | 'exit_clearance'
  | 'approval'
  | 'meter_reading'
  | 'charge'
  | 'role'
  | 'workspace'

export interface AuditEvent {
  entity_type: EntityType
  entity_id: string
  action: AuditAction
  actor_id: string
  actor_type: 'owner' | 'staff' | 'tenant' | 'system'
  workspace_id: string
  changes?: {
    before?: Record<string, unknown>
    after?: Record<string, unknown>
    fields_changed?: string[]
  }
  metadata?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
}

// ============================================
// Notification Types
// ============================================

export type NotificationChannel = 'email' | 'whatsapp' | 'in_app' | 'push'

export type NotificationType =
  | 'bill_generated'
  | 'payment_received'
  | 'payment_reminder'
  | 'complaint_update'
  | 'approval_required'
  | 'approval_decision'
  | 'exit_clearance_initiated'
  | 'exit_clearance_completed'
  | 'welcome'
  | 'invitation'

export interface NotificationPayload {
  type: NotificationType
  recipient_id: string
  recipient_type: 'owner' | 'staff' | 'tenant'
  channels: NotificationChannel[]
  data: Record<string, unknown>
  priority?: 'low' | 'normal' | 'high'
  scheduled_at?: Date
}

// ============================================
// Workflow Types
// ============================================

export type WorkflowStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'waiting_approval'

export interface WorkflowStep {
  id: string
  name: string
  status: WorkflowStatus
  started_at?: Date
  completed_at?: Date
  error?: ServiceError
  result?: unknown
}

export interface WorkflowContext {
  workflow_id: string
  workflow_type: string
  actor_id: string
  actor_type: 'owner' | 'staff' | 'tenant' | 'system'
  workspace_id: string
  started_at: Date
  steps: WorkflowStep[]
  metadata: Record<string, unknown>
}

export interface WorkflowResult<T> {
  success: boolean
  data?: T
  workflow_id: string
  steps_completed: number
  steps_total: number
  errors?: ServiceError[]
  audit_events?: string[] // IDs of created audit events
  notifications_sent?: string[] // IDs of notifications sent
  // BL-004: Track failed optional steps for visibility and debugging
  failed_optional_steps?: string[] // Names of optional steps that failed
}

// ============================================
// Query & Mutation Options
// ============================================

export interface QueryOptions {
  workspace_id: string
  actor_id?: string
  include_deleted?: boolean
  page?: number
  page_size?: number
  order_by?: string
  order_direction?: 'asc' | 'desc'
}

export interface MutationOptions {
  workspace_id: string
  actor_id: string
  actor_type: 'owner' | 'staff' | 'tenant' | 'system'
  skip_audit?: boolean
  skip_notification?: boolean
  skip_workflow?: boolean
}

// ============================================
// List Page Types (for centralized hook)
// ============================================

export interface ListPageConfig<T> {
  entity_type: EntityType
  table: string
  select: string
  default_order: string
  default_order_direction: 'asc' | 'desc'
  search_fields: (keyof T)[]
  join_fields?: string[]
  computed_fields?: (item: T) => Record<string, unknown>
}

export interface FilterDefinition {
  id: string
  label: string
  type: 'select' | 'multi-select' | 'date' | 'date-range' | 'text' | 'number-range'
  options?: { value: string; label: string }[]
  options_query?: {
    table: string
    value_field: string
    label_field: string
    order_by?: string
  }
}

export interface GroupByDefinition {
  key: string
  label: string
  sort_order?: number
}

export interface MetricDefinition<T> {
  id: string
  label: string
  type: 'count' | 'sum' | 'average' | 'custom'
  field?: keyof T
  filter?: (item: T) => boolean
  compute?: (items: T[]) => number | string
  format?: 'number' | 'currency' | 'percentage'
  icon?: string
  highlight_when?: (value: number) => boolean
}

// ============================================
// Entity Status Types
// ============================================

export interface TenantStatus {
  current: 'active' | 'notice_period' | 'checked_out'
  previous?: string
  changed_at?: Date
  changed_by?: string
  reason?: string
}

export interface BillStatus {
  current: 'pending' | 'partial' | 'paid' | 'overdue' | 'waived'
  previous?: string
  changed_at?: Date
  payment_ids?: string[]
}

export interface ComplaintStatus {
  current: 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed'
  previous?: string
  changed_at?: Date
  changed_by?: string
  resolution_notes?: string
}

export interface ApprovalStatus {
  current: 'pending' | 'approved' | 'rejected' | 'expired'
  previous?: string
  decided_at?: Date
  decided_by?: string
  decision_notes?: string
}

// ============================================
// Cascade Effect Types
// ============================================

export interface CascadeEffect {
  entity_type: EntityType
  entity_id: string
  action: AuditAction
  data?: Record<string, unknown>
}

export interface WorkflowCascades {
  updates: CascadeEffect[]
  notifications: NotificationPayload[]
  audit_events: AuditEvent[]
}

// ============================================
// Error Codes
// ============================================

export const ERROR_CODES = {
  // General
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',

  // Tenant
  TENANT_HAS_DUES: 'TENANT_HAS_DUES',
  TENANT_ALREADY_EXITED: 'TENANT_ALREADY_EXITED',
  ROOM_AT_CAPACITY: 'ROOM_AT_CAPACITY',
  TENANT_STATUS_INVALID: 'TENANT_STATUS_INVALID',
  ROOM_TRANSFER_INVALID: 'ROOM_TRANSFER_INVALID',

  // Payment & Billing
  PAYMENT_EXCEEDS_DUE: 'PAYMENT_EXCEEDS_DUE',
  INVALID_PAYMENT_METHOD: 'INVALID_PAYMENT_METHOD',
  BILL_ALREADY_PAID: 'BILL_ALREADY_PAID',
  BILL_AMOUNT_MISMATCH: 'BILL_AMOUNT_MISMATCH',
  ADVANCE_BALANCE_INSUFFICIENT: 'ADVANCE_BALANCE_INSUFFICIENT',

  // Refunds
  REFUND_EXCEEDS_BALANCE: 'REFUND_EXCEEDS_BALANCE',
  REFUND_ALREADY_PROCESSED: 'REFUND_ALREADY_PROCESSED',
  SECURITY_DEPOSIT_INVALID: 'SECURITY_DEPOSIT_INVALID',

  // Exit Clearance
  EXIT_ALREADY_INITIATED: 'EXIT_ALREADY_INITIATED',
  EXIT_INCOMPLETE: 'EXIT_INCOMPLETE',
  PENDING_DUES: 'PENDING_DUES',
  CLEARANCE_CHECKLIST_INCOMPLETE: 'CLEARANCE_CHECKLIST_INCOMPLETE',

  // Workflow
  WORKFLOW_STEP_FAILED: 'WORKFLOW_STEP_FAILED',
  WORKFLOW_CANCELLED: 'WORKFLOW_CANCELLED',
  WORKFLOW_TIMEOUT: 'WORKFLOW_TIMEOUT',

  // Approval
  APPROVAL_EXPIRED: 'APPROVAL_EXPIRED',
  APPROVAL_ALREADY_PROCESSED: 'APPROVAL_ALREADY_PROCESSED',
  APPROVAL_INVALID_STATE: 'APPROVAL_INVALID_STATE',

  // BL-012: Concurrency
  CONCURRENT_MODIFICATION: 'CONCURRENT_MODIFICATION',
} as const

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]

// ============================================
// Helper Functions
// ============================================

export function createServiceError(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
  originalError?: unknown
): ServiceError {
  return {
    code,
    message,
    details,
    originalError,
  }
}

export function createSuccessResult<T>(data: T): ServiceResult<T> {
  return {
    success: true,
    data,
  }
}

export function createErrorResult<T>(error: ServiceError): ServiceResult<T> {
  return {
    success: false,
    error,
  }
}
