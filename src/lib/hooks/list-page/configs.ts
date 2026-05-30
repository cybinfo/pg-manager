/**
 * Pre-built List Page Configurations
 *
 * Centralized config objects for all list pages.
 * Extracted from useListPage.ts for modularity.
 */

import type { ListPageConfig } from "./types"
import { formatCurrency, formatMonthYear, formatDate, formatTime } from "@/lib/format"
import {
  NOTICE_TYPE_LABELS,
  REFUND_STATUS_LABELS,
  REFUND_TYPE_LABELS,
  METER_STATUS_LABELS,
  METER_TYPE_LABELS,
  INQUIRY_STATUS_LABELS,
  INQUIRY_SOURCE_LABELS,
  KITCHEN_WASTAGE_REASON_LABELS,
  BILL_PAYMENT_STATUS_LABELS,
  LIBRARY_SEAT_STATUS_LABELS,
  LIBRARY_MEMBER_STATUS_LABELS,
  LIBRARY_MEMBERSHIP_STATUS_LABELS,
  LIBRARY_LOCKER_STATUS_LABELS,
  LIBRARY_LOCKER_SIZE_LABELS,
  LIBRARY_PAYMENT_TYPE_LABELS,
  LIBRARY_PAYMENT_STATUS_LABELS,
  LIBRARY_PAYMENT_METHOD_LABELS,
  APPROVAL_TYPE_LABELS,
} from "@/lib/status-config"

// ============================================
// PG Module Configs
// ============================================

export const TENANT_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "tenants",
  select: `
    *,
    property:properties(id, name),
    room:rooms(id, room_number),
    person:people(id, name, photo_url)
  `,
  defaultOrderBy: "created_at",
  defaultOrderDirection: "desc",
  searchFields: ["name", "phone", "email"],
  joinFields: ["property", "room", "person"],
  computedFields: (item) => {
    const date = item.check_in_date ? new Date(item.check_in_date as string) : new Date()
    return {
      checkin_month: formatMonthYear(date),
      checkin_year: date.getFullYear().toString(),
    }
  },
}

export const PAYMENT_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "payments",
  select: `
    *,
    tenant:tenants(id, name, phone),
    property:properties(id, name),
    bill:bills(id, bill_number),
    charge_type:charge_types(id, name)
  `,
  defaultOrderBy: "payment_date",
  defaultOrderDirection: "desc",
  searchFields: ["tenant.name", "receipt_number"],
  joinFields: ["tenant", "property", "bill", "charge_type"],
  computedFields: (item) => {
    const date = item.payment_date ? new Date(item.payment_date as string) : new Date()
    return {
      payment_month: formatMonthYear(date),
      payment_year: date.getFullYear().toString(),
    }
  },
}

export const BILL_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "bills",
  select: `
    *,
    tenant:tenants(id, name, phone),
    property:properties(id, name)
  `,
  defaultOrderBy: "bill_date",
  defaultOrderDirection: "desc",
  searchFields: ["bill_number", "tenant.name", "for_month"],
  joinFields: ["tenant", "property"],
  computedFields: (item) => {
    const date = item.bill_date ? new Date(item.bill_date as string) : new Date()
    return {
      bill_month: formatMonthYear(date),
      bill_year: date.getFullYear().toString(),
    }
  },
}

export const EXPENSE_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "expenses",
  select: `
    *,
    property:properties(id, name),
    expense_type:expense_types(id, name, code)
  `,
  defaultOrderBy: "expense_date",
  defaultOrderDirection: "desc",
  searchFields: ["description", "vendor_name", "reference_number"],
  joinFields: ["property", "expense_type"],
  computedFields: (item) => {
    const date = item.expense_date ? new Date(item.expense_date as string) : new Date()
    return {
      expense_month: formatMonthYear(date),
      expense_year: date.getFullYear().toString(),
    }
  },
}

export const COMPLAINT_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "complaints",
  select: `
    *,
    tenant:tenants(id, name, phone),
    property:properties(id, name),
    room:rooms(id, room_number)
  `,
  defaultOrderBy: "created_at",
  defaultOrderDirection: "desc",
  searchFields: ["title", "description", "tenant.name"],
  joinFields: ["tenant", "property", "room"],
  computedFields: (item) => {
    const date = item.created_at ? new Date(item.created_at as string) : new Date()
    return {
      created_month: formatMonthYear(date),
      created_year: date.getFullYear().toString(),
    }
  },
}

