/**
 * Entity Names - Centralized table-to-display-name mapping
 *
 * Single source of truth for converting database table names (e.g. "tenants")
 * and entity type keys (e.g. "tenant") to human-readable display names.
 *
 * Also provides reverse lookup (display name -> table name) and a helper
 * to resolve entity type keys used in the audit system to their table names.
 *
 * @example
 * import { getEntityName, getEntityTableName, entityTypeToTable } from "@/lib/entity-names"
 *
 * getEntityName("tenants")          // "Tenant"
 * getEntityName("tenants", true)    // "Tenants"
 * getEntityName("tenant")           // "Tenant"  (also works with singular keys)
 * getEntityTableName("Tenant")      // "tenants"
 * entityTypeToTable("tenant")       // "tenants"
 */

// ============================================================================
// TABLE NAME -> DISPLAY NAME MAPPING
// ============================================================================

/**
 * Maps database table names to their singular display names.
 *
 * This is the authoritative mapping. All table names from the Supabase schema
 * should be listed here. Entity type keys (singular forms like "tenant") are
 * also included so that audit_events.entity_type values resolve correctly.
 */
export const ENTITY_NAMES: Record<string, string> = {
  // ── PG Module (core) ────────────────────────────────────────────────────
  tenants: "Tenant",
  tenant: "Tenant",
  tenant_stays: "Tenant Stay",
  tenant_documents: "Tenant Document",
  bills: "Bill",
  bill: "Bill",
  bill_categories: "Bill Category",
  bill_payments: "Bill Payment",
  bill_generation_log: "Bill Generation Log",
  payments: "Payment",
  payment: "Payment",
  payment_refunds: "Payment Refund",
  expenses: "Expense",
  expense: "Expense",
  expense_types: "Expense Type",
  refunds: "Refund",
  refund: "Refund",
  complaints: "Complaint",
  complaint: "Complaint",
  notices: "Notice",
  notice: "Notice",
  visitors: "Visitor",
  visitor: "Visitor",
  visitor_contacts: "Visitor Contact",
  properties: "Property",
  property: "Property",
  rooms: "Room",
  room: "Room",
  room_transfers: "Room Transfer",
  beds: "Bed",
  people: "Person",
  person: "Person",
  meters: "Meter",
  meter: "Meter",
  meter_assignments: "Meter Assignment",
  meter_readings: "Meter Reading",
  meter_reading: "Meter Reading",
  staff_members: "Staff Member",
  staff: "Staff Member",
  exit_clearance: "Exit Clearance",
  approvals: "Approval",
  approval: "Approval",
  charges: "Charge",
  charge: "Charge",
  charge_types: "Charge Type",

  // ── PG Module (enhanced expenses) ───────────────────────────────────────
  products: "Product",
  product_categories: "Product Category",
  product_price_history: "Product Price History",
  daily_spend: "Daily Spend",
  vendors: "Vendor",
  service_providers: "Service Provider",
  service_categories: "Service Category",
  service_payments: "Service Payment",
  items: "Item",
  misc_transactions: "Misc Transaction",
  misc_transaction_categories: "Misc Transaction Category",

  // ── Entity Module (unified) ──────────────────────────────────────────────
  entities: "Entity",
  entity: "Entity",
  entity_sections: "Section",
  entity_seats: "Seat",
  entity_members: "Member",
  entity_memberships: "Membership",
  entity_attendance: "Attendance",
  entity_lockers: "Locker",
  entity_locker_assignments: "Locker Assignment",
  entity_payments: "Payment",
  entity_plans: "Plan",
  entity_waitlist: "Waitlist Entry",
  // Kept for backward compat with existing audit events
  libraries: "Library",
  library: "Library",
  library_sections: "Library Section",
  library_seats: "Library Seat",
  library_members: "Library Member",
  library_memberships: "Library Membership",
  library_attendance: "Library Attendance",
  library_lockers: "Library Locker",
  library_locker_assignments: "Locker Assignment",
  library_payments: "Library Payment",
  library_plans: "Library Plan",
  library_waitlist: "Waitlist Entry",

  // ── Identity & Auth ─────────────────────────────────────────────────────
  workspaces: "Workspace",
  workspace: "Workspace",
  user_profiles: "User Profile",
  user_contexts: "User Context",
  user_roles: "User Role",
  platform_admins: "Platform Admin",
  roles: "Role",
  role: "Role",
  invitations: "Invitation",
  person_roles: "Person Role",
  owners: "Owner",
  owner_config: "Owner Config",

  // ── System ──────────────────────────────────────────────────────────────
  audit_events: "Audit Event",
  notifications: "Notification",
  notification_queue: "Notification Queue",
  table_views: "Table View",
  website_inquiries: "Website Inquiry",
  context_switches: "Context Switch",
  context_analytics: "Context Analytics",
  permission_audit_log: "Permission Audit Log",
  permission_usage_analytics: "Permission Usage Analytics",
  duplicate_people_summary: "Duplicate People Summary",
}

