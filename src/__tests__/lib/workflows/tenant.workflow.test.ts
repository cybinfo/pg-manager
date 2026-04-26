/**
 * Tests for src/lib/workflows/tenant.workflow.ts
 *
 * Covers: createTenant (all steps + optional paths) and transferRoom
 * (validation, room occupancy update with optimistic lock retry).
 */

// ============================================================================
// Mocks
// ============================================================================

const mockFrom = jest.fn()
const mockRpc = jest.fn()
const mockSupabase = {
  from: mockFrom,
  auth: { getUser: jest.fn() },
  rpc: mockRpc,
  sql: jest.fn(), // needed for upsert_person fallback tags update
}

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

jest.mock("@/lib/audit", () => ({
  softDelete: jest.fn().mockResolvedValue({ success: true }),
  softDeleteBatch: jest.fn().mockResolvedValue({ success: true }),
  withCreatedBy: jest.fn((data: unknown) => data),
}))

jest.mock("@/lib/date-helpers", () => ({
  getNowISO: jest.fn(() => "2026-04-26T00:00:00Z"),
  getTodayISO: jest.fn(() => "2026-04-26"),
}))

jest.mock("@/lib/format", () => ({
  formatCurrency: jest.fn((n: number) => `₹${n}`),
  formatMonthYear: jest.fn(() => "April 2026"),
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

import { createTenant, transferRoom } from "@/lib/workflows/tenant.workflow"

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

const mockRoom = {
  id: "r1",
  room_number: "101",
  total_beds: 2,
  occupied_beds: 0,
  status: "available",
  property: { id: "p1", name: "Test PG" },
}

const mockTenant = {
  id: "t1",
  name: "Alice",
  phone: "9876543210",
  email: "alice@example.com",
  status: "active",
  monthly_rent: 5000,
  property_id: "p1",
  room_id: "r1",
  bed_id: null,
  owner_id: ACTOR_ID,
  _invitation_will_be_sent: false,
  room: { id: "r1", room_number: "101", occupied_beds: 1 },
}

const mockStay = { id: "stay-1", tenant_id: "t1", room_id: "r1", status: "active" }

const validCreateInput = {
  name: "Alice",
  phone: "9876543210",
  property_id: "p1",
  room_id: "r1",
  check_in_date: "2026-04-01",
  monthly_rent: 5000,
}

function setupCreateTenantRpcs() {
  mockRpc.mockImplementation((rpcName: string) => {
    if (rpcName === "upsert_person") return Promise.resolve({ data: "person-1", error: null })
    if (rpcName === "increment_room_occupancy") return Promise.resolve({ data: { occupied_beds: 1 }, error: null })
    return Promise.resolve({ data: null, error: { message: "Unknown RPC" } })
  })
}

// ============================================================================
// createTenant — validate_room
// ============================================================================

describe("createTenant — validate_room", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns failure when room not found", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "not found" } }))
    setupCreateTenantRpcs()
    const result = await createTenant(validCreateInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).errors?.[0]?.message).toContain("Room not found")
  })

  it("returns failure when room is at full capacity", async () => {
    const fullRoom = { ...mockRoom, total_beds: 2, occupied_beds: 2 }
    mockFrom.mockReturnValue(makeChain({ data: fullRoom, error: null }))
    setupCreateTenantRpcs()
    const result = await createTenant(validCreateInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).errors?.[0]?.code).toBe("ROOM_AT_CAPACITY")
  })
})

// ============================================================================
// createTenant — upsert_person (optional step)
// ============================================================================

