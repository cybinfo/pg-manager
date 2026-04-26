/**
 * Tests for useListPageGrouping from src/lib/hooks/list-page/useListPageGrouping.ts
 *
 * Covers: group state management, fetchGroupCounts paths (no groups, success, error,
 * joinFields transform, null values), and the groupConfig memo.
 *
 * NOTE: filters and searchQuery MUST be defined outside renderHook callbacks as stable
 * references. Inline {} creates a new object on every render, which causes
 * useCallback to recreate fetchGroupCounts → triggers the dependent effect → infinite loop.
 */

import { renderHook, act } from "@testing-library/react"

// ============================================================================
// Mock dependencies
// ============================================================================

const mockFrom = jest.fn()
const mockSupabaseInstance = { from: mockFrom }

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => mockSupabaseInstance),
}))

jest.mock("@/lib/supabase/transforms", () => ({
  transformArrayJoins: jest.fn((data: unknown[]) => data),
}))

const mockApplyBase = jest.fn()
jest.mock("@/lib/hooks/list-page/utils", () => ({
  getNestedValue: jest.requireActual("@/lib/hooks/list-page/utils").getNestedValue,
  applyBaseFiltersToQuery: (...args: unknown[]) => mockApplyBase(...args),
}))

import { useListPageGrouping } from "@/lib/hooks/list-page/useListPageGrouping"
import { transformArrayJoins } from "@/lib/supabase/transforms"
const mockTransformArrayJoins = transformArrayJoins as jest.Mock

// ============================================================================
// Helpers
// ============================================================================

const GROUP_OPTIONS = [
  { value: "status", label: "Status" },
  { value: "type", label: "Type" },
]

// Stable empty objects — NEVER create inline in renderHook callbacks
const EMPTY_FILTERS: Record<string, string> = {}
const EMPTY_SEARCH = ""

function makeConfig(overrides?: Record<string, unknown>) {
  return { table: "items", select: "*", joinFields: [] as string[], ...overrides }
}

function makeRefs(configOverride?: Record<string, unknown>) {
  const config = makeConfig(configOverride)
  return {
    configRef: { current: config } as React.MutableRefObject<typeof config>,
    filterConfigsRef: { current: [] } as React.MutableRefObject<unknown[]>,
  }
}

/** Create a one-shot thenable that resolves to result */
function makeThenable(result: { data: unknown; error: unknown }) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    // Thenable protocol: resolve synchronously with result
    then: (onFulfilled: (v: unknown) => unknown) => Promise.resolve(result).then(onFulfilled),
  }
}

function setupSupabase(result: { data: unknown; error: unknown }) {
  const thenable = makeThenable(result)
  mockFrom.mockReturnValue(thenable)
  mockApplyBase.mockImplementation((_q: unknown) => thenable)
  return thenable
}

// ============================================================================
// Initial state — NO groups active, no Supabase call needed
// ============================================================================

describe("initial state (no groups)", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("selectedGroups starts empty when initialGroups=[]", () => {
    const { configRef, filterConfigsRef } = makeRefs()
    const { result } = renderHook(() =>
      useListPageGrouping(
        { groupByOptions: GROUP_OPTIONS, initialGroups: [], configRef, filterConfigsRef },
        EMPTY_FILTERS,
        EMPTY_SEARCH
      )
    )
    expect(result.current.selectedGroups).toEqual([])
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it("groupCounts starts empty", () => {
    const { configRef, filterConfigsRef } = makeRefs()
    const { result } = renderHook(() =>
      useListPageGrouping(
        { groupByOptions: GROUP_OPTIONS, initialGroups: [], configRef, filterConfigsRef },
        EMPTY_FILTERS,
        EMPTY_SEARCH
      )
    )
    expect(result.current.groupCounts).toEqual({})
  })

  it("groupConfig is empty array when no groups selected", () => {
    const { configRef, filterConfigsRef } = makeRefs()
    const { result } = renderHook(() =>
      useListPageGrouping(
        { groupByOptions: GROUP_OPTIONS, initialGroups: [], configRef, filterConfigsRef },
        EMPTY_FILTERS,
        EMPTY_SEARCH
      )
    )
    expect(result.current.groupConfig).toEqual([])
  })

  it("exposes setSelectedGroups and fetchGroupCounts as functions", () => {
    const { configRef, filterConfigsRef } = makeRefs()
    const { result } = renderHook(() =>
      useListPageGrouping(
        { groupByOptions: GROUP_OPTIONS, initialGroups: [], configRef, filterConfigsRef },
        EMPTY_FILTERS,
        EMPTY_SEARCH
      )
    )
    expect(typeof result.current.setSelectedGroups).toBe("function")
    expect(typeof result.current.fetchGroupCounts).toBe("function")
  })
})

// ============================================================================
// setSelectedGroups
// ============================================================================

describe("setSelectedGroups", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("updates selectedGroups state", async () => {
    setupSupabase({ data: [], error: null })
    const { configRef, filterConfigsRef } = makeRefs()
    const { result } = renderHook(() =>
      useListPageGrouping(
        { groupByOptions: GROUP_OPTIONS, initialGroups: [], configRef, filterConfigsRef },
        EMPTY_FILTERS,
        EMPTY_SEARCH
      )
    )
    await act(async () => { result.current.setSelectedGroups(["status"]) })
    expect(result.current.selectedGroups).toEqual(["status"])
  })

  it("setting back to empty array clears selectedGroups", async () => {
    setupSupabase({ data: [], error: null })
    const { configRef, filterConfigsRef } = makeRefs()
    const { result } = renderHook(() =>
      useListPageGrouping(
        { groupByOptions: GROUP_OPTIONS, initialGroups: [], configRef, filterConfigsRef },
        EMPTY_FILTERS,
        EMPTY_SEARCH
      )
    )
    await act(async () => { result.current.setSelectedGroups(["status"]) })
    await act(async () => { result.current.setSelectedGroups([]) })
    expect(result.current.selectedGroups).toEqual([])
  })
})

