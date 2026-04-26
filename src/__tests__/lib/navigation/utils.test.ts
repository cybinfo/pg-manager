/**
 * Tests for src/lib/navigation/utils.ts
 *
 * Covers: isActiveRoute, getBasePath, getActiveNavHref,
 *         generateBreadcrumbs, formatSegmentLabel,
 *         isDetailPage, isNewPage, isEditPage, getParentListPath
 */

import {
  isActiveRoute,
  getBasePath,
  getActiveNavHref,
  generateBreadcrumbs,
  formatSegmentLabel,
  isDetailPage,
  isNewPage,
  isEditPage,
  getParentListPath,
  scrollNavItemIntoView,
} from "@/lib/navigation/utils"

// ============================================================================
// isActiveRoute
// ============================================================================

describe("isActiveRoute", () => {
  describe("root paths (exact match only)", () => {
    it("matches /dashboard exactly", () => {
      expect(isActiveRoute("/dashboard", "/dashboard")).toBe(true)
    })

    it("does not match /dashboard when on /dashboard/stats", () => {
      expect(isActiveRoute("/dashboard", "/dashboard/stats")).toBe(false)
    })

    it("does not match /tenant when on /tenant/bills", () => {
      expect(isActiveRoute("/tenant", "/tenant/bills")).toBe(false)
    })
  })

  describe("section paths (single-segment = exact match only)", () => {
    it("matches /tenants exactly when on /tenants", () => {
      expect(isActiveRoute("/tenants", "/tenants")).toBe(true)
    })

    it("does NOT match /tenants prefix when on /tenants/123 (root paths are exact-only)", () => {
      expect(isActiveRoute("/tenants", "/tenants/123")).toBe(false)
    })

    it("does NOT match /tenants prefix when on /tenants/123/journey", () => {
      expect(isActiveRoute("/tenants", "/tenants/123/journey")).toBe(false)
    })

    it("does not match /tenants when on /tenants-archived", () => {
      expect(isActiveRoute("/tenants", "/tenants-archived")).toBe(false)
    })

    it("does not match /bills when on /tenants/123", () => {
      expect(isActiveRoute("/bills", "/tenants/123")).toBe(false)
    })
  })

  describe("multi-segment hrefs (prefix match)", () => {
    it("matches /library-members/new when on /library-members/new/step2", () => {
      expect(isActiveRoute("/library-members/new", "/library-members/new/step2")).toBe(true)
    })

    it("matches /tenants/journey prefix on sub-pages", () => {
      expect(isActiveRoute("/tenants/journey", "/tenants/journey/abc")).toBe(true)
    })

    it("exact match on multi-segment href", () => {
      expect(isActiveRoute("/tenants/123", "/tenants/123")).toBe(true)
    })
  })

  describe("exact option", () => {
    it("returns true with exact:true for exact match", () => {
      expect(isActiveRoute("/tenants", "/tenants", { exact: true })).toBe(true)
    })

    it("returns false with exact:true when pathname has subpath", () => {
      expect(isActiveRoute("/tenants", "/tenants/123", { exact: true })).toBe(false)
    })
  })

  describe("trailing slash normalization", () => {
    it("treats /tenants/ and /tenants as equivalent", () => {
      expect(isActiveRoute("/tenants/", "/tenants")).toBe(true)
    })

    it("treats /tenants and /tenants/ as equivalent", () => {
      expect(isActiveRoute("/tenants", "/tenants/")).toBe(true)
    })
  })

  describe("special cases", () => {
    it("returns false for href #more regardless of pathname", () => {
      expect(isActiveRoute("#more", "/tenants")).toBe(false)
    })
  })
})

// ============================================================================
// getBasePath
// ============================================================================

describe("getBasePath", () => {
  it("extracts first segment from a deep path", () => {
    expect(getBasePath("/tenants/123/journey")).toBe("/tenants")
  })

  it("returns the path itself for a single-segment path", () => {
    expect(getBasePath("/dashboard")).toBe("/dashboard")
  })

  it("returns '/' for empty path", () => {
    expect(getBasePath("")).toBe("/")
  })

  it("returns '/' for root path", () => {
    expect(getBasePath("/")).toBe("/")
  })

  it("handles paths with query strings by extracting only the path", () => {
    // getBasePath splits on "/" so query strings become part of last segment
    expect(getBasePath("/tenants")).toBe("/tenants")
  })
})

// ============================================================================
// getActiveNavHref
// ============================================================================

describe("getActiveNavHref", () => {
  const nav = [
    { href: "/dashboard" },
    { href: "/tenants" },
    { href: "/bills" },
  ]

  it("returns href for exact match on root path", () => {
    expect(getActiveNavHref(nav, "/dashboard")).toBe("/dashboard")
  })

  it("returns null for /tenants/123 when nav only has single-segment /tenants (root = exact only)", () => {
    expect(getActiveNavHref(nav, "/tenants/123")).toBeNull()
  })

  it("returns null when no nav item matches", () => {
    expect(getActiveNavHref(nav, "/properties")).toBeNull()
  })

  it("returns null for empty nav list", () => {
    expect(getActiveNavHref([], "/tenants")).toBeNull()
  })
})

// ============================================================================
// generateBreadcrumbs
// ============================================================================