describe("createTenant — upsert_person", () => {
  beforeEach(() => { jest.clearAllMocks() })

  function setupValidRoom() {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "rooms") return makeChain({ data: callCounts.rooms === 1 ? mockRoom : null, error: null })
      if (table === "tenants") return makeChain({ data: mockTenant, error: null })
      if (table === "tenant_stays") return makeChain({ data: mockStay, error: null })
      return makeChain({ data: null, error: null })
    })
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === "increment_room_occupancy") return Promise.resolve({ data: { occupied_beds: 1 }, error: null })
      return Promise.resolve({ data: null, error: null })
    })
  }

  it("uses provided person_id when found in people table", async () => {
    const personData = { id: "existing-person", name: "Alice", phone: "9876543210", email: null, photo_url: null }
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "rooms") return makeChain({ data: callCounts.rooms === 1 ? mockRoom : null, error: null })
      if (table === "people") return makeChain({ data: personData, error: null })
      if (table === "tenants") return makeChain({ data: mockTenant, error: null })
      if (table === "tenant_stays") return makeChain({ data: mockStay, error: null })
      return makeChain({ data: null, error: null })
    })
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === "increment_room_occupancy") return Promise.resolve({ data: { occupied_beds: 1 }, error: null })
      return Promise.resolve({ data: null, error: null })
    })
    const result = await createTenant(
      { ...validCreateInput, person_id: "existing-person" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
    expect(result.data?.person_id).toBe("existing-person")
  })

  it("continues without person_id when provided person not found (optional step)", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "rooms") return makeChain({ data: callCounts.rooms === 1 ? mockRoom : null, error: null })
      if (table === "people") return makeChain({ data: null, error: { message: "not found" } })
      if (table === "tenants") return makeChain({ data: mockTenant, error: null })
      if (table === "tenant_stays") return makeChain({ data: mockStay, error: null })
      return makeChain({ data: null, error: null })
    })
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === "increment_room_occupancy") return Promise.resolve({ data: { occupied_beds: 1 }, error: null })
      return Promise.resolve({ data: null, error: null })
    })
    const result = await createTenant(
      { ...validCreateInput, person_id: "non-existent" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    // upsert_person returns error but is optional — workflow continues
    expect(result.success).toBe(true)
    expect(result.data?.person_id).toBeNull()
  })

  it("uses RPC upsert_person when no person_id provided", async () => {
    setupValidRoom()
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === "upsert_person") return Promise.resolve({ data: "rpc-person-1", error: null })
      if (rpcName === "increment_room_occupancy") return Promise.resolve({ data: { occupied_beds: 1 }, error: null })
      return Promise.resolve({ data: null, error: null })
    })
    const result = await createTenant(validCreateInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(true)
    expect(result.data?.person_id).toBe("rpc-person-1")
  })

  it("falls back to phone lookup when RPC fails", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "rooms") return makeChain({ data: callCounts.rooms === 1 ? mockRoom : null, error: null })
      if (table === "people") {
        // phone lookup → returns existing person
        return makeChain({ data: { id: "found-by-phone" }, error: null })
      }
      if (table === "tenants") return makeChain({ data: mockTenant, error: null })
      if (table === "tenant_stays") return makeChain({ data: mockStay, error: null })
      return makeChain({ data: null, error: null })
    })
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === "upsert_person") return Promise.resolve({ data: null, error: { message: "RPC not found" } })
      if (rpcName === "increment_room_occupancy") return Promise.resolve({ data: { occupied_beds: 1 }, error: null })
      return Promise.resolve({ data: null, error: null })
    })
    const result = await createTenant(
      { ...validCreateInput, phone: "9876543210" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
  })

  it("creates new person when RPC fails and no existing person found", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "rooms") return makeChain({ data: callCounts.rooms === 1 ? mockRoom : null, error: null })
      if (table === "people") {
        // phone lookup → not found; insert → new person
        if (callCounts.people === 1) return makeChain({ data: null, error: null }) // phone lookup: no match
        return makeChain({ data: { id: "new-person-1" }, error: null }) // insert new person
      }
      if (table === "tenants") return makeChain({ data: mockTenant, error: null })
      if (table === "tenant_stays") return makeChain({ data: mockStay, error: null })
      return makeChain({ data: null, error: null })
    })
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === "upsert_person") return Promise.resolve({ data: null, error: { message: "Function not found" } })
      if (rpcName === "increment_room_occupancy") return Promise.resolve({ data: { occupied_beds: 1 }, error: null })
      return Promise.resolve({ data: null, error: null })
    })
    const result = await createTenant(
      { ...validCreateInput, phone: "9876543210" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
    expect(result.data?.person_id).toBe("new-person-1")
  })

  it("continues without person_id when insert fails (optional step)", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "rooms") return makeChain({ data: callCounts.rooms === 1 ? mockRoom : null, error: null })
      if (table === "people") {
        // phone lookup: no match → insert fails
        if (callCounts.people === 1) return makeChain({ data: null, error: null })
        return makeChain({ data: null, error: { message: "insert failed" } })
      }
      if (table === "tenants") return makeChain({ data: mockTenant, error: null })
      if (table === "tenant_stays") return makeChain({ data: mockStay, error: null })
      return makeChain({ data: null, error: null })
    })
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === "upsert_person") return Promise.resolve({ data: null, error: { message: "Function not found" } })
      if (rpcName === "increment_room_occupancy") return Promise.resolve({ data: { occupied_beds: 1 }, error: null })
      return Promise.resolve({ data: null, error: null })
    })
    const result = await createTenant(validCreateInput, ACTOR_ID, "owner", WORKSPACE_ID)
    // upsert_person is optional — insert fails warns but continues
    expect(result.success).toBe(true)
    expect(result.data?.person_id).toBeNull()
  })
})

