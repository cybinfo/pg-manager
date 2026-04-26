/**
 * Tests for src/lib/email.ts
 *
 * Covers: getResendClient (lazy init, missing API key), and all 20 send
 * functions (success path, Resend error path, exception catch path).
 */

// ============================================================================
// Mocks — must come before imports
// ============================================================================

// Mock resend before the module initializes
const mockSend = jest.fn()
jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}))

jest.mock("@/lib/logger", () => ({
  logger: {
    child: jest.fn(() => ({
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    })),
  },
  extractErrorMeta: jest.fn((e: unknown) => ({ error: e })),
}))

// Mock all template functions to return strings (no template rendering)
jest.mock("@/lib/templates", () => ({
  emailSubjects: new Proxy({}, {
    get: () => jest.fn(() => "Mock Subject"),
  }),
  emailBodyTemplates: new Proxy({}, {
    get: () => jest.fn(() => "<p>Mock</p>"),
  }),
}))

// ============================================================================
// Imports (after mocks)
// ============================================================================

const ORIG_ENV = process.env

import {
  sendPaymentReminder,
  sendOverdueAlert,
  sendPaymentReceipt,
  sendInvitationEmail,
  sendTestEmail,
  sendVerificationEmail,
  sendDailySummary,
  sendLibraryLowHoursWarning,
  sendLibraryExpiringMembership,
  sendLibraryExpiredMembership,
  sendTenantWelcomeEmail,
  sendLibraryMemberWelcomeEmail,
  sendLibraryRenewalReminder,
  sendLibraryPaymentReceiptEmail,
  sendComplaintResolvedEmail,
  sendRefundProcessedEmail,
  sendWaitlistSeatAvailableEmail,
  sendCronFailureAlert,
  sendMonthlyAttendanceSummary,
} from "@/lib/email"

// ============================================================================
// Minimal fixture data for each function
// ============================================================================

const NOW = new Date("2026-04-26T00:00:00Z")

const PAYMENT_REMINDER_DATA = {
  to: "t@t.com", tenantName: "Alice", amount: 5000,
  propertyName: "Test PG", roomNumber: "101", dueDate: NOW,
  ownerName: "Bob",
}
const OVERDUE_ALERT_DATA = {
  to: "t@t.com", tenantName: "Alice", amount: 5000, totalDue: 6000,
  propertyName: "Test PG", roomNumber: "101", dueDate: NOW,
  daysOverdue: 5, ownerName: "Bob",
}
const PAYMENT_RECEIPT_DATA = {
  to: "t@t.com", tenantName: "Alice", amount: 5000, receiptNumber: "RCT-001",
  propertyName: "Test PG", roomNumber: "101", paymentDate: NOW,
  paymentMethod: "upi", ownerName: "Bob",
}
const INVITATION_DATA = {
  to: "s@s.com", inviteeName: "Carol", inviterName: "Bob",
  workspaceName: "Test PG", contextType: "staff" as const,
  signupUrl: "https://example.com/signup",
}
const VERIFICATION_DATA = {
  to: "u@u.com", userName: "Alice", email: "u@u.com",
  verificationUrl: "https://example.com/verify/abc",
  expiresInMinutes: 30,
}
const DAILY_SUMMARY_DATA = {
  to: "o@o.com", ownerName: "Bob", date: NOW,
  paymentsReceived: 10000, paymentsCount: 3, expensesTotal: 2000,
  expensesCount: 2, pendingDues: 5000, pendingCount: 2,
  occupancyRate: 0.9, newTenants: 1, exits: 0, openComplaints: 2,
  whatsappMessage: "Daily summary...",
}
const LIB_LOW_HOURS = {
  to: "m@m.com", memberName: "Alice", libraryName: "City Library",
  hoursRemaining: 1.5, totalHours: 9,
}
const LIB_EXPIRING = {
  to: "m@m.com", memberName: "Alice", libraryName: "City Library",
  expiryDate: NOW, daysRemaining: 3, planName: "9 Hours",
  hoursRemaining: 4.5,
}
const LIB_EXPIRED = {
  to: "m@m.com", memberName: "Alice", libraryName: "City Library",
  expiryDate: NOW, planName: "9 Hours", hoursRemaining: 0,
}
const TENANT_WELCOME = {
  to: "t@t.com", tenantName: "Alice", propertyName: "Test PG",
  roomNumber: "101", moveInDate: NOW, monthlyRent: 5000, ownerName: "Bob",
}
const LIB_MEMBER_WELCOME = {
  to: "m@m.com", memberName: "Alice", libraryName: "City Library",
  memberCode: "CLY-001",
}
const LIB_RENEWAL_REMINDER = {
  to: "m@m.com", memberName: "Alice", libraryName: "City Library",
  expiryDate: NOW, daysRemaining: 3, planName: "9 Hours", hoursRemaining: 2,
}
const LIB_PAYMENT_RECEIPT = {
  to: "m@m.com", memberName: "Alice", libraryName: "City Library",
  amount: 1200, paymentMethod: "upi", paymentType: "subscription",
  receiptNumber: "PYMT-LIB-000001", paymentDate: NOW,
}
const COMPLAINT_RESOLVED = {
  to: "t@t.com", recipientName: "Alice", complaintTitle: "Noisy neighbour",
  category: "noise", resolutionNotes: "Resolved", resolvedDate: NOW,
}
const REFUND_PROCESSED = {
  to: "t@t.com", tenantName: "Alice", amount: 10000,
  refundType: "security_deposit", paymentMode: "upi",
  reason: "Checked out", referenceNumber: "REF-001", refundDate: NOW,
  ownerName: "Bob",
}
const WAITLIST_SEAT_AVAILABLE = {
  to: "w@w.com", personName: "Dave", libraryName: "City Library",
  queuePosition: 1,
}
const CRON_FAILURE = {
  cronName: "generate-bills", error: "Timeout", timestamp: "2026-04-26T06:00:00Z",
}
const MONTHLY_ATTENDANCE = {
  to: "m@m.com", memberName: "Alice", libraryName: "City Library",
  month: "April", year: 2026, totalDaysAttended: 20, totalHours: 45,
  averageHoursPerDay: 2.25, hoursRemaining: 3,
}

