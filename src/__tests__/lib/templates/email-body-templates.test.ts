/**
 * Tests for emailBodyTemplates from src/lib/templates/email.ts
 *
 * Covers: paymentReminder, overdueAlert, paymentReceipt, invitation,
 *         emailVerification, dailySummary, libraryLowHours,
 *         libraryRenewalReminder, libraryExpiringMembership, libraryExpiredMembership,
 *         tenantWelcome, libraryMemberWelcome, libraryPaymentReceipt,
 *         complaintResolved, refundProcessed, waitlistSeatAvailable,
 *         monthlyAttendanceSummary
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

// ============================================================================
// dailySummary
// ============================================================================

describe("emailBodyTemplates.dailySummary", () => {
  const data = {
    ownerName: "Suresh Sharma",
    businessName: "Green PG",
    date: new Date("2024-06-15"),
    paymentsReceived: 25000,
    paymentsCount: 5,
    expensesTotal: 3000,
    expensesCount: 2,
    pendingDues: 12000,
    pendingCount: 3,
    occupancyRate: 90,
    newTenants: 1,
    exits: 0,
    openComplaints: 2,
    whatsappMessage: "5 payments received today",
  }

  it("returns valid HTML", () => expectHtml(emailBodyTemplates.dailySummary(data)))
  it("embeds owner name in greeting", () => expect(emailBodyTemplates.dailySummary(data)).toContain("Suresh Sharma"))
  it("embeds formatted payments received", () => expect(emailBodyTemplates.dailySummary(data)).toContain("25,000"))
  it("embeds occupancy rate", () => expect(emailBodyTemplates.dailySummary(data)).toContain("90"))
  it("embeds open complaints count", () => expect(emailBodyTemplates.dailySummary(data)).toContain("2"))
  it("embeds whatsapp message", () => expect(emailBodyTemplates.dailySummary(data)).toContain("5 payments received today"))
})

// ============================================================================
// libraryRenewalReminder
// ============================================================================

describe("emailBodyTemplates.libraryRenewalReminder", () => {
  const data = {
    memberName: "Priya Patel",
    libraryName: "NGH Library",
    expiryDate: new Date("2024-07-10"),
    daysRemaining: 7,
    planName: "6 Hours Plan",
    hoursRemaining: 20,
  }

  it("returns valid HTML", () => expectHtml(emailBodyTemplates.libraryRenewalReminder(data)))
  it("embeds member name", () => expect(emailBodyTemplates.libraryRenewalReminder(data)).toContain("Priya Patel"))
  it("embeds library name", () => expect(emailBodyTemplates.libraryRenewalReminder(data)).toContain("NGH Library"))
  it("embeds plan name", () => expect(emailBodyTemplates.libraryRenewalReminder(data)).toContain("6 Hours Plan"))
  it("embeds days remaining", () => expect(emailBodyTemplates.libraryRenewalReminder(data)).toContain("7"))
  it("embeds member code when provided", () => {
    const withCode = { ...data, memberCode: "NGH-1005" }
    expect(emailBodyTemplates.libraryRenewalReminder(withCode)).toContain("NGH-1005")
  })
  it("embeds owner phone when provided", () => {
    const withPhone = { ...data, ownerPhone: "9876543210" }
    expect(emailBodyTemplates.libraryRenewalReminder(withPhone)).toContain("9876543210")
  })
})

// ============================================================================
// libraryExpiredMembership
// ============================================================================

describe("emailBodyTemplates.libraryExpiredMembership", () => {
  const data = {
    memberName: "Rahul Gupta",
    libraryName: "StudyZone",
    expiryDate: new Date("2024-06-01"),
    planName: "9 Hours Plan",
    hoursRemaining: 3,
  }

  it("returns valid HTML", () => expectHtml(emailBodyTemplates.libraryExpiredMembership(data)))
  it("embeds member name", () => expect(emailBodyTemplates.libraryExpiredMembership(data)).toContain("Rahul Gupta"))
  it("embeds library name", () => expect(emailBodyTemplates.libraryExpiredMembership(data)).toContain("StudyZone"))
  it("embeds plan name", () => expect(emailBodyTemplates.libraryExpiredMembership(data)).toContain("9 Hours Plan"))
  it("embeds unused hours", () => expect(emailBodyTemplates.libraryExpiredMembership(data)).toContain("3.0"))
  it("embeds owner phone when provided", () => {
    const withPhone = { ...data, ownerPhone: "9876540000" }
    expect(emailBodyTemplates.libraryExpiredMembership(withPhone)).toContain("9876540000")
  })
  it("omits owner phone section when not provided", () => {
    const html = emailBodyTemplates.libraryExpiredMembership(data)
    expect(html).not.toContain("9876540000")
  })
})

// ============================================================================
// tenantWelcome
// ============================================================================

describe("emailBodyTemplates.tenantWelcome", () => {
  const data = {
    tenantName: "Aditya Kumar",
    propertyName: "Blue Heights",
    roomNumber: "201",
    moveInDate: new Date("2024-07-01"),
    monthlyRent: 9000,
    ownerName: "Deepak Singh",
  }

  it("returns valid HTML", () => expectHtml(emailBodyTemplates.tenantWelcome(data)))
  it("embeds tenant name", () => expect(emailBodyTemplates.tenantWelcome(data)).toContain("Aditya Kumar"))
  it("embeds property name", () => expect(emailBodyTemplates.tenantWelcome(data)).toContain("Blue Heights"))
  it("embeds room number", () => expect(emailBodyTemplates.tenantWelcome(data)).toContain("201"))
  it("embeds formatted monthly rent", () => expect(emailBodyTemplates.tenantWelcome(data)).toContain("9,000"))
  it("embeds owner name", () => expect(emailBodyTemplates.tenantWelcome(data)).toContain("Deepak Singh"))
  it("embeds owner phone when provided", () => {
    const withPhone = { ...data, ownerPhone: "9000011111" }
    expect(emailBodyTemplates.tenantWelcome(withPhone)).toContain("9000011111")
  })
  it("omits phone section when not provided", () => {
    const html = emailBodyTemplates.tenantWelcome(data)
    expect(html).not.toContain("9000011111")
  })
})

// ============================================================================
// libraryMemberWelcome
// ============================================================================

describe("emailBodyTemplates.libraryMemberWelcome", () => {
  const data = {
    memberName: "Sneha Joshi",
    libraryName: "Bright Library",
    memberCode: "BL-2001",
  }

  it("returns valid HTML", () => expectHtml(emailBodyTemplates.libraryMemberWelcome(data)))
  it("embeds member name", () => expect(emailBodyTemplates.libraryMemberWelcome(data)).toContain("Sneha Joshi"))
  it("embeds library name", () => expect(emailBodyTemplates.libraryMemberWelcome(data)).toContain("Bright Library"))
  it("embeds member code", () => expect(emailBodyTemplates.libraryMemberWelcome(data)).toContain("BL-2001"))
  it("embeds plan name when provided", () => {
    const withPlan = { ...data, planName: "12 Hours Plan" }
    expect(emailBodyTemplates.libraryMemberWelcome(withPlan)).toContain("12 Hours Plan")
  })
  it("embeds seat number when provided", () => {
    const withSeat = { ...data, seatNumber: "A-15" }
    expect(emailBodyTemplates.libraryMemberWelcome(withSeat)).toContain("A-15")
  })
  it("embeds hours included when provided", () => {
    const withHours = { ...data, hoursIncluded: 12 }
    expect(emailBodyTemplates.libraryMemberWelcome(withHours)).toContain("12")
  })
  it("includes member portal link", () => {
    const html = emailBodyTemplates.libraryMemberWelcome(data)
    expect(html).toContain("/member")
  })
})

// ============================================================================
// libraryPaymentReceipt
// ============================================================================

describe("emailBodyTemplates.libraryPaymentReceipt", () => {
  const data = {
    memberName: "Vikram Nair",
    libraryName: "NGH Library",
    amount: 1200,
    paymentMethod: "upi",
    paymentType: "subscription",
    receiptNumber: "PYMT-LIB-000042",
    paymentDate: new Date("2024-06-20"),
  }

  it("returns valid HTML", () => expectHtml(emailBodyTemplates.libraryPaymentReceipt(data)))
  it("embeds member name", () => expect(emailBodyTemplates.libraryPaymentReceipt(data)).toContain("Vikram Nair"))
  it("embeds library name", () => expect(emailBodyTemplates.libraryPaymentReceipt(data)).toContain("NGH Library"))
  it("embeds receipt number", () => expect(emailBodyTemplates.libraryPaymentReceipt(data)).toContain("PYMT-LIB-000042"))
  it("embeds formatted amount", () => expect(emailBodyTemplates.libraryPaymentReceipt(data)).toContain("1,200"))
  it("maps paymentType 'subscription' to readable label", () => {
    expect(emailBodyTemplates.libraryPaymentReceipt(data)).toContain("Subscription")
  })
  it("embeds owner phone when provided", () => {
    const withPhone = { ...data, ownerPhone: "9988776655" }
    expect(emailBodyTemplates.libraryPaymentReceipt(withPhone)).toContain("9988776655")
  })
})

// ============================================================================
// complaintResolved
// ============================================================================

describe("emailBodyTemplates.complaintResolved", () => {
  const data = {
    recipientName: "Meera Shah",
    complaintTitle: "Water leakage in room 3",
    category: "Maintenance",
    resolutionNotes: "Fixed the pipe on June 18th.",
    resolvedDate: new Date("2024-06-18"),
    propertyName: "Sunshine PG",
  }

  it("returns valid HTML", () => expectHtml(emailBodyTemplates.complaintResolved(data)))
  it("embeds recipient name", () => expect(emailBodyTemplates.complaintResolved(data)).toContain("Meera Shah"))
  it("embeds complaint title", () => expect(emailBodyTemplates.complaintResolved(data)).toContain("Water leakage in room 3"))
  it("embeds category", () => expect(emailBodyTemplates.complaintResolved(data)).toContain("Maintenance"))
  it("embeds resolution notes", () => expect(emailBodyTemplates.complaintResolved(data)).toContain("Fixed the pipe on June 18th."))
  it("embeds property name when provided", () => expect(emailBodyTemplates.complaintResolved(data)).toContain("Sunshine PG"))
  it("omits resolution notes block when null", () => {
    const noNotes = { ...data, resolutionNotes: null }
    const html = emailBodyTemplates.complaintResolved(noNotes)
    expect(html).not.toContain("Resolution Notes")
  })
  it("embeds owner phone when provided", () => {
    const withPhone = { ...data, ownerPhone: "9111122222" }
    expect(emailBodyTemplates.complaintResolved(withPhone)).toContain("9111122222")
  })
})

// ============================================================================
// refundProcessed
// ============================================================================

describe("emailBodyTemplates.refundProcessed", () => {
  const data = {
    tenantName: "Kiran Bose",
    amount: 15000,
    refundType: "deposit_refund",
    paymentMode: "bank_transfer",
    reason: "Move-out security deposit return",
    referenceNumber: "TXN-20240620",
    refundDate: new Date("2024-06-20"),
    propertyName: "Green Villa",
    ownerName: "Suresh Kumar",
  }

  it("returns valid HTML", () => expectHtml(emailBodyTemplates.refundProcessed(data)))
  it("embeds tenant name", () => expect(emailBodyTemplates.refundProcessed(data)).toContain("Kiran Bose"))
  it("embeds formatted amount", () => expect(emailBodyTemplates.refundProcessed(data)).toContain("15,000"))
  it("maps refundType to readable label", () => {
    expect(emailBodyTemplates.refundProcessed(data)).toContain("Security Deposit Refund")
  })
  it("embeds reference number when provided", () => {
    expect(emailBodyTemplates.refundProcessed(data)).toContain("TXN-20240620")
  })
  it("embeds reason when provided", () => {
    expect(emailBodyTemplates.refundProcessed(data)).toContain("Move-out security deposit return")
  })
  it("omits reason block when null", () => {
    const noReason = { ...data, reason: null }
    const html = emailBodyTemplates.refundProcessed(noReason)
    expect(html).not.toContain("Reason:")
  })
  it("embeds owner name in signature", () => {
    expect(emailBodyTemplates.refundProcessed(data)).toContain("Suresh Kumar")
  })
  it("embeds owner phone when provided", () => {
    const withPhone = { ...data, ownerPhone: "9000099999" }
    expect(emailBodyTemplates.refundProcessed(withPhone)).toContain("9000099999")
  })
})

// ============================================================================
// waitlistSeatAvailable
// ============================================================================

describe("emailBodyTemplates.waitlistSeatAvailable", () => {
  const data = {
    personName: "Ananya Roy",
    libraryName: "Focus Library",
    queuePosition: 3,
  }

  it("returns valid HTML", () => expectHtml(emailBodyTemplates.waitlistSeatAvailable(data)))
  it("embeds person name", () => expect(emailBodyTemplates.waitlistSeatAvailable(data)).toContain("Ananya Roy"))
  it("embeds library name", () => expect(emailBodyTemplates.waitlistSeatAvailable(data)).toContain("Focus Library"))
  it("embeds queue position", () => expect(emailBodyTemplates.waitlistSeatAvailable(data)).toContain("3"))
  it("embeds owner phone when provided", () => {
    const withPhone = { ...data, ownerPhone: "9333344444" }
    expect(emailBodyTemplates.waitlistSeatAvailable(withPhone)).toContain("9333344444")
  })
  it("omits contact section when no phone", () => {
    const html = emailBodyTemplates.waitlistSeatAvailable(data)
    expect(html).not.toContain("9333344444")
  })
})

// ============================================================================
// monthlyAttendanceSummary
// ============================================================================

describe("emailBodyTemplates.monthlyAttendanceSummary", () => {
  const data = {
    memberName: "Nikhil Verma",
    libraryName: "Scholar Hub",
    month: "June",
    year: 2024,
    totalDaysAttended: 22,
    totalHours: 88,
    averageHoursPerDay: 4,
    hoursRemaining: 5,
  }

  it("returns valid HTML", () => expectHtml(emailBodyTemplates.monthlyAttendanceSummary(data)))
  it("embeds member name", () => expect(emailBodyTemplates.monthlyAttendanceSummary(data)).toContain("Nikhil Verma"))
  it("embeds library name", () => expect(emailBodyTemplates.monthlyAttendanceSummary(data)).toContain("Scholar Hub"))
  it("embeds month and year", () => {
    const html = emailBodyTemplates.monthlyAttendanceSummary(data)
    expect(html).toContain("June")
    expect(html).toContain("2024")
  })
  it("embeds days attended", () => expect(emailBodyTemplates.monthlyAttendanceSummary(data)).toContain("22"))
  it("embeds total hours with decimal", () => expect(emailBodyTemplates.monthlyAttendanceSummary(data)).toContain("88.0"))
  it("embeds member code when provided", () => {
    const withCode = { ...data, memberCode: "SCH-0042" }
    expect(emailBodyTemplates.monthlyAttendanceSummary(withCode)).toContain("SCH-0042")
  })
  it("embeds owner phone when provided", () => {
    const withPhone = { ...data, ownerPhone: "9555566666" }
    expect(emailBodyTemplates.monthlyAttendanceSummary(withPhone)).toContain("9555566666")
  })
  it("uses warning color when hoursRemaining <= 2", () => {
    const lowHours = { ...data, hoursRemaining: 2 }
    const html = emailBodyTemplates.monthlyAttendanceSummary(lowHours)
    expect(html).toContain("#FEF3C7")
  })
  it("uses success color when hoursRemaining > 2", () => {
    const html = emailBodyTemplates.monthlyAttendanceSummary(data)
    expect(html).toContain("#F0FDF4")
  })
})

describe("emailBodyTemplates.testEmail", () => {
  it("contains owner name in greeting", () => {
    const html = emailBodyTemplates.testEmail({ ownerName: "Rajat Seth" })
    expect(html).toContain("Rajat Seth")
    expect(html).toContain("<div")
  })

  it("contains ManageKar branding", () => {
    const html = emailBodyTemplates.testEmail({ ownerName: "Owner" })
    expect(html).toContain("ManageKar")
  })
})

// ============================================================================
// email-templates.ts — backward-compat shim
// ============================================================================

describe("email-templates backward-compat shim", () => {
  it("re-exports all template functions from the deprecated path", async () => {
    const shim = await import("@/lib/email-templates")
    expect(typeof shim.paymentReminderTemplate).toBe("function")
    expect(typeof shim.overdueAlertTemplate).toBe("function")
    expect(typeof shim.paymentReceiptTemplate).toBe("function")
    expect(typeof shim.invitationEmailTemplate).toBe("function")
    expect(typeof shim.emailVerificationTemplate).toBe("function")
    expect(typeof shim.dailySummaryTemplate).toBe("function")
    expect(typeof shim.libraryLowHoursTemplate).toBe("function")
    expect(typeof shim.libraryExpiringMembershipTemplate).toBe("function")
    expect(typeof shim.libraryExpiredMembershipTemplate).toBe("function")
  })

  it("paymentReminderTemplate delegates to emailBodyTemplates.paymentReminder", async () => {
    const { paymentReminderTemplate } = await import("@/lib/email-templates")
    const data = {
      tenantName: "Alice",
      propertyName: "Sunrise PG",
      roomNumber: "101",
      amount: 5000,
      dueDate: "2026-05-01",
      billMonth: "May 2026",
    }
    const html = paymentReminderTemplate(data)
    expect(html).toContain("Alice")
    expect(html).toContain("<!DOCTYPE html>")
  })

  it("libraryLowHoursTemplate delegates to emailBodyTemplates.libraryLowHours", async () => {
    const { libraryLowHoursTemplate } = await import("@/lib/email-templates")
    const data = {
      memberName: "Bob",
      libraryName: "Scholar Hub",
      hoursRemaining: 1,
      totalHours: 9,
    }
    const html = libraryLowHoursTemplate(data)
    expect(html).toContain("Bob")
    expect(html).toContain("<!DOCTYPE html>")
  })
})
