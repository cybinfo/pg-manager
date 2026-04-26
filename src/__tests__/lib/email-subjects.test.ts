/**
 * Tests for emailSubjects pure functions from src/lib/templates/email.ts
 *
 * Each subject function is a pure string transformation — easy to test.
 */

import { emailSubjects } from "@/lib/templates/email"

describe("emailSubjects", () => {
  describe("paymentReminder", () => {
    it("includes property name in subject", () => {
      const subject = emailSubjects.paymentReminder({ propertyName: "Sunshine PG" })
      expect(subject).toContain("Sunshine PG")
      expect(subject).toContain("Rent Reminder")
    })
  })

  describe("overdueAlert", () => {
    it("returns a fixed overdue string", () => {
      const subject = emailSubjects.overdueAlert()
      expect(subject).toContain("Overdue")
      expect(subject.length).toBeGreaterThan(0)
    })
  })

  describe("paymentReceipt", () => {
    it("includes receipt number", () => {
      const subject = emailSubjects.paymentReceipt({ receiptNumber: "RCPT-00123" })
      expect(subject).toContain("RCPT-00123")
    })
  })

  describe("invitation", () => {
    it("includes workspace name", () => {
      const subject = emailSubjects.invitation({
        workspaceName: "Green High Library",
        contextType: "tenant",
      })
      expect(subject).toContain("Green High Library")
    })

    it("includes ManageKar app name", () => {
      const subject = emailSubjects.invitation({
        workspaceName: "Test PG",
        contextType: "tenant",
      })
      expect(subject).toContain("ManageKar")
    })
  })

  describe("emailVerification", () => {
    it("returns a non-empty string with verification mention", () => {
      const subject = emailSubjects.emailVerification()
      expect(subject).toContain("Verify")
      expect(subject.length).toBeGreaterThan(0)
    })
  })

  describe("dailySummary", () => {
    it("includes business name when provided", () => {
      const subject = emailSubjects.dailySummary({
        date: new Date("2024-01-15"),
        businessName: "My PG",
      })
      expect(subject).toContain("My PG")
      expect(subject).toContain("Daily Summary")
    })

    it("falls back to ManageKar when businessName not provided", () => {
      const subject = emailSubjects.dailySummary({ date: new Date("2024-01-15") })
      expect(subject).toContain("ManageKar")
    })

    it("includes formatted date", () => {
      const subject = emailSubjects.dailySummary({
        date: new Date("2024-01-15"),
        businessName: "My PG",
      })
      expect(subject).toMatch(/\d{1,2}.*\d{4}/)
    })
  })

  describe("libraryLowHours", () => {
    it("includes library name", () => {
      const subject = emailSubjects.libraryLowHours({ libraryName: "Green High Library" })
      expect(subject).toContain("Green High Library")
      expect(subject).toContain("Low Hours")
    })
  })

  describe("libraryRenewalReminder", () => {
    it("includes library name", () => {
      const subject = emailSubjects.libraryRenewalReminder({ libraryName: "Study Hub" })
      expect(subject).toContain("Study Hub")
      expect(subject).toContain("Renewal")
    })
  })

  describe("libraryExpiringMembership", () => {
    it("includes library name", () => {
      const subject = emailSubjects.libraryExpiringMembership({ libraryName: "City Library" })
      expect(subject).toContain("City Library")
      expect(subject).toContain("Expiring")
    })
  })

  describe("libraryExpiredMembership", () => {
    it("includes library name", () => {
      const subject = emailSubjects.libraryExpiredMembership({ libraryName: "City Library" })
      expect(subject).toContain("City Library")
      expect(subject).toContain("Expired")
    })
  })

  describe("tenantWelcome", () => {
    it("includes property name and Welcome", () => {
      const subject = emailSubjects.tenantWelcome({ propertyName: "Sunrise PG" })
      expect(subject).toContain("Sunrise PG")
      expect(subject).toContain("Welcome")
    })
  })

  describe("libraryMemberWelcome", () => {
    it("includes library name and Welcome", () => {
      const subject = emailSubjects.libraryMemberWelcome({ libraryName: "Study Hub" })
      expect(subject).toContain("Study Hub")
      expect(subject).toContain("Welcome")
    })
  })

  describe("libraryPaymentReceipt", () => {
    it("includes receipt number and library name", () => {
      const subject = emailSubjects.libraryPaymentReceipt({
        receiptNumber: "PYMT-LIB-001",
        libraryName: "Green High",
      })
      expect(subject).toContain("PYMT-LIB-001")
      expect(subject).toContain("Green High")
    })
  })

  describe("complaintResolved", () => {
    it("includes complaint title", () => {
      const subject = emailSubjects.complaintResolved({
        complaintTitle: "Broken fan in room 4",
      })
      expect(subject).toContain("Broken fan in room 4")
      expect(subject).toContain("Resolved")
    })
  })

  describe("refundProcessed", () => {
    it("includes formatted amount", () => {
      const subject = emailSubjects.refundProcessed({ amount: 5000 })
      expect(subject).toContain("5,000")
      expect(subject).toContain("Refund")
    })
  })

  describe("waitlistSeatAvailable", () => {
    it("includes library name", () => {
      const subject = emailSubjects.waitlistSeatAvailable({ libraryName: "Study Hub" })
      expect(subject).toContain("Study Hub")
      expect(subject).toContain("Seat Available")
    })
  })

  describe("monthlyAttendanceSummary", () => {
    it("includes month, year, and library name", () => {
      const subject = emailSubjects.monthlyAttendanceSummary({
        month: "January",
        year: 2024,
        libraryName: "City Library",
      })
      expect(subject).toContain("January")
      expect(subject).toContain("2024")
      expect(subject).toContain("City Library")
    })
  })

  describe("testEmail", () => {
    it("returns a non-empty string with ManageKar app name", () => {
      const subject = emailSubjects.testEmail()
      expect(subject).toContain("ManageKar")
      expect(subject.length).toBeGreaterThan(0)
    })
  })
})
