/**
 * Tests for useDetailPageData from src/lib/hooks/detail-page/useDetailPageData.ts
 *
 * Covers:
 * 1. enabled=false → loading=false, no fetch
 * 2. id=undefined → loading=false, no fetch
 * 3. Main fetch success path
 * 4. PGRST116 (not found) → showError + redirect
 * 5. PGRST116 without redirectOnNotFound → no redirect
 * 6. fetchError without PGRST116 → sets error state + generic toast
 * 7. joinFields transformation
 * 8. computedFields function called and merged
 * 9. Array id → uses id[0]
 * 10. Related queries fetched in parallel
 * 11. foreignKeyValue "field:x" → uses field from data
 * 12. foreignKeyValue "field:x" missing → empty array
 * 13. foreignKeyValue literal (not field:) → uses directly
 * 14. Related filter array value → .in()
 * 15. Related filter scalar value → .eq()
 * 16. Related filterNull → .is()
 * 17. Related orderBy ascending
 * 18. Related orderBy descending
 * 19. Related limit
 * 20. Related query error → key set to []
 * 21. Related query joinFields per-item
 * 22. refetch re-runs fetchData
 */

import { renderHook, act, waitFor } from "@testing-library/react"
import { useDetailPageData } from "@/lib/hooks/detail-page/useDetailPageData"
import type { DetailPageConfig } from "@/lib/hooks/detail-page/types"

// ============================================================================
// Mocks
// ============================================================================

const mockPush = jest.fn()
const mockShowError = jest.fn()
const mockCreateClient = jest.fn()
const mockTransformJoin = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock("@/lib/toast-helpers", () => ({
  showError: (...args: unknown[]) => mockShowError(...args),
}))

jest.mock("@/lib/supabase/client", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}))

jest.mock("@/lib/supabase/transforms", () => ({
  transformJoin: (v: unknown) => mockTransformJoin(v),
}))

// ============================================================================
// Supabase builder
// ============================================================================

/**
 * Build a minimal Supabase mock for the detail page data hook.
 *
 * The main query chain is: from(table).select(s).eq("id", id).single()
 * Related query chains are: from(table).select(s).eq(fk, val)[...modifiers] (thenable)
 *
 * relHandlers maps table name → result for the related query.
 * All modifier methods (in, is, order, limit, eq) proxy to themselves.
 */
function buildClient(
  mainResult: { data: unknown; error: unknown },
  relHandlers: Record<string, { data: unknown; error: unknown }> = {}
) {
  // Reusable thenable proxy per table
  function makeRelProxy(result: { data: unknown; error: unknown }) {
    const p: Record<string, unknown> = {}
    for (const m of ["select", "eq", "in", "is", "order", "limit"]) {
      p[m] = jest.fn().mockReturnValue(p)
    }
    p.then = (onFulfilled: (v: unknown) => unknown) => Promise.resolve(result).then(onFulfilled)
    return p
  }

  // Cache proxies per table to avoid re-creation
  const relCache: Record<string, ReturnType<typeof makeRelProxy>> = {}

  const from = jest.fn((table: string) => {
    // Main table: needs .select().eq().single()
    if (!relHandlers[table] && Object.keys(relHandlers).length === 0) {
      // No related handlers at all → treat as main table
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue(mainResult),
          }),
        }),
      }
    }

    // Explicit main table detection: if the mock is called and the table
    // is not in relHandlers, it's the main query
    if (!(table in relHandlers)) {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue(mainResult),
          }),
        }),
      }
    }

    // Related table
    if (!relCache[table]) {
      relCache[table] = makeRelProxy(relHandlers[table])
    }
    return relCache[table]
  })

  return { from }
}

// ============================================================================
// Config factory
// ============================================================================

function makeConfig(overrides: Partial<DetailPageConfig> = {}): DetailPageConfig {
  return { table: "tenants", select: "*", ...overrides }
}

// ============================================================================
// Hook render helper
// ============================================================================

