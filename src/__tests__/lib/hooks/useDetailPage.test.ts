/**
 * Tests for useDetailPage from src/lib/hooks/useDetailPage.ts
 *
 * useDetailPage composes useDetailPageData and useDetailPageMutations.
 * We mock both sub-hooks and verify the combined return shape.
 */

import { renderHook } from "@testing-library/react"

// ============================================================================
// Mocks — control sub-hook output
// ============================================================================

const mockDataHookReturn = {
  data: null as unknown,
  setData: jest.fn(),
  related: {} as Record<string, unknown[]>,
  loading: false,
  error: null as Error | null,
  refetch: jest.fn(),
}

const mockMutationsHookReturn = {
  updateField: jest.fn(),
  updateFields: jest.fn(),
  deleteRecord: jest.fn(),
  isDeleting: false,
  isSaving: false,
}

jest.mock("@/lib/hooks/detail-page/useDetailPageData", () => ({
  useDetailPageData: jest.fn(() => mockDataHookReturn),
}))

jest.mock("@/lib/hooks/detail-page/useDetailPageMutations", () => ({
  useDetailPageMutations: jest.fn(() => mockMutationsHookReturn),
}))

import { useDetailPage } from "@/lib/hooks/useDetailPage"
import { useDetailPageData } from "@/lib/hooks/detail-page/useDetailPageData"
import { useDetailPageMutations } from "@/lib/hooks/detail-page/useDetailPageMutations"
const mockUseData = useDetailPageData as jest.Mock
const mockUseMutations = useDetailPageMutations as jest.Mock

const BASE_CONFIG = { table: "tenants", select: "*" }

// ============================================================================
// Tests
// ============================================================================

describe("useDetailPage — composition", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDataHookReturn.data = null
    mockDataHookReturn.loading = false
    mockDataHookReturn.error = null
    mockMutationsHookReturn.isDeleting = false
    mockMutationsHookReturn.isSaving = false
  })

  it("passes config and id to useDetailPageData", () => {
    renderHook(() => useDetailPage({ config: BASE_CONFIG, id: "tenant-1" }))
    expect(mockUseData).toHaveBeenCalledWith(
      expect.objectContaining({ config: BASE_CONFIG, id: "tenant-1", enabled: true })
    )
  })

  it("passes enabled=false when provided", () => {
    renderHook(() => useDetailPage({ config: BASE_CONFIG, id: "t1", enabled: false }))
    expect(mockUseData).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false })
    )
  })

  it("defaults enabled=true when not specified", () => {
    renderHook(() => useDetailPage({ config: BASE_CONFIG, id: "t1" }))
    expect(mockUseData).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true })
    )
  })

  it("passes config, id, data, and setData to useDetailPageMutations", () => {
    const data = { id: "t1", name: "Alice" }
    mockDataHookReturn.data = data
    renderHook(() => useDetailPage({ config: BASE_CONFIG, id: "t1" }))
    expect(mockUseMutations).toHaveBeenCalledWith(
      expect.objectContaining({ config: BASE_CONFIG, id: "t1" })
    )
  })

  it("returns data from useDetailPageData", () => {
    const data = { id: "t1", name: "Bob" }
    mockDataHookReturn.data = data
    const { result } = renderHook(() => useDetailPage({ config: BASE_CONFIG, id: "t1" }))
    expect(result.current.data).toBe(data)
  })

  it("returns related from useDetailPageData", () => {
    const related = { payments: [{ id: "p1" }] }
    mockDataHookReturn.related = related
    const { result } = renderHook(() => useDetailPage({ config: BASE_CONFIG, id: "t1" }))
    expect(result.current.related).toBe(related)
  })

  it("returns loading from useDetailPageData", () => {
    mockDataHookReturn.loading = true
    const { result } = renderHook(() => useDetailPage({ config: BASE_CONFIG, id: "t1" }))
    expect(result.current.loading).toBe(true)
  })

  it("returns error from useDetailPageData", () => {
    const err = new Error("fetch failed")
    mockDataHookReturn.error = err
    const { result } = renderHook(() => useDetailPage({ config: BASE_CONFIG, id: "t1" }))
    expect(result.current.error).toBe(err)
  })

  it("returns refetch from useDetailPageData", () => {
    const { result } = renderHook(() => useDetailPage({ config: BASE_CONFIG, id: "t1" }))
    expect(result.current.refetch).toBe(mockDataHookReturn.refetch)
  })

  it("returns updateField from useDetailPageMutations", () => {
    const { result } = renderHook(() => useDetailPage({ config: BASE_CONFIG, id: "t1" }))
    expect(result.current.updateField).toBe(mockMutationsHookReturn.updateField)
  })

  it("returns updateFields from useDetailPageMutations", () => {
    const { result } = renderHook(() => useDetailPage({ config: BASE_CONFIG, id: "t1" }))
    expect(result.current.updateFields).toBe(mockMutationsHookReturn.updateFields)
  })

  it("returns deleteRecord from useDetailPageMutations", () => {
    const { result } = renderHook(() => useDetailPage({ config: BASE_CONFIG, id: "t1" }))
    expect(result.current.deleteRecord).toBe(mockMutationsHookReturn.deleteRecord)
  })

  it("returns isDeleting from useDetailPageMutations", () => {
    mockMutationsHookReturn.isDeleting = true
    const { result } = renderHook(() => useDetailPage({ config: BASE_CONFIG, id: "t1" }))
    expect(result.current.isDeleting).toBe(true)
  })

  it("returns isSaving from useDetailPageMutations", () => {
    mockMutationsHookReturn.isSaving = true
    const { result } = renderHook(() => useDetailPage({ config: BASE_CONFIG, id: "t1" }))
    expect(result.current.isSaving).toBe(true)
  })
})