// ============================================================================
// createTenant — required steps (create_tenant, create_tenant_stay, update_room_occupancy)
// ============================================================================

describe("createTenant — required steps", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns failure when tenant insert fails", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "rooms") return makeChain({ data: mockRoom, error: null })
      if (table === "tenants") return makeChain({ data: null, error: { message: "insert failed" } })
      return makeChain({ data: null, error: null })
    })
    setupCreateTenantRpcs()
    const result = await createTenant(validCreateInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).errors?.[0]?.message).toContain("Failed to create tenant")
  })

  it("returns failure when tenant_stay insert fails", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "rooms") return makeChain({ data: mockRoom, error: null })
      if (table === "tenants") return makeChain({ data: mockTenant, error: null })
      if (table === "tenant_stays") return makeChain({ data: null, error: { message: "insert failed" } })
      return makeChain({ data: null, error: null })
    })
    setupCreateTenantRpcs()
    const result = await createTenant(validCreateInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).errors?.[0]?.message).toContain("Failed to create tenant stay")
  })

  it("returns failure when increment_room_occupancy RPC fails", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "rooms") return makeChain({ data: mockRoom, error: null })
      if (table === "tenants") return makeChain({ data: mockTenant, error: null })
      if (table === "tenant_stays") return makeChain({ data: mockStay, error: null })
      return makeChain({ data: null, error: null })
    })
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === "upsert_person") return Promise.resolve({ data: "p1", error: null })
      if (rpcName === "increment_room_occupancy") return Promise.resolve({ data: null, error: { message: "RPC not found" } })
      return Promise.resolve({ data: null, error: null })
    })
    const result = await createTenant(validCreateInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).errors?.[0]?.message).toContain("Failed to update room occupancy")
  })
})

// ============================================================================
// createTenant — optional steps (bed, documents, bill)
// ============================================================================

