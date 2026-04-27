/**
 * Tests for src/lib/hooks/list-page/configs.ts
 *
 * Every config has a computedFields function. This test calls each one
 * with representative sample data to achieve coverage of the transformation
 * logic. Assertions are structural (keys exist, types correct) rather than
 * exact-value, since formatting helpers are tested separately.
 */

import {
  TENANT_LIST_CONFIG,
  PAYMENT_LIST_CONFIG,
  BILL_LIST_CONFIG,
  EXPENSE_LIST_CONFIG,
  COMPLAINT_LIST_CONFIG,
  VISITOR_LIST_CONFIG,
  STAFF_LIST_CONFIG,
  PROPERTY_LIST_CONFIG,
  ROOM_LIST_CONFIG,
  EXIT_CLEARANCE_LIST_CONFIG,
  NOTICE_LIST_CONFIG,
  METER_READING_LIST_CONFIG,
  APPROVAL_LIST_CONFIG,
  REFUND_LIST_CONFIG,
  PEOPLE_LIST_CONFIG,
  METER_LIST_CONFIG,
  INQUIRY_LIST_CONFIG,
  PRODUCT_LIST_CONFIG,
  DAILY_SPEND_LIST_CONFIG,
  VENDOR_LIST_CONFIG,
  BILL_PAYMENT_LIST_CONFIG,
  SERVICE_PROVIDER_LIST_CONFIG,
  SERVICE_PAYMENT_LIST_CONFIG,
  KITCHEN_WASTAGE_LIST_CONFIG,
  MISC_TRANSACTION_LIST_CONFIG,
  LIBRARY_LIST_CONFIG,
  LIBRARY_SECTION_LIST_CONFIG,
  LIBRARY_SEAT_LIST_CONFIG,
  LIBRARY_MEMBER_LIST_CONFIG,
  LIBRARY_MEMBERSHIP_LIST_CONFIG,
  LIBRARY_ATTENDANCE_LIST_CONFIG,
  LIBRARY_LOCKER_LIST_CONFIG,
  LIBRARY_PAYMENT_LIST_CONFIG,
  LIBRARY_PLAN_LIST_CONFIG,
  LIBRARY_WAITLIST_LIST_CONFIG,
  APPROVALS_LIST_CONFIG,
  AUDIT_EVENT_LIST_CONFIG,
} from "@/lib/hooks/list-page/configs"

// ============================================================================
// Helpers
// ============================================================================

const ISO_DATE = "2024-06-15T10:30:00Z"

function callComputedFields(config: { computedFields?: (item: Record<string, unknown>) => Record<string, unknown> }, item: Record<string, unknown> = {}): Record<string, unknown> | null {
  if (!config.computedFields) return null
  return config.computedFields(item)
}

// ============================================================================
// PG Module Configs
// ============================================================================

describe("TENANT_LIST_CONFIG.computedFields", () => {
  it("formats check_in_date fields", () => {
    const result = callComputedFields(TENANT_LIST_CONFIG, { check_in_date: ISO_DATE })!
    expect(result).toHaveProperty("checkin_month")
    expect(result).toHaveProperty("checkin_year")
    expect(typeof result.checkin_year).toBe("string")
  })

  it("falls back to current date when check_in_date is null", () => {
    const result = callComputedFields(TENANT_LIST_CONFIG, { check_in_date: null })!
    expect(result).toHaveProperty("checkin_month")
    expect(result).toHaveProperty("checkin_year")
  })
})

describe("PAYMENT_LIST_CONFIG.computedFields", () => {
  it("formats payment_date fields", () => {
    const result = callComputedFields(PAYMENT_LIST_CONFIG, { payment_date: ISO_DATE })!
    expect(result).toHaveProperty("payment_month")
    expect(result).toHaveProperty("payment_year")
  })

  it("falls back to current date when payment_date is null", () => {
    const result = callComputedFields(PAYMENT_LIST_CONFIG, {})!
    expect(result).toHaveProperty("payment_month")
  })
})

describe("BILL_LIST_CONFIG.computedFields", () => {
  it("formats bill_date fields", () => {
    const result = callComputedFields(BILL_LIST_CONFIG, { bill_date: ISO_DATE })!
    expect(result).toHaveProperty("bill_month")
    expect(result).toHaveProperty("bill_year")
  })
})