// ============================================================================
// fetchGroupCounts — explicit call with empty groups
// ============================================================================

describe("fetchGroupCounts — empty groups arg", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("clears groupCounts and does not call Supabase", async () => {
    const { configRef, filterConfigsRef } = makeRefs()
    const { result } = renderHook(() =>
      useListPageGrouping(
        { groupByOptions: GROUP_OPTIONS, initialGroups: [], configRef, filterConfigsRef },
        EMPTY_FILTERS,
        EMPTY_SEARCH
      )
    )
    await act(async () => { await result.current.fetchGroupCounts([]) })
    expect(mockFrom).not.toHaveBeenCalled()
    expect(result.current.groupCounts).toEqual({})
  })
})

// ============================================================================
// fetchGroupCounts — success path
// ============================================================================

describe("fetchGroupCounts — success", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("counts rows by group field using 'field:value' keys", async () => {
    setupSupabase({
      data: [{ status: "active" }, { status: "active" }, { status: "inactive" }],
      error: null,
    })
    const { configRef, filterConfigsRef } = makeRefs()
    const { result } = renderHook(() =>
      useListPageGrouping(
        { groupByOptions: GROUP_OPTIONS, initialGroups: [], configRef, filterConfigsRef },
        EMPTY_FILTERS,
        EMPTY_SEARCH
      )
    )
    await act(async () => { await result.current.fetchGroupCounts(["status"]) })
    expect(result.current.groupCounts["status:active"]).toBe(2)
    expect(result.current.groupCounts["status:inactive"]).toBe(1)
  })

  it("uses '__null__' key for null values", async () => {
    setupSupabase({ data: [{ status: null }, { status: "active" }], error: null })
    const { configRef, filterConfigsRef } = makeRefs()
    const { result } = renderHook(() =>
      useListPageGrouping(
        { groupByOptions: GROUP_OPTIONS, initialGroups: [], configRef, filterConfigsRef },
        EMPTY_FILTERS,
        EMPTY_SEARCH
      )
    )
    await act(async () => { await result.current.fetchGroupCounts(["status"]) })
    expect(result.current.groupCounts["status:__null__"]).toBe(1)
    expect(result.current.groupCounts["status:active"]).toBe(1)
  })

  it("counts multiple group fields independently", async () => {
    setupSupabase({
      data: [
        { status: "active", type: "A" },
        { status: "active", type: "B" },
        { status: "inactive", type: "A" },
      ],
      error: null,
    })
    const { configRef, filterConfigsRef } = makeRefs()
    const { result } = renderHook(() =>
      useListPageGrouping(
        { groupByOptions: GROUP_OPTIONS, initialGroups: [], configRef, filterConfigsRef },
        EMPTY_FILTERS,
        EMPTY_SEARCH
      )
    )
    await act(async () => { await result.current.fetchGroupCounts(["status", "type"]) })
    expect(result.current.groupCounts["status:active"]).toBe(2)
    expect(result.current.groupCounts["type:A"]).toBe(2)
    expect(result.current.groupCounts["type:B"]).toBe(1)
  })

  it("calls transformArrayJoins when config has joinFields", async () => {
    const data = [{ status: "active" }]
    setupSupabase({ data, error: null })
    mockTransformArrayJoins.mockReturnValueOnce(data)
    const { configRef, filterConfigsRef } = makeRefs({ joinFields: ["room"] })
    const { result } = renderHook(() =>
      useListPageGrouping(
        { groupByOptions: GROUP_OPTIONS, initialGroups: [], configRef, filterConfigsRef },
        EMPTY_FILTERS,
        EMPTY_SEARCH
      )
    )
    await act(async () => { await result.current.fetchGroupCounts(["status"]) })
    expect(mockTransformArrayJoins).toHaveBeenCalledWith(data, ["room"])
  })

  it("skips transformArrayJoins when config has no joinFields", async () => {
    setupSupabase({ data: [{ status: "active" }], error: null })
    const { configRef, filterConfigsRef } = makeRefs({ joinFields: [] })
    const { result } = renderHook(() =>
      useListPageGrouping(
        { groupByOptions: GROUP_OPTIONS, initialGroups: [], configRef, filterConfigsRef },
        EMPTY_FILTERS,
        EMPTY_SEARCH
      )
    )
    await act(async () => { await result.current.fetchGroupCounts(["status"]) })
    expect(mockTransformArrayJoins).not.toHaveBeenCalled()
  })
})