describe("createTenant — optional steps", () => {
  beforeEach(() => { jest.clearAllMocks() })

  function setupCoreSuccess() {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "rooms") return makeChain({ data: callCounts.rooms === 1 ? mockRoom : null, error: null })
      if (table === "tenants") return makeChain({ data: mockTenant, error: null })
      if (table === "tenant_stays") return makeChain({ data: mockStay, error: null })
      if (table === "beds") return makeChain({ data: null, error: null })
      if (table === "bills") return makeChain({ data: { id: "bill-1" }, error: null, count: 0 })
      return makeChain({ data: null, error: null })
    })
    setupCreateTenantRpcs()
    return callCounts
  }

  it("updates bed when bed_id provided", async () => {
    setupCoreSuccess()
    const result = await createTenant(
      { ...validCreateInput, bed_id: "bed-1" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
    expect(mockFrom).toHaveBeenCalledWith("beds")
  })

  it("warns but continues when bed update fails (optional)", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "rooms") return makeChain({ data: callCounts.rooms === 1 ? mockRoom : null, error: null })
      if (table === "tenants") return makeChain({ data: mockTenant, error: null })
      if (table === "tenant_stays") return makeChain({ data: mockStay, error: null })
      if (table === "beds") return makeChain({ data: null, error: { message: "bed locked" } })
      return makeChain({ data: null, error: null })
    })
    setupCreateTenantRpcs()
    const result = await createTenant(
      { ...validCreateInput, bed_id: "bed-1" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
  })

  it("generates initial bill with security_deposit and advance_amount", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "rooms") return makeChain({ data: callCounts.rooms === 1 ? mockRoom : null, error: null })
      if (table === "tenants") return makeChain({ data: mockTenant, error: null })
      if (table === "tenant_stays") return makeChain({ data: mockStay, error: null })
      if (table === "bills") {
        if (callCounts.bills === 1) return makeChain({ data: null, error: null, count: 10 }) // count query
        return makeChain({ data: { id: "bill-1", total_amount: 15000 }, error: null }) // insert
      }
      return makeChain({ data: null, error: null })
    })
    setupCreateTenantRpcs()
    const result = await createTenant(
      {
        ...validCreateInput,
        generate_initial_bill: true,
        security_deposit: 5000,
        advance_amount: 5000,
      },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
    expect(result.data?.initial_bill_id).toBe("bill-1")
  })

  it("warns but continues when bill insert fails (optional)", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "rooms") return makeChain({ data: callCounts.rooms === 1 ? mockRoom : null, error: null })
      if (table === "tenants") return makeChain({ data: mockTenant, error: null })
      if (table === "tenant_stays") return makeChain({ data: mockStay, error: null })
      if (table === "bills") {
        if (callCounts.bills === 1) return makeChain({ data: null, error: null, count: 0 })
        return makeChain({ data: null, error: { message: "insert failed" } })
      }
      return makeChain({ data: null, error: null })
    })
    setupCreateTenantRpcs()
    const result = await createTenant(
      { ...validCreateInput, generate_initial_bill: true },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
    expect(result.data?.initial_bill_id).toBeNull()
  })

  it("saves id_documents when provided", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "rooms") return makeChain({ data: callCounts.rooms === 1 ? mockRoom : null, error: null })
      if (table === "tenants") return makeChain({ data: mockTenant, error: null })
      if (table === "tenant_stays") return makeChain({ data: mockStay, error: null })
      if (table === "tenant_documents") return makeChain({ data: [{ id: "doc-1" }], error: null })
      return makeChain({ data: null, error: null })
    })
    setupCreateTenantRpcs()
    const result = await createTenant(
      { ...validCreateInput, id_documents: [{ id_type: "aadhaar", id_number: "1234" }] },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
    expect(mockFrom).toHaveBeenCalledWith("tenant_documents")
  })

  it("fires bill notification when bill generated and email provided", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "rooms") return makeChain({ data: callCounts.rooms === 1 ? mockRoom : null, error: null })
      if (table === "tenants") return makeChain({ data: mockTenant, error: null })
      if (table === "tenant_stays") return makeChain({ data: mockStay, error: null })
      if (table === "bills") {
        if (callCounts.bills === 1) return makeChain({ data: null, error: null, count: 0 })
        return makeChain({ data: { id: "bill-1", total_amount: 5000 }, error: null })
      }
      return makeChain({ data: null, error: null })
    })
    setupCreateTenantRpcs()
    const result = await createTenant(
      { ...validCreateInput, email: "alice@example.com", generate_initial_bill: true },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
    expect(result.data?.initial_bill_id).toBe("bill-1")
  })

  it("falls back to email lookup when RPC fails and no phone match", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "rooms") return makeChain({ data: callCounts.rooms === 1 ? mockRoom : null, error: null })
      if (table === "people") {
        if (callCounts.people === 1) return makeChain({ data: null, error: null }) // phone lookup: no match
        if (callCounts.people === 2) return makeChain({ data: { id: "found-by-email" }, error: null }) // email lookup: found
        return makeChain({ data: null, error: null }) // tags update
      }
      if (table === "tenants") return makeChain({ data: mockTenant, error: null })
      if (table === "tenant_stays") return makeChain({ data: mockStay, error: null })
      return makeChain({ data: null, error: null })
    })
    mockRpc.mockImplementation((rpcName: string) => {
      if (rpcName === "upsert_person") return Promise.resolve({ data: null, error: { message: "RPC not found" } })
      if (rpcName === "increment_room_occupancy") return Promise.resolve({ data: { occupied_beds: 1 }, error: null })
      return Promise.resolve({ data: null, error: null })
    })
    const result = await createTenant(
      { ...validCreateInput, phone: "9876543210", email: "alice@example.com" },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
  })

  it("sets invitation_sent when send_welcome_notification + email provided", async () => {
    const tenantWithInvite = { ...mockTenant, _invitation_will_be_sent: true }
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "rooms") return makeChain({ data: callCounts.rooms === 1 ? mockRoom : null, error: null })
      if (table === "tenants") return makeChain({ data: tenantWithInvite, error: null })
      if (table === "tenant_stays") return makeChain({ data: mockStay, error: null })
      return makeChain({ data: null, error: null })
    })
    setupCreateTenantRpcs()
    const result = await createTenant(
      { ...validCreateInput, email: "alice@example.com", send_welcome_notification: true },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
    expect(result.data?.invitation_sent).toBe(true)
  })
})