describe("EXPENSE_LIST_CONFIG.computedFields", () => {
  it("formats expense_date fields", () => {
    const result = callComputedFields(EXPENSE_LIST_CONFIG, { expense_date: ISO_DATE })!
    expect(result).toHaveProperty("expense_month")
    expect(result).toHaveProperty("expense_year")
  })
})

describe("COMPLAINT_LIST_CONFIG.computedFields", () => {
  it("formats created_at fields", () => {
    const result = callComputedFields(COMPLAINT_LIST_CONFIG, { created_at: ISO_DATE })!
    expect(result).toHaveProperty("created_month")
    expect(result).toHaveProperty("created_year")
  })
})

describe("VISITOR_LIST_CONFIG.computedFields", () => {
  it("computes visitor fields with all data", () => {
    const result = callComputedFields(VISITOR_LIST_CONFIG, {
      check_in_time: ISO_DATE,
      check_out_time: ISO_DATE,
      visitor_contact: { visit_count: 5, is_frequent: true, is_blocked: false },
    })!
    expect(result).toHaveProperty("check_in_date")
    expect(result).toHaveProperty("status", "checked_out")
    expect(result).toHaveProperty("total_visits", 5)
    expect(result).toHaveProperty("is_frequent_visitor", true)
  })

  it("defaults when checked_in (no check_out_time)", () => {
    const result = callComputedFields(VISITOR_LIST_CONFIG, {
      check_in_time: ISO_DATE,
      check_out_time: null,
      visitor_contact: null,
    })!
    expect(result.status).toBe("checked_in")
    expect(result.total_visits).toBe(1)
  })

  it("falls back to current date when check_in_time is null", () => {
    const result = callComputedFields(VISITOR_LIST_CONFIG, { check_in_time: null })!
    expect(result).toHaveProperty("check_in_date")
  })
})

describe("STAFF_LIST_CONFIG.computedFields", () => {
  it("computes staff fields with roles", () => {
    const result = callComputedFields(STAFF_LIST_CONFIG, {
      created_at: ISO_DATE,
      is_active: true,
      user_id: "u1",
      roles: [{ role: { name: "Manager" } }],
    })!
    expect(result.status_label).toBe("Active")
    expect(result.primary_role).toBe("Manager")
    expect(result.account_status).toBe("Has Login")
    expect(result).toHaveProperty("joined_month")
  })

  it("defaults when no roles or user_id", () => {
    const result = callComputedFields(STAFF_LIST_CONFIG, {
      created_at: ISO_DATE,
      is_active: false,
      user_id: null,
      roles: [],
    })!
    expect(result.status_label).toBe("Inactive")
    expect(result.primary_role).toBe("No Role")
    expect(result.account_status).toBe("Pending Invite")
  })
})

describe("PROPERTY_LIST_CONFIG.computedFields", () => {
  it("counts rooms and tenants from arrays", () => {
    const result = callComputedFields(PROPERTY_LIST_CONFIG, {
      rooms: [{ id: "r1" }, { id: "r2" }],
      tenants: [{ id: "t1" }],
    })!
    expect(result.room_count).toBe(2)
    expect(result.tenant_count).toBe(1)
  })

  it("returns 0 when rooms/tenants are not arrays", () => {
    const result = callComputedFields(PROPERTY_LIST_CONFIG, { rooms: null, tenants: null })!
    expect(result.room_count).toBe(0)
    expect(result.tenant_count).toBe(0)
  })
})

describe("ROOM_LIST_CONFIG.computedFields", () => {
  it("formats room labels", () => {
    const result = callComputedFields(ROOM_LIST_CONFIG, {
      has_ac: true,
      has_attached_bathroom: false,
      total_beds: 2,
      floor: 0,
    })!
    expect(result.ac_label).toBe("AC")
    expect(result.bathroom_label).toBe("Shared Bath")
    expect(result.beds_label).toBe("2 Beds")
    expect(result.floor_label).toBe("Ground Floor")
  })

  it("uses singular 'Bed' for 1 bed", () => {
    const result = callComputedFields(ROOM_LIST_CONFIG, {
      has_ac: false,
      has_attached_bathroom: true,
      total_beds: 1,
      floor: 3,
    })!
    expect(result.beds_label).toBe("1 Bed")
    expect(result.floor_label).toBe("Floor 3")
    expect(result.bathroom_label).toBe("Attached Bath")
  })
})

