/**
 * Tests for src/lib/templates/whatsapp.ts
 *
 * Pure string-builder functions — no DB or mocking needed.
 */

import { whatsappTemplates, getPaymentMethodLabel } from "@/lib/templates/whatsapp"
import { formatCurrency, formatDate } from "@/lib/format"

// ============================================================================
// getPaymentMethodLabel
// ============================================================================

describe("getPaymentMethodLabel", () => {
  it("returns a human-readable label for a known payment method", () => {
    expect(getPaymentMethodLabel("upi")).toBeTruthy()
    expect(typeof getPaymentMethodLabel("upi")).toBe("string")
  })

  it("returns the raw method string for an unknown method", () => {
    expect(getPaymentMethodLabel("crypto")).toBe("crypto")
  })

  it("returns the raw method string for empty input", () => {
    expect(getPaymentMethodLabel("")).toBe("")
  })
})

// ============================================================================
// whatsappTemplates.paymentReceipt
// ============================================================================

describe("whatsappTemplates.paymentReceipt", () => {
  const base = {
    tenantName: "Ravi Kumar",
    amount: 8500,
    receiptNumber: "REC-0042",
    propertyName: "Sunshine PG",
    paymentDate: new Date("2026-04-15"),
    paymentMethod: "upi",
  }

  it("contains the tenant name", () => {
    expect(whatsappTemplates.paymentReceipt(base)).toContain("Ravi Kumar")
  })

  it("contains formatted currency amount", () => {
    expect(whatsappTemplates.paymentReceipt(base)).toContain(formatCurrency(8500))
  })

  it("contains the receipt number", () => {
    expect(whatsappTemplates.paymentReceipt(base)).toContain("REC-0042")
  })

  it("contains formatted date", () => {
    expect(whatsappTemplates.paymentReceipt(base)).toContain(formatDate(new Date("2026-04-15")))
  })

  it("contains the property name", () => {
    expect(whatsappTemplates.paymentReceipt(base)).toContain("Sunshine PG")
  })

  it("shows room number when provided", () => {
    const msg = whatsappTemplates.paymentReceipt({ ...base, roomNumber: "101" })
    expect(msg).toContain("Room: 101")
  })

  it("omits room line when roomNumber is not provided", () => {
    expect(whatsappTemplates.paymentReceipt(base)).not.toContain("Room:")
  })

  it("shows address when provided", () => {
    const msg = whatsappTemplates.paymentReceipt({ ...base, propertyAddress: "42 MG Road" })
    expect(msg).toContain("42 MG Road")
  })

  it("shows forPeriod when provided", () => {
    const msg = whatsappTemplates.paymentReceipt({ ...base, forPeriod: "April 2026" })
    expect(msg).toContain("April 2026")
  })

  it("shows description when provided", () => {
    const msg = whatsappTemplates.paymentReceipt({ ...base, description: "Advance payment" })
    expect(msg).toContain("Advance payment")
  })

  it("shows owner contact when ownerPhone provided", () => {
    const msg = whatsappTemplates.paymentReceipt({ ...base, ownerPhone: "9876543210" })
    expect(msg).toContain("9876543210")
  })

  it("shows ownerName when provided", () => {
    const msg = whatsappTemplates.paymentReceipt({ ...base, ownerName: "Rajat Seth" })
    expect(msg).toContain("Rajat Seth")
  })

  it("falls back to ManageKar when ownerName is not provided", () => {
    expect(whatsappTemplates.paymentReceipt(base)).toContain("ManageKar")
  })

  it("always ends with Powered by ManageKar attribution", () => {
    expect(whatsappTemplates.paymentReceipt(base)).toContain("ManageKar")
  })

  it("shows 'N/A' when receiptNumber is empty string", () => {
    const msg = whatsappTemplates.paymentReceipt({ ...base, receiptNumber: "" })
    expect(msg).toContain("N/A")
  })
})

// ============================================================================
// whatsappTemplates.paymentReminder
// ============================================================================

describe("whatsappTemplates.paymentReminder", () => {
  const base = {
    tenantName: "Priya Sharma",
    amount: 7000,
    propertyName: "Green View PG",
    dueDate: new Date("2026-04-30"),
  }

  it("contains the tenant name", () => {
    expect(whatsappTemplates.paymentReminder(base)).toContain("Priya Sharma")
  })

  it("contains formatted amount", () => {
    expect(whatsappTemplates.paymentReminder(base)).toContain(formatCurrency(7000))
  })

  it("contains the property name", () => {
    expect(whatsappTemplates.paymentReminder(base)).toContain("Green View PG")
  })

  it("contains formatted due date", () => {
    expect(whatsappTemplates.paymentReminder(base)).toContain(formatDate(new Date("2026-04-30")))
  })

  it("shows ownerName when provided", () => {
    const msg = whatsappTemplates.paymentReminder({ ...base, ownerName: "Vikram" })
    expect(msg).toContain("Vikram")
  })

  it("falls back to ManageKar when ownerName is not provided", () => {
    expect(whatsappTemplates.paymentReminder(base)).toContain("ManageKar")
  })
})

// ============================================================================
// whatsappTemplates.overdueAlert
// ============================================================================

describe("whatsappTemplates.overdueAlert", () => {
  const base = {
    tenantName: "Amit Patel",
    amount: 8000,
    dueDate: new Date("2026-04-01"),
    totalDue: 16000,
  }

  it("contains the tenant name", () => {
    expect(whatsappTemplates.overdueAlert(base)).toContain("Amit Patel")
  })

  it("contains formatted amount", () => {
    expect(whatsappTemplates.overdueAlert(base)).toContain(formatCurrency(8000))
  })

  it("contains formatted total due", () => {
    expect(whatsappTemplates.overdueAlert(base)).toContain(formatCurrency(16000))
  })

  it("contains the due date", () => {
    expect(whatsappTemplates.overdueAlert(base)).toContain(formatDate(new Date("2026-04-01")))
  })

  it("shows ownerName when provided", () => {
    const msg = whatsappTemplates.overdueAlert({ ...base, ownerName: "Owner" })
    expect(msg).toContain("Owner")
  })

  it("falls back to ManageKar when ownerName not provided", () => {
    expect(whatsappTemplates.overdueAlert(base)).toContain("ManageKar")
  })
})

// ============================================================================
// whatsappTemplates.simpleReceipt
// ============================================================================

describe("whatsappTemplates.simpleReceipt", () => {
  it("contains all key fields in a single-line format", () => {
    const msg = whatsappTemplates.simpleReceipt({
      tenantName: "Neha",
      amount: 3000,
      receiptNumber: "REC-100",
    })
    expect(msg).toContain("Neha")
    expect(msg).toContain(formatCurrency(3000))
    expect(msg).toContain("REC-100")
  })

  it("is a single-line (no newlines, compact)", () => {
    const msg = whatsappTemplates.simpleReceipt({
      tenantName: "Test",
      amount: 1000,
      receiptNumber: "R-1",
    })
    expect(msg.split("\n").length).toBe(1)
  })
})