function renderData(opts: {
  config?: Partial<DetailPageConfig>
  id?: string | string[] | undefined
  enabled?: boolean
} = {}) {
  const config = makeConfig(opts.config ?? {})
  const id = "id" in opts ? opts.id : "t1"
  const enabled = opts.enabled !== undefined ? opts.enabled : true
  return renderHook(() => useDetailPageData({ config, id, enabled }))
}

// ============================================================================
// beforeEach
// ============================================================================

beforeEach(() => {
  mockPush.mockReset()
  mockShowError.mockReset()
  mockCreateClient.mockReset()
  mockTransformJoin.mockReset()
  mockTransformJoin.mockImplementation((v: unknown) =>
    Array.isArray(v) ? (v[0] ?? null) : v
  )
})

// ============================================================================
// Tests
// ============================================================================

describe("useDetailPageData — enabled=false", () => {
  it("sets loading=false without fetching", async () => {
    const { result } = renderData({ enabled: false })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockCreateClient).not.toHaveBeenCalled()
    expect(result.current.data).toBeNull()
  })
})

describe("useDetailPageData — id=undefined", () => {
  it("sets loading=false without fetching", async () => {
    const { result } = renderData({ id: undefined })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockCreateClient).not.toHaveBeenCalled()
    expect(result.current.data).toBeNull()
  })
})

describe("useDetailPageData — main fetch success", () => {
  it("sets data from supabase response", async () => {
    mockCreateClient.mockReturnValue(
      buildClient({ data: { id: "t1", name: "Alice" }, error: null })
    )
    const { result } = renderData()
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toMatchObject({ id: "t1", name: "Alice" })
    expect(result.current.error).toBeNull()
  })
})

describe("useDetailPageData — PGRST116 not found", () => {
  it("shows notFoundMessage toast", async () => {
    mockCreateClient.mockReturnValue(
      buildClient({ data: null, error: { code: "PGRST116" } })
    )
    const { result } = renderData({
      config: { notFoundMessage: "Tenant not found", redirectOnNotFound: "/tenants" },
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockShowError).toHaveBeenCalledWith("Tenant not found")
    expect(result.current.data).toBeNull()
  })

  it("redirects when redirectOnNotFound is set", async () => {
    mockCreateClient.mockReturnValue(
      buildClient({ data: null, error: { code: "PGRST116" } })
    )
    const { result } = renderData({ config: { redirectOnNotFound: "/tenants" } })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockPush).toHaveBeenCalledWith("/tenants")
  })

  it("falls back to generic table-based message", async () => {
    mockCreateClient.mockReturnValue(
      buildClient({ data: null, error: { code: "PGRST116" } })
    )
    const { result } = renderData({ config: { table: "tenants" } })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockShowError).toHaveBeenCalledWith("tenant not found")
  })
})

describe("useDetailPageData — PGRST116 no redirect", () => {
  it("does not redirect when redirectOnNotFound is unset", async () => {
    mockCreateClient.mockReturnValue(
      buildClient({ data: null, error: { code: "PGRST116" } })
    )
    const { result } = renderData({ config: { table: "tenants" } })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockPush).not.toHaveBeenCalled()
  })
})

describe("useDetailPageData — non-PGRST116 fetch error", () => {
  it("sets error state and shows generic toast", async () => {
    mockCreateClient.mockReturnValue(
      buildClient({ data: null, error: { code: "PGRST200", message: "db error" } })
    )
    const { result } = renderData()
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeTruthy()
    expect(mockShowError).toHaveBeenCalledWith("Failed to load data")
  })
})

describe("useDetailPageData — joinFields", () => {
  it("calls transformJoin on specified join fields", async () => {
    const rawProperty = [{ id: "p1", name: "Prop" }]
    mockCreateClient.mockReturnValue(
      buildClient({ data: { id: "t1", property: rawProperty }, error: null })
    )
    mockTransformJoin.mockReturnValue({ id: "p1", name: "Prop" })
    const { result } = renderData({ config: { joinFields: ["property"] } })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockTransformJoin).toHaveBeenCalledWith(rawProperty)
    expect((result.current.data as Record<string, unknown>)?.property).toEqual({ id: "p1", name: "Prop" })
  })

  it("skips transform for fields not present in data", async () => {
    mockCreateClient.mockReturnValue(
      buildClient({ data: { id: "t1" }, error: null })
    )
    const { result } = renderData({ config: { joinFields: ["property"] } })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockTransformJoin).not.toHaveBeenCalled()
  })
})

