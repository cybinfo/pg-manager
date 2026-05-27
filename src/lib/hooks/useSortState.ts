import { useState, useCallback } from "react"

export type SortDirection = "asc" | "desc"

export function useSortState(defaultColumn: string, defaultDirection: SortDirection = "asc") {
  const [sortColumn, setSortColumn] = useState(defaultColumn)
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDirection)

  const toggleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection(d => d === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }, [sortColumn])

  return { sortColumn, sortDirection, toggleSort }
}