describe("EXIT_CLEARANCE_LIST_CONFIG.computedFields", () => {
  it("computes exit clearance fields", () => {
    const result = callComputedFields(EXIT_CLEARANCE_LIST_CONFIG, {
      expected_exit_date: ISO_DATE,
      room_inspection_done: true,
      key_returned: false,
    })!
    expect(result).toHaveProperty("exit_month")
    expect(result.inspection_label).toBe("Inspected")
    expect(result.key_label).toBe("Not Returned")
  })

  it("falls back when expected_exit_date is null", () => {
    const result = callComputedFields(EXIT_CLEARANCE_LIST_CONFIG, {
      expected_exit_date: null,
      room_inspection_done: false,
      key_returned: true,
    })!
    expect(result).toHaveProperty("exit_month")
    expect(result.inspection_label).toBe("Pending Inspection")
    expect(result.key_label).toBe("Returned")
  })
})

describe("NOTICE_LIST_CONFIG.computedFields", () => {
  it("formats notice date fields", () => {
    const result = callComputedFields(NOTICE_LIST_CONFIG, { created_at: ISO_DATE, is_active: true, type: "general" })!
    expect(result).toHaveProperty("created_month")
    expect(result).toHaveProperty("created_year")
    expect(result).toHaveProperty("active_label")
    expect(result).toHaveProperty("type_label")
    expect(result).toHaveProperty("is_expired")
  })
})

describe("METER_READING_LIST_CONFIG.computedFields", () => {
  it("computes meter reading fields", () => {
    const result = callComputedFields(METER_READING_LIST_CONFIG, {
      reading_date: ISO_DATE,
      meter: { meter_type: "electricity" },
    })!
    expect(result).toHaveProperty("reading_month")
    expect(result).toHaveProperty("reading_year")
    expect(result.meter_type).toBe("electricity")
  })
})

describe("APPROVAL_LIST_CONFIG — no computedFields", () => {
  it("has no computedFields (returns null from helper)", () => {
    expect(APPROVAL_LIST_CONFIG.computedFields).toBeUndefined()
    expect(callComputedFields(APPROVAL_LIST_CONFIG, { created_at: ISO_DATE })).toBeNull()
  })
})

describe("REFUND_LIST_CONFIG.computedFields", () => {
  it("formats refund date fields", () => {
    const result = callComputedFields(REFUND_LIST_CONFIG, { created_at: ISO_DATE })!
    expect(result).toHaveProperty("refund_month")
    expect(result).toHaveProperty("refund_year")
  })
})

describe("PEOPLE_LIST_CONFIG.computedFields", () => {
  it("formats people date fields and computes role tags", () => {
    const result = callComputedFields(PEOPLE_LIST_CONFIG, {
      created_at: ISO_DATE,
      tags: ["tenant"],
      is_blocked: false,
      is_verified: true,
    })!
    expect(result).toHaveProperty("created_month")
    expect(result).toHaveProperty("created_year")
    expect(result.primary_role).toBe("Tenant")
    expect(result.is_tenant).toBe(true)
    expect(result.status_label).toBe("Verified")
  })
})

describe("METER_LIST_CONFIG.computedFields", () => {
  it("formats meter date fields", () => {
    const result = callComputedFields(METER_LIST_CONFIG, { created_at: ISO_DATE })!
    expect(result).toHaveProperty("created_month")
    expect(result).toHaveProperty("created_year")
  })
})

describe("INQUIRY_LIST_CONFIG.computedFields", () => {
  it("formats inquiry date fields", () => {
    const result = callComputedFields(INQUIRY_LIST_CONFIG, { created_at: ISO_DATE, status: "new", source: "website" })!
    expect(result).toHaveProperty("created_month")
    expect(result).toHaveProperty("created_year")
    expect(result).toHaveProperty("status_label")
    expect(result).toHaveProperty("source_label")
  })
})

describe("PRODUCT_LIST_CONFIG.computedFields", () => {
  it("returns display_name and status_label", () => {
    const result = callComputedFields(PRODUCT_LIST_CONFIG, { name: "Rice", name_hi: "चावल", is_active: true })!
    expect(result.display_name).toBe("Rice (चावल)")
    expect(result.status_label).toBe("Active")
  })

  it("uses plain name when name_hi is absent", () => {
    const result = callComputedFields(PRODUCT_LIST_CONFIG, { name: "Rice", is_active: false })!
    expect(result.display_name).toBe("Rice")
    expect(result.status_label).toBe("Inactive")
  })
})

