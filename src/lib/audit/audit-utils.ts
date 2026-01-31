/**
 * Audit Utilities - Centralized audit operations
 *
 * Provides consistent methods for:
 * - Adding created_by to insert operations
 * - Soft delete operations (instead of hard delete)
 * - Restoring soft-deleted records
 *
 * Usage:
 * import { withCreatedBy, softDelete, restoreRecord } from "@/lib/audit/audit-utils"
 */

import { createClient } from "@/lib/supabase/client"
import type { SoftDeletableTable, AuditInsertFields, AuditDeleteFields } from "@/types/audit.types"

// ============================================================================
// INSERT UTILITIES
// ============================================================================

/**
 * Adds created_by field to insert data.
 * Use this helper to ensure all inserts track who created the record.
 *
 * @example
 * const { error } = await supabase
 *   .from("tenants")
 *   .insert(withCreatedBy({ name: "John", phone: "123" }, user.id))
 */
export function withCreatedBy<T extends Record<string, unknown>>(
  data: T,
  userId: string
): T & AuditInsertFields {
  return {
    ...data,
    created_by: userId,
  }
}

/**
 * Adds created_by to an array of insert records.
 *
 * @example
 * const records = [{ name: "A" }, { name: "B" }]
 * await supabase.from("table").insert(withCreatedByBatch(records, user.id))
 */
export function withCreatedByBatch<T extends Record<string, unknown>>(
  data: T[],
  userId: string
): (T & AuditInsertFields)[] {
  return data.map((item) => withCreatedBy(item, userId))
}

// ============================================================================
// SOFT DELETE UTILITIES
// ============================================================================

/**
 * Performs a soft delete on a record.
 * Sets deleted_at and deleted_by instead of actually deleting the row.
 *
 * @returns The updated record or null if not found
 *
 * @example
 * const result = await softDelete("tenants", tenantId, user.id)
 * if (result.error) {
 *   toast.error("Failed to delete")
 * }
 */
export async function softDelete(
  table: SoftDeletableTable,
  recordId: string,
  deletedBy: string
): Promise<{ data: unknown | null; error: Error | null }> {
  const supabase = createClient()

  const deleteFields: AuditDeleteFields = {
    deleted_at: new Date().toISOString(),
    deleted_by: deletedBy,
  }

  const { data, error } = await supabase
    .from(table)
    .update(deleteFields)
    .eq("id", recordId)
    .is("deleted_at", null) // Only delete if not already deleted
    .select()
    .single()

  return {
    data,
    error: error ? new Error(error.message) : null,
  }
}

/**
 * Performs soft delete on multiple records.
 *
 * @example
 * await softDeleteBatch("payments", paymentIds, user.id)
 */
export async function softDeleteBatch(
  table: SoftDeletableTable,
  recordIds: string[],
  deletedBy: string
): Promise<{ count: number; error: Error | null }> {
  const supabase = createClient()

  const deleteFields: AuditDeleteFields = {
    deleted_at: new Date().toISOString(),
    deleted_by: deletedBy,
  }

  const { data, error } = await supabase
    .from(table)
    .update(deleteFields)
    .in("id", recordIds)
    .is("deleted_at", null)
    .select("id")

  return {
    count: data?.length || 0,
    error: error ? new Error(error.message) : null,
  }
}

/**
 * Restores a soft-deleted record.
 * Clears deleted_at and deleted_by fields.
 *
 * @example
 * const result = await restoreRecord("tenants", tenantId)
 */
export async function restoreRecord(
  table: SoftDeletableTable,
  recordId: string
): Promise<{ data: unknown | null; error: Error | null }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from(table)
    .update({
      deleted_at: null,
      deleted_by: null,
    })
    .eq("id", recordId)
    .not("deleted_at", "is", null) // Only restore if currently deleted
    .select()
    .single()

  return {
    data,
    error: error ? new Error(error.message) : null,
  }
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

/**
 * Checks if a record is soft-deleted.
 */
export function isDeleted(record: { deleted_at?: string | null }): boolean {
  return record.deleted_at != null
}

/**
 * Filters out soft-deleted records from an array.
 */
export function filterActive<T extends { deleted_at?: string | null }>(
  records: T[]
): T[] {
  return records.filter((r) => !isDeleted(r))
}

// ============================================================================
// CASCADE SOFT DELETE
// ============================================================================

/**
 * Configuration for cascade soft delete operations.
 */
interface CascadeConfig {
  table: SoftDeletableTable
  foreignKey: string
}

/**
 * Performs cascade soft delete on related records.
 * Use this when deleting a parent record that has child relationships.
 *
 * @example
 * // When deleting a person, also soft-delete their tenant records
 * await cascadeSoftDelete(
 *   personId,
 *   deletedBy,
 *   [
 *     { table: "tenants", foreignKey: "person_id" },
 *     { table: "visitor_contacts", foreignKey: "person_id" },
 *   ]
 * )
 */
export async function cascadeSoftDelete(
  parentId: string,
  deletedBy: string,
  cascades: CascadeConfig[]
): Promise<{ results: Record<string, number>; errors: string[] }> {
  const supabase = createClient()
  const results: Record<string, number> = {}
  const errors: string[] = []

  const deleteFields: AuditDeleteFields = {
    deleted_at: new Date().toISOString(),
    deleted_by: deletedBy,
  }

  for (const cascade of cascades) {
    try {
      const { data, error } = await supabase
        .from(cascade.table)
        .update(deleteFields)
        .eq(cascade.foreignKey, parentId)
        .is("deleted_at", null)
        .select("id")

      if (error) {
        errors.push(`${cascade.table}: ${error.message}`)
      } else {
        results[cascade.table] = data?.length || 0
      }
    } catch (err) {
      errors.push(`${cascade.table}: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }

  return { results, errors }
}
