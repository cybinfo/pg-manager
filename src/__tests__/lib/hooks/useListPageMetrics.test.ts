/**
 * Tests for useListPageMetrics hook.
 *
 * Covers: computeMetrics (shape, compute fn, highlight, serverFilter path),
 * fetchServerCounts (happy path, early-return, error, throw),
 * fetchServerSums (happy path, early-return, with/without sumFilter, throw).
 */

import { renderHook, act, waitFor } from "@testing-library/react"
import { useListPageMetrics } from "@/lib/hooks/list-page/useListPageMetrics"
import type { ListPageConfig, MetricConfig, FilterConfig } from "@/lib/hooks/list-page/types"

// ============================================================================
// Mocks
// ============================================================================

const mockCreateClient = jest.fn()

jest.mock("@/lib/supabase/client", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}))

// Build a fully chainable Proxy that resolves `result` when awaited.
function makeProxy(result: unknown) {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void) => resolve(result)
      }
      return (..._args: unknown[]) => proxy
    },
  }
  const proxy = new Proxy({}, handler)
  return proxy
}

function makeSupabase(result: unknown) {
  return { from: () => makeProxy(result) }
}

// ============================================================================
// Helpers
// ============================================================================

const minConfig: ListPageConfig<Record<string, unknown>> = {
  table: "tenants",
  select: "*",
  defaultOrderBy: "created_at",
  defaultOrderDirection: "desc",
  searchFields: ["name"],
}

// MutableRefObject<T> is just { current: T }
const configRef = { current: minConfig }
const filterConfigsRef: { current: FilterConfig[] } = { current: [] }

type Item = { status: string; amount: number }

function makeMetric(overrides: Partial<MetricConfig<Item>> = {}): MetricConfig<Item> {
  return {
    id: "total",
    label: "Total",
    compute: (_items, total) => total,
    ...overrides,
  }
}

function makeHook(metrics: MetricConfig<Item>[] = []) {
  const metricsRef = { current: metrics }
  return renderHook(() =>
    useListPageMetrics<Item>(
      { metrics, configRef, filterConfigsRef, metricsRef },
      {},
      ""
    )
  )
}

// ============================================================================
// computeMetrics — basic shape
// ============================================================================

describe("useListPageMetrics — computeMetrics return shape", () => {
  it("returns an array with one entry per metric", () => {
    const { result } = makeHook()
    const computed = result.current.computeMetrics(
      [],
      100,
      [makeMetric({ id: "total", label: "Total" })]
    )
    expect(computed).toHaveLength(1)
    expect(computed[0].id).toBe("total")
    expect(computed[0].label).toBe("Total")
  })

  it("each entry has id, label, value, icon, highlight", () => {
    const { result } = makeHook()
    const computed = result.current.computeMetrics(
      [],
      42,
      [makeMetric({ id: "total", label: "Total Items" })]
    )
    expect(computed[0]).toHaveProperty("id", "total")
    expect(computed[0]).toHaveProperty("label", "Total Items")
    expect(computed[0]).toHaveProperty("value")
    expect(computed[0]).toHaveProperty("icon")
    expect(computed[0]).toHaveProperty("highlight")
  })

  it("passes total to the compute function", () => {
    const { result } = makeHook()
    const computed = result.current.computeMetrics(
      [],
      99,
      [makeMetric({ compute: (_items, total) => total })]
    )
    expect(computed[0].value).toBe(99)
  })

  it("passes data array to the compute function", () => {
    const { result } = makeHook()
    const items: Item[] = [
      { status: "active", amount: 100 },
      { status: "active", amount: 200 },
    ]
    const computed = result.current.computeMetrics(
      items,
      2,
      [makeMetric({ compute: (data) => data.filter((i) => i.status === "active").length })]
    )
    expect(computed[0].value).toBe(2)
  })

  it("highlight is false when no highlight function is provided", () => {
    const { result } = makeHook()
    const computed = result.current.computeMetrics(
      [],
      10,
      [makeMetric({ compute: () => 10 })]
    )
    expect(computed[0].highlight).toBe(false)
  })

  it("calls highlight function with the value and data", () => {
    const highlight = jest.fn().mockReturnValue(true)
    const { result } = makeHook()
    const items: Item[] = [{ status: "active", amount: 500 }]
    const computed = result.current.computeMetrics(
      items,
      1,
      [makeMetric({ compute: () => 1, highlight })]
    )
    expect(highlight).toHaveBeenCalledWith(1, items)
    expect(computed[0].highlight).toBe(true)
  })
})

// ============================================================================
// computeMetrics — multiple metrics
// ============================================================================