describe("DAILY_SPEND_LIST_CONFIG.computedFields", () => {
  it("formats daily spend date fields", () => {
    const result = callComputedFields(DAILY_SPEND_LIST_CONFIG, {
      spend_date: ISO_DATE,
      amount: 500,
    })!
    expect(result).toHaveProperty("spend_month")
    expect(result).toHaveProperty("display_amount")
  })
})

describe("VENDOR_LIST_CONFIG.computedFields", () => {
  it("computes vendor labels", () => {
    const result = callComputedFields(VENDOR_LIST_CONFIG, { is_active: true })!
    expect(result.status_label).toBe("Active")
  })

  it("handles inactive vendor", () => {
    const result = callComputedFields(VENDOR_LIST_CONFIG, { is_active: false })!
    expect(result.status_label).toBe("Inactive")
  })
})

describe("BILL_PAYMENT_LIST_CONFIG.computedFields", () => {
  it("computes bill payment fields with paid status", () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 5)
    const result = callComputedFields(BILL_PAYMENT_LIST_CONFIG, {
      payment_date: ISO_DATE,
      due_date: futureDate.toISOString(),
      bill_amount: 1000,
      paid_amount: 500,
      status: "partial",
    })!
    expect(result).toHaveProperty("payment_month")
    expect(result).toHaveProperty("balance_due", 500)
    expect(result).toHaveProperty("is_overdue", false) // due in future
  })

  it("computes overdue when past due and not paid", () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 5)
    const result = callComputedFields(BILL_PAYMENT_LIST_CONFIG, {
      payment_date: null,
      due_date: pastDate.toISOString(),
      bill_amount: 1000,
      paid_amount: 0,
      status: "pending",
    })!
    expect(result.is_overdue).toBeTruthy()
    expect(result.payment_month).toBe("-") // formatMonthYear returns "-" for null
    expect(result.payment_year).toBe("")
  })

  it("handles null payment_date and null due_date", () => {
    const result = callComputedFields(BILL_PAYMENT_LIST_CONFIG, {
      payment_date: null,
      due_date: null,
      bill_amount: 200,
      paid_amount: 200,
      status: "paid",
    })!
    expect(result.days_until_due).toBeNull()
    expect(result.is_overdue).toBeNull()
  })
})

describe("SERVICE_PROVIDER_LIST_CONFIG.computedFields", () => {
  it("computes provider labels", () => {
    const result = callComputedFields(SERVICE_PROVIDER_LIST_CONFIG, {
      is_active: true,
      rating: 4,
      tds_applicable: true,
      pan: "ABCDE1234F",
    })!
    expect(result.status_label).toBe("Active")
    expect(result.rating_display).toBe("4/5")
    expect(result.has_tds).toBe(true)
    expect(result.has_pan).toBe(true)
  })

  it("handles missing rating and pan", () => {
    const result = callComputedFields(SERVICE_PROVIDER_LIST_CONFIG, {
      is_active: false,
      rating: null,
      tds_applicable: false,
      pan: null,
    })!
    expect(result.rating_display).toBe("Not rated")
    expect(result.has_pan).toBe(false)
  })
})

describe("SERVICE_PAYMENT_LIST_CONFIG.computedFields", () => {
  it("computes warranty status active", () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30)
    const result = callComputedFields(SERVICE_PAYMENT_LIST_CONFIG, {
      service_date: ISO_DATE,
      warranty_expiry: futureDate.toISOString(),
      gross_amount: 1000,
      net_amount: 900,
      tds_amount: 100,
      complaint_id: "c1",
    })!
    expect(result.warranty_status).toBe("active")
    expect(result.linked_to_complaint).toBe(true)
    expect(result.display_tds).not.toBe("-")
  })

  it("computes warranty status expired", () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 30)
    const result = callComputedFields(SERVICE_PAYMENT_LIST_CONFIG, {
      service_date: null,
      warranty_expiry: pastDate.toISOString(),
      gross_amount: 500,
      net_amount: 500,
      tds_amount: null,
      complaint_id: null,
    })!
    expect(result.warranty_status).toBe("expired")
    expect(result.service_month).toBe("-") // formatMonthYear returns "-" for null
    expect(result.display_tds).toBe("-")
    expect(result.linked_to_complaint).toBe(false)
  })

  it("computes warranty status none when no expiry", () => {
    const result = callComputedFields(SERVICE_PAYMENT_LIST_CONFIG, {
      service_date: ISO_DATE,
      warranty_expiry: null,
      gross_amount: 500,
      net_amount: 500,
      tds_amount: 0,
    })!
    expect(result.warranty_status).toBe("none")
  })
})

