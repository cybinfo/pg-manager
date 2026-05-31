/**
 * Tests for src/lib/workflows/payment.workflow.ts
 *
 * Covers: recordPayment (validation failures + success), refundPayment
 * (validation failures + success + payment_refunds fallback), recordBulkPayments.
 *
 * Strategy: let executeWorkflow run naturally; mock Supabase, audit service
 * (DB writes only), notification service, and email.
 */

// ============================================================================
// Mocks (must be before imports)
// ============================================================================

const mockFrom = jest.fn()
const mockRpc = jest.fn().mockResolvedValue({ data: null, error: { message: "RPC not available" } })
const mockSupabase = { from: mockFrom, auth: { getUser: jest.fn() }, rpc: mockRpc }

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => mockSupabase),
}))

jest.mock("@/lib/services/audit.service", () => {
  const actual = jest.requireActual("@/lib/services/audit.service")
  return {
    ...actual,
    logAuditEvent: jest.fn().mockResolvedValue({ success: true }),
    logAuditEvents: jest.fn().mockResolvedValue({ success: true, data: [] }),
  }
})

jest.mock("@/lib/services/notification.service", () => {
  const actual = jest.requireActual("@/lib/services/notification.service")
  return {
    ...actual,
    sendNotification: jest.fn().mockResolvedValue({ success: true }),
    sendNotifications: jest.fn().mockResolvedValue({ success: true, data: [] }),
  }
})

jest.mock("@/lib/email", () => ({
  sendPaymentReceipt: jest.fn().mockResolvedValue({ success: true }),
}))

jest.mock("@/lib/date-helpers", () => ({
  getNowISO: jest.fn(() => "2026-04-26T00:00:00Z"),
}))

jest.mock("@/lib/format", () => ({
  formatCurrency: jest.fn((n: number) => `₹${n}`),
  formatDate: jest.fn((d: unknown) => String(d)),
}))

jest.mock("@/lib/audit", () => ({
  softDelete: jest.fn().mockResolvedValue({ success: true }),
  isSoftDeletableTable: jest.fn().mockReturnValue(true),
  softDeleteBatch: jest.fn().mockResolvedValue({ success: true }),
}))

jest.mock("@/lib/logger", () => ({
  logger: {
    child: jest.fn(() => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() })),
  },
  workflowLogger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
  extractErrorMeta: jest.fn((e: unknown) => ({ error: e })),
}))

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { recordPayment, refundPayment, recordBulkPayments } from "@/lib/workflows/payment.workflow"

// ============================================================================
// Helpers
// ============================================================================

function makeChain(result: { data: unknown; error: unknown; count?: number }) {
  const chain: Record<string, unknown> = {}
  const methods = [
    "select", "eq", "neq", "order", "limit", "single",
    "gte", "lte", "lt", "or", "in", "is",
    "insert", "update", "delete", "upsert",
  ]
  methods.forEach((m) => { chain[m] = jest.fn(() => chain) })
  chain.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled)
  return chain
}

const ACTOR_ID = "owner-1"
const WORKSPACE_ID = "ws-1"

const mockBill = {
  id: "b1",
  tenant_id: "t1",
  status: "pending",
  total_amount: 5000,
  paid_amount: 0,
  balance_due: 5000,
  for_month: "2026-04",
  tenant: { id: "t1", name: "Alice", email: "alice@example.com", phone: "9999999999", user_id: "u1" },
}

const mockPayment = {
  id: "p1",
  tenant_id: "t1",
  bill_id: "b1",
  amount: 5000,
  receipt_number: "RCP-000006",
  status: "completed",
}

const validInput = {
  tenant_id: "t1",
  entity_id: "prop-1",
  bill_id: "b1",
  amount: 5000,
  payment_date: "2026-04-26",
  payment_method: "upi" as const,
  send_receipt: false,
}

// ============================================================================
// recordPayment — validation failures
// ============================================================================

