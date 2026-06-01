/**
 * Detail Page Types & Pre-built Configurations
 *
 * Shared types, interfaces, and config constants for the useDetailPage hook system.
 */

// ============================================
// Types
// ============================================

export interface RelatedQueryConfig {
  key: string // Result key name
  table: string // Table to query
  select: string // Fields to select
  foreignKey: string // FK column (e.g., "tenant_id")
  foreignKeyValue?: string // Value to use for FK (defaults to entity id, use "field:columnName" to reference a field from main entity)
  joinFields?: string[] // Fields to transform in related data
  orderBy?: string
  orderDirection?: "asc" | "desc"
  limit?: number
  filter?: Record<string, unknown> // Additional filters
  filterNull?: string // Filter where this column is null (e.g., "end_date" for active assignments)
}

export interface DetailPageConfig<T = unknown> {
  table: string
  select: string // Supabase select with joins
  joinFields?: string[] // Fields to transform
  relatedQueries?: RelatedQueryConfig[] // Additional parallel fetches
  computedFields?: (item: T) => Record<string, unknown>
  redirectOnNotFound?: string // Where to redirect if not found
  notFoundMessage?: string // Toast message when not found
}

export interface UseDetailPageOptions<T> {
  config: DetailPageConfig<T>
  id: string | string[] | undefined
  enabled?: boolean
}

export interface UseDetailPageReturn<T> {
  // Data
  data: T | null
  related: Record<string, unknown[]>
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>

  // Actions
  updateField: (field: string, value: unknown) => Promise<boolean>
  updateFields: (updates: Record<string, unknown>) => Promise<boolean>
  deleteRecord: (options?: { confirm?: boolean; cascadeDeletes?: { table: string; foreignKey: string }[] }) => Promise<boolean>
  isDeleting: boolean
  isSaving: boolean
}

// ============================================
// Pre-built Configurations
// ============================================

// Staff Detail Config
export const STAFF_DETAIL_CONFIG: DetailPageConfig = {
  table: "staff_members",
  select: `
    *,
    person:people(id, photo_url)
  `,
  joinFields: ["person"],
  redirectOnNotFound: "/staff",
  notFoundMessage: "Staff member not found",
  relatedQueries: [
    {
      key: "userRoles",
      table: "user_roles",
      select: `
        id,
        role_id,
        entity_id,
        role:roles(id, name, description),
        property:entities(id, name)
      `,
      foreignKey: "staff_member_id",
      joinFields: ["role", "property"],
    },
  ],
}

// Visitor Detail Config
export const VISITOR_DETAIL_CONFIG: DetailPageConfig = {
  table: "visitors",
  select: `
    *,
    property:entities(id, name),
    tenant:tenants!visitors_tenant_id_fkey(id, name, phone, person:people(id, photo_url)),
    person:people(id, name, phone, email, photo_url, company_name, occupation),
    visitor_contact:visitor_contacts(
      id, name, phone, email, visitor_type, company_name, service_type,
      id_type, id_number, notes, photo_url, is_frequent, is_blocked,
      blocked_reason, visit_count, last_visit_at, person_id, created_at,
      person:people(id, name, phone, email, photo_url)
    )
  `,
  joinFields: ["property", "tenant", "person", "visitor_contact"],
  redirectOnNotFound: "/visitors",
  notFoundMessage: "Visitor not found",
}

