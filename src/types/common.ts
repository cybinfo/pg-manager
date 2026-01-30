/**
 * Common Types
 *
 * Shared type definitions used across multiple entities.
 * Import from here instead of defining inline.
 *
 * @example
 * import { PartialProperty, PartialTenant, WithTimeGrouping } from "@/types/common"
 *
 * interface Payment {
 *   property?: PartialProperty | null
 *   tenant?: PartialTenant | null
 * }
 */

// ============================================================================
// PARTIAL ENTITY TYPES (for joins)
// ============================================================================

/**
 * Minimal property info returned from joins
 */
export interface PartialProperty {
  id: string
  name: string
}

/**
 * Minimal room info returned from joins
 */
export interface PartialRoom {
  id: string
  room_number: string
}

/**
 * Minimal person info returned from joins
 */
export interface PartialPerson {
  id: string
  name?: string | null
  photo_url?: string | null
}

/**
 * Minimal tenant info returned from joins
 */
export interface PartialTenant {
  id: string
  name: string
  phone?: string | null
  photo_url?: string | null
  profile_photo?: string | null
  person?: PartialPerson | null
}

/**
 * Minimal staff info returned from joins
 */
export interface PartialStaff {
  id: string
  name: string
  phone?: string | null
  person?: PartialPerson | null
}

/**
 * Minimal charge type info returned from joins
 */
export interface PartialChargeType {
  id: string
  name: string
}

/**
 * Minimal meter info returned from joins
 */
export interface PartialMeter {
  id: string
  meter_number: string
  meter_type: string
}

/**
 * Minimal bill info returned from joins
 */
export interface PartialBill {
  id: string
  bill_number?: string | null
  total_amount: number
  status: string
}

// ============================================================================
// TIME GROUPING TYPES (for list page computed fields)
// ============================================================================

/**
 * Standard month/year grouping fields
 * Used by all list pages for grouping by time
 */
export interface TimeGroupingFields {
  /** Formatted month string, e.g., "January 2026" */
  month?: string
  /** Year string, e.g., "2026" */
  year?: string
}

/**
 * Create a type with time grouping fields prefixed
 *
 * @example
 * type PaymentWithGrouping = Payment & WithTimeGrouping<"payment">
 * // Results in: Payment & { payment_month?: string; payment_year?: string }
 */
export type WithTimeGrouping<Prefix extends string> = {
  [K in `${Prefix}_month`]?: string
} & {
  [K in `${Prefix}_year`]?: string
}

/**
 * Generic list item type that adds time grouping to any base type
 *
 * @example
 * type PaymentListItem = ListItemWithGrouping<Payment, "payment">
 */
export type ListItemWithGrouping<
  T,
  Prefix extends string
> = T & WithTimeGrouping<Prefix>

// ============================================================================
// COMMON ENTITY PATTERNS
// ============================================================================

/**
 * Entity with property join
 */
export interface WithProperty {
  property?: PartialProperty | null
}

/**
 * Entity with room join
 */
export interface WithRoom {
  room?: PartialRoom | null
}

/**
 * Entity with property and room joins
 */
export interface WithPropertyAndRoom extends WithProperty, WithRoom {}

/**
 * Entity with tenant join
 */
export interface WithTenant {
  tenant?: PartialTenant | null
}

/**
 * Entity with person join (for live data)
 */
export interface WithPerson {
  person?: PartialPerson | null
}

/**
 * Entity with charge type join
 */
export interface WithChargeType {
  charge_type?: PartialChargeType | null
}

// ============================================================================
// AUDIT FIELDS
// ============================================================================

/**
 * Standard audit timestamp fields
 */
export interface AuditTimestamps {
  created_at: string
  updated_at?: string | null
}

/**
 * Full audit fields with user tracking
 */
export interface AuditFields extends AuditTimestamps {
  created_by?: string | null
  updated_by?: string | null
}

// ============================================================================
// WORKSPACE FIELDS
// ============================================================================

/**
 * Standard workspace ownership fields
 */
export interface WorkspaceOwned {
  workspace_id: string
  owner_id: string
}

// ============================================================================
// STATUS TYPES
// ============================================================================

/**
 * Generic status with label and variant
 */
export interface StatusInfo {
  label: string
  variant: "success" | "warning" | "error" | "muted" | "default"
}

/**
 * Active/Inactive status
 */
export type ActiveStatus = "active" | "inactive"

// ============================================================================
// PAGINATION TYPES
// ============================================================================

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Standard success response
 */
export interface SuccessResponse<T> {
  success: true
  data: T
  message?: string
}

/**
 * Standard error response
 */
export interface ErrorResponse {
  success: false
  error: string
  code?: string
  details?: Record<string, unknown>
}

/**
 * Combined API response type
 */
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse
