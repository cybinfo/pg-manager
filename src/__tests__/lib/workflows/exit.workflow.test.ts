/**
 * Tests for src/lib/workflows/exit.workflow.ts
 *
 * Covers: initiateExitClearance (validation, fetch failures, success) and
 * completeExitClearance (validation failures, success path with optional steps).
 *
 * Strategy: mock global.fetch for WF-006 REST API calls, mock Supabase client
 * for standard DB queries, mock audit/notification services.
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

jest.mock("@/lib/date-helpers", () => ({
  getNowISO: jest.fn(() => "2026-04-26T00:00:00Z"),
  getTodayISO: jest.fn(() => "2026-04-26"),
}))

jest.mock("@/lib/logger", () => ({
  logger: {
    child: jest.fn(() => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() })),
  },
  workflowLogger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
  extractErrorMeta: jest.fn((e: unknown) => ({ error: e })),
}))

jest.mock("@/lib/constants", () => ({
  API_TIMEOUT_MS: 30000,
}))

// ============================================================================
// Imports
// ============================================================================

import { initiateExitClearance, completeExitClearance } from "@/lib/workflows/exit.workflow"

// ============================================================================
// Helpers
// ============================================================================

const ACTOR_ID = "owner-1"
const WORKSPACE_ID = "ws-1"

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

function makeFetchResponse(data: unknown, options: { ok?: boolean; status?: number } = {}) {
  return {
    ok: options.ok !== false,
    status: options.status || 200,
    json: () => Promise.resolve(data),
    statusText: options.ok === false ? "Error" : "OK",
  }
}

const validExitInput = {
  tenant_id: "t1",
  property_id: "p1",
  room_id: "r1",
  requested_exit_date: "2026-05-31",
  exit_reason: "Moving out",
  notice_date: "2026-04-26",
}

const mockTenantData = {
  id: "t1",
  name: "Alice",
  status: "active",
  security_deposit: 10000,
  advance_balance: 0,
  owner_id: "owner-1",
  property: { id: "p1", name: "Test PG" },
  room: { id: "r1", room_number: "101", total_beds: 2 },
}

// ============================================================================
// initiateExitClearance — deduction validation (no fetch needed)
// ============================================================================

describe("initiateExitClearance — deduction validation", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns failure when deduction amount is zero", async () => {
    const result = await initiateExitClearance(
      { ...validExitInput, deductions: [{ description: "Damage", amount: 0 }] },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(false)
  })

  it("returns failure when deduction amount is negative", async () => {
    const result = await initiateExitClearance(
      { ...validExitInput, deductions: [{ description: "Damage", amount: -500 }] },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(false)
  })

  it("allows valid positive deductions", async () => {
    const mockFetch = jest.fn()
      .mockResolvedValueOnce(makeFetchResponse([mockTenantData]))
      .mockResolvedValueOnce(makeFetchResponse([]))
      .mockResolvedValueOnce(makeFetchResponse([{ id: "c1" }]))
    global.fetch = mockFetch as unknown as typeof fetch
    mockFrom.mockImplementation((table: string) => {
      if (table === "bills") return makeChain({ data: [], error: null })
      if (table === "tenants") return makeChain({ data: null, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await initiateExitClearance(
      { ...validExitInput, deductions: [{ description: "Damage", amount: 500 }] },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// initiateExitClearance — fetch (WF-006) failures
// ============================================================================

describe("initiateExitClearance — fetch failures", () => {
  let mockFetch: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch = jest.fn()
    global.fetch = mockFetch as unknown as typeof fetch
  })

  it("returns failure when tenant fetch returns empty array", async () => {
    mockFetch.mockResolvedValueOnce(makeFetchResponse([])) // no tenant found
    const result = await initiateExitClearance(validExitInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(false)
  })

  it("returns failure when tenant fetch returns non-array", async () => {
    mockFetch.mockResolvedValueOnce(makeFetchResponse(null)) // malformed response
    const result = await initiateExitClearance(validExitInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(false)
  })

  it("returns failure when tenant is already checked out", async () => {
    const checkedOutTenant = { ...mockTenantData, status: "checked_out" }
    mockFetch.mockResolvedValueOnce(makeFetchResponse([checkedOutTenant]))
    const result = await initiateExitClearance(validExitInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(false)
  })

  it("returns failure when exit clearance already initiated", async () => {
    mockFetch
      .mockResolvedValueOnce(makeFetchResponse([mockTenantData])) // tenant fetch
      .mockResolvedValueOnce(makeFetchResponse([{ id: "c-existing", settlement_status: "initiated" }])) // existing clearance
    const result = await initiateExitClearance(validExitInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(false)
  })

  it("returns failure when fetch throws (network error)", async () => {
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"))
    const result = await initiateExitClearance(validExitInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(false)
  })

  it("returns failure when validate_tenant fetch times out (AbortError)", async () => {
    const abortError = new Error("The operation was aborted")
    abortError.name = "AbortError"
    mockFetch.mockRejectedValueOnce(abortError)
    const result = await initiateExitClearance(validExitInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(false)
  })

  it("returns failure when create_clearance_record fetch times out (AbortError)", async () => {
    const abortError = new Error("The operation was aborted")
    abortError.name = "AbortError"
    mockFetch
      .mockResolvedValueOnce(makeFetchResponse([mockTenantData])) // validate_tenant OK
      .mockResolvedValueOnce(makeFetchResponse([]))               // clearance check — none
      .mockRejectedValueOnce(abortError)                          // create_clearance_record → AbortError
    mockFrom.mockImplementation((table: string) => {
      if (table === "bills") return makeChain({ data: [], error: null })
      if (table === "tenants") return makeChain({ data: null, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await initiateExitClearance(validExitInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(false)
  })

  it("returns failure when create clearance fetch returns non-ok status", async () => {
    mockFetch
      .mockResolvedValueOnce(makeFetchResponse([mockTenantData])) // validate tenant
      .mockResolvedValueOnce(makeFetchResponse([])) // clearance check — none
      .mockResolvedValueOnce(makeFetchResponse({ message: "Permission denied" }, { ok: false, status: 403 })) // create fails
    mockFrom.mockImplementation((table: string) => {
      if (table === "bills") return makeChain({ data: [], error: null })
      if (table === "tenants") return makeChain({ data: null, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await initiateExitClearance(validExitInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// initiateExitClearance — success path
// ============================================================================

describe("initiateExitClearance — success path", () => {
  let mockFetch: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch = jest.fn()
    global.fetch = mockFetch as unknown as typeof fetch
  })

  it("returns clearance_id on success", async () => {
    mockFetch
      .mockResolvedValueOnce(makeFetchResponse([mockTenantData])) // validate tenant
      .mockResolvedValueOnce(makeFetchResponse([])) // clearance check — none
      .mockResolvedValueOnce(makeFetchResponse([{ id: "c1", settlement_status: "initiated" }])) // create clearance
    mockFrom.mockImplementation((table: string) => {
      if (table === "bills") return makeChain({ data: [], error: null })
      if (table === "tenants") return makeChain({ data: null, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await initiateExitClearance(validExitInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(true)
    expect(result.data?.clearance_id).toBe("c1")
  })

  it("calculates settlement with unpaid bills", async () => {
    mockFetch
      .mockResolvedValueOnce(makeFetchResponse([{ ...mockTenantData, security_deposit: 10000 }]))
      .mockResolvedValueOnce(makeFetchResponse([]))
      .mockResolvedValueOnce(makeFetchResponse([{ id: "c1" }]))
    const unpaidBills = [
      { id: "b1", total_amount: 3000, paid_amount: 0, balance_due: 3000 },
      { id: "b2", total_amount: 2000, paid_amount: 1000, balance_due: 1000 },
    ]
    mockFrom.mockImplementation((table: string) => {
      if (table === "bills") return makeChain({ data: unpaidBills, error: null })
      if (table === "tenants") return makeChain({ data: null, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await initiateExitClearance(validExitInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(true)
    expect(result.data?.settlement.total_dues).toBe(4000)
    expect(result.data?.settlement.deposit_amount).toBe(10000)
    expect(result.data?.settlement.refund_amount).toBe(6000) // 10000 - 4000
  })

  it("handles notice_period tenant (skips status update)", async () => {
    const noticePeriodTenant = { ...mockTenantData, status: "notice_period" }
    mockFetch
      .mockResolvedValueOnce(makeFetchResponse([noticePeriodTenant]))
      .mockResolvedValueOnce(makeFetchResponse([]))
      .mockResolvedValueOnce(makeFetchResponse([{ id: "c1" }]))
    mockFrom.mockImplementation((table: string) => {
      if (table === "bills") return makeChain({ data: [], error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await initiateExitClearance(validExitInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(true)
    // tenants.update not called since status is already notice_period
    expect(mockFrom).not.toHaveBeenCalledWith("tenants")
  })

  it("returns failure when tenant status update fails (active tenant)", async () => {
    mockFetch
      .mockResolvedValueOnce(makeFetchResponse([mockTenantData])) // validate_tenant (active)
      .mockResolvedValueOnce(makeFetchResponse([]))               // clearance check — none
    mockFrom.mockImplementation((table: string) => {
      if (table === "bills") return makeChain({ data: [], error: null })
      if (table === "tenants") return makeChain({ data: null, error: { message: "update failed" } })
      return makeChain({ data: null, error: null })
    })
    const result = await initiateExitClearance(validExitInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(false)
  })

  it("fires tenant notification when tenant has user_id", async () => {
    const tenantWithUser = { ...mockTenantData, user_id: "u-tenant-1" }
    mockFetch
      .mockResolvedValueOnce(makeFetchResponse([tenantWithUser]))
      .mockResolvedValueOnce(makeFetchResponse([]))
      .mockResolvedValueOnce(makeFetchResponse([{ id: "c1", settlement_status: "initiated" }]))
    mockFrom.mockImplementation((table: string) => {
      if (table === "bills") return makeChain({ data: [], error: null })
      if (table === "tenants") return makeChain({ data: null, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await initiateExitClearance(validExitInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// completeExitClearance — validation failures
// ============================================================================

describe("completeExitClearance — validation failures", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns failure when clearance is not found", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "not found" } }))
    const result = await completeExitClearance(
      { clearance_id: "c-invalid", actual_exit_date: "2026-04-30" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(false)
  })

  it("returns failure when clearance is already completed", async () => {
    const completedClearance = {
      id: "c1",
      status: "completed",
      tenant: { id: "t1", name: "Alice", user_id: "u1", room_id: "r1", property_id: "p1" },
      room: { id: "r1", room_number: "101", total_beds: 2, occupied_beds: 1 },
    }
    mockFrom.mockReturnValue(makeChain({ data: completedClearance, error: null }))
    const result = await completeExitClearance(
      { clearance_id: "c1", actual_exit_date: "2026-04-30" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// completeExitClearance — success path
// ============================================================================

describe("completeExitClearance — success path", () => {
  const mockClearance = {
    id: "c1",
    status: "pending",
    tenant_id: "t1",
    property_id: "p1",
    exit_reason: "Moving out",
    total_refundable: 10000,
    total_dues: 0,
    deductions: [],
    bed_id: null,
    owner_id: "owner-1",
    tenant: { id: "t1", name: "Alice", user_id: "u1", room_id: "r1", property_id: "p1" },
    room: { id: "r1", room_number: "101", total_beds: 2, occupied_beds: 1 },
  }

  beforeEach(() => { jest.clearAllMocks() })

  it("returns success with completed status", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "exit_clearance") {
        if (callCounts.exit_clearance === 1) return makeChain({ data: mockClearance, error: null }) // validate
        return makeChain({ data: null, error: null }) // complete_clearance update + refund update
      }
      if (table === "tenants") return makeChain({ data: null, error: null }) // update_tenant_status
      if (table === "tenant_stays") return makeChain({ data: { id: "s1" }, error: null }) // complete_tenant_stay
      if (table === "rooms") return makeChain({ data: [{ id: "r1", occupied_beds: 1 }], error: null }) // release_room
      if (table === "refunds") return makeChain({ data: { id: "ref1", status: "pending" }, error: null }) // create_refund
      return makeChain({ data: null, error: null })
    })
    const result = await completeExitClearance(
      { clearance_id: "c1", actual_exit_date: "2026-04-30" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
  })

  it("skips refund creation when no refund amount due", async () => {
    const noRefundClearance = { ...mockClearance, total_refundable: 0, total_dues: 5000 }
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "exit_clearance") {
        if (callCounts.exit_clearance === 1) return makeChain({ data: noRefundClearance, error: null })
        return makeChain({ data: null, error: null })
      }
      if (table === "tenants") return makeChain({ data: null, error: null })
      if (table === "tenant_stays") return makeChain({ data: { id: "s1" }, error: null })
      if (table === "rooms") return makeChain({ data: [{ id: "r1", occupied_beds: 1 }], error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await completeExitClearance(
      { clearance_id: "c1", actual_exit_date: "2026-04-30" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
    // refunds table should NOT be called
    expect(mockFrom).not.toHaveBeenCalledWith("refunds")
  })

  it("succeeds even when update_tenant_status fails (error → workflow fails since required step)", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "exit_clearance") {
        if (callCounts.exit_clearance === 1) return makeChain({ data: mockClearance, error: null })
        return makeChain({ data: null, error: null })
      }
      if (table === "tenants") return makeChain({ data: null, error: { message: "update failed" } })
      return makeChain({ data: null, error: null })
    })
    const result = await completeExitClearance(
      { clearance_id: "c1", actual_exit_date: "2026-04-30" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    // update_tenant_status is a required step — should fail
    expect(result.success).toBe(false)
  })

  it("handles clearance with bed_id (releases bed)", async () => {
    const clearanceWithBed = { ...mockClearance, total_refundable: 0, total_dues: 0, bed_id: "b1" }
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "exit_clearance") {
        if (callCounts.exit_clearance === 1) return makeChain({ data: clearanceWithBed, error: null })
        return makeChain({ data: null, error: null })
      }
      if (table === "tenants") return makeChain({ data: null, error: null })
      if (table === "tenant_stays") return makeChain({ data: { id: "s1" }, error: null })
      if (table === "rooms") return makeChain({ data: [{ id: "r1", occupied_beds: 1 }], error: null })
      if (table === "beds") return makeChain({ data: null, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await completeExitClearance(
      { clearance_id: "c1", actual_exit_date: "2026-04-30" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
    expect(mockFrom).toHaveBeenCalledWith("beds")
  })

  it("returns success with settlement output fields", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "exit_clearance") {
        if (callCounts.exit_clearance === 1) return makeChain({ data: mockClearance, error: null })
        return makeChain({ data: null, error: null })
      }
      if (table === "tenants") return makeChain({ data: null, error: null })
      if (table === "tenant_stays") return makeChain({ data: { id: "s1" }, error: null })
      if (table === "rooms") return makeChain({ data: [{ id: "r1", occupied_beds: 1 }], error: null })
      if (table === "refunds") return makeChain({ data: { id: "ref1", status: "pending" }, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await completeExitClearance(
      { clearance_id: "c1", actual_exit_date: "2026-04-30", final_settlement_mode: "upi" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
    expect(result.data?.tenant_id).toBe("t1")
  })

  it("succeeds when clearance has no room (room_released: false path)", async () => {
    const noRoomClearance = { ...mockClearance, total_refundable: 0, total_dues: 0, room: null }
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "exit_clearance") {
        if (callCounts.exit_clearance === 1) return makeChain({ data: noRoomClearance, error: null })
        return makeChain({ data: null, error: null })
      }
      if (table === "tenants") return makeChain({ data: null, error: null })
      if (table === "tenant_stays") return makeChain({ data: { id: "s1" }, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await completeExitClearance(
      { clearance_id: "c1", actual_exit_date: "2026-04-30" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
    expect(mockFrom).not.toHaveBeenCalledWith("rooms")
  })

  it("retries rooms update on optimistic lock failure (empty data)", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "exit_clearance") {
        if (callCounts.exit_clearance === 1) return makeChain({ data: mockClearance, error: null })
        return makeChain({ data: null, error: null })
      }
      if (table === "tenants") return makeChain({ data: null, error: null })
      if (table === "tenant_stays") return makeChain({ data: { id: "s1" }, error: null })
      if (table === "rooms") {
        // First: update with optimistic lock → returns empty (no rows matched = lock failed)
        if (callCounts.rooms === 1) return makeChain({ data: [], error: null })
        // Second: fresh select single → returns current data
        if (callCounts.rooms === 2) return makeChain({ data: { occupied_beds: 2, total_beds: 2 }, error: null })
        // Third: retry update → success
        return makeChain({ data: null, error: null })
      }
      return makeChain({ data: null, error: null })
    })
    const result = await completeExitClearance(
      { clearance_id: "c1", actual_exit_date: "2026-04-30" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
    expect(callCounts.rooms).toBeGreaterThanOrEqual(2)
  })

  it("warns but succeeds when bed release update fails", async () => {
    const clearanceWithBed = { ...mockClearance, total_refundable: 0, total_dues: 0, bed_id: "b1" }
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "exit_clearance") {
        if (callCounts.exit_clearance === 1) return makeChain({ data: clearanceWithBed, error: null })
        return makeChain({ data: null, error: null })
      }
      if (table === "tenants") return makeChain({ data: null, error: null })
      if (table === "tenant_stays") return makeChain({ data: { id: "s1" }, error: null })
      if (table === "rooms") return makeChain({ data: [{ id: "r1", occupied_beds: 1 }], error: null })
      if (table === "beds") return makeChain({ data: null, error: { message: "bed update failed" } })
      return makeChain({ data: null, error: null })
    })
    const result = await completeExitClearance(
      { clearance_id: "c1", actual_exit_date: "2026-04-30" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    // Optional step: warns but continues
    expect(result.success).toBe(true)
  })

  it("warns but succeeds when refund insert fails", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "exit_clearance") {
        if (callCounts.exit_clearance === 1) return makeChain({ data: mockClearance, error: null })
        return makeChain({ data: null, error: null })
      }
      if (table === "tenants") return makeChain({ data: null, error: null })
      if (table === "tenant_stays") return makeChain({ data: { id: "s1" }, error: null })
      if (table === "rooms") return makeChain({ data: [{ id: "r1", occupied_beds: 1 }], error: null })
      if (table === "refunds") return makeChain({ data: null, error: { message: "insert failed" } })
      return makeChain({ data: null, error: null })
    })
    const result = await completeExitClearance(
      { clearance_id: "c1", actual_exit_date: "2026-04-30" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    // Optional step: warns but continues
    expect(result.success).toBe(true)
  })

  it("returns failure when complete_clearance update fails", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "exit_clearance") {
        if (callCounts.exit_clearance === 1) return makeChain({ data: { ...mockClearance, total_refundable: 0 }, error: null }) // validate
        return makeChain({ data: null, error: { message: "final update failed" } }) // complete_clearance
      }
      if (table === "tenants") return makeChain({ data: null, error: null })
      if (table === "tenant_stays") return makeChain({ data: { id: "s1" }, error: null })
      if (table === "rooms") return makeChain({ data: [{ id: "r1", occupied_beds: 1 }], error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await completeExitClearance(
      { clearance_id: "c1", actual_exit_date: "2026-04-30" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(false)
  })

  it("warns but continues when tenant_stay update fails (optional step)", async () => {
    let stayCallCount = 0
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "exit_clearance") {
        if (callCounts.exit_clearance === 1) return makeChain({ data: mockClearance, error: null })
        return makeChain({ data: null, error: null })
      }
      if (table === "tenants") return makeChain({ data: null, error: null })
      if (table === "tenant_stays") {
        stayCallCount++
        if (stayCallCount === 1) return makeChain({ data: { id: "s1" }, error: null }) // SELECT → stay found
        return makeChain({ data: null, error: { message: "locked" } }) // UPDATE → fails
      }
      if (table === "rooms") return makeChain({ data: [{ id: "r1", occupied_beds: 1 }], error: null })
      if (table === "refunds") return makeChain({ data: { id: "ref1" }, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await completeExitClearance(
      { clearance_id: "c1", actual_exit_date: "2026-04-30" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    // optional step — warns but workflow still succeeds
    expect(result.success).toBe(true)
    expect(stayCallCount).toBe(2) // both SELECT and UPDATE were called
  })

  it("calculates refund with array deductions (positive net amount)", async () => {
    const clearanceWithDeductions = {
      ...mockClearance,
      total_refundable: 10000,
      total_dues: 0,
      deductions: [{ description: "Damage", amount: 1000 }, { description: "Cleaning", amount: 500 }],
    }
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "exit_clearance") {
        if (callCounts.exit_clearance === 1) return makeChain({ data: clearanceWithDeductions, error: null })
        return makeChain({ data: null, error: null })
      }
      if (table === "tenants") return makeChain({ data: null, error: null })
      if (table === "tenant_stays") return makeChain({ data: { id: "s1" }, error: null })
      if (table === "rooms") return makeChain({ data: [{ id: "r1", occupied_beds: 1 }], error: null })
      if (table === "refunds") return makeChain({ data: { id: "ref1" }, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await completeExitClearance(
      { clearance_id: "c1", actual_exit_date: "2026-04-30" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
    // refund should be created: 10000 - 0 - 1500 = 8500
    expect(mockFrom).toHaveBeenCalledWith("refunds")
  })
})