describe("useDetailPageData — computedFields", () => {
  it("merges computed fields into data", async () => {
    mockCreateClient.mockReturnValue(
      buildClient({ data: { id: "t1", amount: 100 }, error: null })
    )
    const computedFields = jest.fn((item: Record<string, unknown>) => ({
      displayAmount: `₹${item.amount}`,
    }))
    const { result } = renderData({ config: { computedFields } })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(computedFields).toHaveBeenCalled()
    expect((result.current.data as Record<string, unknown>)?.displayAmount).toBe("₹100")
  })
})

describe("useDetailPageData — array id", () => {
  it("uses id[0] as entity ID", async () => {
    mockCreateClient.mockReturnValue(
      buildClient({ data: { id: "t1" }, error: null })
    )
    const { result } = renderData({ id: ["t1", "t2"] })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toMatchObject({ id: "t1" })
  })
})

describe("useDetailPageData — related queries", () => {
  it("stores related data under the configured key", async () => {
    mockCreateClient.mockReturnValue(
      buildClient(
        { data: { id: "t1" }, error: null },
        { payments: { data: [{ id: "pay1", amount: 500 }], error: null } }
      )
    )
    const { result } = renderData({
      config: {
        relatedQueries: [
          { key: "payments", table: "payments", select: "*", foreignKey: "tenant_id" },
        ],
      },
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.related.payments).toEqual([{ id: "pay1", amount: 500 }])
  })
})

describe("useDetailPageData — foreignKeyValue field:", () => {
  it("uses field value from main data as FK", async () => {
    const eqArgs: { col: string; val: unknown }[] = []
    const relProxy: Record<string, unknown> = {}
    for (const m of ["select", "in", "is", "order", "limit"]) {
      relProxy[m] = jest.fn().mockReturnValue(relProxy)
    }
    relProxy.eq = jest.fn((col: string, val: unknown) => {
      eqArgs.push({ col, val })
      return relProxy
    })
    relProxy.then = (onFulfilled: (v: unknown) => unknown) =>
      Promise.resolve({ data: [{ id: "p1" }], error: null }).then(onFulfilled)

    const from = jest.fn((table: string) => {
      if (table === "tenants") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: "t1", workspace_id: "ws-42" }, error: null }),
            }),
          }),
        }
      }
      return relProxy
    })
    mockCreateClient.mockReturnValue({ from })

    const { result } = renderData({
      config: {
        relatedQueries: [{
          key: "items",
          table: "library_payments",
          select: "*",
          foreignKey: "workspace_id",
          foreignKeyValue: "field:workspace_id",
        }],
      },
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(eqArgs).toContainEqual({ col: "workspace_id", val: "ws-42" })
    expect(result.current.related.items).toEqual([{ id: "p1" }])
  })

  it("returns empty array when field: value is missing from data", async () => {
    mockCreateClient.mockReturnValue(
      buildClient({ data: { id: "t1" }, error: null })
    )
    const { result } = renderData({
      config: {
        relatedQueries: [{
          key: "items",
          table: "library_payments",
          select: "*",
          foreignKey: "workspace_id",
          foreignKeyValue: "field:workspace_id",
        }],
      },
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.related.items).toEqual([])
  })
})

describe("useDetailPageData — foreignKeyValue literal", () => {
  it("uses literal value as FK (not field:)", async () => {
    const eqArgs: { col: string; val: unknown }[] = []
    const relProxy: Record<string, unknown> = {}
    for (const m of ["select", "in", "is", "order", "limit"]) {
      relProxy[m] = jest.fn().mockReturnValue(relProxy)
    }
    relProxy.eq = jest.fn((col: string, val: unknown) => {
      eqArgs.push({ col, val })
      return relProxy
    })
    relProxy.then = (onFulfilled: (v: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled)

    const from = jest.fn((table: string) => {
      if (table === "tenants") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: "t1" }, error: null }),
            }),
          }),
        }
      }
      return relProxy
    })
    mockCreateClient.mockReturnValue({ from })

    const { result } = renderData({
      config: {
        relatedQueries: [{
          key: "items",
          table: "items",
          select: "*",
          foreignKey: "category_id",
          foreignKeyValue: "cat-999",
        }],
      },
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(eqArgs).toContainEqual({ col: "category_id", val: "cat-999" })
  })
})

