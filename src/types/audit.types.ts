/**
 * Audit Types - Centralized audit field definitions
 *
 * All entity types should extend AuditableEntity for consistent audit tracking.
 * This ensures unified handling of created_by, deleted_at, deleted_by across the app.
 */

// ============================================================================
// BASE AUDIT INTERFACE
// ============================================================================

/**
 * Base interface for all auditable entities.
 * Extend this interface when defining new entity types.
 */
export interface AuditableEntity {
  // Standard timestamps (usually auto-set by database)
  created_at: string
  updated_at: string

  // Audit tracking fields (set by application code)
  created_by?: string | null
  deleted_at?: string | null
  deleted_by?: string | null
}

/**
 * Audit fields to include in insert operations.
 * Use this when creating new records.
 */
export interface AuditInsertFields {
  created_by: string
}

/**
 * Audit fields for soft delete operations.
 * Use this when soft-deleting records.
 */
export interface AuditDeleteFields {
  deleted_at: string
  deleted_by: string
}

// ============================================================================
// AUDIT CONTEXT
// ============================================================================

/**
 * Context for audit operations.
 * Typically derived from the authenticated user session.
 */
export interface AuditContext {
  actor_id: string
  actor_type: 'user' | 'system' | 'cron'
  workspace_id?: string
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Helper type to add audit fields to any entity type.
 * Usage: type MyAuditableEntity = WithAuditFields<MyBaseEntity>
 */
export type WithAuditFields<T> = T & AuditableEntity

/**
 * Entity types that support soft delete.
 * These are the tables that have deleted_at/deleted_by columns.
 */
export type SoftDeletableTable =
  | 'tenants'
  | 'bills'
  | 'payments'
  | 'expenses'
  | 'refunds'
  | 'complaints'
  | 'notices'
  | 'visitors'
  | 'meter_readings'
  | 'exit_clearance'
  | 'properties'
  | 'rooms'
  | 'people'
  | 'meters'
  | 'staff_members'
  | 'visitor_contacts'

/**
 * Entity types that support created_by tracking.
 * Same as soft deletable tables.
 */
export type AuditableTable = SoftDeletableTable

// ============================================================================
// AUDIT EVENT TYPES (for activity history)
// ============================================================================

export type AuditAction = 'insert' | 'update' | 'delete'

export interface AuditEvent {
  id: string
  entity_type: string
  entity_id: string
  action: AuditAction
  actor_id: string | null
  actor_type: string
  changes: {
    before?: Record<string, unknown>
    after?: Record<string, unknown>
  } | null
  metadata: Record<string, unknown> | null
  created_at: string
  workspace_id?: string
}