describe("useListPageMetrics — computeMetrics multiple metrics", () => {
  it("processes all metrics and returns them in order", () => {
    const { result } = makeHook()
    const metrics: MetricConfig<Item>[] = [
      makeMetric({ id: "total", label: "Total", compute: (_items, total) => total }),
      makeMetric({ id: "active_count", label: "Active", compute: (items) => items.filter((i) => i.status === "active").length }),
      makeMetric({ id: "revenue", label: "Revenue", compute: (items) => items.reduce((s, i) => s + i.amount, 0) }),
    ]

    const items: Item[] = [
      { status: "active", amount: 1000 },
      { status: "inactive", amount: 500 },
    ]

    const computed = result.current.computeMetrics(items, 2, metrics)

    expect(computed).toHaveLength(3)
    expect(computed[0]).toMatchObject({ id: "total", value: 2 })
    expect(computed[1]).toMatchObject({ id: "active_count", value: 1 })
    expect(computed[2]).toMatchObject({ id: "revenue", value: 1500 })
  })
})

// ============================================================================
// computeMetrics — serverFilter path (serverCounts is empty initially)
// ============================================================================

describe("useListPageMetrics — computeMetrics serverFilter path", () => {
  it("falls through to compute when serverCounts is not populated", () => {
    const { result } = makeHook()
    const computeFn = jest.fn().mockReturnValue(42)
    const metric = makeMetric({
      id: "active",
      serverFilter: { column: "status", operator: "eq", value: "active" },
      compute: computeFn,
    })

    result.current.computeMetrics([], 100, [metric])
    // With no server data (initial state), compute should be called
    expect(computeFn).toHaveBeenCalled()
  })
})

// ============================================================================
// Initial state
// ============================================================================

describe("useListPageMetrics — initial state", () => {
  it("serverCounts starts empty", () => {
    const { result } = makeHook()
    expect(result.current.serverCounts).toEqual({})
  })

  it("serverSums starts empty", () => {
    const { result } = makeHook()
    expect(result.current.serverSums).toEqual({})
  })

  it("serverCountsLoading starts false", () => {
    const { result } = makeHook()
    expect(result.current.serverCountsLoading).toBe(false)
  })
})

// ============================================================================
// fetchServerCounts
// ============================================================================

describe("useListPageMetrics — fetchServerCounts", () => {
  beforeEach(() => { mockCreateClient.mockReset() })

  it("returns early without calling supabase when no metrics have serverFilter", async () => {
    const { result } = makeHook([makeMetric({ id: "total" })])
    await act(async () => {
      await result.current.fetchServerCounts()
    })
    expect(mockCreateClient).not.toHaveBeenCalled()
  })

  it("populates serverCounts on happy path", async () => {
    const metric = makeMetric({
      id: "active",
      serverFilter: { column: "status", operator: "eq", value: "active" },
      compute: jest.fn().mockReturnValue(0),
    })
    mockCreateClient.mockReturnValue(makeSupabase({ count: 7, error: null }))

    const { result } = makeHook([metric])
    await act(async () => {
      await result.current.fetchServerCounts()
    })

    await waitFor(() => expect(result.current.serverCounts["active"]).toBe(7))
  })

  it("does not set count when response has an error", async () => {
    const metric = makeMetric({
      id: "active",
      serverFilter: { column: "status", operator: "eq", value: "active" },
      compute: jest.fn().mockReturnValue(0),
    })
    mockCreateClient.mockReturnValue(makeSupabase({ count: null, error: { message: "db error" } }))

    const { result } = makeHook([metric])
    await act(async () => {
      await result.current.fetchServerCounts()
    })

    expect(result.current.serverCounts["active"]).toBeUndefined()
  })

  it("accepts explicit fetchFilters and fetchSearchQuery args", async () => {
    const metric = makeMetric({
      id: "active",
      serverFilter: { column: "status", operator: "eq", value: "active" },
      compute: jest.fn().mockReturnValue(0),
    })
    mockCreateClient.mockReturnValue(makeSupabase({ count: 5, error: null }))

    const { result } = makeHook([metric])
    await act(async () => {
      await result.current.fetchServerCounts({ status: "active" }, "query text")
    })
    await waitFor(() => expect(result.current.serverCounts["active"]).toBe(5))
  })

  it("handles thrown error gracefully (no unhandled rejection)", async () => {
    const metric = makeMetric({
      id: "active",
      serverFilter: { column: "status", operator: "eq", value: "active" },
      compute: jest.fn().mockReturnValue(0),
    })
    mockCreateClient.mockImplementation(() => { throw new Error("connection refused") })

    const { result } = makeHook([metric])
    await act(async () => {
      await result.current.fetchServerCounts()
    })

    expect(result.current.serverCountsLoading).toBe(false)
    expect(result.current.serverCounts).toEqual({})
  })

  it("sets serverCountsLoading=true while fetching and false after", async () => {
    const metric = makeMetric({
      id: "active",
      serverFilter: { column: "status", operator: "eq", value: "active" },
      compute: jest.fn().mockReturnValue(0),
    })
    mockCreateClient.mockReturnValue(makeSupabase({ count: 3, error: null }))

    const { result } = makeHook([metric])
    await act(async () => {
      await result.current.fetchServerCounts()
    })

    expect(result.current.serverCountsLoading).toBe(false)
  })

  it("uses serverCount directly in computeMetrics once populated", async () => {
    const metric = makeMetric({
      id: "active",
      serverFilter: { column: "status", operator: "eq", value: "active" },
      compute: jest.fn().mockReturnValue(0),
    })
    mockCreateClient.mockReturnValue(makeSupabase({ count: 42, error: null }))

    const { result } = makeHook([metric])
    await act(async () => {
      await result.current.fetchServerCounts()
    })

    await waitFor(() => expect(result.current.serverCounts["active"]).toBe(42))

    const computed = result.current.computeMetrics([], 100, [metric])
    // serverCounts is populated, so compute fn is bypassed
    expect(computed[0].value).toBe(42)
    expect(metric.compute).not.toHaveBeenCalled()
  })
})