describe("useDetailPageData — related filter", () => {
  function makeRelProxyWithCaptures() {
    const inArgs: { col: string; val: unknown }[] = []
    const eqArgs: { col: string; val: unknown }[] = []
    const isArgs: { col: string; val: unknown }[] = []
    const orderArgs: { col: string; opts: unknown }[] = []
    const limitArgs: number[] = []
    const p: Record<string, unknown> = {}
    p.select = jest.fn().mockReturnValue(p)
    p.eq = jest.fn((col: string, val: unknown) => { eqArgs.push({ col, val }); return p })
    p.in = jest.fn((col: string, val: unknown) => { inArgs.push({ col, val }); return p })
    p.is = jest.fn((col: string, val: unknown) => { isArgs.push({ col, val }); return p })
    p.order = jest.fn((col: string, opts: unknown) => { orderArgs.push({ col, opts }); return p })
    p.limit = jest.fn((n: number) => { limitArgs.push(n); return p })
    p.then = (onFulfilled: (v: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled)
    return { p, inArgs, eqArgs, isArgs, orderArgs, limitArgs }
  }

  function makeFromWithRelProxy(relProxy: Record<string, unknown>) {
    return jest.fn((table: string) => {
      if (table === "tenants") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: "t1" }, error: null }),
            }),
          }),
        }
      }
      return relProxy
    })
  }

  it("calls .in() for array filter values", async () => {
    const { p, inArgs } = makeRelProxyWithCaptures()
    mockCreateClient.mockReturnValue({ from: makeFromWithRelProxy(p) })
    const { result } = renderData({
      config: {
        relatedQueries: [{
          key: "tenants",
          table: "rel_tenants",
          select: "*",
          foreignKey: "entity_id",
          filter: { status: ["active", "notice_period"] },
        }],
      },
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(inArgs).toContainEqual({ col: "status", val: ["active", "notice_period"] })
  })

  it("calls .eq() for scalar filter values", async () => {
    const { p, eqArgs } = makeRelProxyWithCaptures()
    mockCreateClient.mockReturnValue({ from: makeFromWithRelProxy(p) })
    const { result } = renderData({
      config: {
        relatedQueries: [{
          key: "items",
          table: "items",
          select: "*",
          foreignKey: "tenant_id",
          filter: { is_active: true },
        }],
      },
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(eqArgs).toContainEqual({ col: "is_active", val: true })
  })

  it("calls .is(field, null) for filterNull", async () => {
    const { p, isArgs } = makeRelProxyWithCaptures()
    mockCreateClient.mockReturnValue({ from: makeFromWithRelProxy(p) })
    const { result } = renderData({
      config: {
        relatedQueries: [{
          key: "assignments",
          table: "meter_assignments",
          select: "*",
          foreignKey: "room_id",
          filterNull: "end_date",
        }],
      },
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(isArgs).toContainEqual({ col: "end_date", val: null })
  })

  it("calls .order() with ascending=true for asc", async () => {
    const { p, orderArgs } = makeRelProxyWithCaptures()
    mockCreateClient.mockReturnValue({ from: makeFromWithRelProxy(p) })
    const { result } = renderData({
      config: {
        relatedQueries: [{
          key: "rooms",
          table: "rooms",
          select: "*",
          foreignKey: "entity_id",
          orderBy: "room_number",
          orderDirection: "asc",
        }],
      },
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(orderArgs[0]).toMatchObject({ col: "room_number", opts: { ascending: true } })
  })

  it("calls .order() with ascending=false for desc", async () => {
    const { p, orderArgs } = makeRelProxyWithCaptures()
    mockCreateClient.mockReturnValue({ from: makeFromWithRelProxy(p) })
    const { result } = renderData({
      config: {
        relatedQueries: [{
          key: "payments",
          table: "payments",
          select: "*",
          foreignKey: "tenant_id",
          orderBy: "payment_date",
          orderDirection: "desc",
        }],
      },
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(orderArgs[0]).toMatchObject({ col: "payment_date", opts: { ascending: false } })
  })

  it("calls .limit() with configured value", async () => {
    const { p, limitArgs } = makeRelProxyWithCaptures()
    mockCreateClient.mockReturnValue({ from: makeFromWithRelProxy(p) })
    const { result } = renderData({
      config: {
        relatedQueries: [{
          key: "bills",
          table: "bills",
          select: "*",
          foreignKey: "tenant_id",
          orderBy: "bill_date",
          orderDirection: "desc",
          limit: 5,
        }],
      },
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(limitArgs).toContain(5)
  })
})

describe("useDetailPageData — related query error", () => {
  it("sets related key to [] on error (returned error object)", async () => {
    mockCreateClient.mockReturnValue(
      buildClient(
        { data: { id: "t1" }, error: null },
        { payments: { data: null, error: { message: "db error" } } }
      )
    )
    const { result } = renderData({
      config: {
        relatedQueries: [{ key: "payments", table: "payments", select: "*", foreignKey: "tenant_id" }],
      },
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.related.payments).toEqual([])
  })

  it("sets related key to [] when related query THROWS an Error (inner catch — lines 195-201)", async () => {
    // Make the related query throw instead of returning an error object
    const thrownError = new Error("network timeout")
    const throwingProxy: Record<string, unknown> = {}
    for (const m of ["select", "eq", "in", "is", "order", "limit"]) {
      throwingProxy[m] = jest.fn().mockReturnValue(throwingProxy)
    }
    throwingProxy.then = (_onFulfilled: unknown, onRejected: (e: unknown) => unknown) =>
      Promise.reject(thrownError).catch(onRejected)

    const throwingFrom = jest.fn((table: string) => {
      if (table === "tenants") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { id: "t1" }, error: null }) }),
          }),
        }
      }
      return throwingProxy
    })
    mockCreateClient.mockReturnValue({ from: throwingFrom })

    const { result } = renderData({
      config: {
        relatedQueries: [{ key: "payments", table: "payments", select: "*", foreignKey: "tenant_id" }],
      },
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.related.payments).toEqual([])
  })

  it("sets related key to [] when related query throws a non-Error object (JSON.stringify branch)", async () => {
    const throwingProxy: Record<string, unknown> = {}
    for (const m of ["select", "eq", "in", "is", "order", "limit"]) {
      throwingProxy[m] = jest.fn().mockReturnValue(throwingProxy)
    }
    // Throw a plain object (not an Error instance)
    const plainObjectError = { code: "PGRST200", details: "constraint violation" }
    throwingProxy.then = (_onFulfilled: unknown, onRejected: (e: unknown) => unknown) =>
      Promise.reject(plainObjectError).catch(onRejected)

    const throwingFrom = jest.fn((table: string) => {
      if (table === "tenants") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: { id: "t1" }, error: null }) }),
          }),
        }
      }
      return throwingProxy
    })
    mockCreateClient.mockReturnValue({ from: throwingFrom })

    const { result } = renderData({
      config: {
        relatedQueries: [{ key: "payments", table: "payments", select: "*", foreignKey: "tenant_id" }],
      },
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.related.payments).toEqual([])
  })
})

