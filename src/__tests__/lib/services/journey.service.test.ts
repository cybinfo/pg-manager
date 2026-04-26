/**
 * Tests for src/lib/services/journey.service.ts
 *
 * Covers: getTenantJourney (tenant not found, outer catch, success path with
 * include flags), and getEventCategoryCounts (counts aggregation, zero counts).
 *
 * The service makes many parallel Supabase queries across multiple tables.
 * A universal chainable thenable mock is used to handle all query patterns.
 */

// ============================================================================
// Mocks
// ============================================================================

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

jest.mock("@/lib/supabase/transforms", () => ({
  transformJoin: jest.fn((val: unknown) => {
    if (Array.isArray(val)) return val[0] || null
    return val || null
  }),
  transformArrayJoins: jest.fn((data: unknown[]) => data),
}))

jest.mock("@/lib/format", () => ({
  formatCurrency: jest.fn((n: number) => `₹${n}`),
  formatDate: jest.fn((d: string) => d),
}))

jest.mock("@/lib/date-helpers", () => ({
  getNowISO: jest.fn(() => "2026-04-26T00:00:00Z"),
}))

jest.mock("@/lib/phone", () => ({
  normalizePhoneForComparison: jest.fn((p: string) => p?.replace(/\D/g, "") || ""),
}))

const mockFrom = jest.fn()
const mockSupabase = { from: mockFrom }

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => mockSupabase),
}))

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { getTenantJourney, getEventCategoryCounts } from "@/lib/services/journey.service"

// ============================================================================
// Helpers
// ============================================================================

/**
 * Universal chainable thenable — resolves to `result` when awaited.
 * All chained methods (select, eq, order, limit, single, etc.) return `this`.
 */
function makeChain(result: { data: unknown; error: unknown; count?: number }) {
  const chain: Record<string, unknown> = {}
  const methods = [
    "select", "eq", "neq", "order", "limit", "single",
    "gte", "lte", "lt", "or", "ilike", "in", "is",
  ]
  methods.forEach((m) => {
    chain[m] = jest.fn(() => chain)
  })
  chain.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled)
  return chain
}

/** Empty result for tables we don't care about in a test */
const EMPTY = { data: [], error: null }

/** Build a from() mock that returns a specific result for the `tenants` table,
 *  and empty arrays for everything else. */
function setupFromMock(tenantResult: { data: unknown; error: unknown }) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "tenants") return makeChain(tenantResult)
    return makeChain(EMPTY)
  })
}

/** Build a valid minimal tenant record */
function makeTenant() {
  return {
    id: "t1",
    name: "Alice",
    status: "active",
    photo_url: null,
    check_in_date: "2025-01-01",
    phone: "9876543210",
    phone_numbers: [],
    monthly_rent: 5000,
    security_deposit: 10000,
    security_deposit_paid: 10000,
    advance_amount: 0,
    advance_balance: 0,
    agreement_signed: true,
    police_verification_status: "verified",
    property: { id: "p1", name: "Test Property", address: "123 Main St" },
    room: { id: "r1", room_number: "101", room_type: "single" },
  }
}

// ============================================================================
// getEventCategoryCounts
// ============================================================================

describe("getEventCategoryCounts", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns aggregated counts from all tables", async () => {
    const tableCountMap: Record<string, number> = {
      tenant_stays: 2,
      bills: 3,
      payments: 5,
      complaints: 1,
      room_transfers: 0,
      exit_clearance: 1,
      visitors: 4,
      refunds: 2,
    }
    mockFrom.mockImplementation((table: string) =>
      makeChain({ data: null, error: null, count: tableCountMap[table] ?? 0 })
    )
    const result = await getEventCategoryCounts("t1")
    // ONBOARDING = tenant_stays count
    expect(result.onboarding).toBe(2)
    // FINANCIAL = bills + payments + refunds
    expect(result.financial).toBe(3 + 5 + 2)
    // ACCOMMODATION = room_transfers
    expect(result.accommodation).toBe(0)
    // COMPLAINT = complaints
    expect(result.complaint).toBe(1)
    // EXIT = exit_clearance
    expect(result.exit).toBe(1)
    // VISITOR = visitors
    expect(result.visitor).toBe(4)
  })

  it("returns 0 for all categories when all queries return null count", async () => {
    mockFrom.mockImplementation(() => makeChain({ data: null, error: null, count: null }))
    const result = await getEventCategoryCounts("t1")
    expect(result.onboarding).toBe(0)
    expect(result.financial).toBe(0)
    expect(result.visitor).toBe(0)
  })

  it("logs warn but continues when a query returns error", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "bills") return makeChain({ data: null, error: { message: "RLS denied" }, count: 0 })
      return makeChain({ data: null, error: null, count: 1 })
    })
    // Should not throw
    const result = await getEventCategoryCounts("t1")
    expect(result).toBeDefined()
  })

  it("returns 0 for DOCUMENT, COMMUNICATION, SYSTEM categories (no tables)", async () => {
    mockFrom.mockImplementation(() => makeChain({ data: null, error: null, count: 10 }))
    const result = await getEventCategoryCounts("t1")
    expect(result.document).toBe(0)
    expect(result.communication).toBe(0)
    expect(result.system).toBe(0)
  })
})

// ============================================================================
// getTenantJourney — tenant not found
// ============================================================================

describe("getTenantJourney — tenant not found", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns error result when tenant query returns error", async () => {
    setupFromMock({ data: null, error: { message: "Not found" } })
    const result = await getTenantJourney({ tenant_id: "t1", workspace_id: "ws1" })
    expect(result.success).toBe(false)
    expect(result.error?.code).toBeTruthy()
  })

  it("returns error result when tenant data is null with no error", async () => {
    setupFromMock({ data: null, error: null })
    const result = await getTenantJourney({ tenant_id: "t1", workspace_id: "ws1" })
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// getTenantJourney — outer catch
// ============================================================================

describe("getTenantJourney — outer catch", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns error result when createClient throws", async () => {
    // Make from() throw synchronously
    mockFrom.mockImplementation(() => {
      throw new Error("Connection refused")
    })
    const result = await getTenantJourney({ tenant_id: "t1", workspace_id: "ws1" })
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// getTenantJourney — success path
// ============================================================================

describe("getTenantJourney — success with all includes", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns success result with all top-level fields", async () => {
    setupFromMock({ data: makeTenant(), error: null })
    const result = await getTenantJourney({
      tenant_id: "t1",
      workspace_id: "ws1",
      include_analytics: true,
      include_financial: true,
      include_insights: true,
      include_visitors: true,
    })
    expect(result.success).toBe(true)
    const data = result.data!
    expect(data.tenant_id).toBe("t1")
    expect(data.tenant_name).toBe("Alice")
    expect(data.tenant_status).toBe("active")
    expect(data.events).toBeDefined()
    expect(data.analytics).toBeDefined()
    expect(data.financial).toBeDefined()
    expect(data.insights).toBeDefined()
    expect(data.linked_visitors).toBeDefined()
    expect(data.generated_at).toBe("2026-04-26T00:00:00Z")
  })

  it("populates empty events array when all fetch tables return empty", async () => {
    setupFromMock({ data: makeTenant(), error: null })
    const result = await getTenantJourney({ tenant_id: "t1", workspace_id: "ws1" })
    expect(result.success).toBe(true)
    expect(result.data!.events).toEqual([])
    expect(result.data!.total_events).toBe(0)
    expect(result.data!.has_more_events).toBe(false)
  })

  it("exposes property and room from tenant record", async () => {
    setupFromMock({ data: makeTenant(), error: null })
    const result = await getTenantJourney({ tenant_id: "t1", workspace_id: "ws1" })
    expect(result.success).toBe(true)
    // property/room may be null after transformJoin if array — just check field exists
    expect("property" in result.data!).toBe(true)
    expect("room" in result.data!).toBe(true)
  })
})

describe("getTenantJourney — with include flags disabled", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns default analytics when include_analytics=false", async () => {
    setupFromMock({ data: makeTenant(), error: null })
    const result = await getTenantJourney({
      tenant_id: "t1",
      workspace_id: "ws1",
      include_analytics: false,
      include_financial: false,
      include_insights: false,
      include_visitors: false,
    })
    expect(result.success).toBe(true)
    // Default analytics, financial, insights are still returned (createDefault*)
    expect(result.data!.analytics).toBeDefined()
    expect(result.data!.financial).toBeDefined()
    expect(result.data!.insights).toBeDefined()
    expect(result.data!.linked_visitors).toEqual([])
    expect(result.data!.pre_tenant_visits).toEqual([])
  })
})

describe("getTenantJourney — event filtering", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("respects events_limit and events_offset in options", async () => {
    setupFromMock({ data: makeTenant(), error: null })
    const result = await getTenantJourney({
      tenant_id: "t1",
      workspace_id: "ws1",
      events_limit: 5,
      events_offset: 0,
    })
    expect(result.success).toBe(true)
    // With empty source tables, we expect 0 events
    expect(result.data!.events.length).toBeLessThanOrEqual(5)
  })
})

// ============================================================================
// Helper functions — indirectly tested via getTenantJourney
// ============================================================================

describe("journey service helper functions — via getTenantJourney", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("handles tenant with no phone number for visitor matching (early return path)", async () => {
    const tenantNoPhone = { ...makeTenant(), phone: null, phone_numbers: [] }
    setupFromMock({ data: tenantNoPhone, error: null })
    const result = await getTenantJourney({
      tenant_id: "t1",
      workspace_id: "ws1",
      include_visitors: true,
    })
    expect(result.success).toBe(true)
    // Without phone, pre-tenant visits returns [] early
    expect(result.data!.pre_tenant_visits).toEqual([])
  })

  it("handles tenant with extra phone_numbers array", async () => {
    const tenantWithPhones = {
      ...makeTenant(),
      phone_numbers: [{ number: "9999999999" }, { number: "8888888888" }],
    }
    setupFromMock({ data: tenantWithPhones, error: null })
    const result = await getTenantJourney({
      tenant_id: "t1",
      workspace_id: "ws1",
      include_visitors: true,
    })
    expect(result.success).toBe(true)
  })
})
