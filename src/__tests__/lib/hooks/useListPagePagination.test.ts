/**
 * Tests for useListPagePagination from src/lib/hooks/list-page/useListPagePagination.ts
 *
 * Covers: initial state, pagination computation (totalPages, hasNextPage,
 * hasPrevPage), setPageState, setPageSizeState, setTotal.
 */

import { renderHook, act } from "@testing-library/react"
import { useListPagePagination } from "@/lib/hooks/list-page/useListPagePagination"

// ============================================================================
// Initial state
// ============================================================================

describe("useListPagePagination — initial state", () => {
  it("starts at page 1 with the configured default page size", () => {
    const { result } = renderHook(() => useListPagePagination({ defaultPageSize: 25 }))
    expect(result.current.page).toBe(1)
    expect(result.current.pageSize).toBe(25)
    expect(result.current.total).toBe(0)
  })

  it("pagination has totalPages=1, hasNextPage=false, hasPrevPage=false when total=0", () => {
    const { result } = renderHook(() => useListPagePagination({ defaultPageSize: 10 }))
    expect(result.current.pagination.totalPages).toBe(1) // Math.ceil(0/10) || 1
    expect(result.current.pagination.hasNextPage).toBe(false)
    expect(result.current.pagination.hasPrevPage).toBe(false)
  })
})

// ============================================================================
// Pagination computation
// ============================================================================

describe("useListPagePagination — pagination computation", () => {
  it("computes totalPages correctly", () => {
    const { result } = renderHook(() => useListPagePagination({ defaultPageSize: 10 }))
    act(() => { result.current.setTotal(45) })
    expect(result.current.pagination.totalPages).toBe(5) // ceil(45/10)
  })

  it("computes totalPages=1 when total equals pageSize", () => {
    const { result } = renderHook(() => useListPagePagination({ defaultPageSize: 25 }))
    act(() => { result.current.setTotal(25) })
    expect(result.current.pagination.totalPages).toBe(1)
  })

  it("hasNextPage=true on page 1 of 3", () => {
    const { result } = renderHook(() => useListPagePagination({ defaultPageSize: 10 }))
    act(() => { result.current.setTotal(30) })
    expect(result.current.pagination.hasNextPage).toBe(true)
  })

  it("hasNextPage=false on last page", () => {
    const { result } = renderHook(() => useListPagePagination({ defaultPageSize: 10 }))
    act(() => {
      result.current.setTotal(20)
      result.current.setPageState(2)
    })
    expect(result.current.pagination.hasNextPage).toBe(false)
  })

  it("hasPrevPage=false on page 1", () => {
    const { result } = renderHook(() => useListPagePagination({ defaultPageSize: 10 }))
    act(() => { result.current.setTotal(30) })
    expect(result.current.pagination.hasPrevPage).toBe(false)
  })

  it("hasPrevPage=true on page 2", () => {
    const { result } = renderHook(() => useListPagePagination({ defaultPageSize: 10 }))
    act(() => {
      result.current.setTotal(30)
      result.current.setPageState(2)
    })
    expect(result.current.pagination.hasPrevPage).toBe(true)
  })

  it("pagination reflects updated page correctly", () => {
    const { result } = renderHook(() => useListPagePagination({ defaultPageSize: 10 }))
    act(() => {
      result.current.setTotal(50)
      result.current.setPageState(3)
    })
    expect(result.current.pagination.page).toBe(3)
    expect(result.current.pagination.hasNextPage).toBe(true)
    expect(result.current.pagination.hasPrevPage).toBe(true)
  })
})

// ============================================================================
// setPageSizeState
// ============================================================================

describe("useListPagePagination — setPageSizeState", () => {
  it("updates pageSize and recomputes totalPages", () => {
    const { result } = renderHook(() => useListPagePagination({ defaultPageSize: 10 }))
    act(() => {
      result.current.setTotal(50)
      result.current.setPageSizeState(25)
    })
    expect(result.current.pageSize).toBe(25)
    expect(result.current.pagination.totalPages).toBe(2) // ceil(50/25)
  })
})

// ============================================================================
// setTotal
// ============================================================================

describe("useListPagePagination — setTotal", () => {
  it("updates total and pagination", () => {
    const { result } = renderHook(() => useListPagePagination({ defaultPageSize: 10 }))
    act(() => { result.current.setTotal(100) })
    expect(result.current.total).toBe(100)
    expect(result.current.pagination.total).toBe(100)
    expect(result.current.pagination.totalPages).toBe(10)
  })
})