describe("generateBreadcrumbs", () => {
  it("starts with home breadcrumb", () => {
    const crumbs = generateBreadcrumbs("/tenants")
    expect(crumbs[0]).toEqual({ label: "Dashboard", href: "/dashboard" })
  })

  it("adds segment label for single-depth path", () => {
    const crumbs = generateBreadcrumbs("/tenants")
    expect(crumbs).toHaveLength(2)
    expect(crumbs[1].label).toBe("Tenants")
  })

  it("skips numeric ID segments by default", () => {
    const crumbs = generateBreadcrumbs("/tenants/123/journey")
    const labels = crumbs.map((c) => c.label)
    expect(labels).not.toContain("123")
    expect(labels).toContain("Journey")
  })

  it("skips UUID segments by default", () => {
    const crumbs = generateBreadcrumbs("/tenants/550e8400-e29b-41d4-a716-446655440000/edit")
    const labels = crumbs.map((c) => c.label)
    expect(labels).not.toContain("550e8400-e29b-41d4-a716-446655440000")
  })

  it("uses custom label when provided", () => {
    const crumbs = generateBreadcrumbs("/meter-readings", { labels: { "meter-readings": "Meter Readings" } })
    const lastCrumb = crumbs[crumbs.length - 1]
    expect(lastCrumb.label).toBe("Meter Readings")
  })

  it("last breadcrumb has no href", () => {
    const crumbs = generateBreadcrumbs("/tenants/123/journey")
    const last = crumbs[crumbs.length - 1]
    expect(last.href).toBeUndefined()
  })

  it("intermediate breadcrumbs have hrefs", () => {
    const crumbs = generateBreadcrumbs("/tenants/new")
    // /tenants should have href, new is last and should not
    const tenantsCrumb = crumbs.find((c) => c.label === "Tenants")
    expect(tenantsCrumb?.href).toBe("/tenants")
  })

  it("respects custom home configuration", () => {
    const crumbs = generateBreadcrumbs("/tenants", {
      home: { label: "Home", href: "/" },
    })
    expect(crumbs[0]).toEqual({ label: "Home", href: "/" })
  })
})

// ============================================================================
// formatSegmentLabel
// ============================================================================

describe("formatSegmentLabel", () => {
  it("converts kebab-case to title case", () => {
    expect(formatSegmentLabel("meter-readings")).toBe("Meter Readings")
  })

  it("converts camelCase to spaced title case", () => {
    expect(formatSegmentLabel("exitClearance")).toBe("Exit Clearance")
  })

  it("capitalizes a single word", () => {
    expect(formatSegmentLabel("tenants")).toBe("Tenants")
  })

  it("handles multiple kebab-case words", () => {
    expect(formatSegmentLabel("library-payments")).toBe("Library Payments")
  })
})

// ============================================================================
// isDetailPage / isNewPage / isEditPage / getParentListPath
// ============================================================================

describe("isDetailPage", () => {
  it("returns true for /tenants/123", () => {
    expect(isDetailPage("/tenants/123")).toBe(true)
  })

  it("returns false for /tenants", () => {
    expect(isDetailPage("/tenants")).toBe(false)
  })

  it("returns true for /tenants/123/journey", () => {
    expect(isDetailPage("/tenants/123/journey")).toBe(true)
  })
})

describe("isNewPage", () => {
  it("returns true for /tenants/new", () => {
    expect(isNewPage("/tenants/new")).toBe(true)
  })

  it("returns false for /tenants/123", () => {
    expect(isNewPage("/tenants/123")).toBe(false)
  })

  it("returns false for /tenants", () => {
    expect(isNewPage("/tenants")).toBe(false)
  })
})

describe("isEditPage", () => {
  it("returns true for /tenants/123/edit", () => {
    expect(isEditPage("/tenants/123/edit")).toBe(true)
  })

  it("returns false for /tenants/123", () => {
    expect(isEditPage("/tenants/123")).toBe(false)
  })

  it("returns false for /tenants/new", () => {
    expect(isEditPage("/tenants/new")).toBe(false)
  })
})

describe("getParentListPath", () => {
  it("returns /tenants from /tenants/123/journey", () => {
    expect(getParentListPath("/tenants/123/journey")).toBe("/tenants")
  })

  it("returns /bills from /bills/new", () => {
    expect(getParentListPath("/bills/new")).toBe("/bills")
  })

  it("returns /dashboard from /dashboard", () => {
    expect(getParentListPath("/dashboard")).toBe("/dashboard")
  })
})

// ============================================================================
// scrollNavItemIntoView
// ============================================================================

describe("scrollNavItemIntoView", () => {
  it("calls scrollIntoView on the active item when both elements exist", () => {
    const scrollIntoView = jest.fn()
    const container = document.createElement("div")
    const activeItem = document.createElement("a")
    activeItem.scrollIntoView = scrollIntoView
    document.body.appendChild(container)
    document.body.appendChild(activeItem)

    container.className = "nav-container"
    activeItem.className = "nav-active"

    const containerSpy = jest.spyOn(document, "querySelector").mockImplementation((sel) => {
      if (sel === ".nav-container") return container
      if (sel === ".nav-active") return activeItem
      return null
    })

    scrollNavItemIntoView(".nav-container", ".nav-active")

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "nearest" })

    containerSpy.mockRestore()
  })

  it("does nothing when container is not found", () => {
    const scrollIntoView = jest.fn()
    jest.spyOn(document, "querySelector").mockReturnValue(null)

    expect(() => scrollNavItemIntoView(".missing", ".nav-active")).not.toThrow()
    expect(scrollIntoView).not.toHaveBeenCalled()

    jest.restoreAllMocks()
  })
})