export const VISITOR_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "visitors",
  select: `
    *,
    tenant:tenants!tenant_id(id, name),
    property:properties(id, name),
    visitor_contact:visitor_contacts(id, name, visit_count, is_frequent, is_blocked, person_id, person:people(id, name, photo_url))
  `,
  defaultOrderBy: "check_in_time",
  defaultOrderDirection: "desc",
  searchFields: ["visitor_name", "visitor_phone", "company_name", "service_type", "tenant.name"],
  joinFields: ["tenant", "property", "visitor_contact"],
  computedFields: (item) => {
    const date = item.check_in_time ? new Date(item.check_in_time as string) : new Date()
    const contact = item.visitor_contact as { visit_count?: number; is_frequent?: boolean; is_blocked?: boolean } | null
    return {
      check_in_date: date.toISOString().split("T")[0],
      check_in_month: formatMonthYear(date),
      check_in_year: date.getFullYear().toString(),
      status: item.check_out_time ? "checked_out" : "checked_in",
      total_visits: contact?.visit_count || 1,
      is_frequent_visitor: contact?.is_frequent || false,
      is_blocked_visitor: contact?.is_blocked || false,
    }
  },
}

export const STAFF_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "staff_members",
  select: `
    *,
    roles:user_roles(
      id,
      role:roles(id, name, description),
      property:properties(id, name)
    ),
    person:people(id, name, photo_url)
  `,
  defaultOrderBy: "name",
  defaultOrderDirection: "asc",
  searchFields: ["name", "email", "phone"],
  joinFields: ["person"],
  computedFields: (item) => {
    const date = item.created_at ? new Date(item.created_at as string) : new Date()
    const roles = (item.roles as { role: { name: string } | null }[] | null) || []
    const firstRole = roles[0]?.role
    return {
      status_label: item.is_active ? "Active" : "Inactive",
      primary_role: firstRole?.name || "No Role",
      account_status: item.user_id ? "Has Login" : "Pending Invite",
      joined_month: formatMonthYear(date),
      joined_year: date.getFullYear().toString(),
    }
  },
}

export const PROPERTY_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "properties",
  select: `
    *,
    rooms(id),
    tenants(id)
  `,
  defaultOrderBy: "created_at",
  defaultOrderDirection: "desc",
  searchFields: ["name", "address", "city"],
  computedFields: (item) => ({
    room_count: Array.isArray(item.rooms) ? item.rooms.length : 0,
    tenant_count: Array.isArray(item.tenants) ? item.tenants.length : 0,
  }),
}

export const ROOM_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "rooms",
  select: `
    *,
    property:properties(id, name)
  `,
  defaultOrderBy: "room_number",
  defaultOrderDirection: "asc",
  searchFields: ["room_number"],
  joinFields: ["property"],
  computedFields: (item) => ({
    ac_label: item.has_ac ? "AC" : "Non-AC",
    bathroom_label: item.has_attached_bathroom ? "Attached Bath" : "Shared Bath",
    beds_label: `${item.total_beds} ${item.total_beds === 1 ? "Bed" : "Beds"}`,
    floor_label: item.floor === 0 ? "Ground Floor" : `Floor ${item.floor}`,
  }),
}

export const EXIT_CLEARANCE_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "exit_clearance",
  select: `
    *,
    tenant:tenants(id, name, phone, photo_url, profile_photo),
    property:properties(id, name),
    room:rooms(id, room_number)
  `,
  defaultOrderBy: "created_at",
  defaultOrderDirection: "desc",
  searchFields: ["tenant.name"],
  joinFields: ["tenant", "property", "room"],
  computedFields: (item) => {
    const date = item.expected_exit_date ? new Date(item.expected_exit_date as string) : new Date()
    return {
      exit_month: formatMonthYear(date),
      exit_year: date.getFullYear().toString(),
      inspection_label: item.room_inspection_done ? "Inspected" : "Pending Inspection",
      key_label: item.key_returned ? "Returned" : "Not Returned",
    }
  },
}