// Tenant Detail Config
export const TENANT_DETAIL_CONFIG: DetailPageConfig = {
  table: "tenants",
  select: `
    *,
    property:entities(id, name, address),
    room:rooms(id, room_number, room_type),
    person:people(
      id, name, phone, email, photo_url, date_of_birth, gender,
      aadhaar_number, pan_number, permanent_address, permanent_city,
      permanent_state, permanent_pincode, current_address, occupation,
      company_name, emergency_contacts, blood_group, is_verified, is_blocked
    )
  `,
  joinFields: ["property", "room", "person"],
  redirectOnNotFound: "/tenants",
  notFoundMessage: "Tenant not found",
  relatedQueries: [
    {
      key: "payments",
      table: "payments",
      select: "id, amount, payment_date, payment_method, for_period, charge_type:charge_types(name)",
      foreignKey: "tenant_id",
      joinFields: ["charge_type"],
      orderBy: "payment_date",
      orderDirection: "desc",
      limit: 5,
    },
    {
      key: "charges",
      table: "charges",
      select: "id, amount, due_date, status, for_period, charge_type:charge_types(name)",
      foreignKey: "tenant_id",
      joinFields: ["charge_type"],
      filter: { status: ["pending", "partial", "overdue"] },
      orderBy: "due_date",
      orderDirection: "asc",
    },
    {
      key: "stays",
      table: "tenant_stays",
      select: "id, join_date, exit_date, monthly_rent, status, stay_number, property:entities(name), room:rooms(room_number)",
      foreignKey: "tenant_id",
      joinFields: ["property", "room"],
      orderBy: "stay_number",
      orderDirection: "desc",
    },
    {
      key: "transfers",
      table: "room_transfers",
      select: `
        id, transfer_date, reason, old_rent, new_rent,
        from_property:entities!room_transfers_from_entity_id_fkey(name),
        from_room:rooms!room_transfers_from_room_id_fkey(room_number),
        to_property:entities!room_transfers_to_entity_id_fkey(name),
        to_room:rooms!room_transfers_to_room_id_fkey(room_number)
      `,
      foreignKey: "tenant_id",
      joinFields: ["from_property", "from_room", "to_property", "to_room"],
      orderBy: "transfer_date",
      orderDirection: "desc",
    },
    {
      key: "bills",
      table: "bills",
      select: "id, bill_number, bill_date, total_amount, balance_due, status",
      foreignKey: "tenant_id",
      orderBy: "bill_date",
      orderDirection: "desc",
      limit: 5,
    },
  ],
}

// Bill Detail Config
export const BILL_DETAIL_CONFIG: DetailPageConfig = {
  table: "bills",
  select: `
    *,
    tenant:tenants(id, name, phone, email, person_id, person:people(id, photo_url)),
    property:entities(id, name, address)
  `,
  joinFields: ["tenant", "property"],
  redirectOnNotFound: "/bills",
  notFoundMessage: "Bill not found",
  relatedQueries: [
    {
      key: "payments",
      table: "payments",
      select: "id, amount, payment_date, payment_method, receipt_number, notes",
      foreignKey: "bill_id",
      orderBy: "payment_date",
      orderDirection: "desc",
    },
  ],
}

// Payment Detail Config
export const PAYMENT_DETAIL_CONFIG: DetailPageConfig = {
  table: "payments",
  select: `
    *,
    tenant:tenants(id, name, phone, person_id, person:people(id, photo_url)),
    property:entities(id, name),
    bill:bills(id, bill_number, total_amount, balance_due),
    charge_type:charge_types(id, name)
  `,
  joinFields: ["tenant", "property", "bill", "charge_type"],
  redirectOnNotFound: "/payments",
  notFoundMessage: "Payment not found",
}

// Expense Detail Config
export const EXPENSE_DETAIL_CONFIG: DetailPageConfig = {
  table: "expenses",
  select: `
    *,
    property:entities(id, name),
    expense_type:expense_types(id, name, code)
  `,
  joinFields: ["property", "expense_type"],
  redirectOnNotFound: "/expenses",
  notFoundMessage: "Expense not found",
}

