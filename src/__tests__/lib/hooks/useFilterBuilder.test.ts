/**
 * Tests for useFilterBuilder and useFilterRow hooks
 * from src/lib/hooks/useFilterBuilder.ts
 *
 * Tests the group-level and row-level filter state management logic.
 * (No Supabase dependency — pure React state with useCallback/useMemo)
 */

import { renderHook, act } from "@testing-library/react"
import {
  useFilterBuilder,
  useFilterRow,
  type FilterableColumn,
} from "@/lib/hooks/useFilterBuilder"
import { createEmptyFilterGroup, createEmptyFilter } from "@/types/table-features.types"
import type { FilterGroup, AdvancedFilter } from "@/types/table-features.types"

// ============================================================================
// Test fixtures
// ============================================================================

const NAME_COLUMN: FilterableColumn = {
  key: "name",
  header: "Name",
  filterType: "text",
}

const STATUS_COLUMN: FilterableColumn = {
  key: "status",
  header: "Status",
  filterType: "select",
  filterOptions: [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ],
}

const AMOUNT_COLUMN: FilterableColumn = {
  key: "amount",
  header: "Amount",
  filterType: "number",
  filterKey: "monthly_rent",
}

const COLUMNS: FilterableColumn[] = [NAME_COLUMN, STATUS_COLUMN, AMOUNT_COLUMN]

// ============================================================================
// useFilterBuilder
// ============================================================================

