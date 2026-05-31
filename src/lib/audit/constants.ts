/**
 * Audit Constants - Shared soft-deletable table list
 *
 * Single source of truth for which tables support soft delete.
 * Import from "@/lib/audit" for all audit-related constants.
 *
 * When adding a new table with soft delete support:
 * 1. Add the table name to SOFT_DELETABLE_TABLES below
 * 2. The SoftDeletableTable type in audit.types.ts derives from this automatically
 */

// ============================================================================
// SOFT-DELETABLE TABLES
// ============================================================================

/**
 * All database tables that support soft delete (deleted_at / deleted_by columns).
 * This is the single source of truth - all runtime checks should use this constant
 * or the isSoftDeletableTable() helper.
 */
export const SOFT_DELETABLE_TABLES = [
  // Core PG module tables
  "tenants",
  "bills",
  "payments",
  "expenses",
  "refunds",
  "complaints",
  "notices",
  "visitors",
  "meter_readings",
  "exit_clearance",
  "properties",
  "rooms",
  "people",
  "meters",
  "staff_members",
  "visitor_contacts",
  // Enhanced expense module tables
  "products",
  "daily_spend",
  "vendors",
  "bill_payments",
  "service_providers",
  "service_payments",
  // Miscellaneous transactions
  "misc_transactions",
  "misc_transaction_categories",
  // Entity module tables (unified)
  "entities",
  "entity_sections",
  "entity_seats",
  "entity_members",
  "entity_memberships",
  "entity_attendance",
  "entity_lockers",
  "entity_locker_assignments",
  "entity_payments",
  "entity_waitlist",
  // Tenant portal tables
  "tenant_documents",
] as const

/**
 * Derived type from the SOFT_DELETABLE_TABLES constant.
 * Use this type for function parameters that accept a soft-deletable table name.
 */
export type SoftDeletableTable = (typeof SOFT_DELETABLE_TABLES)[number]

/**
 * Set-based lookup for O(1) membership checks at runtime.
 */
const SOFT_DELETABLE_SET: ReadonlySet<string> = new Set<string>(SOFT_DELETABLE_TABLES)

/**
 * Check if a table name supports soft delete.
 * Uses O(1) Set lookup internally.
 *
 * @example
 * if (isSoftDeletableTable("tenants")) {
 *   await softDelete("tenants", id, userId)
 * }
 */
export function isSoftDeletableTable(table: string): table is SoftDeletableTable {
  return SOFT_DELETABLE_SET.has(table)
}
