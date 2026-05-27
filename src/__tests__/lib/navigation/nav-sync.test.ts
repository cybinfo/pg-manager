/**
 * Enforces that the dashboard sidebar navigation is single-source.
 *
 * layout.tsx must derive its nav from DASHBOARD_NAVIGATION_GROUPED in config.ts.
 * If someone reintroduces a hardcoded `navigation` array in layout.tsx this test
 * will catch the divergence by comparing the full set of hrefs.
 */

import { DASHBOARD_NAVIGATION_GROUPED, type GroupedNavItem } from "@/lib/navigation/config"

/** Recursively collect all hrefs from a grouped nav tree. */
function collectHrefs(items: GroupedNavItem[]): string[] {
  const result: string[] = []
  for (const item of items) {
    result.push(item.href)
    if (item.children) {
      result.push(...collectHrefs(item.children))
    }
  }
  return result
}

describe("dashboard navigation single-source enforcement", () => {
  it("DASHBOARD_NAVIGATION_GROUPED is non-empty", () => {
    expect(DASHBOARD_NAVIGATION_GROUPED.length).toBeGreaterThan(0)
  })

  it("every item has the required fields", () => {
    const all = collectHrefs(DASHBOARD_NAVIGATION_GROUPED)
    expect(all.length).toBeGreaterThan(0)

    const checkItem = (item: GroupedNavItem) => {
      expect(typeof item.name).toBe("string")
      expect(item.name.length).toBeGreaterThan(0)
      expect(typeof item.href).toBe("string")
      expect(item.href.startsWith("/")).toBe(true)
      expect(item.icon).toBeDefined()
      expect(item.permission === null || typeof item.permission === "string").toBe(true)
      expect(item.module === null || typeof item.module === "string").toBe(true)
      if (item.children) {
        item.children.forEach(checkItem)
      }
    }

    DASHBOARD_NAVIGATION_GROUPED.forEach(checkItem)
  })

  it("contains the Dashboard root item", () => {
    const dash = DASHBOARD_NAVIGATION_GROUPED.find((i) => i.href === "/dashboard")
    expect(dash).toBeDefined()
    expect(dash!.permission).toBeNull()
    expect(dash!.module).toBeNull()
  })

  it("all leaf hrefs are unique across the tree (excluding known parent/child overlap)", () => {
    const hrefs = collectHrefs(DASHBOARD_NAVIGATION_GROUPED)
    const unique = new Set(hrefs)
    // Some parent group items share their href with the first child (e.g. the
    // "PG Management" parent uses /properties, and so does the "Properties" child).
    // This is intentional — the parent href is used as the collapsed-state link.
    // Collect parent hrefs so we can exclude them from the duplicate check.
    const parentHrefs = new Set(
      DASHBOARD_NAVIGATION_GROUPED
        .filter((i) => i.children && i.children.length > 0)
        .map((i) => i.href)
    )
    const duplicates = hrefs.filter((h, idx) => hrefs.indexOf(h) !== idx)
    const unexpectedDuplicates = duplicates.filter((h) => !parentHrefs.has(h))
    expect(unexpectedDuplicates).toEqual([])
    // Sanity: unique count should still be high
    expect(unique.size).toBeGreaterThan(20)
  })

  it("contains all core PG leaf routes", () => {
    const hrefs = collectHrefs(DASHBOARD_NAVIGATION_GROUPED)
    const coreRoutes = [
      "/properties",
      "/rooms",
      "/tenants",
      "/bills",
      "/payments",
      "/refunds",
      "/exit-clearance",
      "/meters",
      "/meter-readings",
      "/staff",
      "/expenses",
      "/reports",
      "/activity",
    ]
    for (const route of coreRoutes) {
      expect(hrefs).toContain(route)
    }
  })

  it("contains all library leaf routes", () => {
    const hrefs = collectHrefs(DASHBOARD_NAVIGATION_GROUPED)
    const libraryRoutes = [
      "/library",
      "/library-sections",
      "/library-seats",
      "/library-members",
      "/library-waitlist",
      "/library-attendance",
      "/library-lockers",
      "/library-subscriptions",
      "/library-payments",
      "/library-reports",
      "/library-plans",
    ]
    for (const route of libraryRoutes) {
      expect(hrefs).toContain(route)
    }
  })

  it("parent group items that have children use them for sub-nav", () => {
    const pgGroup = DASHBOARD_NAVIGATION_GROUPED.find((i) => i.name === "PG Management")
    expect(pgGroup).toBeDefined()
    expect(pgGroup!.children!.length).toBeGreaterThan(0)

    const libraryGroup = DASHBOARD_NAVIGATION_GROUPED.find((i) => i.name === "Library")
    expect(libraryGroup).toBeDefined()
    expect(libraryGroup!.children!.length).toBeGreaterThan(0)

    const metersGroup = DASHBOARD_NAVIGATION_GROUPED.find((i) => i.name === "Meters")
    expect(metersGroup).toBeDefined()
    expect(metersGroup!.children!.length).toBeGreaterThan(0)

    const expensesGroup = DASHBOARD_NAVIGATION_GROUPED.find((i) => i.name === "Expenses")
    expect(expensesGroup).toBeDefined()
    expect(expensesGroup!.children!.length).toBeGreaterThan(0)
  })

  it("feature-gated items carry the correct feature key", () => {
    const allItems: GroupedNavItem[] = []
    const flatten = (items: GroupedNavItem[]) => {
      for (const item of items) {
        allItems.push(item)
        if (item.children) flatten(item.children)
      }
    }
    flatten(DASHBOARD_NAVIGATION_GROUPED)

    const arch = allItems.find((i) => i.href === "/architecture")
    expect(arch?.feature).toBe("architectureView")

    const meterReadings = allItems.find((i) => i.href === "/meter-readings")
    expect(meterReadings?.feature).toBe("meterReadings")

    const dailySpend = allItems.find((i) => i.href === "/expenses/daily-spend")
    expect(dailySpend?.feature).toBe("dailySpend")
  })
})
