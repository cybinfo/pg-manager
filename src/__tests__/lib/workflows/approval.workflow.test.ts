/**
 * Tests for src/lib/workflows/approval.workflow.ts
 *
 * Covers: processApproval (fetch failure, already-processed, rejection, name_change
 * approval, phone_change, email_change, address_change), createApproval (validation
 * failures + success), bulkApprove, bulkReject.
 */

// ============================================================================
// Mocks
// ============================================================================

const mockFrom = jest.fn()
const mockRpc = jest.fn().mockResolvedValue({ data: null, error: { message: "RPC not available" } })
const mockSupabase = { from: mockFrom, auth: { getUser: jest.fn() }, rpc: mockRpc }

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => mockSupabase),
}))

jest.mock("@/lib/supabase/transforms", () => ({
  transformJoin: jest.fn((val: unknown) => {
    if (Array.isArray(val)) return val[0] || null
    return val ?? null
  }),
  transformArrayJoins: jest.fn((data: unknown[]) => data),
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

jest.mock("@/lib/workflows/tenant.workflow", () => ({
  transferRoom: jest.fn().mockResolvedValue({ success: true, data: {} }),
}))

jest.mock("@/lib/date-helpers", () => ({
  getNowISO: jest.fn(() => "2026-04-26T00:00:00Z"),
  getTodayISO: jest.fn(() => "2026-04-26"),
}))

jest.mock("@/lib/format", () => ({
  formatCurrency: jest.fn((n: number) => `₹${n}`),
  formatDate: jest.fn((d: unknown) => String(d)),
}))

jest.mock("@/lib/logger", () => ({
  logger: {
    child: jest.fn(() => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() })),
  },
  workflowLogger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
  extractErrorMeta: jest.fn((e: unknown) => ({ error: e })),
}))

// ============================================================================
// Imports
// ============================================================================

import {
  processApproval,
  createApproval,
  bulkApprove,
  bulkReject,
} from "@/lib/workflows/approval.workflow"

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

const mockTenant = {
  id: "t1",
  name: "Alice",
  email: "alice@example.com",
  phone: "9999999999",
  user_id: "u1",
  addresses: [],
  notes: null,
  monthly_rent: 5000,
  room_id: "r1",
}

function makePendingApproval(type: string, payload: Record<string, unknown> = {}) {
  return {
    id: "a1",
    status: "pending",
    type,
    requester_tenant_id: "t1",
    tenant: mockTenant,
    payload,
    title: `Test ${type}`,
    change_applied: false,
    applied: false,
  }
}

// ============================================================================
// processApproval — fetch failures
// ============================================================================

describe("processApproval — fetch failures", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns failure when approval is not found", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "Not found" } }))
    const result = await processApproval(
      { approval_id: "a-invalid", decision: "approved" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(false)
  })

  it("returns failure when approval data is null", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }))
    const result = await processApproval(
      { approval_id: "a1", decision: "approved" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(false)
  })

  it("returns failure when approval is already processed", async () => {
    const approvedApproval = { ...makePendingApproval("name_change"), status: "approved" }
    mockFrom.mockReturnValue(makeChain({ data: approvedApproval, error: null }))
    const result = await processApproval(
      { approval_id: "a1", decision: "approved" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(false)
  })

  it("returns failure when approval is already rejected", async () => {
    const rejectedApproval = { ...makePendingApproval("other"), status: "rejected" }
    mockFrom.mockReturnValue(makeChain({ data: rejectedApproval, error: null }))
    const result = await processApproval(
      { approval_id: "a1", decision: "rejected" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// processApproval — rejection path (simplified — no apply step)
// ============================================================================

describe("processApproval — rejection path", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns success for rejected decision", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "approvals") {
        if (callCounts.approvals === 1) return makeChain({ data: makePendingApproval("name_change"), error: null })
        return makeChain({ data: null, error: null }) // update_approval
      }
      return makeChain({ data: null, error: null })
    })
    const result = await processApproval(
      { approval_id: "a1", decision: "rejected", decision_notes: "Not valid" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
    expect(result.data?.change_applied).toBe(false)
  })

  it("returns failure when update_approval DB call fails on rejection", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "approvals") {
        if (callCounts.approvals === 1) return makeChain({ data: makePendingApproval("other"), error: null })
        return makeChain({ data: null, error: { message: "DB error" } }) // update_approval fails
      }
      return makeChain({ data: null, error: null })
    })
    const result = await processApproval(
      { approval_id: "a1", decision: "rejected" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// processApproval — name_change approval
// ============================================================================

describe("processApproval — name_change approval", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns success and applies name change", async () => {
    const approval = makePendingApproval("name_change", { new_name: "Bob" })
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "approvals") return makeChain({ data: callCounts.approvals === 1 ? approval : null, error: null })
      if (table === "tenants") return makeChain({ data: null, error: null }) // name update
      if (table === "user_profiles") return makeChain({ data: null, error: null }) // profile update
      return makeChain({ data: null, error: null })
    })
    const result = await processApproval(
      { approval_id: "a1", decision: "approved" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
    expect(result.data?.change_applied).toBe(true)
    expect(result.data?.cascading_actions).toContain("tenant_name_updated")
  })

  it("returns failure when tenant name update fails", async () => {
    const approval = makePendingApproval("name_change", { new_name: "Bob" })
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "approvals") return makeChain({ data: callCounts.approvals === 1 ? approval : null, error: null })
      if (table === "tenants") return makeChain({ data: null, error: { message: "update failed" } })
      return makeChain({ data: null, error: null })
    })
    const result = await processApproval(
      { approval_id: "a1", decision: "approved" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(false)
  })

  it("applies name change without user_profile update when tenant has no user_id", async () => {
    const tenantNoUserId = { ...mockTenant, user_id: null }
    const approval = { ...makePendingApproval("name_change", { new_name: "Bob" }), tenant: tenantNoUserId }
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "approvals") return makeChain({ data: callCounts.approvals === 1 ? approval : null, error: null })
      if (table === "tenants") return makeChain({ data: null, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await processApproval(
      { approval_id: "a1", decision: "approved" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
    expect(mockFrom).not.toHaveBeenCalledWith("user_profiles")
  })
})

// ============================================================================
// processApproval — phone_change approval
// ============================================================================

describe("processApproval — phone_change approval", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns success and applies phone change", async () => {
    const approval = makePendingApproval("phone_change", { new_phone: "8888888888" })
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "approvals") return makeChain({ data: callCounts.approvals === 1 ? approval : null, error: null })
      if (table === "tenants") return makeChain({ data: null, error: null })
      if (table === "user_profiles") return makeChain({ data: null, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await processApproval(
      { approval_id: "a1", decision: "approved" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
    expect(result.data?.cascading_actions).toContain("tenant_phone_updated")
  })

  it("returns failure when phone update fails", async () => {
    const approval = makePendingApproval("phone_change", { new_phone: "8888888888" })
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "approvals") return makeChain({ data: callCounts.approvals === 1 ? approval : null, error: null })
      if (table === "tenants") return makeChain({ data: null, error: { message: "failed" } })
      return makeChain({ data: null, error: null })
    })
    const result = await processApproval(
      { approval_id: "a1", decision: "approved" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// processApproval — email_change approval
// ============================================================================

describe("processApproval — email_change approval", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns success and applies email change", async () => {
    const approval = makePendingApproval("email_change", { new_email: "new@email.com" })
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "approvals") return makeChain({ data: callCounts.approvals === 1 ? approval : null, error: null })
      if (table === "tenants") return makeChain({ data: null, error: null })
      if (table === "user_profiles") return makeChain({ data: null, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await processApproval(
      { approval_id: "a1", decision: "approved" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
    expect(result.data?.cascading_actions).toContain("tenant_email_updated")
  })

  it("returns failure when email update fails", async () => {
    const approval = makePendingApproval("email_change", { new_email: "new@email.com" })
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "approvals") return makeChain({ data: callCounts.approvals === 1 ? approval : null, error: null })
      if (table === "tenants") return makeChain({ data: null, error: { message: "failed" } })
      return makeChain({ data: null, error: null })
    })
    const result = await processApproval(
      { approval_id: "a1", decision: "approved" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// processApproval — address_change approval
// ============================================================================

describe("processApproval — address_change approval", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("applies address change (string address, simple update)", async () => {
    const approval = makePendingApproval("address_change", { new_address: "123 New Street" })
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "approvals") return makeChain({ data: callCounts.approvals === 1 ? approval : null, error: null })
      if (table === "tenants") return makeChain({ data: { addresses: [] }, error: null }) // select + update
      return makeChain({ data: null, error: null })
    })
    const result = await processApproval(
      { approval_id: "a1", decision: "approved" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
  })

  it("applies address change (object address, JSONB array update)", async () => {
    const newAddress = { street: "456 New Ave", city: "Delhi", pincode: "110001" }
    const approval = makePendingApproval("address_change", { new_address: newAddress })
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "approvals") return makeChain({ data: callCounts.approvals === 1 ? approval : null, error: null })
      if (table === "tenants") return makeChain({ data: { addresses: [{ street: "Old", is_primary: true }] }, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await processApproval(
      { approval_id: "a1", decision: "approved" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
  })

  it("returns failure when JSONB address update fails", async () => {
    const newAddress = { street: "456 New Ave" }
    const approval = makePendingApproval("address_change", { new_address: newAddress })
    let tenantsCallCount = 0
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "approvals") return makeChain({ data: callCounts.approvals === 1 ? approval : null, error: null })
      if (table === "tenants") {
        tenantsCallCount++
        if (tenantsCallCount === 1) return makeChain({ data: { addresses: [] }, error: null }) // select
        return makeChain({ data: null, error: { message: "update failed" } }) // update fails
      }
      return makeChain({ data: null, error: null })
    })
    const result = await processApproval(
      { approval_id: "a1", decision: "approved" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// processApproval — other types (complaint, other, bill_dispute, etc.)
// ============================================================================

describe("processApproval — other approval types", () => {
  beforeEach(() => { jest.clearAllMocks() })

  async function testSimpleApprovalType(type: string, payload = {}) {
    const approval = makePendingApproval(type, payload)
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "approvals") return makeChain({ data: callCounts.approvals === 1 ? approval : null, error: null })
      // All other tables (tenants, complaints, bills, etc.) return success
      return makeChain({ data: null, error: null })
    })
    return processApproval(
      { approval_id: "a1", decision: "approved" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
  }

  it("succeeds for complaint type", async () => {
    const result = await testSimpleApprovalType("complaint", { resolution_notes: "Fixed" })
    expect(result.success).toBe(true)
  })

  it("succeeds for bill_dispute type", async () => {
    const approval = makePendingApproval("bill_dispute", { bill_id: "b1" })
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "approvals") return makeChain({ data: callCounts.approvals === 1 ? approval : null, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await processApproval(
      { approval_id: "a1", decision: "approved", adjustment_amount: 500 },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
  })

  it("succeeds for payment_dispute type", async () => {
    const result = await testSimpleApprovalType("payment_dispute", { payment_id: "p1" })
    expect(result.success).toBe(true)
  })

  it("succeeds for tenancy_issue type", async () => {
    const result = await testSimpleApprovalType("tenancy_issue")
    expect(result.success).toBe(true)
  })

  it("succeeds for room_issue type", async () => {
    const result = await testSimpleApprovalType("room_issue")
    expect(result.success).toBe(true)
  })

  it("succeeds for other type", async () => {
    const result = await testSimpleApprovalType("other")
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// processApproval — room_change (concurrent check + transferRoom)
// ============================================================================

describe("processApproval — room_change", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns failure when concurrent room_change approval detected", async () => {
    const approval = makePendingApproval("room_change", { new_room_id: "r2" })
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "approvals") {
        if (callCounts.approvals === 1) return makeChain({ data: approval, error: null }) // fetch
        return makeChain({ data: [{ id: "a2", type: "room_change", status: "approved" }], error: null }) // concurrent
      }
      return makeChain({ data: null, error: null })
    })
    const result = await processApproval(
      { approval_id: "a1", decision: "approved" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(false)
  })

  it("succeeds when no concurrent approvals", async () => {
    const { transferRoom } = jest.requireMock("@/lib/workflows/tenant.workflow") as { transferRoom: jest.Mock }
    transferRoom.mockResolvedValueOnce({ success: true, data: { rent_adjusted: false } })
    // requested_room_id is what the room_change handler validates
    const approval = makePendingApproval("room_change", { requested_room_id: "r2", reason: "Upgrade" })
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "approvals") {
        if (callCounts.approvals === 1) return makeChain({ data: approval, error: null }) // fetch
        if (callCounts.approvals === 2) return makeChain({ data: [], error: null }) // concurrent check — empty
        return makeChain({ data: null, error: null }) // update_approval + mark_applied
      }
      if (table === "rooms") return makeChain({ data: { id: "r2", total_beds: 2, occupied_beds: 1 }, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await processApproval(
      { approval_id: "a1", decision: "approved" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// processApproval — room_change validate path coverage
// ============================================================================

describe("processApproval — room_change validate paths", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("fails when room_change payload has no requested_room_id", async () => {
    // payload has no requested_room_id → validate rejects
    const approval = makePendingApproval("room_change", {}) // empty payload
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "approvals") {
        if (callCounts.approvals === 1) return makeChain({ data: approval, error: null })
        return makeChain({ data: [], error: null }) // concurrent check
      }
      return makeChain({ data: null, error: null })
    })
    const result = await processApproval(
      { approval_id: "a1", decision: "approved" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(false)
  })

  it("fails when requested room is not found", async () => {
    const approval = makePendingApproval("room_change", { requested_room_id: "r-invalid" })
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "approvals") {
        if (callCounts.approvals === 1) return makeChain({ data: approval, error: null })
        return makeChain({ data: [], error: null }) // concurrent check empty
      }
      if (table === "rooms") return makeChain({ data: null, error: { message: "not found" } })
      return makeChain({ data: null, error: null })
    })
    const result = await processApproval(
      { approval_id: "a1", decision: "approved" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(false)
  })

  it("fails when requested room is at capacity", async () => {
    const approval = makePendingApproval("room_change", { requested_room_id: "r2" })
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "approvals") {
        if (callCounts.approvals === 1) return makeChain({ data: approval, error: null })
        return makeChain({ data: [], error: null }) // concurrent check empty
      }
      if (table === "rooms") return makeChain({ data: { id: "r2", total_beds: 2, occupied_beds: 2 }, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await processApproval(
      { approval_id: "a1", decision: "approved" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(false)
  })

  it("fails when transferRoom workflow fails during apply", async () => {
    const { transferRoom } = jest.requireMock("@/lib/workflows/tenant.workflow") as { transferRoom: jest.Mock }
    transferRoom.mockResolvedValueOnce({ success: false, errors: [{ message: "Room locked" }] })
    const approval = makePendingApproval("room_change", { requested_room_id: "r2" })
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "approvals") {
        if (callCounts.approvals === 1) return makeChain({ data: approval, error: null })
        return makeChain({ data: [], error: null }) // concurrent check
      }
      if (table === "rooms") return makeChain({ data: { id: "r2", total_beds: 2, occupied_beds: 0 }, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await processApproval(
      { approval_id: "a1", decision: "approved" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// processApproval — complaint with complaint_id
// ============================================================================

describe("processApproval — complaint with complaint_id", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("resolves complaint when complaint_id present in payload", async () => {
    const approval = makePendingApproval("complaint", { complaint_id: "c1", resolution_notes: "Fixed" })
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "approvals") return makeChain({ data: callCounts.approvals === 1 ? approval : null, error: null })
      if (table === "complaints") return makeChain({ data: null, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await processApproval(
      { approval_id: "a1", decision: "approved", decision_notes: "Resolved" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
    expect(mockFrom).toHaveBeenCalledWith("complaints")
  })
})

// ============================================================================
// processApproval — bill_dispute with bill_id
// ============================================================================

describe("processApproval — bill_dispute with bill_id", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("adjusts bill when adjustment_amount provided", async () => {
    const approval = makePendingApproval("bill_dispute", { bill_id: "b1" })
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "approvals") return makeChain({ data: callCounts.approvals === 1 ? approval : null, error: null })
      if (table === "bills") return makeChain({ data: { id: "b1", total_amount: 5000 }, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await processApproval(
      { approval_id: "a1", decision: "approved", adjustment_amount: 500 },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
    expect(mockFrom).toHaveBeenCalledWith("bills")
  })

  it("returns manual_review when no bill_id in payload", async () => {
    // When payload has no bill_id, handler returns bill_dispute_acknowledged_manual_review
    const approval = makePendingApproval("bill_dispute", {}) // no bill_id
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "approvals") return makeChain({ data: callCounts.approvals === 1 ? approval : null, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await processApproval(
      { approval_id: "a1", decision: "approved" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
    expect(result.data?.cascading_actions).toContain("bill_dispute_acknowledged_manual_review")
  })
})

// ============================================================================
// processApproval — payment_dispute with payment_id
// ============================================================================

describe("processApproval — payment_dispute with payment_id", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("acknowledges payment dispute when payment_id in payload", async () => {
    const approval = makePendingApproval("payment_dispute", { payment_id: "p1" })
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "approvals") return makeChain({ data: callCounts.approvals === 1 ? approval : null, error: null })
      if (table === "payments") return makeChain({ data: { id: "p1", amount: 5000 }, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await processApproval(
      { approval_id: "a1", decision: "approved" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// createApproval — validation + success
// ============================================================================

describe("createApproval — validation failures", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns failure when tenant is not found", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "not found" } }))
    const result = await createApproval(
      {
        tenant_id: "t-invalid",
        workspace_id: WORKSPACE_ID,
        owner_id: ACTOR_ID,
        type: "name_change",
        title: "Change my name",
        payload: { new_name: "Bob" },
      },
      "t1", "tenant", WORKSPACE_ID
    )
    expect(result.success).toBe(false)
  })

  it("returns failure for checked-out tenant", async () => {
    mockFrom.mockReturnValue(makeChain({ data: { id: "t1", name: "Alice", status: "checked_out" }, error: null }))
    const result = await createApproval(
      {
        tenant_id: "t1",
        workspace_id: WORKSPACE_ID,
        owner_id: ACTOR_ID,
        type: "other",
        title: "Test",
        payload: {},
      },
      "t1", "tenant", WORKSPACE_ID
    )
    expect(result.success).toBe(false)
  })
})

describe("createApproval — success", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns approval_id on success", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "tenants") return makeChain({ data: { id: "t1", name: "Alice", status: "active" }, error: null })
      if (table === "approvals") return makeChain({ data: { id: "a1", status: "pending" }, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await createApproval(
      {
        tenant_id: "t1",
        workspace_id: WORKSPACE_ID,
        owner_id: ACTOR_ID,
        type: "name_change",
        title: "Change my name",
        payload: { new_name: "Bob" },
        priority: "normal",
      },
      "t1", "tenant", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
    expect(result.data?.approval_id).toBe("a1")
    expect(result.data?.status).toBe("pending")
  })

  it("returns failure when approval insert fails", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "tenants") return makeChain({ data: { id: "t1", name: "Alice", status: "active" }, error: null })
      if (table === "approvals") return makeChain({ data: null, error: { message: "insert failed" } })
      return makeChain({ data: null, error: null })
    })
    const result = await createApproval(
      {
        tenant_id: "t1",
        workspace_id: WORKSPACE_ID,
        owner_id: ACTOR_ID,
        type: "complaint",
        title: "Test complaint",
        payload: {},
      },
      "t1", "tenant", WORKSPACE_ID
    )
    expect(result.success).toBe(false)
  })

  it("accepts urgent priority", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "tenants") return makeChain({ data: { id: "t1", name: "Alice", status: "active" }, error: null })
      if (table === "approvals") return makeChain({ data: { id: "a2", status: "pending" }, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await createApproval(
      {
        tenant_id: "t1",
        workspace_id: WORKSPACE_ID,
        owner_id: ACTOR_ID,
        type: "tenancy_issue",
        title: "Urgent issue",
        payload: {},
        priority: "urgent",
        document_ids: ["doc1"],
      },
      "t1", "tenant", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// bulkApprove + bulkReject
// ============================================================================

describe("bulkApprove", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns empty result for empty approval IDs", async () => {
    const result = await bulkApprove([], "Approved", ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(0)
    expect(result.failed).toBe(0)
    expect(result.results).toHaveLength(0)
  })

  it("counts successes and failures", async () => {
    let approvalsFetchCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === "approvals") {
        approvalsFetchCount++
        // a1 fetch: success; a2 fetch: success; updates: success
        if (approvalsFetchCount === 1) {
          return makeChain({ data: makePendingApproval("other"), error: null })
        }
        if (approvalsFetchCount === 2) {
          return makeChain({ data: null, error: { message: "not found" } }) // a2 fails at fetch
        }
        return makeChain({ data: null, error: null })
      }
      return makeChain({ data: null, error: null })
    })
    const result = await bulkApprove(["a1", "a2"], "Batch approve", ACTOR_ID, "owner", WORKSPACE_ID)
    // a1 may succeed (goes through full rejection skip since decision is "approved" and update_approval runs)
    // Actually a1 has type "other" which has a simple apply handler
    expect(result.results).toHaveLength(2)
    // At least a2 fails
    expect(result.failed).toBeGreaterThan(0)
  })
})

describe("bulkReject", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns empty result for empty approval IDs", async () => {
    const result = await bulkReject([], "Rejected", ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(0)
    expect(result.failed).toBe(0)
  })

  it("rejects all approvals successfully", async () => {
    let fetchCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === "approvals") {
        fetchCount++
        // Alternate: fetch, update, fetch, update
        if (fetchCount % 2 === 1) return makeChain({ data: makePendingApproval("name_change"), error: null })
        return makeChain({ data: null, error: null })
      }
      return makeChain({ data: null, error: null })
    })
    const result = await bulkReject(["a1", "a2"], "Batch reject", ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.results).toHaveLength(2)
    expect(result.success).toBe(2)
    expect(result.failed).toBe(0)
  })
})