export const NOTICE_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "notices",
  select: `
    *,
    property:properties(id, name)
  `,
  defaultOrderBy: "created_at",
  defaultOrderDirection: "desc",
  searchFields: ["title", "content"],
  joinFields: ["property"],
  computedFields: (item) => {
    const date = item.created_at ? new Date(item.created_at as string) : new Date()
    const isExpired = item.expires_at ? new Date(item.expires_at as string) < new Date() : false
    return {
      created_month: formatMonthYear(date),
      created_year: date.getFullYear().toString(),
      active_label: item.is_active && !isExpired ? "Active" : "Inactive",
      type_label: NOTICE_TYPE_LABELS[item.type as string] || (item.type as string),
      is_expired: isExpired,
    }
  },
}

export const METER_READING_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "meter_readings",
  select: `
    *,
    property:properties(id, name),
    room:rooms(id, room_number),
    charge_type:charge_types(id, name),
    meter:meters(id, meter_number, meter_type)
  `,
  defaultOrderBy: "reading_date",
  defaultOrderDirection: "desc",
  searchFields: ["property.name", "room.room_number", "meter.meter_number"],
  joinFields: ["property", "room", "charge_type", "meter"],
  computedFields: (item) => {
    const date = item.reading_date ? new Date(item.reading_date as string) : new Date()
    const meter = item.meter as Record<string, unknown> | null
    return {
      reading_month: formatMonthYear(date),
      reading_year: date.getFullYear().toString(),
      meter_type: meter?.meter_type as string || ((item.charge_type as Record<string, unknown>)?.name as string)?.toLowerCase() || "electricity",
    }
  },
}

export const APPROVAL_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "approvals",
  select: `
    *,
    tenant:tenants(id, name, phone),
    property:properties(id, name)
  `,
  defaultOrderBy: "created_at",
  defaultOrderDirection: "desc",
  searchFields: ["type", "tenant.name"],
  joinFields: ["tenant", "property"],
}

export const REFUND_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "refunds",
  select: `
    *,
    tenant:tenants(id, name, phone, photo_url),
    property:properties(id, name),
    exit_clearance:exit_clearance(id, expected_exit_date)
  `,
  defaultOrderBy: "created_at",
  defaultOrderDirection: "desc",
  searchFields: ["tenant.name", "reference_number"],
  joinFields: ["tenant", "property", "exit_clearance"],
  computedFields: (item) => {
    const date = item.created_at ? new Date(item.created_at as string) : new Date()
    return {
      refund_month: formatMonthYear(date),
      refund_year: date.getFullYear().toString(),
      status_label: REFUND_STATUS_LABELS[item.status as string] || (item.status as string),
      type_label: REFUND_TYPE_LABELS[item.refund_type as string] || (item.refund_type as string),
    }
  },
}

export const PEOPLE_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "people",
  select: "*",
  defaultOrderBy: "name",
  defaultOrderDirection: "asc",
  searchFields: ["name", "phone", "email", "aadhaar_number", "pan_number"],
  computedFields: (item) => {
    const date = item.created_at ? new Date(item.created_at as string) : new Date()
    const tags = (item.tags as string[]) || []
    return {
      created_month: formatMonthYear(date),
      created_year: date.getFullYear().toString(),
      status_label: item.is_blocked ? "Blocked" : item.is_verified ? "Verified" : "Active",
      is_tenant: tags.includes("tenant"),
      is_staff: tags.includes("staff"),
      is_visitor: tags.includes("visitor"),
      primary_role: tags.includes("tenant") ? "Tenant" : tags.includes("staff") ? "Staff" : tags.includes("visitor") ? "Visitor" : tags.includes("library_member") ? "Library Member" : "Other",
    }
  },
}

export const METER_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "meters",
  select: `
    *,
    property:properties(id, name)
  `,
  defaultOrderBy: "meter_number",
  defaultOrderDirection: "asc",
  searchFields: ["meter_number", "property.name", "make", "model"],
  joinFields: ["property"],
  computedFields: (item) => {
    const date = item.created_at ? new Date(item.created_at as string) : new Date()
    return {
      created_month: formatMonthYear(date),
      created_year: date.getFullYear().toString(),
      status_label: METER_STATUS_LABELS[item.status as string] || (item.status as string),
      type_label: METER_TYPE_LABELS[item.meter_type as string] || (item.meter_type as string),
    }
  },
}