// ============================================================================
// createTenant — full happy path
// ============================================================================

describe("createTenant — happy path", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns tenant_id and stay_id on success", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "rooms") return makeChain({ data: callCounts.rooms === 1 ? mockRoom : null, error: null })
      if (table === "tenants") return makeChain({ data: mockTenant, error: null })
      if (table === "tenant_stays") return makeChain({ data: mockStay, error: null })
      return makeChain({ data: null, error: null })
    })
    setupCreateTenantRpcs()
    const result = await createTenant(validCreateInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(true)
    expect(result.data?.tenant_id).toBe("t1")
    expect(result.data?.tenant_stay_id).toBe("stay-1")
    expect(result.data?.initial_bill_id).toBeNull()
  })
})

// ============================================================================
// transferRoom — validate
// ============================================================================

const mockTenantForTransfer = {
  id: "t1",
  name: "Alice",
  monthly_rent: 5000,
  room_id: "r1",
  bed_id: null,
  room: { id: "r1", room_number: "101", occupied_beds: 1 },
}

const mockNewRoom = {
  id: "r2",
  room_number: "102",
  total_beds: 2,
  occupied_beds: 0,
  monthly_rent: 6000,
}

const validTransferInput = {
  tenant_id: "t1",
  new_room_id: "r2",
  transfer_date: "2026-04-26",
}

