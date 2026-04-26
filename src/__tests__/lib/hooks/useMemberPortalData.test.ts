/**
 * Tests for useMemberPortalData from src/lib/hooks/useMemberPortalData.ts
 *
 * Covers: hook return values and the internal transformMemberData function
 * (tested indirectly via postTransform captured from usePortalData config).
 */

import type { UseMemberPortalDataReturn } from "@/lib/hooks/useMemberPortalData"

// ============================================================================
// Mock usePortalData so we control what it returns and capture postTransform
// ============================================================================

let capturedConfig: Record<string, unknown> = {}
const mockRefresh = jest.fn()

const mockPortalReturn = {
  data: null as unknown,
  user: null,
  loading: true,
  error: null,
  refresh: mockRefresh,
}

jest.mock("@/lib/hooks/usePortalData", () => ({
  usePortalData: (config: Record<string, unknown>) => {
    capturedConfig = config
    return mockPortalReturn
  },
}))

import { renderHook } from "@testing-library/react"
import { useMemberPortalData } from "@/lib/hooks/useMemberPortalData"

// ============================================================================
// Helpers
// ============================================================================

function callTransform(data: Record<string, unknown>) {
  const postTransform = capturedConfig.postTransform as (d: Record<string, unknown>) => unknown
  return postTransform(data)
}

// ============================================================================
// Hook return values
// ============================================================================

describe("useMemberPortalData", () => {
  beforeEach(() => {
    capturedConfig = {}
    mockPortalReturn.data = null
    mockPortalReturn.user = null
    mockPortalReturn.loading = true
    mockPortalReturn.error = null
  })

  it("returns null library and membership when member is null", () => {
    mockPortalReturn.data = null
    const { result } = renderHook(() => useMemberPortalData())
    expect(result.current.member).toBeNull()
    expect(result.current.library).toBeNull()
    expect(result.current.membership).toBeNull()
  })

  it("extracts library from member.library", () => {
    const lib = { id: "lib-1", name: "Scholar Hub" }
    mockPortalReturn.data = { library: lib, current_subscription: null }
    const { result } = renderHook(() => useMemberPortalData())
    expect(result.current.library).toEqual(lib)
  })

  it("extracts membership from member.current_subscription", () => {
    const sub = { id: "sub-1", plan_name: "9 Hours", status: "active" }
    mockPortalReturn.data = { library: null, current_subscription: sub }
    const { result } = renderHook(() => useMemberPortalData())
    expect(result.current.membership).toEqual(sub)
  })

  it("passes through loading, error, and refresh from usePortalData", () => {
    mockPortalReturn.loading = false
    mockPortalReturn.error = "fetch failed"
    const { result } = renderHook(() => useMemberPortalData())
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe("fetch failed")
    expect(result.current.refresh).toBe(mockRefresh)
  })
})

// ============================================================================
// transformMemberData (via postTransform captured from config)
// ============================================================================

describe("transformMemberData (postTransform)", () => {
  beforeEach(() => {
    capturedConfig = {}
    // Render hook once so capturedConfig is populated
    renderHook(() => useMemberPortalData())
  })

  it("passes through data when assigned_seat is null", () => {
    const data = { id: "m1", assigned_seat: null }
    const result = callTransform(data) as { assigned_seat: null }
    expect(result.assigned_seat).toBeNull()
  })

  it("passes through data when assigned_seat has no section", () => {
    const data = { id: "m1", assigned_seat: { seat_number: "A1", section: null } }
    const result = callTransform(data) as { assigned_seat: { section: null } }
    expect(result.assigned_seat.section).toBeNull()
  })

  it("unwraps array section to first element", () => {
    const section = { name: "AC Hall" }
    const data = { id: "m1", assigned_seat: { seat_number: "A1", section: [section] } }
    const result = callTransform(data) as { assigned_seat: { section: { name: string } } }
    expect(result.assigned_seat.section).toEqual(section)
  })

  it("returns null section when array is empty", () => {
    const data = { id: "m1", assigned_seat: { seat_number: "A1", section: [] } }
    const result = callTransform(data) as { assigned_seat: { section: null } }
    expect(result.assigned_seat.section).toBeNull()
  })

  it("keeps section as-is when it is already an object (not array)", () => {
    const section = { name: "Non-AC Hall" }
    const data = { id: "m1", assigned_seat: { seat_number: "B3", section } }
    const result = callTransform(data) as { assigned_seat: { section: { name: string } } }
    expect(result.assigned_seat.section).toEqual(section)
  })
})