// Property Detail Config
export const PROPERTY_DETAIL_CONFIG: DetailPageConfig = {
  table: "entities",
  select: "*",
  redirectOnNotFound: "/properties",
  notFoundMessage: "Property not found",
  relatedQueries: [
    {
      key: "rooms",
      table: "rooms",
      select: "id, room_number, room_type, floor, total_beds, occupied_beds, rent_amount, status, has_ac, has_attached_bathroom",
      foreignKey: "entity_id",
      orderBy: "room_number",
      orderDirection: "asc",
    },
    {
      key: "tenants",
      table: "tenants",
      select: "id, name, phone, photo_url, profile_photo, status, monthly_rent, check_in_date, room:rooms(id, room_number), person:people(id, photo_url)",
      foreignKey: "entity_id",
      joinFields: ["room", "person"],
      filter: { status: ["active", "notice_period"] },
      orderBy: "name",
      orderDirection: "asc",
    },
    {
      key: "staff",
      table: "user_roles",
      select: "id, staff_member:staff_members(id, name, email, phone, is_active, person:people(id, photo_url)), role:roles(id, name)",
      foreignKey: "entity_id",
      joinFields: ["staff_member", "role"],
    },
    {
      key: "bills",
      table: "bills",
      select: "id, bill_number, bill_date, total_amount, balance_due, status, tenant:tenants(id, name)",
      foreignKey: "entity_id",
      joinFields: ["tenant"],
      orderBy: "bill_date",
      orderDirection: "desc",
      limit: 5,
    },
    {
      key: "payments",
      table: "payments",
      select: "id, amount, payment_date, payment_method, tenant:tenants(id, name)",
      foreignKey: "entity_id",
      joinFields: ["tenant"],
      orderBy: "payment_date",
      orderDirection: "desc",
      limit: 5,
    },
    {
      key: "expenses",
      table: "expenses",
      select: "id, amount, expense_date, description, expense_type:expense_types(name)",
      foreignKey: "entity_id",
      joinFields: ["expense_type"],
      orderBy: "expense_date",
      orderDirection: "desc",
      limit: 5,
    },
    {
      key: "complaints",
      table: "complaints",
      select: "id, title, description, status, priority, created_at, tenant:tenants(id, name), room:rooms(id, room_number)",
      foreignKey: "entity_id",
      joinFields: ["tenant", "room"],
      orderBy: "created_at",
      orderDirection: "desc",
      limit: 5,
    },
    {
      key: "visitors",
      table: "visitors",
      select: "id, visitor_name, purpose, check_in_time, check_out_time, is_overnight, tenant:tenants(id, name)",
      foreignKey: "entity_id",
      joinFields: ["tenant"],
      orderBy: "check_in_time",
      orderDirection: "desc",
      limit: 5,
    },
  ],
}

// Room Detail Config
export const ROOM_DETAIL_CONFIG: DetailPageConfig = {
  table: "rooms",
  select: `
    *,
    property:entities(id, name, address)
  `,
  joinFields: ["property"],
  redirectOnNotFound: "/rooms",
  notFoundMessage: "Room not found",
  relatedQueries: [
    {
      key: "tenants",
      table: "tenants",
      select: "id, name, phone, email, photo_url, profile_photo, status, monthly_rent, check_in_date, person:people(id, photo_url)",
      foreignKey: "room_id",
      joinFields: ["person"],
      filter: { status: ["active", "notice_period"] },
      orderBy: "name",
      orderDirection: "asc",
    },
    {
      key: "meterAssignments",
      table: "meter_assignments",
      select: "id, meter_id, start_date, start_reading, end_date, meter:meters(id, meter_number, meter_type, status)",
      foreignKey: "room_id",
      joinFields: ["meter"],
      filterNull: "end_date",
      orderBy: "start_date",
      orderDirection: "desc",
    },
    {
      key: "meterReadings",
      table: "meter_readings",
      select: "id, reading_date, reading_value, units_consumed, meter:meters(id, meter_number, meter_type)",
      foreignKey: "room_id",
      joinFields: ["meter"],
      orderBy: "reading_date",
      orderDirection: "desc",
      limit: 5,
    },
    {
      key: "complaints",
      table: "complaints",
      select: "id, title, description, status, priority, created_at, tenant:tenants(id, name)",
      foreignKey: "room_id",
      joinFields: ["tenant"],
      orderBy: "created_at",
      orderDirection: "desc",
      limit: 5,
    },
  ],
}

// Meter Reading Detail Config
export const METER_READING_DETAIL_CONFIG: DetailPageConfig = {
  table: "meter_readings",
  select: `
    *,
    property:entities(id, name, address),
    room:rooms(id, room_number),
    charge_type:charge_types(id, name, calculation_config)
  `,
  joinFields: ["property", "room", "charge_type"],
  redirectOnNotFound: "/meter-readings",
  notFoundMessage: "Meter reading not found",
}