describe("transferRoom — validate", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns failure when tenant not found", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "tenants") return makeChain({ data: null, error: { message: "not found" } })
      return makeChain({ data: null, error: null })
    })
    const result = await transferRoom(validTransferInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).errors?.[0]?.message).toContain("Tenant not found")
  })

  it("returns failure when new room not found", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "tenants") return makeChain({ data: mockTenantForTransfer, error: null })
      if (table === "rooms") return makeChain({ data: null, error: { message: "not found" } })
      return makeChain({ data: null, error: null })
    })
    const result = await transferRoom(validTransferInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).errors?.[0]?.message).toContain("New room not found")
  })

  it("returns failure when new room is at full capacity", async () => {
    const fullNewRoom = { ...mockNewRoom, total_beds: 1, occupied_beds: 1 }
    mockFrom.mockImplementation((table: string) => {
      if (table === "tenants") return makeChain({ data: mockTenantForTransfer, error: null })
      if (table === "rooms") return makeChain({ data: fullNewRoom, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await transferRoom(validTransferInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).errors?.[0]?.code).toBe("ROOM_AT_CAPACITY")
  })
})

// ============================================================================
// transferRoom — optional steps
// ============================================================================

describe("transferRoom — optional steps", () => {
  beforeEach(() => { jest.clearAllMocks() })

  function setupTransferCore(overrides: Record<string, (callCount: number) => { data: unknown; error: unknown }> = {}) {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (overrides[table]) return makeChain(overrides[table](callCounts[table]))
      if (table === "tenants") {
        if (callCounts.tenants === 1) return makeChain({ data: mockTenantForTransfer, error: null })
        return makeChain({ data: null, error: null }) // update_tenant
      }
      if (table === "rooms") return makeChain({ data: callCounts.rooms === 1 ? mockNewRoom : [{ occupied_beds: 0 }], error: null })
      if (table === "room_transfers") return makeChain({ data: { id: "transfer-1" }, error: null })
      if (table === "tenant_stays") {
        if (callCounts.tenant_stays === 1) return makeChain({ data: { id: "stay-1", room_id: "r1" }, error: null })
        return makeChain({ data: null, error: null })
      }
      return makeChain({ data: null, error: null })
    })
    return callCounts
  }

  it("warns but continues when create_transfer_record fails (optional)", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "tenants") {
        if (callCounts.tenants === 1) return makeChain({ data: mockTenantForTransfer, error: null })
        return makeChain({ data: null, error: null })
      }
      if (table === "rooms") return makeChain({ data: callCounts.rooms === 1 ? mockNewRoom : [{ occupied_beds: 0 }], error: null })
      if (table === "room_transfers") return makeChain({ data: null, error: { message: "insert failed" } })
      if (table === "tenant_stays") {
        if (callCounts.tenant_stays === 1) return makeChain({ data: { id: "stay-1", room_id: "r1" }, error: null })
        return makeChain({ data: null, error: null })
      }
      return makeChain({ data: null, error: null })
    })
    const result = await transferRoom(validTransferInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(true)
    expect(result.data?.transfer_id).toBe("") // null → ""
  })

  it("handles release_old_room when no old room (tenant has no room)", async () => {
    const tenantNoRoom = { ...mockTenantForTransfer, room: null }
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "tenants") {
        if (callCounts.tenants === 1) return makeChain({ data: tenantNoRoom, error: null })
        return makeChain({ data: null, error: null })
      }
      if (table === "rooms") return makeChain({ data: callCounts.rooms === 1 ? mockNewRoom : [{ occupied_beds: 0 }], error: null })
      if (table === "room_transfers") return makeChain({ data: { id: "transfer-1" }, error: null })
      if (table === "tenant_stays") {
        if (callCounts.tenant_stays === 1) return makeChain({ data: { id: "stay-1", room_id: "r1" }, error: null })
        return makeChain({ data: null, error: null })
      }
      return makeChain({ data: null, error: null })
    })
    const result = await transferRoom(validTransferInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(true)
  })

  it("retries release_old_room on optimistic lock failure", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "tenants") {
        if (callCounts.tenants === 1) return makeChain({ data: mockTenantForTransfer, error: null })
        return makeChain({ data: null, error: null })
      }
      if (table === "rooms") {
        if (callCounts.rooms === 1) return makeChain({ data: mockNewRoom, error: null }) // validate new room
        if (callCounts.rooms === 2) return makeChain({ data: [], error: null })           // release_old: optimistic lock fails (empty)
        if (callCounts.rooms === 3) return makeChain({ data: { occupied_beds: 2 }, error: null }) // fresh select
        if (callCounts.rooms === 4) return makeChain({ data: null, error: null })         // release_old retry update
        return makeChain({ data: [{ occupied_beds: 0 }], error: null })                  // assign_new
      }
      if (table === "room_transfers") return makeChain({ data: { id: "transfer-1" }, error: null })
      if (table === "tenant_stays") {
        if (callCounts.tenant_stays === 1) return makeChain({ data: { id: "stay-1", room_id: "r1" }, error: null })
        return makeChain({ data: null, error: null })
      }
      return makeChain({ data: null, error: null })
    })
    const result = await transferRoom(validTransferInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(true)
    expect(callCounts.rooms).toBeGreaterThanOrEqual(3)
  })

  it("retries assign_new_room on optimistic lock failure", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "tenants") {
        if (callCounts.tenants === 1) return makeChain({ data: mockTenantForTransfer, error: null })
        return makeChain({ data: null, error: null })
      }
      if (table === "rooms") {
        if (callCounts.rooms === 1) return makeChain({ data: mockNewRoom, error: null }) // validate new room
        if (callCounts.rooms === 2) return makeChain({ data: [{ id: "r1", occupied_beds: 0 }], error: null }) // release_old succeeds
        if (callCounts.rooms === 3) return makeChain({ data: [], error: null })           // assign_new: optimistic lock fails
        if (callCounts.rooms === 4) return makeChain({ data: { occupied_beds: 0, total_beds: 2 }, error: null }) // fresh select
        return makeChain({ data: null, error: null })                                     // assign_new retry
      }
      if (table === "room_transfers") return makeChain({ data: { id: "transfer-1" }, error: null })
      if (table === "tenant_stays") {
        if (callCounts.tenant_stays === 1) return makeChain({ data: { id: "stay-1", room_id: "r1" }, error: null })
        return makeChain({ data: null, error: null })
      }
      return makeChain({ data: null, error: null })
    })
    const result = await transferRoom(validTransferInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(true)
    expect(callCounts.rooms).toBeGreaterThanOrEqual(4)
  })

  it("returns failure when update_tenant fails (required step)", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "tenants") {
        if (callCounts.tenants === 1) return makeChain({ data: mockTenantForTransfer, error: null })
        return makeChain({ data: null, error: { message: "update failed" } }) // update_tenant fails
      }
      if (table === "rooms") return makeChain({ data: callCounts.rooms === 1 ? mockNewRoom : [{ occupied_beds: 0 }], error: null })
      if (table === "room_transfers") return makeChain({ data: { id: "transfer-1" }, error: null })
      return makeChain({ data: null, error: null })
    })
    const result = await transferRoom(validTransferInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result as any).errors?.[0]?.message).toContain("Failed to update tenant")
  })

  it("adjusts rent when adjust_rent + new_rent provided", async () => {
    setupTransferCore()
    const result = await transferRoom(
      { ...validTransferInput, adjust_rent: true, new_rent: 7000 },
      ACTOR_ID, "owner", WORKSPACE_ID
    )
    expect(result.success).toBe(true)
    expect(result.data?.rent_adjusted).toBe(true)
  })

  it("warns but continues when no active tenant_stay found (optional)", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "tenants") {
        if (callCounts.tenants === 1) return makeChain({ data: mockTenantForTransfer, error: null })
        return makeChain({ data: null, error: null })
      }
      if (table === "rooms") return makeChain({ data: callCounts.rooms === 1 ? mockNewRoom : [{ occupied_beds: 0 }], error: null })
      if (table === "room_transfers") return makeChain({ data: { id: "transfer-1" }, error: null })
      if (table === "tenant_stays") return makeChain({ data: null, error: { message: "no rows" } })
      return makeChain({ data: null, error: null })
    })
    const result = await transferRoom(validTransferInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(true)
  })

  it("warns but continues when tenant_stay update fails (optional)", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "tenants") {
        if (callCounts.tenants === 1) return makeChain({ data: mockTenantForTransfer, error: null })
        return makeChain({ data: null, error: null })
      }
      if (table === "rooms") return makeChain({ data: callCounts.rooms === 1 ? mockNewRoom : [{ occupied_beds: 0 }], error: null })
      if (table === "room_transfers") return makeChain({ data: { id: "transfer-1" }, error: null })
      if (table === "tenant_stays") {
        if (callCounts.tenant_stays === 1) return makeChain({ data: { id: "stay-1", room_id: "r1" }, error: null }) // find stay
        return makeChain({ data: null, error: { message: "update failed" } }) // update fails
      }
      return makeChain({ data: null, error: null })
    })
    const result = await transferRoom(validTransferInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// transferRoom — happy path
// ============================================================================

describe("transferRoom — happy path", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns transfer_id, old_room_id, new_room_id on success", async () => {
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "tenants") {
        if (callCounts.tenants === 1) return makeChain({ data: mockTenantForTransfer, error: null })
        return makeChain({ data: null, error: null })
      }
      if (table === "rooms") return makeChain({ data: callCounts.rooms === 1 ? mockNewRoom : [{ occupied_beds: 0 }], error: null })
      if (table === "room_transfers") return makeChain({ data: { id: "transfer-1" }, error: null })
      if (table === "tenant_stays") {
        if (callCounts.tenant_stays === 1) return makeChain({ data: { id: "stay-1", room_id: "r1" }, error: null })
        return makeChain({ data: null, error: null })
      }
      return makeChain({ data: null, error: null })
    })
    const result = await transferRoom(validTransferInput, ACTOR_ID, "owner", WORKSPACE_ID)
    expect(result.success).toBe(true)
    expect(result.data?.transfer_id).toBe("transfer-1")
    expect(result.data?.old_room_id).toBe("r1")
    expect(result.data?.new_room_id).toBe("r2")
  })
})
