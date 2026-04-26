/**
 * Tests for computeMetrics from src/lib/hooks/list-page/useListPageMetrics.ts
 *
 * Covers: compute function invocation, return shape, highlight flag,
 * serverFilter path (when serverCounts populated vs empty).
 *
 * Note: fetchServerCounts / fetchServerSums require Supabase and are skipped.
 */

import { renderHook } from "@testing-library/react"
import { useListPageMetrics } from "@/lib/hooks/list-page/useListPageMetrics"
import type { ListPageConfig, MetricConfig, FilterConfig } from "@/lib/hooks/list-page/types"

// ============================================================================
// Mocks
// ============================================================================

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(),
}))

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