export const INQUIRY_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "website_inquiries",
  select: `
    *,
    property:properties(id, name)
  `,
  defaultOrderBy: "created_at",
  defaultOrderDirection: "desc",
  searchFields: ["name", "phone", "email", "message", "property.name"],
  joinFields: ["property"],
  includeSoftDeleted: true,
  computedFields: (item) => {
    const date = item.created_at ? new Date(item.created_at as string) : new Date()
    return {
      created_month: formatMonthYear(date),
      created_year: date.getFullYear().toString(),
      status_label: INQUIRY_STATUS_LABELS[item.status as string] || (item.status as string),
      source_label: INQUIRY_SOURCE_LABELS[item.source as string] || (item.source as string),
    }
  },
}

// ============================================
// ENHANCED EXPENSE MODULE CONFIGS
// ============================================

export const PRODUCT_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "products",
  select: `
    *,
    category:product_categories(id, name, name_hi)
  `,
  defaultOrderBy: "name",
  defaultOrderDirection: "asc",
  searchFields: ["name", "name_hi", "category.name"],
  joinFields: ["category"],
  computedFields: (item) => ({
    display_name: item.name_hi ? `${item.name} (${item.name_hi})` : item.name,
    status_label: item.is_active ? "Active" : "Inactive",
  }),
}

export const DAILY_SPEND_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "daily_spend",
  select: `
    *,
    property:properties(id, name),
    product:products(id, name, name_hi)
  `,
  defaultOrderBy: "spend_date",
  defaultOrderDirection: "desc",
  searchFields: ["product_name", "vendor_name", "notes", "category_name"],
  joinFields: ["property", "product"],
  computedFields: (item) => {
    const date = item.spend_date ? new Date(item.spend_date as string) : new Date()
    return {
      spend_month: formatMonthYear(date),
      spend_year: date.getFullYear().toString(),
      display_amount: formatCurrency(item.total as number),
      display_qty: `${item.quantity} ${item.unit}`,
    }
  },
}

export const VENDOR_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "vendors",
  select: `
    *,
    category:bill_categories(id, name, name_hi)
  `,
  defaultOrderBy: "name",
  defaultOrderDirection: "asc",
  searchFields: ["name", "contact_name", "phone", "email", "gstin", "upi_id"],
  joinFields: ["category"],
  computedFields: (item) => ({
    status_label: item.is_active ? "Active" : "Inactive",
    has_gst: !!item.gstin,
    has_upi: !!item.upi_id,
  }),
}

export const BILL_PAYMENT_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "bill_payments",
  select: `
    *,
    property:properties(id, name),
    vendor:vendors(id, name, upi_id),
    category:bill_categories(id, name, name_hi)
  `,
  defaultOrderBy: "payment_date",
  defaultOrderDirection: "desc",
  searchFields: ["vendor_name", "bill_number", "notes", "category_name"],
  joinFields: ["property", "vendor", "category"],
  computedFields: (item) => {
    const paymentDate = item.payment_date ? new Date(item.payment_date as string) : null
    const dueDate = item.due_date ? new Date(item.due_date as string) : null
    const today = new Date()
    const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null

    return {
      payment_month: formatMonthYear(paymentDate) || "",
      payment_year: paymentDate?.getFullYear().toString() || "",
      days_until_due: daysUntilDue,
      is_overdue: dueDate && today > dueDate && item.status !== "paid",
      status_label: BILL_PAYMENT_STATUS_LABELS[item.status as string]?.label || item.status,
      status_label_hi: BILL_PAYMENT_STATUS_LABELS[item.status as string]?.labelHi || item.status,
      display_amount: formatCurrency(item.bill_amount as number),
      balance_due: ((item.bill_amount as number) || 0) - ((item.paid_amount as number) || 0),
    }
  },
}

export const SERVICE_PROVIDER_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "service_providers",
  select: `
    *,
    category:service_categories(id, name, name_hi, default_tds_section, default_tds_rate)
  `,
  defaultOrderBy: "name",
  defaultOrderDirection: "asc",
  searchFields: ["name", "phone", "email", "pan", "address"],
  joinFields: ["category"],
  computedFields: (item) => ({
    status_label: item.is_active ? "Active" : "Inactive",
    rating_display: item.rating ? `${item.rating}/5` : "Not rated",
    has_tds: item.tds_applicable,
    has_pan: !!item.pan,
  }),
}