// Meter Detail Config
export const METER_DETAIL_CONFIG: DetailPageConfig = {
  table: "meters",
  select: `
    *,
    property:entities(id, name)
  `,
  joinFields: ["property"],
  redirectOnNotFound: "/meters",
  notFoundMessage: "Meter not found",
  relatedQueries: [
    {
      key: "assignments",
      table: "meter_assignments",
      select: "id, start_date, end_date, start_reading, end_reading, reason, notes, room:rooms(id, room_number)",
      foreignKey: "meter_id",
      joinFields: ["room"],
      orderBy: "start_date",
      orderDirection: "desc",
    },
    {
      key: "readings",
      table: "meter_readings",
      select: "id, reading_date, reading_value, units_consumed",
      foreignKey: "meter_id",
      orderBy: "reading_date",
      orderDirection: "desc",
      limit: 10,
    },
    {
      key: "rooms",
      table: "rooms",
      select: "id, room_number",
      foreignKey: "entity_id",
      foreignKeyValue: "field:entity_id",
      orderBy: "room_number",
      orderDirection: "asc",
    },
  ],
}

// Complaint Detail Config
export const COMPLAINT_DETAIL_CONFIG: DetailPageConfig = {
  table: "complaints",
  select: `
    *,
    tenant:tenants(id, name, phone, person:people(id, photo_url)),
    property:entities(id, name, address, city),
    room:rooms(id, room_number)
  `,
  joinFields: ["tenant", "property", "room"],
  redirectOnNotFound: "/complaints",
  notFoundMessage: "Complaint not found",
}

// Notice Detail Config
export const NOTICE_DETAIL_CONFIG: DetailPageConfig = {
  table: "notices",
  select: `
    *,
    property:entities(id, name)
  `,
  joinFields: ["property"],
  redirectOnNotFound: "/notices",
  notFoundMessage: "Notice not found",
}

// Exit Clearance Detail Config
export const EXIT_CLEARANCE_DETAIL_CONFIG: DetailPageConfig = {
  table: "exit_clearance",
  select: `
    *,
    tenant:tenants(id, name, phone, email, security_deposit, monthly_rent, person:people(id, photo_url)),
    property:entities(id, name),
    room:rooms(id, room_number)
  `,
  joinFields: ["tenant", "property", "room"],
  redirectOnNotFound: "/exit-clearance",
  notFoundMessage: "Exit clearance not found",
  relatedQueries: [
    {
      key: "refunds",
      table: "refunds",
      select: "id, amount, refund_type, status, payment_method, processed_date",
      foreignKey: "exit_clearance_id",
      orderBy: "created_at",
      orderDirection: "desc",
    },
  ],
}

// Refund Detail Config
export const REFUND_DETAIL_CONFIG: DetailPageConfig = {
  table: "refunds",
  select: `
    *,
    tenant:tenants(id, name, phone, photo_url, profile_photo, person:people(id, photo_url)),
    property:entities(id, name),
    exit_clearance:exit_clearance(id, expected_exit_date, actual_exit_date, settlement_status)
  `,
  joinFields: ["tenant", "property", "exit_clearance"],
  redirectOnNotFound: "/refunds",
  notFoundMessage: "Refund not found",
}

// People Detail Config
export const PEOPLE_DETAIL_CONFIG: DetailPageConfig = {
  table: "people",
  select: "*",
  redirectOnNotFound: "/people",
  notFoundMessage: "Person not found",
  relatedQueries: [
    {
      key: "tenants",
      table: "tenants",
      select: "id, check_in_date, check_out_date, status, monthly_rent, property:entities(name), room:rooms(room_number)",
      foreignKey: "person_id",
      joinFields: ["property", "room"],
      orderBy: "check_in_date",
      orderDirection: "desc",
    },
    {
      key: "staffMembers",
      table: "staff_members",
      select: "id, is_active, created_at, user_id",
      foreignKey: "person_id",
      orderBy: "created_at",
      orderDirection: "desc",
    },
    {
      key: "visitorContacts",
      table: "visitor_contacts",
      select: "id, visit_count, is_frequent, is_blocked",
      foreignKey: "person_id",
    },
  ],
}

// Inquiry Detail Config
export const INQUIRY_DETAIL_CONFIG: DetailPageConfig = {
  table: "website_inquiries",
  select: `
    *,
    property:entities(id, name, city)
  `,
  joinFields: ["property"],
  redirectOnNotFound: "/inquiries",
  notFoundMessage: "Inquiry not found",
}

