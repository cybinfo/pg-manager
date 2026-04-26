/**
 * Tests for useBackNavigation hook and buildDetailHref helper.
 */

const mockGet = jest.fn()

jest.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: mockGet }),
}))

import { renderHook } from "@testing-library/react"
import { useBackNavigation, buildDetailHref } from "@/lib/hooks/useBackNavigation"

// ============================================================================
// useBackNavigation hook
// ============================================================================

describe("useBackNavigation", () => {
  beforeEach(() => { mockGet.mockReset() })

  it("returns defaultHref and isDynamic=false when no 'from' param", () => {
    mockGet.mockReturnValue(null)
    const { result } = renderHook(() =>
      useBackNavigation({ defaultHref: "/tenants", defaultLabel: "Tenants" })
    )

    expect(result.current.backHref).toBe("/tenants")
    expect(result.current.backLabel).toBe("Tenants")
    expect(result.current.isDynamic).toBe(false)
  })

  it("uses 'Back' as default label when defaultLabel is not provided", () => {
    mockGet.mockReturnValue(null)
    const { result } = renderHook(() =>
      useBackNavigation({ defaultHref: "/tenants" })
    )

    expect(result.current.backLabel).toBe("Back")
  })

  it("returns defaultHref when 'from' does not start with / (external URL rejection)", () => {
    mockGet.mockReturnValue("https://evil.com/path")
    const { result } = renderHook(() =>
      useBackNavigation({ defaultHref: "/tenants", defaultLabel: "Tenants" })
    )

    expect(result.current.backHref).toBe("/tenants")
    expect(result.current.isDynamic).toBe(false)
  })

  it("uses 'from' param as backHref with known module label when valid", () => {
    // basePath = "/" + split("/").filter(Boolean)[0] — must be a clean path segment
    mockGet.mockReturnValue("/payments/detail")
    const { result } = renderHook(() =>
      useBackNavigation({ defaultHref: "/payments" })
    )

    expect(result.current.backHref).toBe("/payments/detail")
    expect(result.current.backLabel).toBe("All Payments")
    expect(result.current.isDynamic).toBe(true)
  })

  it("falls back to defaultLabel when 'from' base path is unknown", () => {
    mockGet.mockReturnValue("/unknown-module/detail")
    const { result } = renderHook(() =>
      useBackNavigation({ defaultHref: "/fallback", defaultLabel: "Go Back" })
    )

    expect(result.current.backHref).toBe("/unknown-module/detail")
    expect(result.current.backLabel).toBe("Go Back")
    expect(result.current.isDynamic).toBe(true)
  })

  it("resolves label for library-members path", () => {
    mockGet.mockReturnValue("/library-members/abc")
    const { result } = renderHook(() =>
      useBackNavigation({ defaultHref: "/library-members" })
    )

    expect(result.current.backLabel).toBe("All Members")
  })
})

// ============================================================================
// buildDetailHref
// ============================================================================

describe("buildDetailHref", () => {
  it("appends from parameter to a clean URL", () => {
    const result = buildDetailHref("/tenants/123", "/tenants")
    expect(result).toBe("/tenants/123?from=%2Ftenants")
  })

  it("URL-encodes the from value", () => {
    const result = buildDetailHref("/tenants/123", "/tenants", "status=active&page=2")
    expect(result).toContain("from=")
    expect(result).toContain(encodeURIComponent("/tenants?status=active&page=2"))
  })

  it("includes search params in the from value", () => {
    const result = buildDetailHref("/tenants/123", "/tenants", "filter=active")
    const decoded = decodeURIComponent(result.split("from=")[1])
    expect(decoded).toBe("/tenants?filter=active")
  })

  it("uses & separator when detailHref already has query params", () => {
    const result = buildDetailHref("/tenants/123?view=detail", "/tenants")
    expect(result).toContain("&from=")
    expect(result).not.toContain("?from=")
  })

  it("uses ? separator when detailHref has no query params", () => {
    const result = buildDetailHref("/tenants/123", "/tenants")
    expect(result).toContain("?from=")
  })

  it("handles fromValue without search params (no currentSearch)", () => {
    const result = buildDetailHref("/members/abc", "/library-members")
    const decoded = decodeURIComponent(result.split("from=")[1])
    expect(decoded).toBe("/library-members")
  })

  it("handles empty currentSearch gracefully (omits query string)", () => {
    const result = buildDetailHref("/tenants/123", "/tenants", "")
    const decoded = decodeURIComponent(result.split("from=")[1])
    // Empty string means no search, so from = just the path
    expect(decoded).toBe("/tenants")
  })
})