describe("KITCHEN_WASTAGE_LIST_CONFIG.computedFields", () => {
  it("formats kitchen wastage date", () => {
    const result = callComputedFields(KITCHEN_WASTAGE_LIST_CONFIG, {
      wastage_date: ISO_DATE,
      estimated_value: 300,
      quantity: 2,
      unit: "kg",
      reason: "spoiled",
    })!
    expect(result).toHaveProperty("wastage_month")
    expect(result).toHaveProperty("display_value")
    expect(result).toHaveProperty("display_qty")
  })
})

describe("MISC_TRANSACTION_LIST_CONFIG.computedFields", () => {
  it("formats misc transaction date", () => {
    const result = callComputedFields(MISC_TRANSACTION_LIST_CONFIG, {
      transaction_date: ISO_DATE,
      amount: 100,
    })!
    expect(result).toHaveProperty("transaction_month")
    expect(result).toHaveProperty("display_amount")
  })
})

// ============================================================================
// Library Module Configs
// ============================================================================

describe("LIBRARY_LIST_CONFIG.computedFields", () => {
  it("computes library occupancy fields", () => {
    const result = callComputedFields(LIBRARY_LIST_CONFIG, {
      total_seats: 10,
      occupied_seats: 6,
      is_active: true,
    })!
    expect(result.available_seats).toBe(4)
    expect(result.occupancy_percent).toBe(60)
    expect(result.status_label).toBe("Active")
  })

  it("returns 0 occupancy when no seats", () => {
    const result = callComputedFields(LIBRARY_LIST_CONFIG, {
      total_seats: 0,
      occupied_seats: 0,
      is_active: false,
    })!
    expect(result.occupancy_percent).toBe(0)
    expect(result.status_label).toBe("Inactive")
  })
})

describe("LIBRARY_SECTION_LIST_CONFIG.computedFields", () => {
  it("computes section occupancy and AC label", () => {
    const result = callComputedFields(LIBRARY_SECTION_LIST_CONFIG, {
      total_seats: 8,
      occupied_seats: 3,
      is_active: true,
      is_ac: true,
    })!
    expect(result.available_seats).toBe(5)
    expect(result.ac_label).toBe("AC")
    expect(result.status_label).toBe("Active")
  })

  it("handles non-AC section with full occupancy", () => {
    const result = callComputedFields(LIBRARY_SECTION_LIST_CONFIG, {
      total_seats: 5,
      occupied_seats: 5,
      is_active: false,
      is_ac: false,
    })!
    expect(result.ac_label).toBe("Non-AC")
    expect(result.available_seats).toBe(0)
    expect(result.occupancy_percent).toBe(100)
  })
})

describe("LIBRARY_SEAT_LIST_CONFIG.computedFields", () => {
  it("computes seat status label", () => {
    const result = callComputedFields(LIBRARY_SEAT_LIST_CONFIG, {
      status: "available",
    })!
    expect(result).toHaveProperty("status_label")
  })
})

describe("LIBRARY_MEMBER_LIST_CONFIG.computedFields", () => {
  it("computes member fields with person", () => {
    const result = callComputedFields(LIBRARY_MEMBER_LIST_CONFIG, {
      join_date: ISO_DATE,
      status: "active",
      person: { name: "Alice" },
      hours_used: 3,
      hours_balance: 6,
    })!
    expect(result).toHaveProperty("join_month")
    expect(result.display_name).toBe("Alice")
    expect(result.hours_display).toBe("3h used / 6h remaining")
  })

  it("falls back to item.name when no person", () => {
    const result = callComputedFields(LIBRARY_MEMBER_LIST_CONFIG, {
      join_date: ISO_DATE,
      status: "active",
      person: null,
      name: "Bob",
    })!
    expect(result.display_name).toBe("Bob")
  })
})