// ============================================================================
// fetchGroupCounts — error path
// ============================================================================

describe("fetchGroupCounts — error", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("does not update groupCounts when query returns error", async () => {
    setupSupabase({ data: null, error: new Error("RLS denied") })
    const { configRef, filterConfigsRef } = makeRefs()
    const { result } = renderHook(() =>
      useListPageGrouping(
        { groupByOptions: GROUP_OPTIONS, initialGroups: [], configRef, filterConfigsRef },
        EMPTY_FILTERS,
        EMPTY_SEARCH
      )
    )
    await act(async () => { await result.current.fetchGroupCounts(["status"]) })
    expect(result.current.groupCounts).toEqual({})
  })

  it("does not update groupCounts when query returns null data without error", async () => {
    setupSupabase({ data: null, error: null })
    const { configRef, filterConfigsRef } = makeRefs()
    const { result } = renderHook(() =>
      useListPageGrouping(
        { groupByOptions: GROUP_OPTIONS, initialGroups: [], configRef, filterConfigsRef },
        EMPTY_FILTERS,
        EMPTY_SEARCH
      )
    )
    await act(async () => { await result.current.fetchGroupCounts(["status"]) })
    expect(result.current.groupCounts).toEqual({})
  })

  it("catches thrown exceptions and does not update groupCounts (line 129 catch)", async () => {
    // Make the thenable THROW instead of returning { data, error }
    const throwingThenable = {
      select: jest.fn().mockReturnThis(),
      then: (_onFulfilled: unknown, onRejected: (e: unknown) => unknown) =>
        Promise.reject(new Error("unexpected throw")).catch(onRejected),
    }
    mockFrom.mockReturnValue(throwingThenable)
    mockApplyBase.mockImplementation(() => throwingThenable)

    const { configRef, filterConfigsRef } = makeRefs()
    const { result } = renderHook(() =>
      useListPageGrouping(
        { groupByOptions: GROUP_OPTIONS, initialGroups: [], configRef, filterConfigsRef },
        EMPTY_FILTERS,
        EMPTY_SEARCH
      )
    )
    await act(async () => { await result.current.fetchGroupCounts(["status"]) })
    // Catch block should prevent groupCounts from being updated
    expect(result.current.groupCounts).toEqual({})
  })
})

// ============================================================================
// groupConfig memo
// ============================================================================

describe("groupConfig", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("maps selected group keys to label from groupByOptions", async () => {
    setupSupabase({ data: [], error: null })
    const { configRef, filterConfigsRef } = makeRefs()
    const { result } = renderHook(() =>
      useListPageGrouping(
        { groupByOptions: GROUP_OPTIONS, initialGroups: [], configRef, filterConfigsRef },
        EMPTY_FILTERS,
        EMPTY_SEARCH
      )
    )
    await act(async () => { result.current.setSelectedGroups(["status"]) })
    expect(result.current.groupConfig).toEqual([{ key: "status", label: "Status" }])
  })

  it("groupConfig label is undefined for keys not in groupByOptions", async () => {
    setupSupabase({ data: [], error: null })
    const { configRef, filterConfigsRef } = makeRefs()
    const { result } = renderHook(() =>
      useListPageGrouping(
        { groupByOptions: GROUP_OPTIONS, initialGroups: [], configRef, filterConfigsRef },
        EMPTY_FILTERS,
        EMPTY_SEARCH
      )
    )
    await act(async () => { result.current.setSelectedGroups(["unknown_field"]) })
    expect(result.current.groupConfig).toEqual([{ key: "unknown_field", label: undefined }])
  })
})
