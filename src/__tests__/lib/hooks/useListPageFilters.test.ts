/**
 * Tests for useListPageFilters from src/lib/hooks/list-page/useListPageFilters.ts
 *
 * Covers: initial state from props, filter state updates, sort config,
 * search query, hidden columns, and localStorage persistence.
 */

import { renderHook, act } from "@testing-library/react"
import { useListPageFilters } from "@/lib/hooks/list-page/useListPageFilters"
import type { ListPageConfig, SortConfig } from "@/lib/hooks/list-page/types"
import type { FilterGroup } from "@/types/table-features.types"

// ============================================================================
// Mocks
// ============================================================================

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => ({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({ data: [], error: null }),
        eq: jest.fn().mockReturnValue({ data: [], error: null }),
      }),
    }),
  })),
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

const emptyAdvanced: FilterGroup = { filters: [], combineMode: "and" }

function makeOptions(overrides: Partial<Parameters<typeof useListPageFilters>[0]> = {}) {
  return {
    config: minConfig,
    filterConfigs: [],
    initialFilters: {},
    initialSort: [] as SortConfig[],
    initialHiddenColumns: [] as string[],
    initialAdvancedFilters: emptyAdvanced,
    ...overrides,
  }
}

// ============================================================================
// Initial state
// ============================================================================

describe("useListPageFilters — initial state", () => {
  it("initialises filters from initialFilters prop", () => {
    const { result } = renderHook(() =>
      useListPageFilters(makeOptions({ initialFilters: { status: "active" } }))
    )
    expect(result.current.filters).toEqual({ status: "active" })
  })

  it("initialises sortConfig from initialSort prop", () => {
    const sort: SortConfig[] = [{ field: "name", direction: "asc" }]
    const { result } = renderHook(() =>
      useListPageFilters(makeOptions({ initialSort: sort }))
    )
    expect(result.current.sortConfig).toEqual(sort)
  })

  it("initialises hiddenColumns from initialHiddenColumns prop", () => {
    const { result } = renderHook(() =>
      useListPageFilters(makeOptions({ initialHiddenColumns: ["phone", "email"] }))
    )
    expect(result.current.hiddenColumns).toEqual(["phone", "email"])
  })

  it("initialises searchQuery as empty string", () => {
    const { result } = renderHook(() => useListPageFilters(makeOptions()))
    expect(result.current.searchQuery).toBe("")
  })

  it("initialises advancedFilters from prop", () => {
    const advanced: FilterGroup = { filters: [], combineMode: "or" }
    const { result } = renderHook(() =>
      useListPageFilters(makeOptions({ initialAdvancedFilters: advanced }))
    )
    expect(result.current.advancedFilters.combineMode).toBe("or")
  })

  it("initialises filterOptions as empty object", () => {
    const { result } = renderHook(() => useListPageFilters(makeOptions()))
    expect(result.current.filterOptions).toEqual({})
  })
})

// ============================================================================
// Filter state updates
// ============================================================================

describe("useListPageFilters — setFiltersState", () => {
  it("updates filters state", () => {
    const { result } = renderHook(() => useListPageFilters(makeOptions()))
    act(() => { result.current.setFiltersState({ status: "pending" }) })
    expect(result.current.filters).toEqual({ status: "pending" })
  })

  it("replaces existing filters entirely", () => {
    const { result } = renderHook(() =>
      useListPageFilters(makeOptions({ initialFilters: { status: "active" } }))
    )
    act(() => { result.current.setFiltersState({ property: "p1" }) })
    expect(result.current.filters).toEqual({ property: "p1" })
    expect(result.current.filters.status).toBeUndefined()
  })
})

// ============================================================================
// Sort config
// ============================================================================

describe("useListPageFilters — setSortConfig", () => {
  it("updates sort config", () => {
    const { result } = renderHook(() => useListPageFilters(makeOptions()))
    const newSort: SortConfig[] = [{ field: "name", direction: "asc" }]
    act(() => { result.current.setSortConfig(newSort) })
    expect(result.current.sortConfig).toEqual(newSort)
  })

  it("sortConfigRef stays in sync with sortConfig state", () => {
    const { result } = renderHook(() => useListPageFilters(makeOptions()))
    const newSort: SortConfig[] = [{ field: "amount", direction: "desc" }]
    act(() => { result.current.setSortConfig(newSort) })
    expect(result.current.sortConfigRef.current).toEqual(newSort)
  })
})

