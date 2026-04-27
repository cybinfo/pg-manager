/**
 * Tests for useSidebarOrder from src/lib/hooks/useSidebarOrder.ts
 *
 * Tests: applyOrder, reorderMain, reorderChildren, resetOrder
 * Uses localStorage mock.
 */

import { renderHook, act } from "@testing-library/react"
import { useSidebarOrder } from "@/lib/hooks/useSidebarOrder"

const STORAGE_KEY = "sidebar-order"

// ============================================================================
// localStorage mock helpers
// ============================================================================

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY)
}

// ============================================================================
// Fixtures
// ============================================================================

interface NavItem {
  name: string
  children?: NavItem[]
}

const ITEMS: NavItem[] = [
  { name: "Dashboard" },
  { name: "Tenants" },
  { name: "Rooms" },
  { name: "Payments" },
]

// ============================================================================
// applyOrder
// ============================================================================

describe("applyOrder", () => {
  beforeEach(clearStorage)

  it("returns items in original order when no stored order", () => {
    const { result } = renderHook(() => useSidebarOrder())
    const ordered = result.current.applyOrder(ITEMS)
    expect(ordered.map((i) => i.name)).toEqual(["Dashboard", "Tenants", "Rooms", "Payments"])
  })

  it("applies stored order from mainOrder", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mainOrder: ["Rooms", "Dashboard", "Payments", "Tenants"], childOrder: {} })
    )
    const { result } = renderHook(() => useSidebarOrder())
    const ordered = result.current.applyOrder(ITEMS)
    expect(ordered.map((i) => i.name)).toEqual(["Rooms", "Dashboard", "Payments", "Tenants"])
  })

  it("appends unknown items not in stored order at the end", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mainOrder: ["Rooms", "Dashboard"], childOrder: {} })
    )
    const { result } = renderHook(() => useSidebarOrder())
    const ordered = result.current.applyOrder(ITEMS)
    const names = ordered.map((i) => i.name)
    expect(names[0]).toBe("Rooms")
    expect(names[1]).toBe("Dashboard")
    // Tenants and Payments are new — appended in some order
    expect(names).toContain("Tenants")
    expect(names).toContain("Payments")
  })

  it("applies child order when parentName is given", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        mainOrder: [],
        childOrder: { Settings: ["Roles", "Profile", "Billing"] },
      })
    )
    const childItems: NavItem[] = [
      { name: "Profile" },
      { name: "Billing" },
      { name: "Roles" },
    ]
    const { result } = renderHook(() => useSidebarOrder())
    const ordered = result.current.applyOrder(childItems, "Settings")
    expect(ordered.map((i) => i.name)).toEqual(["Roles", "Profile", "Billing"])
  })

  it("skips items in stored order that no longer exist in items list", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        mainOrder: ["Dashboard", "OldModule", "Tenants"],
        childOrder: {},
      })
    )
    const { result } = renderHook(() => useSidebarOrder())
    const items: NavItem[] = [{ name: "Dashboard" }, { name: "Tenants" }]
    const ordered = result.current.applyOrder(items)
    expect(ordered.map((i) => i.name)).toEqual(["Dashboard", "Tenants"])
  })
})

// ============================================================================
// reorderMain
// ============================================================================

describe("reorderMain", () => {
  beforeEach(clearStorage)

  it("moves an item from fromIndex to toIndex", () => {
    const { result } = renderHook(() => useSidebarOrder())
    const names = ITEMS.map((i) => i.name)

    act(() => {
      result.current.reorderMain(0, 2, names)
    })

    // Dashboard moved from index 0 to index 2
    const newOrder = result.current.order.mainOrder
    expect(newOrder[0]).toBe("Tenants")
    expect(newOrder[1]).toBe("Rooms")
    expect(newOrder[2]).toBe("Dashboard")
    expect(newOrder[3]).toBe("Payments")
  })

  it("persists order to localStorage", () => {
    const { result } = renderHook(() => useSidebarOrder())
    const names = ITEMS.map((i) => i.name)

    act(() => {
      result.current.reorderMain(3, 0, names)
    })

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
    expect(stored.mainOrder[0]).toBe("Payments")
  })
})

// ============================================================================
// reorderChildren
// ============================================================================

describe("reorderChildren", () => {
  beforeEach(clearStorage)

  it("reorders children within a parent section", () => {
    const { result } = renderHook(() => useSidebarOrder())
    const childNames = ["Alpha", "Beta", "Gamma"]

    act(() => {
      result.current.reorderChildren("ParentA", 2, 0, childNames)
    })

    const newChildOrder = result.current.order.childOrder["ParentA"]
    expect(newChildOrder[0]).toBe("Gamma")
    expect(newChildOrder[1]).toBe("Alpha")
    expect(newChildOrder[2]).toBe("Beta")
  })

  it("does not affect other parent sections", () => {
    const { result } = renderHook(() => useSidebarOrder())

    act(() => {
      result.current.reorderChildren("ParentA", 0, 1, ["X", "Y"])
    })

    expect(result.current.order.childOrder["ParentB"]).toBeUndefined()
  })

  it("persists child order to localStorage", () => {
    const { result } = renderHook(() => useSidebarOrder())

    act(() => {
      result.current.reorderChildren("Settings", 1, 0, ["Profile", "Billing"])
    })

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
    expect(stored.childOrder["Settings"][0]).toBe("Billing")
  })
})

// ============================================================================
// resetOrder
// ============================================================================

describe("resetOrder", () => {
  it("clears stored order from localStorage and resets state", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mainOrder: ["Rooms", "Dashboard"], childOrder: {} })
    )

    const { result } = renderHook(() => useSidebarOrder())

    act(() => {
      result.current.resetOrder()
    })

    expect(result.current.order.mainOrder).toHaveLength(0)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})

// ============================================================================
// localStorage error paths
// ============================================================================

describe("localStorage error handling", () => {
  it("handles getItem throwing during load — falls back to default state silently", () => {
    const getItemSpy = jest.spyOn(Storage.prototype, "getItem").mockImplementationOnce(() => {
      throw new Error("storage unavailable")
    })

    const { result } = renderHook(() => useSidebarOrder())

    // Falls back to default state — no console.error (errors are silently ignored)
    expect(result.current.isLoaded).toBe(true)
    expect(result.current.order).toEqual({ mainOrder: [], childOrder: {} })

    getItemSpy.mockRestore()
  })

  it("handles setItem throwing during save (line 49 catch block)", () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {})
    const setItemSpy = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded")
    })

    const { result } = renderHook(() => useSidebarOrder())

    // reorderMain internally calls saveOrder which calls localStorage.setItem
    act(() => {
      result.current.reorderMain(0, 1, ["Dashboard", "Rooms"])
    })

    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("Failed to save"),
      expect.any(Error)
    )

    setItemSpy.mockRestore()
    consoleError.mockRestore()
  })
})

// ============================================================================
// isLoaded
// ============================================================================

describe("isLoaded", () => {
  it("becomes true after mount", () => {
    const { result } = renderHook(() => useSidebarOrder())
    expect(result.current.isLoaded).toBe(true)
  })
})