describe("useFilterBuilder", () => {
  describe("initial state", () => {
    it("starts with no active filters", () => {
      const onChange = jest.fn()
      const { result } = renderHook(() =>
        useFilterBuilder({
          columns: COLUMNS,
          value: createEmptyFilterGroup(),
          onChange,
        })
      )
      expect(result.current.activeFilterCount).toBe(0)
      expect(result.current.hasFilters).toBe(false)
    })
  })

  describe("addFilter", () => {
    it("adds a filter for the given column", () => {
      const onChange = jest.fn()
      const { result } = renderHook(() =>
        useFilterBuilder({
          columns: COLUMNS,
          value: createEmptyFilterGroup(),
          onChange,
        })
      )

      act(() => {
        result.current.addFilter(NAME_COLUMN)
      })

      expect(onChange).toHaveBeenCalledTimes(1)
      const newGroup: FilterGroup = onChange.mock.calls[0][0]
      expect(newGroup.filters).toHaveLength(1)
      expect(newGroup.filters[0].column).toBe("name")
      expect(newGroup.filters[0].filterType).toBe("text")
    })

    it("uses filterKey when column has filterKey", () => {
      const onChange = jest.fn()
      const { result } = renderHook(() =>
        useFilterBuilder({
          columns: COLUMNS,
          value: createEmptyFilterGroup(),
          onChange,
        })
      )

      act(() => {
        result.current.addFilter(AMOUNT_COLUMN)
      })

      const newGroup: FilterGroup = onChange.mock.calls[0][0]
      expect(newGroup.filters[0].column).toBe("monthly_rent")
    })

    it("attaches _options when column has filterOptions", () => {
      const onChange = jest.fn()
      const { result } = renderHook(() =>
        useFilterBuilder({
          columns: COLUMNS,
          value: createEmptyFilterGroup(),
          onChange,
        })
      )

      act(() => {
        result.current.addFilter(STATUS_COLUMN)
      })

      const newGroup: FilterGroup = onChange.mock.calls[0][0]
      const added = newGroup.filters[0] as typeof newGroup.filters[0] & { _options?: unknown[] }
      expect(added._options).toEqual(STATUS_COLUMN.filterOptions)
    })
  })

  describe("updateFilter", () => {
    it("updates the filter with the given ID", () => {
      const existingFilter = createEmptyFilter("name", "Name", "text")
      const group: FilterGroup = { filters: [existingFilter], combineMode: "and" }
      const onChange = jest.fn()

      const { result } = renderHook(() =>
        useFilterBuilder({
          columns: COLUMNS,
          value: group,
          onChange,
        })
      )

      act(() => {
        result.current.updateFilter(existingFilter.id, {
          conditions: [{ operator: "contains", value: "Rajat" }],
        })
      })

      const updated: FilterGroup = onChange.mock.calls[0][0]
      expect(updated.filters[0].conditions[0].value).toBe("Rajat")
    })

    it("does not touch other filters", () => {
      const filter1 = createEmptyFilter("name", "Name", "text")
      const filter2 = createEmptyFilter("status", "Status", "select")
      const group: FilterGroup = { filters: [filter1, filter2], combineMode: "and" }
      const onChange = jest.fn()

      const { result } = renderHook(() =>
        useFilterBuilder({
          columns: COLUMNS,
          value: group,
          onChange,
        })
      )

      act(() => {
        result.current.updateFilter(filter1.id, {
          conditions: [{ operator: "contains", value: "test" }],
        })
      })

      const updated: FilterGroup = onChange.mock.calls[0][0]
      expect(updated.filters).toHaveLength(2)
      expect(updated.filters[1].column).toBe("status")
    })
  })

  describe("removeFilter", () => {
    it("removes the filter with the given ID", () => {
      const filter1 = createEmptyFilter("name", "Name", "text")
      const filter2 = createEmptyFilter("status", "Status", "select")
      const group: FilterGroup = { filters: [filter1, filter2], combineMode: "and" }
      const onChange = jest.fn()

      const { result } = renderHook(() =>
        useFilterBuilder({
          columns: COLUMNS,
          value: group,
          onChange,
        })
      )

      act(() => {
        result.current.removeFilter(filter1.id)
      })

      const updated: FilterGroup = onChange.mock.calls[0][0]
      expect(updated.filters).toHaveLength(1)
      expect(updated.filters[0].column).toBe("status")
    })
  })

  describe("clearAllFilters", () => {
    it("resets to empty filter group with AND combine mode", () => {
      const filter1 = createEmptyFilter("name", "Name", "text")
      const group: FilterGroup = { filters: [filter1], combineMode: "or" }
      const onChange = jest.fn()

      const { result } = renderHook(() =>
        useFilterBuilder({
          columns: COLUMNS,
          value: group,
          onChange,
        })
      )

      act(() => {
        result.current.clearAllFilters()
      })

      const cleared: FilterGroup = onChange.mock.calls[0][0]
      expect(cleared.filters).toHaveLength(0)
      expect(cleared.combineMode).toBe("and")
    })
  })

  describe("toggleCombineMode", () => {
    it("switches from AND to OR", () => {
      const group: FilterGroup = { filters: [], combineMode: "and" }
      const onChange = jest.fn()

      const { result } = renderHook(() =>
        useFilterBuilder({
          columns: COLUMNS,
          value: group,
          onChange,
        })
      )

      act(() => {
        result.current.toggleCombineMode()
      })

      const updated: FilterGroup = onChange.mock.calls[0][0]
      expect(updated.combineMode).toBe("or")
    })

    it("switches from OR to AND", () => {
      const group: FilterGroup = { filters: [], combineMode: "or" }
      const onChange = jest.fn()

      const { result } = renderHook(() =>
        useFilterBuilder({
          columns: COLUMNS,
          value: group,
          onChange,
        })
      )

      act(() => {
        result.current.toggleCombineMode()
      })

      const updated: FilterGroup = onChange.mock.calls[0][0]
      expect(updated.combineMode).toBe("and")
    })
  })

  describe("findColumnForFilter", () => {
    it("finds column by filter.column key", () => {
      const filter = createEmptyFilter("name", "Name", "text")
      const group: FilterGroup = { filters: [filter], combineMode: "and" }
      const onChange = jest.fn()

      const { result } = renderHook(() =>
        useFilterBuilder({
          columns: COLUMNS,
          value: group,
          onChange,
        })
      )

      const found = result.current.findColumnForFilter(filter)
      expect(found?.key).toBe("name")
      expect(found?.header).toBe("Name")
    })

    it("finds column by filterKey when column has filterKey", () => {
      const filter = createEmptyFilter("monthly_rent", "Amount", "number")
      const group: FilterGroup = { filters: [filter], combineMode: "and" }
      const onChange = jest.fn()

      const { result } = renderHook(() =>
        useFilterBuilder({
          columns: COLUMNS,
          value: group,
          onChange,
        })
      )

      const found = result.current.findColumnForFilter(filter)
      expect(found?.key).toBe("amount")
    })

    it("returns undefined for unknown column", () => {
      const filter = createEmptyFilter("unknown_column", "Unknown", "text")
      const group: FilterGroup = { filters: [], combineMode: "and" }
      const onChange = jest.fn()

      const { result } = renderHook(() =>
        useFilterBuilder({
          columns: COLUMNS,
          value: group,
          onChange,
        })
      )

      expect(result.current.findColumnForFilter(filter)).toBeUndefined()
    })
  })

  describe("activeFilterCount", () => {
    it("counts filters with active conditions", () => {
      const activeFilter: AdvancedFilter = {
        ...createEmptyFilter("name", "Name", "text"),
        conditions: [{ operator: "contains", value: "Rajat" }],
      }
      const group: FilterGroup = { filters: [activeFilter], combineMode: "and" }
      const onChange = jest.fn()

      const { result } = renderHook(() =>
        useFilterBuilder({
          columns: COLUMNS,
          value: group,
          onChange,
        })
      )

      expect(result.current.activeFilterCount).toBe(1)
      expect(result.current.hasFilters).toBe(true)
    })
  })
})

