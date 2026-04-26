/**
 * Tests for src/lib/hooks/useRowSelection.ts
 */

import { renderHook, act } from "@testing-library/react"
import { useRowSelection } from "@/lib/hooks/useRowSelection"

const ITEMS = [
  { id: "1", name: "Alpha" },
  { id: "2", name: "Beta" },
  { id: "3", name: "Gamma" },
]

describe("useRowSelection", () => {
  describe("initial state", () => {
    it("starts with no rows selected", () => {
      const { result } = renderHook(() => useRowSelection(ITEMS))
      expect(result.current.selectedIds).toHaveLength(0)
      expect(result.current.selectedCount).toBe(0)
    })

    it("isAllSelected is false when nothing is selected", () => {
      const { result } = renderHook(() => useRowSelection(ITEMS))
      expect(result.current.isAllSelected).toBe(false)
    })

    it("isSomeSelected is false when nothing is selected", () => {
      const { result } = renderHook(() => useRowSelection(ITEMS))
      expect(result.current.isSomeSelected).toBe(false)
    })
  })

  describe("toggleRow", () => {
    it("selects a row that was not selected", () => {
      const { result } = renderHook(() => useRowSelection(ITEMS))
      act(() => result.current.toggleRow("1"))
      expect(result.current.selectedIds).toContain("1")
      expect(result.current.selectedCount).toBe(1)
    })

    it("deselects a row that was already selected", () => {
      const { result } = renderHook(() => useRowSelection(ITEMS))
      act(() => result.current.toggleRow("1"))
      act(() => result.current.toggleRow("1"))
      expect(result.current.selectedIds).not.toContain("1")
      expect(result.current.selectedCount).toBe(0)
    })

    it("can select multiple rows independently", () => {
      const { result } = renderHook(() => useRowSelection(ITEMS))
      act(() => result.current.toggleRow("1"))
      act(() => result.current.toggleRow("3"))
      expect(result.current.selectedIds).toContain("1")
      expect(result.current.selectedIds).toContain("3")
      expect(result.current.selectedIds).not.toContain("2")
    })

    it("isSelected returns true for selected row", () => {
      const { result } = renderHook(() => useRowSelection(ITEMS))
      act(() => result.current.toggleRow("2"))
      expect(result.current.isSelected("2")).toBe(true)
    })

    it("isSelected returns false for unselected row", () => {
      const { result } = renderHook(() => useRowSelection(ITEMS))
      expect(result.current.isSelected("2")).toBe(false)
    })
  })

  describe("toggleAll", () => {
    it("selects all rows when none are selected", () => {
      const { result } = renderHook(() => useRowSelection(ITEMS))
      act(() => result.current.toggleAll())
      expect(result.current.selectedCount).toBe(3)
      expect(result.current.isAllSelected).toBe(true)
    })

    it("clears all rows when all are selected", () => {
      const { result } = renderHook(() => useRowSelection(ITEMS))
      act(() => result.current.toggleAll())
      act(() => result.current.toggleAll())
      expect(result.current.selectedCount).toBe(0)
      expect(result.current.isAllSelected).toBe(false)
    })

    it("selects all rows when only some are selected", () => {
      const { result } = renderHook(() => useRowSelection(ITEMS))
      act(() => result.current.toggleRow("1"))
      act(() => result.current.toggleAll())
      expect(result.current.selectedCount).toBe(3)
    })
  })

  describe("clearSelection", () => {
    it("clears all selected rows", () => {
      const { result } = renderHook(() => useRowSelection(ITEMS))
      act(() => result.current.toggleRow("1"))
      act(() => result.current.toggleRow("2"))
      act(() => result.current.clearSelection())
      expect(result.current.selectedCount).toBe(0)
      expect(result.current.selectedIds).toHaveLength(0)
    })
  })

  describe("isSomeSelected", () => {
    it("is true when some but not all rows are selected", () => {
      const { result } = renderHook(() => useRowSelection(ITEMS))
      act(() => result.current.toggleRow("1"))
      expect(result.current.isSomeSelected).toBe(true)
      expect(result.current.isAllSelected).toBe(false)
    })

    it("is false when all rows are selected", () => {
      const { result } = renderHook(() => useRowSelection(ITEMS))
      act(() => result.current.toggleAll())
      expect(result.current.isSomeSelected).toBe(false)
    })
  })

  describe("empty items list", () => {
    it("isAllSelected is false for empty list", () => {
      const { result } = renderHook(() => useRowSelection([]))
      expect(result.current.isAllSelected).toBe(false)
    })

    it("toggleAll on empty list keeps selection empty", () => {
      const { result } = renderHook(() => useRowSelection([]))
      act(() => result.current.toggleAll())
      expect(result.current.selectedCount).toBe(0)
    })
  })
})