// ============================================================================
// Shared success/error setup
// ============================================================================

const { Resend: MockResend } = jest.requireMock("resend") as { Resend: jest.Mock }

/** Reset mocks and re-wire the Resend instance fresh for each test */
function resetMocks() {
  jest.clearAllMocks()
  // Re-wire: Resend constructor returns a fresh instance using the shared mockSend
  MockResend.mockImplementation(() => ({ emails: { send: mockSend } }))
}

function mockSendSuccess() {
  mockSend.mockResolvedValue({ data: { id: "msg-abc" }, error: null })
}

function mockSendResendError() {
  mockSend.mockResolvedValue({ data: null, error: { message: "Invalid API key" } })
}

function mockSendThrows() {
  mockSend.mockRejectedValue(new Error("Network error"))
}

// ============================================================================
// getResendClient — lazy init (using jest.isolateModules for clean singleton)
// ============================================================================

describe("getResendClient — no API key", () => {
  it("returns failure when RESEND_API_KEY is not set", async () => {
    // Import email in isolated module context so singleton is fresh
    let isolatedSend: typeof sendTestEmail | undefined
    await jest.isolateModulesAsync(async () => {
      const saved = process.env.RESEND_API_KEY
      delete process.env.RESEND_API_KEY
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require("@/lib/email") as { sendTestEmail: typeof sendTestEmail }
        isolatedSend = mod.sendTestEmail
      } finally {
        if (saved) process.env.RESEND_API_KEY = saved
      }
    })
    if (isolatedSend) {
      const result = await isolatedSend("t@t.com", "Bob")
      expect(result.success).toBe(false)
      expect(result.error).toContain("RESEND_API_KEY")
    }
  })
})

// ============================================================================
// All 20 send functions — success path
// ============================================================================