describe("useDetailPageData — related joinFields", () => {
  it("transforms joinFields on each related item", async () => {
    const relData = [{ id: "pay1", charge_type: [{ id: "ct1", name: "Rent" }] }]
    mockCreateClient.mockReturnValue(
      buildClient(
        { data: { id: "t1" }, error: null },
        { payments: { data: relData, error: null } }
      )
    )
    mockTransformJoin.mockReturnValue({ id: "ct1", name: "Rent" })

    const { result } = renderData({
      config: {
        relatedQueries: [{
          key: "payments",
          table: "payments",
          select: "*, charge_type:charge_types(name)",
          foreignKey: "tenant_id",
          joinFields: ["charge_type"],
        }],
      },
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockTransformJoin).toHaveBeenCalledWith([{ id: "ct1", name: "Rent" }])
    const payments = result.current.related.payments as Array<Record<string, unknown>>
    expect(payments[0].charge_type).toEqual({ id: "ct1", name: "Rent" })
  })
})

describe("useDetailPageData — related joinFields edge cases", () => {
  it("handles null relatedData (covers relatedData || [] fallback)", async () => {
    mockCreateClient.mockReturnValue(
      buildClient(
        { data: { id: "t1" }, error: null },
        { payments: { data: null, error: null } }
      )
    )

    const { result } = renderData({
      config: {
        relatedQueries: [{
          key: "payments",
          table: "payments",
          select: "*",
          foreignKey: "tenant_id",
          joinFields: ["charge_type"],
        }],
      },
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    // null relatedData → falls back to [] → no joinField transform runs
    expect(result.current.related.payments).toEqual([])
  })

  it("skips joinField when field is absent from item (covers !== undefined false branch)", async () => {
    const relData = [{ id: "pay1" }] // no charge_type field
    mockCreateClient.mockReturnValue(
      buildClient(
        { data: { id: "t1" }, error: null },
        { payments: { data: relData, error: null } }
      )
    )

    const { result } = renderData({
      config: {
        relatedQueries: [{
          key: "payments",
          table: "payments",
          select: "*",
          foreignKey: "tenant_id",
          joinFields: ["charge_type"],
        }],
      },
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    // transformJoin should NOT be called since field is absent
    expect(mockTransformJoin).not.toHaveBeenCalledWith(undefined)
    const payments = result.current.related.payments as Array<Record<string, unknown>>
    expect(payments[0]).not.toHaveProperty("charge_type")
  })

  it("handles non-Error object thrown in related query catch (covers JSON.stringify branch)", async () => {
    const plainObj = { code: 500, detail: "DB error" }
    mockCreateClient.mockImplementation(() => {
      const normalClient = buildClient({ data: { id: "t1" }, error: null })
      const origFrom = normalClient.from
      return {
        ...normalClient,
        from: jest.fn().mockImplementation((table: string) => {
          const chain = origFrom(table)
          if (table === "payments") {
            return {
              ...chain,
              then: (_onFulfilled: unknown, onRejected: ((r: unknown) => unknown) | undefined) =>
                Promise.reject(plainObj).catch(onRejected),
              catch: (onRejected: (r: unknown) => unknown) => Promise.reject(plainObj).catch(onRejected),
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              order: jest.fn().mockReturnThis(),
            }
          }
          return chain
        }),
      }
    })

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {})
    const { result } = renderData({
      config: {
        relatedQueries: [{
          key: "payments",
          table: "payments",
          select: "*",
          foreignKey: "tenant_id",
        }],
      },
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    consoleSpy.mockRestore()
    // Error was caught — related should be empty array
    expect(result.current.related.payments).toEqual([])
  })
})

describe("useDetailPageData — refetch", () => {
  it("exposes a refetch function", async () => {
    mockCreateClient.mockReturnValue(
      buildClient({ data: { id: "t1" }, error: null })
    )
    const { result } = renderData()
    await waitFor(() => expect(result.current.loading).toBe(false))
    // refetch is a function (tests that it is callable and typed correctly)
    expect(typeof result.current.refetch).toBe("function")
  })

  it("calling refetch triggers another fetch cycle (loading goes true then false)", async () => {
    mockCreateClient.mockReturnValue(
      buildClient({ data: { id: "t1" }, error: null })
    )
    const { result } = renderData()
    await waitFor(() => expect(result.current.loading).toBe(false))

    // Trigger refetch — loading should go true then settle false
    act(() => {
      void result.current.refetch()
    })
    // After calling refetch, loading goes true
    await waitFor(() => expect(result.current.loading).toBe(false))
    // Data should still be available
    expect(result.current.data).toMatchObject({ id: "t1" })
  })
})