export const SERVICE_PAYMENT_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "service_payments",
  select: `
    *,
    property:properties(id, name),
    room:rooms(id, room_number),
    provider:service_providers(id, name, phone, rating),
    category:service_categories(id, name, name_hi),
    complaint:complaints(id, title)
  `,
  defaultOrderBy: "service_date",
  defaultOrderDirection: "desc",
  searchFields: ["provider_name", "description", "notes", "category_name"],
  joinFields: ["property", "room", "provider", "category", "complaint"],
  computedFields: (item) => {
    const serviceDate = item.service_date ? new Date(item.service_date as string) : null
    const warrantyExpiry = item.warranty_expiry ? new Date(item.warranty_expiry as string) : null
    const today = new Date()

    let warrantyStatus: "active" | "expired" | "none" = "none"
    if (warrantyExpiry) {
      warrantyStatus = today <= warrantyExpiry ? "active" : "expired"
    }

    return {
      service_month: formatMonthYear(serviceDate) || "",
      service_year: serviceDate?.getFullYear().toString() || "",
      warranty_status: warrantyStatus,
      display_gross: formatCurrency(item.gross_amount as number),
      display_net: formatCurrency(item.net_amount as number),
      display_tds: item.tds_amount ? formatCurrency(item.tds_amount as number) : "-",
      linked_to_complaint: !!item.complaint_id,
    }
  },
}

export const KITCHEN_WASTAGE_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "kitchen_wastage",
  select: `
    *,
    property:properties(id, name),
    product:products(id, name, name_hi)
  `,
  defaultOrderBy: "wastage_date",
  defaultOrderDirection: "desc",
  searchFields: ["product_name", "notes"],
  joinFields: ["property", "product"],
  computedFields: (item) => {
    const date = item.wastage_date ? new Date(item.wastage_date as string) : new Date()
    return {
      wastage_month: formatMonthYear(date),
      wastage_year: date.getFullYear().toString(),
      reason_label: KITCHEN_WASTAGE_REASON_LABELS[item.reason as string]?.label || item.reason,
      reason_label_hi: KITCHEN_WASTAGE_REASON_LABELS[item.reason as string]?.labelHi || item.reason,
      display_value: formatCurrency(item.estimated_value as number),
      display_qty: `${item.quantity} ${item.unit}`,
    }
  },
}

export const MISC_TRANSACTION_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "misc_transactions",
  select: `
    *,
    category:misc_transaction_categories(id, name, name_hi, default_type),
    property:properties(id, name),
    tenant:tenants(id, name)
  `,
  defaultOrderBy: "transaction_date",
  defaultOrderDirection: "desc",
  searchFields: ["person_name", "description", "notes", "category_name"],
  joinFields: ["category", "property", "tenant"],
  computedFields: (item) => {
    const date = item.transaction_date ? new Date(item.transaction_date as string) : new Date()
    return {
      transaction_month: formatMonthYear(date),
      transaction_year: date.getFullYear().toString(),
      type_label: item.transaction_type === "in" ? "Money In" : "Money Out",
      display_amount: formatCurrency(item.amount as number),
    }
  },
}

// ============================================
// LIBRARY MODULE CONFIGS
// ============================================

export const LIBRARY_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "libraries",
  select: `*`,
  defaultOrderBy: "name",
  defaultOrderDirection: "asc",
  searchFields: ["name", "code", "city", "phone"],
  joinFields: [],
  computedFields: (item) => ({
    available_seats: (item.total_seats as number) - (item.occupied_seats as number),
    occupancy_percent: item.total_seats
      ? Math.round(((item.occupied_seats as number) / (item.total_seats as number)) * 100)
      : 0,
    status_label: item.is_active ? "Active" : "Inactive",
  }),
}

export const LIBRARY_SECTION_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "library_sections",
  select: `
    *,
    library:libraries(id, name, code)
  `,
  defaultOrderBy: "name",
  defaultOrderDirection: "asc",
  searchFields: ["name", "section_number", "library.name"],
  joinFields: ["library"],
  computedFields: (item) => ({
    available_seats: (item.total_seats as number) - (item.occupied_seats as number),
    occupancy_percent: item.total_seats
      ? Math.round(((item.occupied_seats as number) / (item.total_seats as number)) * 100)
      : 0,
    status_label: item.is_active ? "Active" : "Inactive",
    ac_label: item.is_ac ? "AC" : "Non-AC",
  }),
}

