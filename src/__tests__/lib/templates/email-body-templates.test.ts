/**
 * Tests for emailBodyTemplates from src/lib/templates/email.ts
 *
 * Strategy: call each template function and assert the returned HTML string
 * contains the expected data values (tenant name, amounts, etc.).
 * We don't assert exact HTML structure — just that key data is embedded.
 */

import { emailBodyTemplates } from "@/lib/templates"

// ============================================================================
// Shared assertions
// ============================================================================

function expectHtml(html: string) {
  expect(html).toContain("<!DOCTYPE html>")
  expect(html.toLowerCase()).toContain("managekar")
}

// ============================================================================
// paymentReminder
// ============================================================================

describe("emailBodyTemplates.paymentReminder", () => {
  const data = {
    tenantName: "Rajat Seth",
    amount: 8500,
    propertyName: "Green Villa",
    roomNumber: "101",
    dueDate: new Date("2024-06-15"),
    ownerName: "Suresh Kumar",
    ownerPhone: "9876543210",
  }

  it("returns a valid HTML string", () => {
    const html = emailBodyTemplates.paymentReminder(data)
    expectHtml(html)
  })

  it("embeds tenant name", () => {
    expect(emailBodyTemplates.paymentReminder(data)).toContain("Rajat Seth")
  })

  it("embeds property name", () => {
    expect(emailBodyTemplates.paymentReminder(data)).toContain("Green Villa")
  })

  it("embeds formatted amount", () => {
    expect(emailBodyTemplates.paymentReminder(data)).toContain("8,500")
  })

  it("embeds owner phone when provided", () => {
    expect(emailBodyTemplates.paymentReminder(data)).toContain("9876543210")
  })

  it("omits phone section when ownerPhone is not provided", () => {
    const noPhone = { ...data, ownerPhone: undefined }
    const html = emailBodyTemplates.paymentReminder(noPhone)
    expect(html).not.toContain("9876543210")
  })
})

// ============================================================================
// overdueAlert
// ============================================================================

describe("emailBodyTemplates.overdueAlert", () => {
  const data = {
    tenantName: "Priya Sharma",
    amount: 7000,
    totalDue: 14000,
    propertyName: "Blue Heights",
    roomNumber: "202",
    dueDate: new Date("2024-05-01"),
    daysOverdue: 15,
    ownerName: "Ravi Gupta",
  }

  it("returns valid HTML", () => expectHtml(emailBodyTemplates.overdueAlert(data)))
  it("embeds tenant name", () => expect(emailBodyTemplates.overdueAlert(data)).toContain("Priya Sharma"))
  it("embeds daysOverdue count", () => expect(emailBodyTemplates.overdueAlert(data)).toContain("15"))
  it("embeds property name", () => expect(emailBodyTemplates.overdueAlert(data)).toContain("Blue Heights"))
})

// ============================================================================
// paymentReceipt
// ============================================================================

describe("emailBodyTemplates.paymentReceipt", () => {
  const data = {
    tenantName: "Amit Verma",
    amount: 6000,
    receiptNumber: "RCPT-001",
    propertyName: "Sun PG",
    roomNumber: "5A",
    paymentDate: new Date("2024-06-10"),
    paymentMethod: "upi",
    ownerName: "Deepak Singh",
  }

  it("returns valid HTML", () => expectHtml(emailBodyTemplates.paymentReceipt(data)))
  it("embeds receipt number", () => expect(emailBodyTemplates.paymentReceipt(data)).toContain("RCPT-001"))
  it("embeds formatted amount", () => expect(emailBodyTemplates.paymentReceipt(data)).toContain("6,000"))
  it("embeds payment method label", () => {
    // "upi" maps to "UPI" via PAYMENT_METHODS
    expect(emailBodyTemplates.paymentReceipt(data)).toContain("UPI")
  })
  it("embeds forPeriod when provided", () => {
    const withPeriod = { ...data, forPeriod: "June 2024" }
    expect(emailBodyTemplates.paymentReceipt(withPeriod)).toContain("June 2024")
  })
})

// ============================================================================
// invitation
// ============================================================================

describe("emailBodyTemplates.invitation", () => {
  const data = {
    inviteeName: "Neha Patel",
    inviterName: "Suresh",
    workspaceName: "Green PG",
    contextType: "tenant" as const,
    signupUrl: "https://managekar.com/signup?token=abc",
  }

  it("returns valid HTML", () => expectHtml(emailBodyTemplates.invitation(data)))
  it("embeds invitee name", () => expect(emailBodyTemplates.invitation(data)).toContain("Neha Patel"))
  it("embeds workspace name", () => expect(emailBodyTemplates.invitation(data)).toContain("Green PG"))
  it("embeds signup URL", () => expect(emailBodyTemplates.invitation(data)).toContain("signup?token=abc"))
  it("embeds optional message when provided", () => {
    const withMsg = { ...data, message: "Welcome aboard!" }
    expect(emailBodyTemplates.invitation(withMsg)).toContain("Welcome aboard!")
  })
})

// ============================================================================
// emailVerification
// ============================================================================

describe("emailBodyTemplates.emailVerification", () => {
  const data = {
    userName: "Rohan Mehta",
    email: "rohan@example.com",
    verificationUrl: "https://managekar.com/verify?token=xyz",
    expiresInMinutes: 60,
  }

  it("returns valid HTML", () => expectHtml(emailBodyTemplates.emailVerification(data)))
  it("embeds user name", () => expect(emailBodyTemplates.emailVerification(data)).toContain("Rohan Mehta"))
  it("embeds verification URL", () => expect(emailBodyTemplates.emailVerification(data)).toContain("verify?token=xyz"))
  it("embeds expiry duration", () => expect(emailBodyTemplates.emailVerification(data)).toContain("60"))
})

// ============================================================================
// libraryLowHours
// ============================================================================

describe("emailBodyTemplates.libraryLowHours", () => {
  const data = {
    memberName: "Kavya Reddy",
    libraryName: "NGH Library",
    hoursRemaining: 1,
    totalHours: 9,
  }

  it("returns valid HTML", () => expectHtml(emailBodyTemplates.libraryLowHours(data)))
  it("embeds member name", () => expect(emailBodyTemplates.libraryLowHours(data)).toContain("Kavya Reddy"))
  it("embeds library name", () => expect(emailBodyTemplates.libraryLowHours(data)).toContain("NGH Library"))
  it("embeds hours remaining", () => expect(emailBodyTemplates.libraryLowHours(data)).toContain("1"))
  it("embeds member code when provided", () => {
    const withCode = { ...data, memberCode: "NGH-2001" }
    expect(emailBodyTemplates.libraryLowHours(withCode)).toContain("NGH-2001")
  })
})

// ============================================================================
// libraryExpiringMembership
// ============================================================================

describe("emailBodyTemplates.libraryExpiringMembership", () => {
  const data = {
    memberName: "Arjun Singh",
    libraryName: "StudyHub",
    expiryDate: new Date("2024-07-01"),
    daysRemaining: 5,
    planName: "9 Hours Plan",
    hoursRemaining: 45,
  }

  it("returns valid HTML", () => expectHtml(emailBodyTemplates.libraryExpiringMembership(data)))
  it("embeds member name", () => expect(emailBodyTemplates.libraryExpiringMembership(data)).toContain("Arjun Singh"))
  it("embeds plan name", () => expect(emailBodyTemplates.libraryExpiringMembership(data)).toContain("9 Hours Plan"))
  it("embeds days remaining", () => expect(emailBodyTemplates.libraryExpiringMembership(data)).toContain("5"))
})
