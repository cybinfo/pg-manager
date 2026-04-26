/**
 * Tests for buildDetailHref pure helper from src/lib/hooks/useBackNavigation.ts
 *
 * (useBackNavigation hook depends on next/navigation — not tested here)
 */

import { buildDetailHref } from "@/lib/hooks/useBackNavigation"

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
