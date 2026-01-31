/**
 * Audit Module - Centralized exports
 *
 * Import from "@/lib/audit" for all audit-related functionality.
 */

// Utilities
export {
  withCreatedBy,
  withCreatedByBatch,
  softDelete,
  softDeleteBatch,
  restoreRecord,
  isDeleted,
  filterActive,
  cascadeSoftDelete,
} from "./audit-utils"

// Types (re-exported from types folder)
export type {
  AuditableEntity,
  AuditInsertFields,
  AuditDeleteFields,
  AuditContext,
  WithAuditFields,
  SoftDeletableTable,
  AuditableTable,
  AuditAction,
  AuditEvent,
} from "@/types/audit.types"