export const LIBRARY_SEAT_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "library_seats",
  select: `
    *,
    section:library_sections(id, name, library:libraries(id, name)),
    current_member:library_members!fk_seats_current_member(id, name, member_code)
  `,
  defaultOrderBy: "seat_number",
  defaultOrderDirection: "asc",
  searchFields: ["seat_number", "row_number", "section.name"],
  joinFields: ["section", "current_member"],
  computedFields: (item) => {
    return {
      status_label: LIBRARY_SEAT_STATUS_LABELS[item.status as string] || (item.status as string),
      has_power: item.has_power_outlet ? "Yes" : "No",
    }
  },
}

export const LIBRARY_MEMBER_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "library_members",
  select: `
    *,
    person:people(id, name, photo_url),
    library:libraries(id, name),
    assigned_seat:library_seats!library_members_assigned_seat_id_fkey(id, seat_number, section:library_sections(id, name))
  `,
  defaultOrderBy: "created_at",
  defaultOrderDirection: "desc",
  searchFields: ["name", "phone", "email", "member_code"],
  joinFields: ["person", "library", "assigned_seat"],
  computedFields: (item) => {
    const joinDate = item.join_date ? new Date(item.join_date as string) : new Date()
    return {
      join_month: formatMonthYear(joinDate),
      join_year: joinDate.getFullYear().toString(),
      status_label: LIBRARY_MEMBER_STATUS_LABELS[item.status as string] || (item.status as string),
      display_name: (item.person as { name?: string })?.name || item.name,
      hours_display: `${item.hours_used || 0}h used / ${item.hours_balance || 0}h remaining`,
    }
  },
}

export const LIBRARY_MEMBERSHIP_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "library_memberships",
  select: `
    *,
    member:library_members!library_memberships_member_id_fkey(id, name, member_code, person:people(id, name, photo_url)),
    plan:library_plans(id, name, hours_included)
  `,
  defaultOrderBy: "start_date",
  defaultOrderDirection: "desc",
  searchFields: ["plan_name", "member.name", "member.member_code"],
  joinFields: ["member", "plan"],
  computedFields: (item) => {
    const startDate = item.start_date ? new Date(item.start_date as string) : new Date()
    const endDate = item.end_date ? new Date(item.end_date as string) : null
    const today = new Date()
    return {
      start_month: formatMonthYear(startDate),
      start_year: startDate.getFullYear().toString(),
      status_label: LIBRARY_MEMBERSHIP_STATUS_LABELS[item.status as string] || (item.status as string),
      is_expired: endDate && today > endDate,
      hours_display: item.hours_included
        ? `${item.hours_used || 0}h / ${item.hours_included}h`
        : "Unlimited",
      display_amount: formatCurrency(item.final_amount as number),
    }
  },
}

export const LIBRARY_ATTENDANCE_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "library_attendance",
  select: `
    *,
    member:library_members!library_attendance_member_id_fkey(id, name, member_code, person:people(id, name, photo_url)),
    seat:library_seats(id, seat_number)
  `,
  defaultOrderBy: "check_in_time",
  defaultOrderDirection: "desc",
  searchFields: ["member.name", "member.member_code"],
  joinFields: ["member", "seat"],
  computedFields: (item) => {
    const checkIn = item.check_in_time ? new Date(item.check_in_time as string) : new Date()
    const checkOut = item.check_out_time ? new Date(item.check_out_time as string) : null
    return {
      attendance_month: formatMonthYear(checkIn),
      attendance_year: checkIn.getFullYear().toString(),
      is_checked_in: !checkOut,
      check_in_display: formatTime(checkIn),
      check_out_display: checkOut ? formatTime(checkOut) : "-",
      hours_display: item.hours_spent ? `${(item.hours_spent as number).toFixed(1)}h` : "-",
      display_name: (item.member as { person?: { name?: string }; name?: string })?.person?.name
        || (item.member as { name?: string })?.name || "Unknown",
    }
  },
}