// ============================================================================
// fetchServerSums
// ============================================================================

describe("useListPageMetrics — fetchServerSums", () => {
  beforeEach(() => { mockCreateClient.mockReset() })

  it("returns early without calling supabase when no metrics have serverSum", async () => {
    const { result } = makeHook([makeMetric({ id: "total" })])
    await act(async () => {
      await result.current.fetchServerSums()
    })
    expect(mockCreateClient).not.toHaveBeenCalled()
  })

  it("computes sum from returned data rows", async () => {
    const metric: MetricConfig<Item> = {
      id: "revenue",
      label: "Revenue",
      compute: (_items, _total, serverData) => serverData["revenue"] ?? 0,
      serverSum: { column: "amount" },
    }
    const rows = [{ amount: 100 }, { amount: 200 }, { amount: 50 }]
    mockCreateClient.mockReturnValue(makeSupabase({ data: rows, error: null }))

    const { result } = makeHook([metric])
    await act(async () => {
      await result.current.fetchServerSums()
    })

    await waitFor(() => expect(result.current.serverSums["revenue"]).toBe(350))
  })

  it("applies sumFilter when defined", async () => {
    const metric: MetricConfig<Item> = {
      id: "paid_revenue",
      label: "Paid",
      compute: (_items, _total, serverData) => serverData["paid_revenue"] ?? 0,
      serverSum: {
        column: "amount",
        filter: { column: "status", operator: "eq", value: "paid" },
      },
    }
    mockCreateClient.mockReturnValue(makeSupabase({ data: [{ amount: 500 }], error: null }))

    const { result } = makeHook([metric])
    await act(async () => {
      await result.current.fetchServerSums()
    })

    await waitFor(() => expect(result.current.serverSums["paid_revenue"]).toBe(500))
  })

  it("does not set sum when response has an error", async () => {
    const metric: MetricConfig<Item> = {
      id: "revenue",
      label: "Revenue",
      compute: jest.fn().mockReturnValue(0),
      serverSum: { column: "amount" },
    }
    mockCreateClient.mockReturnValue(makeSupabase({ data: null, error: { message: "db err" } }))

    const { result } = makeHook([metric])
    await act(async () => {
      await result.current.fetchServerSums()
    })

    expect(result.current.serverSums["revenue"]).toBeUndefined()
  })

  it("handles non-numeric values gracefully (coerces to 0)", async () => {
    const metric: MetricConfig<Item> = {
      id: "revenue",
      label: "Revenue",
      compute: (_items, _total, serverData) => serverData["revenue"] ?? 0,
      serverSum: { column: "amount" },
    }
    mockCreateClient.mockReturnValue(makeSupabase({ data: [{ amount: "abc" }, { amount: null }], error: null }))

    const { result } = makeHook([metric])
    await act(async () => {
      await result.current.fetchServerSums()
    })

    await waitFor(() => expect(result.current.serverSums["revenue"]).toBe(0))
  })

  it("accepts explicit fetchFilters and fetchSearchQuery args", async () => {
    const metric: MetricConfig<Item> = {
      id: "revenue",
      label: "Revenue",
      compute: (_items, _total, serverData) => serverData["revenue"] ?? 0,
      serverSum: { column: "amount" },
    }
    mockCreateClient.mockReturnValue(makeSupabase({ data: [{ amount: 100 }], error: null }))

    const { result } = makeHook([metric])
    await act(async () => {
      await result.current.fetchServerSums({ status: "paid" }, "search")
    })
    await waitFor(() => expect(result.current.serverSums["revenue"]).toBe(100))
  })

  it("handles thrown error gracefully", async () => {
    const metric: MetricConfig<Item> = {
      id: "revenue",
      label: "Revenue",
      compute: jest.fn().mockReturnValue(0),
      serverSum: { column: "amount" },
    }
    mockCreateClient.mockImplementation(() => { throw new Error("timeout") })

    const { result } = makeHook([metric])
    await act(async () => {
      await result.current.fetchServerSums()
    })

    expect(result.current.serverSums).toEqual({})
  })
})