describe("send functions — success path", () => {
  beforeAll(() => {
    process.env = { ...ORIG_ENV, RESEND_API_KEY: "test-key" }
  })

  afterAll(() => {
    process.env = ORIG_ENV
  })

  beforeEach(() => {
    resetMocks()
    mockSendSuccess()
  })

  it("sendPaymentReminder returns success with id", async () => {
    const r = await sendPaymentReminder(PAYMENT_REMINDER_DATA)
    expect(r.success).toBe(true)
    expect(r.id).toBe("msg-abc")
  })

  it("sendOverdueAlert returns success", async () => {
    const r = await sendOverdueAlert(OVERDUE_ALERT_DATA)
    expect(r.success).toBe(true)
    expect(r.id).toBe("msg-abc")
  })

  it("sendPaymentReceipt returns success", async () => {
    const r = await sendPaymentReceipt(PAYMENT_RECEIPT_DATA)
    expect(r.success).toBe(true)
  })

  it("sendInvitationEmail returns success", async () => {
    const r = await sendInvitationEmail(INVITATION_DATA)
    expect(r.success).toBe(true)
  })

  it("sendTestEmail returns success", async () => {
    const r = await sendTestEmail("t@t.com", "Bob")
    expect(r.success).toBe(true)
  })

  it("sendVerificationEmail returns success", async () => {
    const r = await sendVerificationEmail(VERIFICATION_DATA)
    expect(r.success).toBe(true)
  })

  it("sendDailySummary returns success", async () => {
    const r = await sendDailySummary(DAILY_SUMMARY_DATA)
    expect(r.success).toBe(true)
  })

  it("sendLibraryLowHoursWarning returns success", async () => {
    const r = await sendLibraryLowHoursWarning(LIB_LOW_HOURS)
    expect(r.success).toBe(true)
  })

  it("sendLibraryExpiringMembership returns success", async () => {
    const r = await sendLibraryExpiringMembership(LIB_EXPIRING)
    expect(r.success).toBe(true)
  })

  it("sendLibraryExpiredMembership returns success", async () => {
    const r = await sendLibraryExpiredMembership(LIB_EXPIRED)
    expect(r.success).toBe(true)
  })

  it("sendTenantWelcomeEmail returns success", async () => {
    const r = await sendTenantWelcomeEmail(TENANT_WELCOME)
    expect(r.success).toBe(true)
  })

  it("sendLibraryMemberWelcomeEmail returns success", async () => {
    const r = await sendLibraryMemberWelcomeEmail(LIB_MEMBER_WELCOME)
    expect(r.success).toBe(true)
  })

  it("sendLibraryRenewalReminder returns success", async () => {
    const r = await sendLibraryRenewalReminder(LIB_RENEWAL_REMINDER)
    expect(r.success).toBe(true)
  })

  it("sendLibraryPaymentReceiptEmail returns success", async () => {
    const r = await sendLibraryPaymentReceiptEmail(LIB_PAYMENT_RECEIPT)
    expect(r.success).toBe(true)
  })

  it("sendComplaintResolvedEmail returns success", async () => {
    const r = await sendComplaintResolvedEmail(COMPLAINT_RESOLVED)
    expect(r.success).toBe(true)
  })

  it("sendRefundProcessedEmail returns success", async () => {
    const r = await sendRefundProcessedEmail(REFUND_PROCESSED)
    expect(r.success).toBe(true)
  })

  it("sendWaitlistSeatAvailableEmail returns success", async () => {
    const r = await sendWaitlistSeatAvailableEmail(WAITLIST_SEAT_AVAILABLE)
    expect(r.success).toBe(true)
  })

  it("sendCronFailureAlert returns success", async () => {
    const r = await sendCronFailureAlert(CRON_FAILURE)
    expect(r.success).toBe(true)
  })

  it("sendMonthlyAttendanceSummary returns success", async () => {
    const r = await sendMonthlyAttendanceSummary(MONTHLY_ATTENDANCE)
    expect(r.success).toBe(true)
  })
})

// ============================================================================
// Resend error path (error returned from send, not exception)
// ============================================================================

describe("send functions — Resend error path", () => {
  beforeAll(() => {
    process.env = { ...ORIG_ENV, RESEND_API_KEY: "test-key" }
  })

  afterAll(() => {
    process.env = ORIG_ENV
  })

  beforeEach(() => {
    resetMocks()
    mockSendResendError()
  })

  it("sendPaymentReminder returns failure with error message", async () => {
    const r = await sendPaymentReminder(PAYMENT_REMINDER_DATA)
    expect(r.success).toBe(false)
    expect(r.error).toBe("Invalid API key")
  })

  it("sendOverdueAlert returns failure on Resend error", async () => {
    const r = await sendOverdueAlert(OVERDUE_ALERT_DATA)
    expect(r.success).toBe(false)
    expect(r.error).toBeTruthy()
  })

  it("sendTestEmail returns failure on Resend error", async () => {
    mockSend.mockResolvedValue({ error: { message: "Domain not verified" } })
    const r = await sendTestEmail("t@t.com", "Bob")
    expect(r.success).toBe(false)
    expect(r.error).toBe("Domain not verified")
  })

  it("sendCronFailureAlert returns failure on Resend error", async () => {
    const r = await sendCronFailureAlert(CRON_FAILURE)
    expect(r.success).toBe(false)
  })

  it("sendLibraryLowHoursWarning returns failure on Resend error", async () => {
    const r = await sendLibraryLowHoursWarning(LIB_LOW_HOURS)
    expect(r.success).toBe(false)
    expect(r.error).toBe("Invalid API key")
  })
})

// ============================================================================
// Exception catch path (send() throws an exception)
// ============================================================================

describe("send functions — exception catch path", () => {
  beforeAll(() => {
    process.env = { ...ORIG_ENV, RESEND_API_KEY: "test-key" }
  })

  afterAll(() => {
    process.env = ORIG_ENV
  })

  beforeEach(() => {
    resetMocks()
    mockSendThrows()
  })

  it("sendPaymentReminder returns failure with error string", async () => {
    const r = await sendPaymentReminder(PAYMENT_REMINDER_DATA)
    expect(r.success).toBe(false)
    expect(r.error).toContain("Network error")
  })

  it("sendLibraryExpiringMembership catches exception", async () => {
    const r = await sendLibraryExpiringMembership(LIB_EXPIRING)
    expect(r.success).toBe(false)
    expect(r.error).toContain("Network error")
  })

  it("sendTenantWelcomeEmail catches exception", async () => {
    const r = await sendTenantWelcomeEmail(TENANT_WELCOME)
    expect(r.success).toBe(false)
    expect(r.error).toContain("Network error")
  })

  it("sendMonthlyAttendanceSummary catches exception", async () => {
    const r = await sendMonthlyAttendanceSummary(MONTHLY_ATTENDANCE)
    expect(r.success).toBe(false)
    expect(r.error).toContain("Network error")
  })
})