describe("LIBRARY_MEMBERSHIP_LIST_CONFIG.computedFields", () => {
  it("computes membership fields with hours", () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30)
    const result = callComputedFields(LIBRARY_MEMBERSHIP_LIST_CONFIG, {
      start_date: ISO_DATE,
      end_date: futureDate.toISOString(),
      status: "active",
      hours_included: 100,
      hours_used: 50,
      final_amount: 500,
    })!
    expect(result).toHaveProperty("start_month")
    expect(result.is_expired).toBe(false)
    expect(result.hours_display).toBe("50h / 100h")
  })

  it("shows Unlimited when no hours_included", () => {
    const result = callComputedFields(LIBRARY_MEMBERSHIP_LIST_CONFIG, {
      start_date: ISO_DATE,
      end_date: null,
      status: "active",
      hours_included: null,
      hours_used: 0,
      final_amount: 0,
    })!
    expect(result.hours_display).toBe("Unlimited")
    expect(result.is_expired).toBeNull()
  })

  it("is_expired=true for past end_date", () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 10)
    const result = callComputedFields(LIBRARY_MEMBERSHIP_LIST_CONFIG, {
      start_date: ISO_DATE,
      end_date: pastDate.toISOString(),
      status: "expired",
      hours_included: 50,
      hours_used: 50,
      final_amount: 500,
    })!
    expect(result.is_expired).toBeTruthy()
  })
})

describe("LIBRARY_ATTENDANCE_LIST_CONFIG.computedFields", () => {
  it("computes attendance fields with check_out", () => {
    const checkOut = "2024-06-15T14:30:00Z"
    const result = callComputedFields(LIBRARY_ATTENDANCE_LIST_CONFIG, {
      check_in_time: ISO_DATE,
      check_out_time: checkOut,
      hours_spent: 4.5,
    })!
    expect(result).toHaveProperty("attendance_month")
    expect(result.is_checked_in).toBe(false)
    expect(result.check_out_display).not.toBe("-")
    expect(result.hours_display).toBe("4.5h")
  })

  it("computes attendance fields for checked-in (no check_out)", () => {
    const result = callComputedFields(LIBRARY_ATTENDANCE_LIST_CONFIG, {
      check_in_time: ISO_DATE,
      check_out_time: null,
      hours_spent: null,
    })!
    expect(result.is_checked_in).toBe(true)
    expect(result.check_out_display).toBe("-")
    expect(result.hours_display).toBe("-")
  })
})

describe("LIBRARY_LOCKER_LIST_CONFIG.computedFields", () => {
  it("computes locker fields with status, size, rent and deposit", () => {
    const result = callComputedFields(LIBRARY_LOCKER_LIST_CONFIG, {
      status: "rented",
      size: "small",
      monthly_rent: 200,
      deposit_amount: 500,
    })!
    expect(result).toHaveProperty("status_label")
    expect(result).toHaveProperty("size_label")
    expect(result.display_rent).not.toBe("-")
    expect(result.display_deposit).not.toBe("-")
  })

  it("shows dashes when no rent or deposit configured", () => {
    const result = callComputedFields(LIBRARY_LOCKER_LIST_CONFIG, {
      status: "available",
      size: "medium",
      monthly_rent: null,
      deposit_amount: null,
    })!
    expect(result.display_rent).toBe("-")
    expect(result.display_deposit).toBe("-")
  })
})

describe("LIBRARY_PAYMENT_LIST_CONFIG.computedFields", () => {
  it("formats library payment date", () => {
    const result = callComputedFields(LIBRARY_PAYMENT_LIST_CONFIG, {
      payment_date: ISO_DATE,
      amount: 500,
    })!
    expect(result).toHaveProperty("payment_month")
    expect(result).toHaveProperty("display_amount")
  })

  it("falls back when payment_date is null", () => {
    const result = callComputedFields(LIBRARY_PAYMENT_LIST_CONFIG, {
      payment_date: null,
      amount: 0,
    })!
    expect(result).toHaveProperty("payment_month")
  })
})

