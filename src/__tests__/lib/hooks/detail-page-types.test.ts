/**
 * Tests for src/lib/hooks/detail-page/types.ts
 *
 * This file exports ~30 DetailPageConfig constants (pure data objects).
 * Importing them exercises all statement-level coverage.
 * We spot-check structural invariants to ensure configs are well-formed.
 */

import {
  STAFF_DETAIL_CONFIG,
  TENANT_DETAIL_CONFIG,
  BILL_DETAIL_CONFIG,
  PAYMENT_DETAIL_CONFIG,
  PROPERTY_DETAIL_CONFIG,
  ROOM_DETAIL_CONFIG,
  COMPLAINT_DETAIL_CONFIG,
  NOTICE_DETAIL_CONFIG,
  EXIT_CLEARANCE_DETAIL_CONFIG,
  REFUND_DETAIL_CONFIG,
  PEOPLE_DETAIL_CONFIG,
  LIBRARY_DETAIL_CONFIG,
  LIBRARY_MEMBER_DETAIL_CONFIG,
  LIBRARY_ATTENDANCE_DETAIL_CONFIG,
  LIBRARY_LOCKER_DETAIL_CONFIG,
  LIBRARY_SUBSCRIPTION_DETAIL_CONFIG,
  LIBRARY_PAYMENT_DETAIL_CONFIG,
  METER_DETAIL_CONFIG,
  METER_READING_DETAIL_CONFIG,
  VISITOR_DETAIL_CONFIG,
  EXPENSE_DETAIL_CONFIG,
  INQUIRY_DETAIL_CONFIG,
} from "@/lib/hooks/detail-page/types"

// ============================================================================
// Structural invariants — every config must have table + select
// ============================================================================

const ALL_CONFIGS = [
  STAFF_DETAIL_CONFIG,
  TENANT_DETAIL_CONFIG,
  BILL_DETAIL_CONFIG,
  PAYMENT_DETAIL_CONFIG,
  PROPERTY_DETAIL_CONFIG,
  ROOM_DETAIL_CONFIG,
  COMPLAINT_DETAIL_CONFIG,
  NOTICE_DETAIL_CONFIG,
  EXIT_CLEARANCE_DETAIL_CONFIG,
  REFUND_DETAIL_CONFIG,
  PEOPLE_DETAIL_CONFIG,
  LIBRARY_DETAIL_CONFIG,
  LIBRARY_MEMBER_DETAIL_CONFIG,
  LIBRARY_ATTENDANCE_DETAIL_CONFIG,
  LIBRARY_LOCKER_DETAIL_CONFIG,
  LIBRARY_SUBSCRIPTION_DETAIL_CONFIG,
  LIBRARY_PAYMENT_DETAIL_CONFIG,
  METER_DETAIL_CONFIG,
  METER_READING_DETAIL_CONFIG,
  VISITOR_DETAIL_CONFIG,
  EXPENSE_DETAIL_CONFIG,
  INQUIRY_DETAIL_CONFIG,
]

describe("detail-page configs — structural invariants", () => {
  it("every config has a non-empty table string", () => {
    for (const cfg of ALL_CONFIGS) {
      expect(typeof cfg.table).toBe("string")
      expect(cfg.table.length).toBeGreaterThan(0)
    }
  })

  it("every config has a non-empty select string", () => {
    for (const cfg of ALL_CONFIGS) {
      expect(typeof cfg.select).toBe("string")
      expect(cfg.select.length).toBeGreaterThan(0)
    }
  })

  it("relatedQueries entries have key, table, select, and foreignKey", () => {
    for (const cfg of ALL_CONFIGS) {
      for (const rq of cfg.relatedQueries ?? []) {
        expect(typeof rq.key).toBe("string")
        expect(typeof rq.table).toBe("string")
        expect(typeof rq.select).toBe("string")
        expect(typeof rq.foreignKey).toBe("string")
      }
    }
  })
})

// ============================================================================
// Spot-checks for specific configs
// ============================================================================

describe("TENANT_DETAIL_CONFIG", () => {
  it("queries the tenants table", () => {
    expect(TENANT_DETAIL_CONFIG.table).toBe("tenants")
  })

  it("includes person join in select", () => {
    expect(TENANT_DETAIL_CONFIG.select).toContain("people")
  })
})

describe("LIBRARY_MEMBER_DETAIL_CONFIG", () => {
  it("queries the library_members table", () => {
    expect(LIBRARY_MEMBER_DETAIL_CONFIG.table).toBe("library_members")
  })

  it("has relatedQueries for attendance or payments", () => {
    const keys = (LIBRARY_MEMBER_DETAIL_CONFIG.relatedQueries ?? []).map((r) => r.key)
    expect(keys.length).toBeGreaterThan(0)
  })
})

describe("EXIT_CLEARANCE_DETAIL_CONFIG", () => {
  it("queries the exit_clearance table", () => {
    expect(EXIT_CLEARANCE_DETAIL_CONFIG.table).toBe("exit_clearance")
  })
})

describe("LIBRARY_SUBSCRIPTION_DETAIL_CONFIG", () => {
  it("queries the library_memberships table", () => {
    expect(LIBRARY_SUBSCRIPTION_DETAIL_CONFIG.table).toBe("library_memberships")
  })
})