// ============================================
// ENHANCED EXPENSE MODULE DETAIL CONFIGS
// ============================================

// Product Detail Config
export const PRODUCT_DETAIL_CONFIG: DetailPageConfig = {
  table: "products",
  select: `
    *,
    category:product_categories(id, name, name_hi)
  `,
  joinFields: ["category"],
  redirectOnNotFound: "/expenses/products",
  notFoundMessage: "Product not found",
}

// Daily Spend Detail Config
export const DAILY_SPEND_DETAIL_CONFIG: DetailPageConfig = {
  table: "daily_spend",
  select: `
    *,
    property:entities(id, name),
    product:products(id, name, name_hi, default_unit)
  `,
  joinFields: ["property", "product"],
  redirectOnNotFound: "/expenses/daily-spend",
  notFoundMessage: "Daily spend entry not found",
}

// Vendor Detail Config
export const VENDOR_DETAIL_CONFIG: DetailPageConfig = {
  table: "vendors",
  select: `
    *,
    category:bill_categories(id, name, name_hi)
  `,
  joinFields: ["category"],
  redirectOnNotFound: "/expenses/vendors",
  notFoundMessage: "Vendor not found",
  relatedQueries: [
    {
      key: "recentPayments",
      table: "bill_payments",
      select: "id, bill_number, bill_amount, paid_amount, payment_date, status",
      foreignKey: "vendor_id",
      orderBy: "payment_date",
      orderDirection: "desc",
      limit: 10,
    },
  ],
}

// Bill Payment Detail Config
export const BILL_PAYMENT_DETAIL_CONFIG: DetailPageConfig = {
  table: "bill_payments",
  select: `
    *,
    property:entities(id, name),
    vendor:vendors(id, name, upi_id, gstin),
    category:bill_categories(id, name, name_hi)
  `,
  joinFields: ["property", "vendor", "category"],
  redirectOnNotFound: "/expenses/bills",
  notFoundMessage: "Bill payment not found",
}

// Service Provider Detail Config
export const SERVICE_PROVIDER_DETAIL_CONFIG: DetailPageConfig = {
  table: "service_providers",
  select: `
    *,
    category:service_categories(id, name, name_hi, default_tds_section, default_tds_rate)
  `,
  joinFields: ["category"],
  redirectOnNotFound: "/expenses/service-providers",
  notFoundMessage: "Service provider not found",
  relatedQueries: [
    {
      key: "recentServices",
      table: "service_payments",
      select: "id, service_date, description, gross_amount, net_amount, warranty_expiry, property:entities(id, name)",
      foreignKey: "provider_id",
      joinFields: ["property"],
      orderBy: "service_date",
      orderDirection: "desc",
      limit: 10,
    },
  ],
}

// Service Payment Detail Config
export const SERVICE_PAYMENT_DETAIL_CONFIG: DetailPageConfig = {
  table: "service_payments",
  select: `
    *,
    property:entities(id, name),
    room:rooms(id, room_number),
    provider:service_providers(id, name, phone, rating, upi_id),
    category:service_categories(id, name, name_hi),
    complaint:complaints(id, title, status)
  `,
  joinFields: ["property", "room", "provider", "category", "complaint"],
  redirectOnNotFound: "/expenses/services",
  notFoundMessage: "Service payment not found",
}

// Kitchen Wastage Detail Config
export const KITCHEN_WASTAGE_DETAIL_CONFIG: DetailPageConfig = {
  table: "kitchen_wastage",
  select: `
    *,
    property:entities(id, name),
    product:products(id, name, name_hi)
  `,
  joinFields: ["property", "product"],
  redirectOnNotFound: "/expenses/kitchen/wastage",
  notFoundMessage: "Wastage entry not found",
}

// Misc Transaction Detail Config
export const MISC_TRANSACTION_DETAIL_CONFIG: DetailPageConfig = {
  table: "misc_transactions",
  select: `
    *,
    category:misc_transaction_categories(id, name, name_hi, default_type)
  `,
  joinFields: ["category"],
  redirectOnNotFound: "/expenses/misc",
  notFoundMessage: "Transaction not found",
}

// ============================================
// LIBRARY MODULE DETAIL CONFIGS
// ============================================