// ============================================================================
// Search query
// ============================================================================

describe("useListPageFilters — setSearchQueryState", () => {
  it("updates search query", () => {
    const { result } = renderHook(() => useListPageFilters(makeOptions()))
    act(() => { result.current.setSearchQueryState("John") })
    expect(result.current.searchQuery).toBe("John")
  })

  it("searchQueryState mirrors searchQuery", () => {
    const { result } = renderHook(() => useListPageFilters(makeOptions()))
    act(() => { result.current.setSearchQueryState("test query") })
    expect(result.current.searchQueryState).toBe("test query")
  })
})

// ============================================================================
// Advanced filters
// ============================================================================

describe("useListPageFilters — setAdvancedFiltersState", () => {
  it("updates advancedFilters state", () => {
    const { result } = renderHook(() => useListPageFilters(makeOptions()))
    const newGroup: FilterGroup = { filters: [], combineMode: "or" }
    act(() => { result.current.setAdvancedFiltersState(newGroup) })
    expect(result.current.advancedFilters.combineMode).toBe("or")
  })

  it("advancedFiltersRef stays in sync", () => {
    const { result } = renderHook(() => useListPageFilters(makeOptions()))
    const newGroup: FilterGroup = { filters: [], combineMode: "or" }
    act(() => { result.current.setAdvancedFiltersState(newGroup) })
    expect(result.current.advancedFiltersRef.current.combineMode).toBe("or")
  })
})

// ============================================================================
// Hidden columns
// ============================================================================

describe("useListPageFilters — setHiddenColumnsState", () => {
  it("updates hiddenColumns state", () => {
    const { result } = renderHook(() => useListPageFilters(makeOptions()))
    act(() => { result.current.setHiddenColumnsState(["email"]) })
    expect(result.current.hiddenColumns).toEqual(["email"])
  })
})

// ============================================================================
// localStorage persistence
// ============================================================================

describe("useListPageFilters — localStorage", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("reads hiddenColumns from localStorage on init when tableKey is set", () => {
    localStorage.setItem(
      "column-visibility:tenants",
      JSON.stringify(["phone", "email"])
    )
    const { result } = renderHook(() =>
      useListPageFilters(makeOptions({ tableKey: "tenants" }))
    )
    expect(result.current.hiddenColumns).toEqual(["phone", "email"])
  })

  it("uses initialHiddenColumns when no localStorage entry for tableKey", () => {
    const { result } = renderHook(() =>
      useListPageFilters(
        makeOptions({ tableKey: "tenants", initialHiddenColumns: ["name"] })
      )
    )
    expect(result.current.hiddenColumns).toEqual(["name"])
  })

  it("persists hiddenColumns to localStorage when tableKey is set", () => {
    const { result } = renderHook(() =>
      useListPageFilters(makeOptions({ tableKey: "tenants" }))
    )
    act(() => { result.current.setHiddenColumnsState(["amount"]) })
    const stored = JSON.parse(localStorage.getItem("column-visibility:tenants") || "null")
    expect(stored).toEqual(["amount"])
  })

  it("does not write to localStorage when tableKey is not set", () => {
    const { result } = renderHook(() => useListPageFilters(makeOptions()))
    act(() => { result.current.setHiddenColumnsState(["amount"]) })
    expect(localStorage.getItem("column-visibility:tenants")).toBeNull()
  })

  it("ignores malformed JSON in localStorage", () => {
    localStorage.setItem("column-visibility:tenants", "not-valid-json")
    const { result } = renderHook(() =>
      useListPageFilters(
        makeOptions({ tableKey: "tenants", initialHiddenColumns: ["fallback"] })
      )
    )
    // Should fall back to initialHiddenColumns when JSON.parse fails
    expect(result.current.hiddenColumns).toEqual(["fallback"])
  })
})