describe("LIBRARY_PLAN_LIST_CONFIG.computedFields", () => {
  it("formats plan price", () => {
    const result = callComputedFields(LIBRARY_PLAN_LIST_CONFIG, {
      base_price: 500,
      is_active: true,
    })!
    expect(result).toHaveProperty("display_price")
    expect(result.status_label).toBe("Active")
  })

  it("handles inactive plan", () => {
    const result = callComputedFields(LIBRARY_PLAN_LIST_CONFIG, {
      base_price: 0,
      is_active: false,
    })!
    expect(result.status_label).toBe("Inactive")
  })
})

describe("LIBRARY_WAITLIST_LIST_CONFIG — no computedFields", () => {
  it("has no computedFields (returns null from helper)", () => {
    expect(LIBRARY_WAITLIST_LIST_CONFIG.computedFields).toBeUndefined()
  })
})

describe("APPROVALS_LIST_CONFIG.computedFields", () => {
  it("computes approval fields with documents", () => {
    const result = callComputedFields(APPROVALS_LIST_CONFIG, {
      created_at: ISO_DATE,
      type: "maintenance",
      priority: "high",
      document_ids: ["doc1", "doc2"],
    })!
    expect(result).toHaveProperty("type_label")
    expect(result.priority_label).toBe("High")
    expect(result.has_docs_label).toBe("With Documents")
    expect(result).toHaveProperty("created_month")
  })

  it("shows No Documents when document_ids is empty", () => {
    const result = callComputedFields(APPROVALS_LIST_CONFIG, {
      created_at: ISO_DATE,
      type: "leave",
      priority: "low",
      document_ids: [],
    })!
    expect(result.has_docs_label).toBe("No Documents")
  })
})

describe("AUDIT_EVENT_LIST_CONFIG.computedFields", () => {
  it("formats audit event date", () => {
    const result = callComputedFields(AUDIT_EVENT_LIST_CONFIG, {
      occurred_at: ISO_DATE,
    })!
    expect(result).toHaveProperty("event_date")
    expect(result).toHaveProperty("event_month")
  })

  it("falls back when occurred_at is null", () => {
    const result = callComputedFields(AUDIT_EVENT_LIST_CONFIG, {})!
    expect(result).toHaveProperty("event_date")
  })
})

// ============================================================================
// Config structure sanity checks
// ============================================================================

describe("Config structure", () => {
  it("all configs have required table and select fields", () => {
    const configs = [
      TENANT_LIST_CONFIG, PAYMENT_LIST_CONFIG, BILL_LIST_CONFIG,
      EXPENSE_LIST_CONFIG, COMPLAINT_LIST_CONFIG, VISITOR_LIST_CONFIG,
      STAFF_LIST_CONFIG, PROPERTY_LIST_CONFIG, ROOM_LIST_CONFIG,
      EXIT_CLEARANCE_LIST_CONFIG, NOTICE_LIST_CONFIG, METER_READING_LIST_CONFIG,
      APPROVAL_LIST_CONFIG, REFUND_LIST_CONFIG, PEOPLE_LIST_CONFIG,
      METER_LIST_CONFIG, INQUIRY_LIST_CONFIG, PRODUCT_LIST_CONFIG,
      DAILY_SPEND_LIST_CONFIG, VENDOR_LIST_CONFIG, BILL_PAYMENT_LIST_CONFIG,
      SERVICE_PROVIDER_LIST_CONFIG, SERVICE_PAYMENT_LIST_CONFIG,
      KITCHEN_WASTAGE_LIST_CONFIG, MISC_TRANSACTION_LIST_CONFIG,
      LIBRARY_LIST_CONFIG, LIBRARY_SECTION_LIST_CONFIG, LIBRARY_SEAT_LIST_CONFIG,
      LIBRARY_MEMBER_LIST_CONFIG, LIBRARY_MEMBERSHIP_LIST_CONFIG,
      LIBRARY_ATTENDANCE_LIST_CONFIG, LIBRARY_LOCKER_LIST_CONFIG,
      LIBRARY_PAYMENT_LIST_CONFIG, LIBRARY_PLAN_LIST_CONFIG,
      LIBRARY_WAITLIST_LIST_CONFIG, APPROVALS_LIST_CONFIG, AUDIT_EVENT_LIST_CONFIG,
    ]

    for (const config of configs) {
      expect(config.table).toBeTruthy()
      expect(config.select).toBeTruthy()
      expect(config.defaultOrderBy).toBeTruthy()
    }
  })
})