export const LIBRARY_LOCKER_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "library_lockers",
  select: `
    *,
    library:libraries(id, name),
    current_member:library_members!fk_lockers_current_member(id, name, member_code)
  `,
  defaultOrderBy: "locker_number",
  defaultOrderDirection: "asc",
  searchFields: ["locker_number", "section", "library.name"],
  joinFields: ["library", "current_member"],
  computedFields: (item) => {
    return {
      status_label: LIBRARY_LOCKER_STATUS_LABELS[item.status as string] || (item.status as string),
      size_label: LIBRARY_LOCKER_SIZE_LABELS[item.size as string] || (item.size as string),
      display_rent: item.monthly_rent ? `${formatCurrency(item.monthly_rent as number)}/mo` : "-",
      display_deposit: item.deposit_amount ? formatCurrency(item.deposit_amount as number) : "-",
    }
  },
}

export const LIBRARY_PAYMENT_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "library_payments",
  select: `
    *,
    member:library_members(id, name, member_code, phone, person:people(id, name, photo_url))
  `,
  defaultOrderBy: "payment_date",
  defaultOrderDirection: "desc",
  searchFields: ["receipt_number", "member.name", "member.member_code", "member.phone"],
  joinFields: ["member"],
  computedFields: (item) => {
    const paymentDate = item.payment_date ? new Date(item.payment_date as string) : new Date()
    return {
      payment_month: formatMonthYear(paymentDate),
      payment_year: paymentDate.getFullYear().toString(),
      type_label: LIBRARY_PAYMENT_TYPE_LABELS[item.payment_type as string] || (item.payment_type as string),
      status_label: LIBRARY_PAYMENT_STATUS_LABELS[item.status as string] || (item.status as string),
      method_label: LIBRARY_PAYMENT_METHOD_LABELS[item.payment_method as string] || (item.payment_method as string),
      display_amount: formatCurrency(item.amount as number),
      display_name: (item.member as { person?: { name?: string }; name?: string })?.person?.name
        || (item.member as { name?: string })?.name || "Unknown",
    }
  },
}

export const LIBRARY_PLAN_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "library_plans",
  select: `*`,
  defaultOrderBy: "sort_order",
  defaultOrderDirection: "asc",
  searchFields: ["name", "description"],
  joinFields: [],
  computedFields: (item) => ({
    hours_display: item.hours_included ? `${item.hours_included}h` : "Unlimited",
    validity_display: `${item.validity_days} days`,
    display_price: formatCurrency(item.base_price as number),
    status_label: item.is_active ? "Active" : "Inactive",
  }),
}

// ============================================
// WAITLIST CONFIG
// ============================================

export const LIBRARY_WAITLIST_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "library_waitlist",
  select: `
    *,
    library:libraries(id, name)
  `,
  joinFields: ["library"],
  searchFields: ["name", "phone", "email"],
  defaultOrderBy: "queue_position",
  defaultOrderDirection: "asc",
  defaultPageSize: 25,
}

// ============================================
// APPROVALS CONFIG (custom page, uses computedFields)
// ============================================

export const APPROVALS_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "approvals",
  select: `
    *,
    requester_tenant:tenants(id, name, phone, user_id)
  `,
  defaultOrderBy: "created_at",
  defaultOrderDirection: "desc",
  searchFields: ["title", "type"],
  joinFields: ["requester_tenant"],
  computedFields: (item: Record<string, unknown>) => {
    const date = new Date(item.created_at as string)
    return {
      type_label: APPROVAL_TYPE_LABELS[item.type as string] || (item.type as string),
      priority_label: (item.priority as string)?.charAt(0).toUpperCase() + (item.priority as string)?.slice(1),
      created_month: formatMonthYear(date),
      created_year: date.getFullYear().toString(),
      has_docs_label: (item.document_ids && (item.document_ids as string[]).length > 0) ? "With Documents" : "No Documents",
    }
  },
}

// ============================================
// AUDIT EVENTS CONFIG (Activity Log page)
// ============================================

export const AUDIT_EVENT_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "audit_events",
  select: "*",
  defaultOrderBy: "occurred_at",
  defaultOrderDirection: "desc",
  searchFields: ["action", "entity_type", "actor_email", "actor_name"],
  defaultPageSize: 50,
  includeSoftDeleted: true,
  computedFields: (item: Record<string, unknown>) => {
    const date = item.occurred_at ? new Date(item.occurred_at as string) : new Date()
    return {
      event_date: formatDate(date),
      event_month: formatMonthYear(date),
    }
  },
}