// ============================================================================
// useFilterRow
// ============================================================================

describe("useFilterRow", () => {
  function makeFilter(type: FilterableColumn["filterType"]): AdvancedFilter {
    return createEmptyFilter("field", "Field", type)
  }

  describe("availableOperators", () => {
    it("uses column filterOperators when provided", () => {
      const filter = makeFilter("text")
      const column: FilterableColumn = {
        ...NAME_COLUMN,
        filterOperators: ["eq", "neq"],
      }
      const onUpdate = jest.fn()
      const onRemove = jest.fn()

      const { result } = renderHook(() =>
        useFilterRow({ filter, column, onUpdate, onRemove })
      )

      expect(result.current.availableOperators).toEqual(["eq", "neq"])
    })

    it("falls back to OPERATORS_BY_TYPE when column has no filterOperators", () => {
      const filter = makeFilter("number")
      const onUpdate = jest.fn()
      const onRemove = jest.fn()

      const { result } = renderHook(() =>
        useFilterRow({ filter, column: AMOUNT_COLUMN, onUpdate, onRemove })
      )

      expect(result.current.availableOperators).toContain("between")
    })

    it("returns eq as default when column is undefined", () => {
      const filter = makeFilter("text")
      const onUpdate = jest.fn()
      const onRemove = jest.fn()

      const { result } = renderHook(() =>
        useFilterRow({ filter, column: undefined, onUpdate, onRemove })
      )

      expect(result.current.availableOperators).toContain("eq")
    })
  })

  describe("filterOptions", () => {
    it("returns column filterOptions when provided", () => {
      const filter = makeFilter("select")
      const onUpdate = jest.fn()
      const onRemove = jest.fn()

      const { result } = renderHook(() =>
        useFilterRow({ filter, column: STATUS_COLUMN, onUpdate, onRemove })
      )

      expect(result.current.filterOptions).toEqual(STATUS_COLUMN.filterOptions)
    })

    it("returns undefined when no options on column or filter", () => {
      const filter = makeFilter("text")
      const onUpdate = jest.fn()
      const onRemove = jest.fn()

      const { result } = renderHook(() =>
        useFilterRow({ filter, column: NAME_COLUMN, onUpdate, onRemove })
      )

      expect(result.current.filterOptions).toBeUndefined()
    })
  })

  describe("updateCondition", () => {
    it("updates a specific condition by index", () => {
      const filter: AdvancedFilter = {
        ...makeFilter("text"),
        conditions: [
          { operator: "contains", value: null },
          { operator: "starts", value: null },
        ],
      }
      const onUpdate = jest.fn()
      const onRemove = jest.fn()

      const { result } = renderHook(() =>
        useFilterRow({ filter, column: NAME_COLUMN, onUpdate, onRemove })
      )

      act(() => {
        result.current.updateCondition(0, { value: "Rajat" })
      })

      expect(onUpdate).toHaveBeenCalledTimes(1)
      const update = onUpdate.mock.calls[0][0]
      expect(update.conditions[0].value).toBe("Rajat")
      expect(update.conditions[1].operator).toBe("starts")
    })
  })

  describe("addCondition", () => {
    it("appends a new empty condition", () => {
      const filter = makeFilter("text")
      const onUpdate = jest.fn()
      const onRemove = jest.fn()

      const { result } = renderHook(() =>
        useFilterRow({ filter, column: NAME_COLUMN, onUpdate, onRemove })
      )

      act(() => {
        result.current.addCondition()
      })

      const update = onUpdate.mock.calls[0][0]
      expect(update.conditions).toHaveLength(2)
    })
  })

  describe("removeCondition", () => {
    it("removes a condition by index when there are multiple", () => {
      const filter: AdvancedFilter = {
        ...makeFilter("text"),
        conditions: [
          { operator: "contains", value: "a" },
          { operator: "starts", value: "b" },
        ],
      }
      const onUpdate = jest.fn()
      const onRemove = jest.fn()

      const { result } = renderHook(() =>
        useFilterRow({ filter, column: NAME_COLUMN, onUpdate, onRemove })
      )

      act(() => {
        result.current.removeCondition(0)
      })

      const update = onUpdate.mock.calls[0][0]
      expect(update.conditions).toHaveLength(1)
      expect(update.conditions[0].operator).toBe("starts")
    })

    it("calls onRemove when removing the last condition", () => {
      const filter = makeFilter("text")
      const onUpdate = jest.fn()
      const onRemove = jest.fn()

      const { result } = renderHook(() =>
        useFilterRow({ filter, column: NAME_COLUMN, onUpdate, onRemove })
      )

      act(() => {
        result.current.removeCondition(0)
      })

      expect(onRemove).toHaveBeenCalledTimes(1)
      expect(onUpdate).not.toHaveBeenCalled()
    })
  })

  describe("changeColumn", () => {
    it("updates column, columnLabel, filterType, and resets conditions", () => {
      const filter = makeFilter("text")
      const onUpdate = jest.fn()
      const onRemove = jest.fn()

      const { result } = renderHook(() =>
        useFilterRow({ filter, column: NAME_COLUMN, onUpdate, onRemove })
      )

      act(() => {
        result.current.changeColumn(STATUS_COLUMN)
      })

      const update = onUpdate.mock.calls[0][0]
      expect(update.column).toBe("status")
      expect(update.columnLabel).toBe("Status")
      expect(update.filterType).toBe("select")
      expect(update.conditions).toHaveLength(1)
    })

    it("uses filterKey when column has filterKey", () => {
      const filter = makeFilter("text")
      const onUpdate = jest.fn()
      const onRemove = jest.fn()

      const { result } = renderHook(() =>
        useFilterRow({ filter, column: NAME_COLUMN, onUpdate, onRemove })
      )

      act(() => {
        result.current.changeColumn(AMOUNT_COLUMN)
      })

      const update = onUpdate.mock.calls[0][0]
      expect(update.column).toBe("monthly_rent")
    })
  })
})