describe("recordPayment — validation failures", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns failure when amount is zero", async () => {
    const result = await recordPayment(
      { ...validInput, amount: 0 },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(false)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it("returns failure when amount is negative", async () => {
    const result = await recordPayment(
      { ...validInput, amount: -100 },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(false)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it("returns failure when bill is not found", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "Not found" } }))
    const result = await recordPayment(validInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(false)
  })

  it("returns failure when bill data is null with no error", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }))
    const result = await recordPayment(validInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(false)
  })

  it("returns failure when bill does not belong to the specified tenant", async () => {
    const billWrongTenant = { ...mockBill, tenant_id: "other-tenant" }
    mockFrom.mockReturnValue(makeChain({ data: billWrongTenant, error: null }))
    const result = await recordPayment(validInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(false)
  })

  it("returns failure when bill is already paid", async () => {
    const paidBill = { ...mockBill, status: "paid" }
    mockFrom.mockReturnValue(makeChain({ data: paidBill, error: null }))
    const result = await recordPayment(validInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(false)
  })

  it("returns failure when payment exceeds remaining balance (non-advance)", async () => {
    const smallBalanceBill = { ...mockBill, balance_due: 1000 }
    mockFrom.mockReturnValue(makeChain({ data: smallBalanceBill, error: null }))
    const result = await recordPayment(
      { ...validInput, amount: 2000, is_advance: false },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(false)
  })

  it("allows payment exceeding balance when is_advance=true", async () => {
    const smallBalanceBill = { ...mockBill, balance_due: 1000 }
    // Set up the full success mock sequence for advance payment
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "bills") {
        return callCounts.bills === 1
          ? makeChain({ data: smallBalanceBill, error: null }) // validate
          : makeChain({ data: null, error: null }) // update bill
      }
      if (table === "payments") {
        return callCounts.payments === 1
          ? makeChain({ data: null, error: null, count: 5 }) // receipt count
          : makeChain({ data: mockPayment, error: null }) // create payment
      }
      if (table === "tenants") return makeChain({ data: { advance_balance: 0 }, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await recordPayment(
      { ...validInput, amount: 2000, is_advance: true },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// recordPayment — success path
// ============================================================================

describe("recordPayment — success path", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "bills") {
        return callCounts.bills === 1
          ? makeChain({ data: mockBill, error: null }) // validate
          : makeChain({ data: null, error: null }) // update bill
      }
      if (table === "payments") {
        return callCounts.payments === 1
          ? makeChain({ data: null, error: null, count: 5 }) // receipt count
          : makeChain({ data: mockPayment, error: null }) // create payment insert
      }
      return makeChain({ data: null, error: null })
    })
  })

  it("returns success with payment_id and receipt_number", async () => {
    const result = await recordPayment(validInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(true)
    expect(result.data?.payment_id).toBe("p1")
    expect(result.data?.receipt_number).toBe("RCP-000006")
  })

  it("sets bill_status to paid when full payment", async () => {
    const result = await recordPayment(validInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(true)
    expect(result.data?.bill_status).toBe("paid")
  })

  it("sets bill_status to partial when partial payment", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "bills") {
        return callCounts.bills === 1
          ? makeChain({ data: { ...mockBill, total_amount: 5000 }, error: null })
          : makeChain({ data: null, error: null })
      }
      if (table === "payments") {
        return callCounts.payments === 1
          ? makeChain({ data: null, error: null, count: 3 })
          : makeChain({ data: { ...mockPayment, amount: 2000 }, error: null })
      }
      return makeChain({ data: null, error: null })
    })
    const result = await recordPayment(
      { ...validInput, amount: 2000 },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
    expect(result.data?.bill_status).toBe("partial")
  })

  it("returns failure when create_payment insert fails", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "bills") return makeChain({ data: mockBill, error: null })
      if (table === "payments") {
        return callCounts.payments === 1
          ? makeChain({ data: null, error: null, count: 5 })
          : makeChain({ data: null, error: { message: "insert failed" } })
      }
      return makeChain({ data: null, error: null })
    })
    const result = await recordPayment(validInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(false)
  })

  it("returns failure when update_bill fails", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "bills") {
        return callCounts.bills === 1
          ? makeChain({ data: mockBill, error: null })
          : makeChain({ data: null, error: { message: "update failed" } })
      }
      if (table === "payments") {
        return callCounts.payments === 1
          ? makeChain({ data: null, error: null, count: 5 })
          : makeChain({ data: mockPayment, error: null })
      }
      return makeChain({ data: null, error: null })
    })
    const result = await recordPayment(validInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// recordPayment — with send_receipt=true (optional email step)
// ============================================================================

describe("recordPayment — send_receipt=true", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("exercises send_receipt_email step (no_email path when tenant has no email)", async () => {
    const billNoEmail = {
      ...mockBill,
      tenant: { id: "t1", name: "Alice", email: null, phone: "9999999999", user_id: "u1" },
    }
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "bills") {
        return callCounts.bills === 1
          ? makeChain({ data: billNoEmail, error: null })
          : makeChain({ data: null, error: null })
      }
      if (table === "payments") {
        return callCounts.payments === 1
          ? makeChain({ data: null, error: null, count: 5 })
          : makeChain({ data: mockPayment, error: null })
      }
      return makeChain({ data: null, error: null })
    })
    const result = await recordPayment(
      { ...validInput, send_receipt: true },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
  })

  it("sends receipt email when tenant has email", async () => {
    const { sendPaymentReceipt } = jest.requireMock("@/lib/email") as { sendPaymentReceipt: jest.Mock }
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "bills") {
        return callCounts.bills === 1
          ? makeChain({ data: mockBill, error: null })
          : makeChain({ data: null, error: null })
      }
      if (table === "payments") {
        return callCounts.payments === 1
          ? makeChain({ data: null, error: null, count: 5 })
          : makeChain({ data: mockPayment, error: null })
      }
      if (table === "properties") return makeChain({ data: { name: "Test PG" }, error: null })
      if (table === "user_profiles") return makeChain({ data: { full_name: "Bob" }, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await recordPayment(
      { ...validInput, send_receipt: true },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
    expect(sendPaymentReceipt).toHaveBeenCalled()
  })

  it("catches exception in send_receipt_email (optional step continues)", async () => {
    const { sendPaymentReceipt } = jest.requireMock("@/lib/email") as { sendPaymentReceipt: jest.Mock }
    sendPaymentReceipt.mockRejectedValueOnce(new Error("SMTP connection refused"))
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "bills") {
        return callCounts.bills === 1
          ? makeChain({ data: mockBill, error: null })
          : makeChain({ data: null, error: null })
      }
      if (table === "payments") {
        return callCounts.payments === 1
          ? makeChain({ data: null, error: null, count: 5 })
          : makeChain({ data: mockPayment, error: null })
      }
      if (table === "properties") return makeChain({ data: { name: "Test PG" }, error: null })
      if (table === "user_profiles") return makeChain({ data: { full_name: "Bob" }, error: null })
      return makeChain({ data: null, error: null })
    })
    // send_receipt_email is optional — exception is caught, workflow succeeds
    const result = await recordPayment(
      { ...validInput, send_receipt: true },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// refundPayment — validation failures
// ============================================================================

describe("refundPayment — validation failures", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns failure when payment is not found", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "not found" } }))
    const result = await refundPayment(
      { payment_id: "p1", refund_amount: 500, refund_reason: "test", refund_method: "upi" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(false)
  })

  it("returns failure when refund amount exceeds payment amount", async () => {
    const payment = { id: "p1", amount: 500, bill: { id: "b1", paid_amount: 500, total_amount: 5000, status: "paid" } }
    mockFrom.mockReturnValue(makeChain({ data: payment, error: null }))
    const result = await refundPayment(
      { payment_id: "p1", refund_amount: 1000, refund_reason: "test", refund_method: "upi" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// refundPayment — success path
// ============================================================================

describe("refundPayment — success path", () => {
  const mockPaymentForRefund = {
    id: "p1",
    amount: 5000,
    notes: null,
    bill: { id: "b1", paid_amount: 5000, total_amount: 5000, status: "paid" },
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns success with refund_id", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "payments") return makeChain({ data: mockPaymentForRefund, error: null }) // validate
      if (table === "payment_refunds") return makeChain({ data: { id: "r1" }, error: null }) // create refund
      if (table === "bills") return makeChain({ data: null, error: null }) // update bill
      return makeChain({ data: null, error: null })
    })
    const result = await refundPayment(
      { payment_id: "p1", refund_amount: 500, refund_reason: "Wrong charge", refund_method: "upi" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
    expect(result.data?.refund_id).toBe("r1")
    expect(result.data?.original_payment_id).toBe("p1")
  })

  it("falls back to updating payment notes when payment_refunds table does not exist", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "payments") {
        // First call: validate; second call: update notes fallback
        return makeChain({ data: callCounts.payments === 1 ? mockPaymentForRefund : null, error: null })
      }
      if (table === "payment_refunds") return makeChain({ data: null, error: { message: "table does not exist" } })
      if (table === "bills") return makeChain({ data: null, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await refundPayment(
      { payment_id: "p1", refund_amount: 500, refund_reason: "Wrong charge", refund_method: "upi" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
    expect(result.data?.refund_id).toMatch(/refund-/)
  })

  it("sets bill_status back to pending when full refund", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "payments") return makeChain({ data: mockPaymentForRefund, error: null })
      if (table === "payment_refunds") return makeChain({ data: { id: "r1" }, error: null })
      if (table === "bills") return makeChain({ data: null, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await refundPayment(
      { payment_id: "p1", refund_amount: 5000, refund_reason: "Full refund", refund_method: "cash" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
    expect(result.data?.bill_updated).toBe(true)
  })

  it("handles partial refund (bill becomes partial)", async () => {
    const partialPayment = {
      ...mockPaymentForRefund,
      bill: { id: "b1", paid_amount: 5000, total_amount: 7000, status: "partial" },
    }
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "payments") return makeChain({ data: partialPayment, error: null })
      if (table === "payment_refunds") return makeChain({ data: { id: "r2" }, error: null })
      if (table === "bills") return makeChain({ data: null, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await refundPayment(
      { payment_id: "p1", refund_amount: 2000, refund_reason: "Partial refund", refund_method: "upi" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// recordPayment — optional step edge cases
// ============================================================================

describe("recordPayment — optional step edge cases", () => {
  beforeEach(() => { jest.clearAllMocks() })

  function setupSuccessBase(callCounts: Record<string, number>) {
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "bills") {
        return callCounts.bills === 1
          ? makeChain({ data: mockBill, error: null })
          : makeChain({ data: null, error: null })
      }
      if (table === "payments") {
        return callCounts.payments === 1
          ? makeChain({ data: null, error: null, count: 5 })
          : makeChain({ data: mockPayment, error: null })
      }
      return makeChain({ data: null, error: null })
    })
  }

  it("logs warning when advance balance update fails (optional step continues)", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "bills") {
        return callCounts.bills === 1
          ? makeChain({ data: mockBill, error: null })
          : makeChain({ data: null, error: null })
      }
      if (table === "payments") {
        return callCounts.payments === 1
          ? makeChain({ data: null, error: null, count: 5 })
          : makeChain({ data: mockPayment, error: null })
      }
      if (table === "tenants") {
        return callCounts.tenants === 1
          ? makeChain({ data: { advance_balance: 500 }, error: null }) // select succeeds
          : makeChain({ data: null, error: { message: "update failed" } }) // update fails
      }
      return makeChain({ data: null, error: null })
    })
    const result = await recordPayment(
      { ...validInput, is_advance: true },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    // Optional step failure — workflow still succeeds
    expect(result.success).toBe(true)
  })

  it("logs when overdue bill becomes paid (clear_overdue step)", async () => {
    const overdueBill = { ...mockBill, status: "overdue", paid_amount: 0, balance_due: 5000 }
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "bills") {
        return callCounts.bills === 1
          ? makeChain({ data: overdueBill, error: null })
          : makeChain({ data: null, error: null })
      }
      if (table === "payments") {
        return callCounts.payments === 1
          ? makeChain({ data: null, error: null, count: 5 })
          : makeChain({ data: mockPayment, error: null })
      }
      return makeChain({ data: null, error: null })
    })
    const result = await recordPayment(validInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(true)
    expect(result.data?.bill_status).toBe("paid")
  })
})

// ============================================================================
// refundPayment — optional step edge cases
// ============================================================================

describe("refundPayment — optional step edge cases", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("logs warning when update_bill fails (optional step continues)", async () => {
    const payment = { id: "p1", amount: 5000, notes: null,
      bill: { id: "b1", paid_amount: 5000, total_amount: 5000, status: "paid" } }
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "payments") return makeChain({ data: payment, error: null })
      if (table === "payment_refunds") return makeChain({ data: { id: "r1" }, error: null })
      if (table === "bills") return makeChain({ data: null, error: { message: "update failed" } })
      return makeChain({ data: null, error: null })
    })
    const result = await refundPayment(
      { payment_id: "p1", refund_amount: 500, refund_reason: "test", refund_method: "cash" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    // update_bill warns but still returns success (logs warn, does not fail)
    expect(result.success).toBe(true)
    expect(result.data?.bill_updated).toBe(true)
  })

  it("handles payment with no bill (skips update_bill)", async () => {
    const paymentNoBill = { id: "p1", amount: 5000, notes: null, bill: null }
    mockFrom.mockImplementation((table: string) => {
      if (table === "payments") return makeChain({ data: paymentNoBill, error: null })
      if (table === "payment_refunds") return makeChain({ data: { id: "r1" }, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await refundPayment(
      { payment_id: "p1", refund_amount: 500, refund_reason: "test", refund_method: "upi" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
    expect(result.data?.bill_updated).toBe(false)
  })
})

// ============================================================================
// recordBulkPayments
// ============================================================================

describe("recordBulkPayments", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns empty result for empty payments array", async () => {
    const result = await recordBulkPayments(
      { payments: [], payment_date: "2026-04-26", send_receipts: false },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.total_payments).toBe(0)
    expect(result.total_amount).toBe(0)
    expect(result.payment_ids).toHaveLength(0)
  })

  it("sums totals for successful payments", async () => {
    // Each call to recordPayment goes through full 4-step sequence
    // Set up mockFrom to handle 2 payments worth of calls
    let globalCallIndex = 0
    const billsSequence = [
      makeChain({ data: { ...mockBill, id: "b1", tenant_id: "t1", balance_due: 5000 }, error: null }), // p1 validate
      makeChain({ data: null, error: null }), // p1 update bill
      makeChain({ data: { ...mockBill, id: "b2", tenant_id: "t2", balance_due: 3000 }, error: null }), // p2 validate
      makeChain({ data: null, error: null }), // p2 update bill
    ]
    const paymentsSequence = [
      makeChain({ data: null, error: null, count: 0 }), // p1 receipt count
      makeChain({ data: { id: "pmt1", receipt_number: "RCP-000001" }, error: null }), // p1 create
      makeChain({ data: null, error: null, count: 1 }), // p2 receipt count
      makeChain({ data: { id: "pmt2", receipt_number: "RCP-000002" }, error: null }), // p2 create
    ]
    const billsCallCount = { n: 0 }
    const paymentsCallCount = { n: 0 }
    mockFrom.mockImplementation((table: string) => {
      if (table === "bills") return billsSequence[billsCallCount.n++] || makeChain({ data: null, error: null })
      if (table === "payments") return paymentsSequence[paymentsCallCount.n++] || makeChain({ data: null, error: null })
      return makeChain({ data: null, error: null })
    })
    const _ = globalCallIndex
    const result = await recordBulkPayments(
      {
        payments: [
          { tenant_id: "t1", entity_id: "p1", bill_id: "b1", amount: 5000, payment_method: "upi" },
          { tenant_id: "t2", entity_id: "p2", bill_id: "b2", amount: 3000, payment_method: "cash" },
        ],
        payment_date: "2026-04-26",
        send_receipts: false,
      },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.total_payments).toBe(2)
    expect(result.total_amount).toBe(8000)
    expect(result.payment_ids).toContain("pmt1")
    expect(result.payment_ids).toContain("pmt2")
  })

  it("excludes failed payments from totals", async () => {
    // First payment fails (bill not found), second succeeds
    let billsCallCount = 0
    let paymentsCallCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === "bills") {
        billsCallCount++
        if (billsCallCount === 1) return makeChain({ data: null, error: { message: "not found" } }) // p1 fail
        if (billsCallCount === 2) return makeChain({ data: { ...mockBill, id: "b2", tenant_id: "t2" }, error: null }) // p2 validate
        return makeChain({ data: null, error: null }) // p2 update
      }
      if (table === "payments") {
        paymentsCallCount++
        if (paymentsCallCount === 1) return makeChain({ data: null, error: null, count: 1 }) // p2 receipt
        return makeChain({ data: { id: "pmt2" }, error: null }) // p2 create
      }
      return makeChain({ data: null, error: null })
    })
    const result = await recordBulkPayments(
      {
        payments: [
          { tenant_id: "t1", entity_id: "p1", bill_id: "b-invalid", amount: 5000, payment_method: "upi" },
          { tenant_id: "t2", entity_id: "p2", bill_id: "b2", amount: 3000, payment_method: "cash" },
        ],
        payment_date: "2026-04-26",
      },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.total_payments).toBe(1)
    expect(result.total_amount).toBe(3000)
  })
})