// Library Detail Config
export const LIBRARY_DETAIL_CONFIG: DetailPageConfig = {
  table: "entities",
  select: "*",
  redirectOnNotFound: "/library",
  notFoundMessage: "Library not found",
  relatedQueries: [
    {
      key: "sections",
      table: "entity_sections",
      select: "id, name, section_number, floor, total_seats, occupied_seats, is_ac, is_active",
      foreignKey: "entity_id",
      orderBy: "name",
      orderDirection: "asc",
    },
    {
      key: "members",
      table: "entity_members",
      select: "id, name, member_code, phone, status, hours_balance, join_date, person:people(id, name, photo_url)",
      foreignKey: "entity_id",
      joinFields: ["person"],
      filter: { status: ["active"] },
      orderBy: "name",
      orderDirection: "asc",
      limit: 10,
    },
    {
      key: "lockers",
      table: "entity_lockers",
      select: "id, locker_number, size, status, monthly_rent, current_member:entity_members!fk_lockers_current_member(id, name, person:people(id, name))",
      foreignKey: "entity_id",
      joinFields: ["current_member"],
      orderBy: "locker_number",
      orderDirection: "asc",
    },
    {
      key: "recentPayments",
      table: "entity_payments",
      select: "id, amount, payment_date, payment_type, member:entity_members(id, name, person:people(id, name))",
      foreignKey: "workspace_id",
      foreignKeyValue: "field:workspace_id",
      joinFields: ["member"],
      orderBy: "payment_date",
      orderDirection: "desc",
      limit: 5,
    },
  ],
}

// Library Section Detail Config
export const LIBRARY_SECTION_DETAIL_CONFIG: DetailPageConfig = {
  table: "entity_sections",
  select: `
    *,
    library:entities(id, name, code)
  `,
  joinFields: ["library"],
  redirectOnNotFound: "/library-sections",
  notFoundMessage: "Section not found",
  relatedQueries: [
    {
      key: "seats",
      table: "entity_seats",
      select: "id, seat_number, row_number, status, has_power_outlet, current_member:entity_members!fk_seats_current_member(id, name, member_code, person:people(id, name))",
      foreignKey: "section_id",
      joinFields: ["current_member"],
      orderBy: "seat_number",
      orderDirection: "asc",
    },
  ],
}

// Library Seat Detail Config
export const LIBRARY_SEAT_DETAIL_CONFIG: DetailPageConfig = {
  table: "entity_seats",
  select: `
    *,
    section:entity_sections(id, name, library:entities(id, name)),
    current_member:entity_members!fk_seats_current_member(id, name, member_code, phone, person:people(id, name, photo_url, phone))
  `,
  joinFields: ["section", "current_member"],
  redirectOnNotFound: "/library-sections",
  notFoundMessage: "Seat not found",
}

// Library Member Detail Config
export const LIBRARY_MEMBER_DETAIL_CONFIG: DetailPageConfig = {
  table: "entity_members",
  select: `
    *,
    person:people(id, name, phone, email, photo_url, aadhaar_number, pan_number, date_of_birth, gender, phone_numbers, emergency_contacts, id_documents, permanent_address, permanent_city, permanent_state, permanent_pincode, current_address, current_city, occupation, blood_group, company_name),
    library:entities(id, name, code),
    assigned_seat:entity_seats!library_members_assigned_seat_id_fkey(id, seat_number, section:entity_sections(id, name)),
    locker:entity_lockers!library_members_locker_id_fkey(id, locker_number, size)
  `,
  joinFields: ["person", "library", "assigned_seat", "locker"],
  redirectOnNotFound: "/library-members",
  notFoundMessage: "Member not found",
  relatedQueries: [
    {
      key: "memberships",
      table: "entity_memberships",
      select: "id, plan_name, start_date, end_date, hours_included, hours_used, hours_remaining, final_amount, status",
      foreignKey: "member_id",
      orderBy: "start_date",
      orderDirection: "desc",
    },
    {
      key: "attendance",
      table: "entity_attendance",
      select: "id, attendance_date, check_in_time, check_out_time, hours_spent",
      foreignKey: "member_id",
      orderBy: "check_in_time",
      orderDirection: "desc",
      limit: 10,
    },
    {
      key: "payments",
      table: "entity_payments",
      select: "id, amount, payment_date, payment_type, payment_method, receipt_number, membership_id, status",
      foreignKey: "member_id",
      orderBy: "payment_date",
      orderDirection: "desc",
      limit: 10,
    },
    {
      key: "lockerAssignments",
      table: "entity_locker_assignments",
      select: "id, start_date, end_date, rent_amount, deposit_amount, status, locker:entity_lockers(id, locker_number)",
      foreignKey: "member_id",
      joinFields: ["locker"],
      orderBy: "start_date",
      orderDirection: "desc",
    },
  ],
}