// ============================================================================
// PLURAL FORMS
// ============================================================================

/**
 * Irregular plurals that cannot be derived by appending "s".
 */
const IRREGULAR_PLURALS: Record<string, string> = {
  Person: "People",
  Property: "Properties",
  Library: "Libraries",
  "Bill Category": "Bill Categories",
  "Product Category": "Product Categories",
  "Service Category": "Service Categories",
  "Misc Transaction Category": "Misc Transaction Categories",
  "Waitlist Entry": "Waitlist Entries",
  "Website Inquiry": "Website Inquiries",
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the human-readable display name for a database table or entity type key.
 *
 * @param table - The database table name ("tenants") or entity type key ("tenant")
 * @param plural - If true, return the plural form ("Tenants")
 * @returns The display name, or a formatted fallback if the table is not mapped
 *
 * @example
 * getEntityName("tenants")          // "Tenant"
 * getEntityName("tenants", true)    // "Tenants"
 * getEntityName("library_members")  // "Library Member"
 * getEntityName("unknown_table")    // "Unknown Table" (formatted fallback)
 */
export function getEntityName(table: string, plural?: boolean): string {
  const singular = ENTITY_NAMES[table] || formatFallbackName(table)

  if (!plural) return singular

  // Check irregular plurals first
  if (IRREGULAR_PLURALS[singular]) {
    return IRREGULAR_PLURALS[singular]
  }

  // Default: append "s"
  return singular + "s"
}

/**
 * Reverse lookup: get the primary (plural) table name from a display name.
 *
 * @param displayName - The human-readable display name (e.g. "Tenant")
 * @returns The database table name ("tenants"), or undefined if not found
 *
 * @example
 * getEntityTableName("Tenant")       // "tenants"
 * getEntityTableName("Library Seat")  // "library_seats"
 * getEntityTableName("Bogus")        // undefined
 */
export function getEntityTableName(displayName: string): string | undefined {
  // Prefer plural (table) keys over singular (entity type) keys.
  // Table names end with "s" or "_" patterns that distinguish them.
  const entries = Object.entries(ENTITY_NAMES)

  // First pass: find a plural table name match (most common usage)
  for (const [key, name] of entries) {
    if (name === displayName && key.includes("_") || name === displayName && key.endsWith("s")) {
      return key
    }
  }

  // Second pass: find any match
  for (const [key, name] of entries) {
    if (name === displayName) {
      return key
    }
  }

  return undefined
}

/**
 * Convert an entity type key (singular, used in audit_events) to its database table name.
 *
 * @param entityType - The entity type key (e.g. "tenant", "staff", "meter_reading")
 * @returns The database table name (e.g. "tenants", "staff_members", "meter_readings")
 *
 * @example
 * entityTypeToTable("tenant")        // "tenants"
 * entityTypeToTable("staff")         // "staff_members"
 * entityTypeToTable("exit_clearance") // "exit_clearance"
 */
export function entityTypeToTable(entityType: string): string {
  // Explicit mapping for entity types whose table name differs from simply appending "s"
  const ENTITY_TYPE_TO_TABLE: Record<string, string> = {
    tenant: "tenants",
    property: "properties",
    room: "rooms",
    bill: "bills",
    payment: "payments",
    expense: "expenses",
    complaint: "complaints",
    notice: "notices",
    visitor: "visitors",
    staff: "staff_members",
    exit_clearance: "exit_clearance",
    approval: "approvals",
    meter_reading: "meter_readings",
    charge: "charges",
    role: "roles",
    workspace: "workspaces",
    person: "people",
    meter: "meters",
    refund: "refunds",
    library: "libraries",
  }

  return ENTITY_TYPE_TO_TABLE[entityType] || entityType
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Produce a reasonable display name for an unmapped table by replacing
 * underscores with spaces and title-casing each word.
 */
function formatFallbackName(table: string): string {
  return table
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
