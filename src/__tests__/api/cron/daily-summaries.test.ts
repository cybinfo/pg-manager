/**
 * Tests for generateWhatsAppSummary pure function in daily-summaries cron
 *
 * The function is a pure string-builder — no DB or mocking needed.
 */

import { formatCurrency, formatDate } from "@/lib/format"
import {
  generateWhatsAppSummary,
  type DailySummaryData,
} from "@/lib/billing/daily-summaries.helpers"

// ============================================================
// Fixtures
// ============================================================

const baseDate = new Date("2026-04-26T00:00:00.000Z")

function makeData(overrides: Partial<DailySummaryData> = {}): DailySummaryData {
  return {
    ownerName: "Rajat Seth",
    businessName: null,
    date: baseDate,
    paymentsReceived: { count: 0, total: 0, breakdown: [] },
    expensesRecorded: { count: 0, total: 0, breakdown: [] },
    newTenants: 0,
    exits: 0,
    pendingDues: { total: 0, count: 0 },
    occupancyRate: 75,
    openComplaints: 0,
    ...overrides,
  }
}

// ============================================================
// Tests
// ============================================================

describe("generateWhatsAppSummary", () => {
  describe("header", () => {
    it("uses businessName when present", () => {
      const msg = generateWhatsAppSummary(makeData({ businessName: "Green High PG" }))
      expect(msg).toContain("Daily Summary - Green High PG")
      expect(msg).not.toContain("Rajat Seth")
    })

    it("falls back to ownerName when businessName is null", () => {
      const msg = generateWhatsAppSummary(makeData({ businessName: null }))
      expect(msg).toContain("Daily Summary - Rajat Seth")
    })

    it("includes the formatted date", () => {
      const msg = generateWhatsAppSummary(makeData())
      expect(msg).toContain(formatDate(baseDate))
    })
  })

  describe("payments section", () => {
    it("shows no-payments message when count is 0", () => {
      const msg = generateWhatsAppSummary(makeData())
      expect(msg).toContain("No payments received")
      expect(msg).not.toContain("Payments Received")
    })

    it("shows payment count and total when payments exist", () => {
      const msg = generateWhatsAppSummary(
        makeData({
          paymentsReceived: {
            count: 3,
            total: 15000,
            breakdown: [{ method: "UPI", amount: 15000 }],
          },
        })
      )
      expect(msg).toContain("3 payments")
      expect(msg).toContain(formatCurrency(15000))
    })

    it("lists each payment method in breakdown", () => {
      const msg = generateWhatsAppSummary(
        makeData({
          paymentsReceived: {
            count: 2,
            total: 10000,
            breakdown: [
              { method: "UPI", amount: 7000 },
              { method: "Cash", amount: 3000 },
            ],
          },
        })
      )
      expect(msg).toContain("• UPI:")
      expect(msg).toContain("• Cash:")
    })
  })

  describe("expenses section", () => {
    it("omits expenses section when count is 0", () => {
      const msg = generateWhatsAppSummary(makeData())
      expect(msg).not.toContain("Expenses")
    })

    it("shows expense count and total", () => {
      const msg = generateWhatsAppSummary(
        makeData({
          expensesRecorded: {
            count: 5,
            total: 8000,
            breakdown: [{ category: "Groceries", amount: 8000 }],
          },
        })
      )
      expect(msg).toContain("5 expenses")
      expect(msg).toContain(formatCurrency(8000))
    })

    it("shows at most 3 expense breakdown items", () => {
      const msg = generateWhatsAppSummary(
        makeData({
          expensesRecorded: {
            count: 5,
            total: 10000,
            breakdown: [
              { category: "Cat1", amount: 2000 },
              { category: "Cat2", amount: 2000 },
              { category: "Cat3", amount: 2000 },
              { category: "Cat4", amount: 2000 },
              { category: "Cat5", amount: 2000 },
            ],
          },
        })
      )
      expect(msg).toContain("• Cat1:")
      expect(msg).toContain("• Cat2:")
      expect(msg).toContain("• Cat3:")
      expect(msg).not.toContain("• Cat4:")
      expect(msg).not.toContain("• Cat5:")
    })
  })

  describe("net calculation", () => {
    it("shows positive net with + prefix", () => {
      const msg = generateWhatsAppSummary(
        makeData({
          paymentsReceived: { count: 1, total: 10000, breakdown: [] },
          expensesRecorded: { count: 1, total: 4000, breakdown: [{ category: "X", amount: 4000 }] },
        })
      )
      expect(msg).toContain("+")
      expect(msg).toContain(formatCurrency(6000))
    })

    it("shows negative net without + prefix", () => {
      const msg = generateWhatsAppSummary(
        makeData({
          paymentsReceived: { count: 1, total: 2000, breakdown: [] },
          expensesRecorded: { count: 1, total: 5000, breakdown: [{ category: "X", amount: 5000 }] },
        })
      )
      expect(msg).toMatch(/Net.*-/)
    })

    it("shows zero net with + prefix", () => {
      const msg = generateWhatsAppSummary(
        makeData({
          paymentsReceived: { count: 1, total: 5000, breakdown: [] },
          expensesRecorded: { count: 1, total: 5000, breakdown: [{ category: "X", amount: 5000 }] },
        })
      )
      expect(msg).toContain("+")
      expect(msg).toContain(formatCurrency(0))
    })
  })

  describe("occupancy", () => {
    it("includes rounded occupancy rate", () => {
      const msg = generateWhatsAppSummary(makeData({ occupancyRate: 66.666 }))
      expect(msg).toContain("Occupancy: 67%")
    })

    it("shows 0% when occupancy is zero", () => {
      const msg = generateWhatsAppSummary(makeData({ occupancyRate: 0 }))
      expect(msg).toContain("Occupancy: 0%")
    })
  })

  describe("pending dues", () => {
    it("omits pending line when total is 0", () => {
      const msg = generateWhatsAppSummary(makeData({ pendingDues: { total: 0, count: 0 } }))
      expect(msg).not.toContain("Pending:")
    })

    it("shows pending amount and bill count", () => {
      const msg = generateWhatsAppSummary(makeData({ pendingDues: { total: 25000, count: 7 } }))
      expect(msg).toContain(formatCurrency(25000))
      expect(msg).toContain("7 bills")
    })
  })

  describe("complaints", () => {
    it("omits complaints line when count is 0", () => {
      const msg = generateWhatsAppSummary(makeData({ openComplaints: 0 }))
      expect(msg).not.toContain("Complaints:")
    })

    it("shows open complaint count", () => {
      const msg = generateWhatsAppSummary(makeData({ openComplaints: 3 }))
      expect(msg).toContain("3 open")
    })
  })

  describe("activity section", () => {
    it("omits activity block when no new tenants or exits", () => {
      const msg = generateWhatsAppSummary(makeData({ newTenants: 0, exits: 0 }))
      expect(msg).not.toContain("new tenant")
      expect(msg).not.toContain("exit")
    })

    it("shows singular 'tenant' for 1 new tenant", () => {
      const msg = generateWhatsAppSummary(makeData({ newTenants: 1 }))
      expect(msg).toContain("+1 new tenant")
      expect(msg).not.toContain("tenants")
    })

    it("shows plural 'tenants' for >1 new tenants", () => {
      const msg = generateWhatsAppSummary(makeData({ newTenants: 3 }))
      expect(msg).toContain("+3 new tenants")
    })

    it("shows singular 'exit' for 1 exit", () => {
      const msg = generateWhatsAppSummary(makeData({ exits: 1 }))
      expect(msg).toContain("-1 exit")
      expect(msg).not.toContain("exits")
    })

    it("shows plural 'exits' for >1 exits", () => {
      const msg = generateWhatsAppSummary(makeData({ exits: 2 }))
      expect(msg).toContain("-2 exits")
    })

    it("shows both new tenants and exits together", () => {
      const msg = generateWhatsAppSummary(makeData({ newTenants: 2, exits: 1 }))
      expect(msg).toContain("+2 new tenants")
      expect(msg).toContain("-1 exit")
    })
  })

  describe("footer", () => {
    it("always ends with ManageKar attribution", () => {
      const msg = generateWhatsAppSummary(makeData())
      expect(msg).toContain("_Generated by ManageKar_")
    })
  })

  describe("full output structure", () => {
    it("produces a newline-separated string", () => {
      const msg = generateWhatsAppSummary(makeData())
      expect(typeof msg).toBe("string")
      const lines = msg.split("\n")
      expect(lines.length).toBeGreaterThan(5)
    })

    it("complete output for a busy day", () => {
      const msg = generateWhatsAppSummary(
        makeData({
          businessName: "NGH Library",
          paymentsReceived: {
            count: 4,
            total: 20000,
            breakdown: [
              { method: "UPI", amount: 15000 },
              { method: "Cash", amount: 5000 },
            ],
          },
          expensesRecorded: {
            count: 2,
            total: 3000,
            breakdown: [{ category: "Electricity", amount: 3000 }],
          },
          newTenants: 1,
          exits: 0,
          pendingDues: { total: 50000, count: 12 },
          occupancyRate: 88,
          openComplaints: 2,
        })
      )
      expect(msg).toContain("NGH Library")
      expect(msg).toContain("4 payments")
      expect(msg).toContain("2 expenses")
      expect(msg).toContain("Occupancy: 88%")
      expect(msg).toContain("12 bills")
      expect(msg).toContain("2 open")
      expect(msg).toContain("+1 new tenant")
    })
  })
})