// Library Attendance Detail Config
export const LIBRARY_ATTENDANCE_DETAIL_CONFIG: DetailPageConfig = {
  table: "entity_attendance",
  select: `
    *,
    member:entity_members(id, name, member_code, phone, person:people(id, name, photo_url)),
    seat:entity_seats(id, seat_number, section:entity_sections(id, name))
  `,
  joinFields: ["member", "seat"],
  redirectOnNotFound: "/library-attendance",
  notFoundMessage: "Attendance record not found",
}

// Library Locker Detail Config
export const LIBRARY_LOCKER_DETAIL_CONFIG: DetailPageConfig = {
  table: "entity_lockers",
  select: `
    *,
    library:entities(id, name),
    current_member:entity_members!fk_lockers_current_member(id, name, member_code, phone, person:people(id, name, photo_url, phone))
  `,
  joinFields: ["library", "current_member"],
  redirectOnNotFound: "/library-lockers",
  notFoundMessage: "Locker not found",
  relatedQueries: [
    {
      key: "assignments",
      table: "entity_locker_assignments",
      select: "id, start_date, end_date, rent_amount, deposit_amount, deposit_returned, status, member:entity_members(id, name, member_code, person:people(id, name))",
      foreignKey: "locker_id",
      joinFields: ["member"],
      orderBy: "start_date",
      orderDirection: "desc",
    },
  ],
}

// Library Subscription (Membership) Detail Config
export const LIBRARY_SUBSCRIPTION_DETAIL_CONFIG: DetailPageConfig = {
  table: "entity_memberships",
  select: `
    *,
    member:entity_members!library_memberships_member_id_fkey(id, name, member_code, phone, email,
      person:people(id, name, photo_url, phone, email)),
    plan:entity_plans(id, name, hours_included, base_price)
  `,
  joinFields: ["member", "plan"],
  redirectOnNotFound: "/library-subscriptions",
  notFoundMessage: "Subscription not found",
  relatedQueries: [
    {
      key: "payments",
      table: "entity_payments",
      select: "id, amount, payment_date, payment_method, receipt_number, status, notes, payment_type, payment_reference",
      foreignKey: "membership_id",
      orderBy: "payment_date",
      orderDirection: "desc",
    },
  ],
}

// Library Payment Detail Config
export const LIBRARY_PAYMENT_DETAIL_CONFIG: DetailPageConfig = {
  table: "entity_payments",
  select: `
    *,
    member:entity_members(id, name, member_code, phone, person:people(id, photo_url)),
    membership:entity_memberships!library_payments_membership_id_fkey(id, plan_name, start_date, end_date)
  `,
  joinFields: ["member", "membership"],
  redirectOnNotFound: "/library-payments",
  notFoundMessage: "Payment not found",
}

// ============================================
// Business Hierarchy Detail Configs
// ============================================

export const BUSINESS_DETAIL_CONFIG: DetailPageConfig = {
  table: "businesses",
  select: `
    *,
    workspace:workspaces(id, name, type, logo_url, is_active)
  `,
  joinFields: ["workspace"],
  redirectOnNotFound: "/businesses",
  notFoundMessage: "Business not found",
  relatedQueries: [
    {
      key: "entities",
      table: "entities",
      select: "id, name, type, city, is_active, created_at",
      foreignKey: "business_id",
      orderBy: "name",
      orderDirection: "asc",
    },
  ],
}

export const ENTITY_DETAIL_CONFIG: DetailPageConfig = {
  table: "entities",
  select: `
    *,
    business:businesses(id, name, legal_name)
  `,
  joinFields: ["business"],
  redirectOnNotFound: "/entities",
  notFoundMessage: "Entity not found",
}

