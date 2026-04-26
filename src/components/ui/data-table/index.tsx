"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Column,
  SortConfig,
  GroupConfig,
  NestedGroup,
  DataTableProps,
  getNestedValue,
  buildGridTemplate,
} from "./types"
import { DataTableRow } from "./DataTableRow"
import { DataTableHeader } from "./DataTableHeader"
import { DataTableGroupControls, NestedGroupRenderer } from "./DataTableGroupRenderer"
import { DataTableSearch } from "./DataTableSearch"
import { Loader2 } from "lucide-react"

// ============================================
// Re-exports: All types, constants, and components
// ============================================
export {
  columnWidths,
  type ColumnWidthKey,
  type EditType,
  type EditValidation,
  type EditOption,
  type Column,
  type SortDirection,
  type SortConfig,
  type GroupConfig,
  type DataTableProps,
} from "./types"

export { TableBadge } from "./TableBadge"
export { StatusDot } from "./StatusDot"

// ============================================
// Main DataTable Component
// ============================================
export function DataTable<T extends object>({
  columns,
  data,
  keyField,
  onRowClick,
  href,
  loading,
  emptyState,
  searchable,
  searchPlaceholder = "Search...",
  searchFields,
  externalSearch,
  onExternalSearchChange,
  className,
  defaultSort,
  onSortChange,
  groupBy,
  groupCounts,
  collapsibleGroups = true,
  defaultCollapsed = false,
  hiddenColumns = [],
  selectable,
  selectedIds,
  onToggleRow,
  onToggleAll,
  isAllSelected,
  isSomeSelected,
}: DataTableProps<T>) {
  const router = useRouter()
  const [internalSearch, setInternalSearch] = React.useState("")

  // Use external search if provided, otherwise use internal state
  const isExternalSearch = externalSearch !== undefined && onExternalSearchChange !== undefined
  const search = isExternalSearch ? externalSearch : internalSearch
  const setSearch = isExternalSearch ? onExternalSearchChange : setInternalSearch

  // Multi-column sort state - normalize defaultSort to array
  const initialSortConfigs = React.useMemo(() => {
    if (!defaultSort) return []
    if (Array.isArray(defaultSort)) return defaultSort
    return [defaultSort]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [sortConfigs, setSortConfigs] = React.useState<SortConfig[]>(initialSortConfigs)

  // Update sort configs when defaultSort prop changes
  React.useEffect(() => {
    if (!defaultSort) {
      setSortConfigs([])
    } else if (Array.isArray(defaultSort)) {
      setSortConfigs(defaultSort)
    } else {
      setSortConfigs([defaultSort])
    }
  }, [defaultSort])

  const [collapsedGroups, setCollapsedGroups] = React.useState<Set<string>>(new Set())

  // Parse groupBy config - now supports arrays for nested grouping
  const groupConfigs: GroupConfig[] = React.useMemo(() => {
    if (!groupBy) return []

    // Normalize to array
    const configs = Array.isArray(groupBy) ? groupBy : [groupBy]

    // Convert strings to GroupConfig objects
    return configs.map((config) => {
      if (typeof config === "string") {
        return { key: config }
      }
      return config
    })
  }, [groupBy])

  // Handle column header click for sorting
  // Normal click: Set as primary sort (single column)
  // Shift+click: Add/toggle secondary sort (multi-column)
  const handleSort = (column: Column<T>, event: React.MouseEvent) => {
    if (!column.sortable) return

    const sortKey = column.sortKey || column.key
    const isShiftClick = event.shiftKey
    const existingIndex = sortConfigs.findIndex((s) => s.key === sortKey)
    const existingConfig = existingIndex >= 0 ? sortConfigs[existingIndex] : null

    let newConfigs: SortConfig[]

    if (isShiftClick) {
      // Shift+click: Multi-column sorting
      if (existingConfig) {
        // Column already in sort - cycle direction or remove
        if (existingConfig.direction === "asc") {
          // asc -> desc
          newConfigs = [...sortConfigs]
          newConfigs[existingIndex] = { key: sortKey, direction: "desc" }
        } else {
          // desc -> remove from multi-sort
          newConfigs = sortConfigs.filter((_, i) => i !== existingIndex)
        }
      } else {
        // Add as new secondary sort
        newConfigs = [...sortConfigs, { key: sortKey, direction: "asc" }]
      }
    } else {
      // Normal click: Single column sort (replaces all)
      if (existingConfig && sortConfigs.length === 1) {
        // Same column, single sort - cycle direction
        if (existingConfig.direction === "asc") {
          newConfigs = [{ key: sortKey, direction: "desc" }]
        } else {
          // Clear sort
          newConfigs = []
        }
      } else {
        // New column or replacing multi-sort - start with asc
        newConfigs = [{ key: sortKey, direction: "asc" }]
      }
    }

    setSortConfigs(newConfigs)
    onSortChange?.(newConfigs)
  }

  // Filter and sort data
  const processedData = React.useMemo(() => {
    let result = [...data]

    // Apply search filter ONLY if using internal search (client-side filtering)
    // Skip if using external search because server already filtered the data
    if (!isExternalSearch && search && searchFields) {
      const lowerSearch = search.toLowerCase()
      result = result.filter((row) =>
        searchFields.some((field) => {
          const value = row[field]
          return value && String(value).toLowerCase().includes(lowerSearch)
        })
      )
    }

    // Apply multi-column sorting ONLY if sorting is handled client-side
    // Skip if onSortChange is provided (sorting handled by server)
    const isExternalSort = !!onSortChange
    if (!isExternalSort && sortConfigs.length > 0) {
      result.sort((a, b) => {
        // Iterate through sort columns in order
        for (const sortConfig of sortConfigs) {
          const column = columns.find((c) => (c.sortKey || c.key) === sortConfig.key)
          const sortType = column?.sortType || "string"

          const aVal = getNestedValue(a, sortConfig.key)
          const bVal = getNestedValue(b, sortConfig.key)

          // Handle null/undefined values
          if (aVal == null && bVal == null) continue
          if (aVal == null) return sortConfig.direction === "asc" ? 1 : -1
          if (bVal == null) return sortConfig.direction === "asc" ? -1 : 1

          let comparison = 0

          if (sortType === "number") {
            comparison = Number(aVal) - Number(bVal)
          } else if (sortType === "date") {
            comparison = new Date(String(aVal)).getTime() - new Date(String(bVal)).getTime()
          } else {
            // String comparison (case-insensitive)
            comparison = String(aVal).toLowerCase().localeCompare(String(bVal).toLowerCase())
          }

          // Apply direction
          comparison = sortConfig.direction === "asc" ? comparison : -comparison

          // If not equal, return this comparison result
          if (comparison !== 0) return comparison
          // If equal, continue to next sort column
        }
        return 0
      })
    }

    return result
  }, [data, search, searchFields, sortConfigs, columns, isExternalSearch, onSortChange])

  // Build nested group structure recursively
  const buildNestedGroups = React.useCallback(
    (rows: T[], configs: GroupConfig[], depth: number, parentKey: string, activeSortConfigs: SortConfig[]): NestedGroup<T>[] => {
      if (configs.length === 0) return []

      const [currentConfig, ...remainingConfigs] = configs
      const groups = new Map<string, { label: string; rows: T[] }>()

      // Group rows by current config
      rows.forEach((row) => {
        const value = getNestedValue(row, currentConfig.key)
        const groupKey = value == null ? "__null__" : String(value)
        const groupLabel = value == null ? "Ungrouped" : String(value)

        if (!groups.has(groupKey)) {
          groups.set(groupKey, { label: groupLabel, rows: [] })
        }
        groups.get(groupKey)!.rows.push(row)
      })

      // Determine sort direction for this group's key
      // Check if the group key matches any active sort config
      const matchingSort = activeSortConfigs.find(s =>
        s.key === currentConfig.key ||
        s.key === currentConfig.key.split('.')[0] // Handle nested keys like "category.name"
      )
      const sortDirection = matchingSort?.direction || "asc"

      // Convert to NestedGroup array with proper sort order
      return Array.from(groups.entries())
        .sort(([keyA, a], [keyB, b]) => {
          // Put "Ungrouped" at the end
          if (keyA === "__null__") return 1
          if (keyB === "__null__") return -1

          // Sort by label (handles dates as strings correctly for ISO format)
          const comparison = a.label.localeCompare(b.label)
          return sortDirection === "desc" ? -comparison : comparison
        })
        .map(([key, { label, rows: groupRows }]) => {
          const fullKey = parentKey ? `${parentKey}::${key}` : key
          return {
            key: fullKey,
            label,
            depth,
            config: currentConfig,
            rows: groupRows,
            children: remainingConfigs.length > 0
              ? buildNestedGroups(groupRows, remainingConfigs, depth + 1, fullKey, activeSortConfigs)
              : [],
          }
        })
    },
    []
  )

  // Group data if groupBy is specified
  const groupedData = React.useMemo(() => {
    if (groupConfigs.length === 0) return null
    return buildNestedGroups(processedData, groupConfigs, 0, "", sortConfigs)
  }, [processedData, groupConfigs, buildNestedGroups, sortConfigs])

  // Collect all group keys for collapsed state initialization
  const getAllGroupKeys = React.useCallback((groups: NestedGroup<T>[]): string[] => {
    const keys: string[] = []
    const collect = (gs: NestedGroup<T>[]) => {
      gs.forEach((g) => {
        keys.push(g.key)
        if (g.children.length > 0) {
          collect(g.children)
        }
      })
    }
    collect(groups)
    return keys
  }, [])

  // Initialize collapsed state when groupBy changes
  React.useEffect(() => {
    if (groupedData && defaultCollapsed) {
      setCollapsedGroups(new Set(getAllGroupKeys(groupedData)))
    } else {
      setCollapsedGroups(new Set())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupConfigs.length, defaultCollapsed, getAllGroupKeys])

  // Toggle group collapse
  const toggleGroup = (groupKey: string) => {
    if (!collapsibleGroups) return
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }

  // Collapse all groups
  const collapseAllGroups = React.useCallback(() => {
    if (groupedData) {
      setCollapsedGroups(new Set(getAllGroupKeys(groupedData)))
    }
  }, [groupedData, getAllGroupKeys])

  // Expand all groups
  const expandAllGroups = React.useCallback(() => {
    setCollapsedGroups(new Set())
  }, [])

  // Check if all groups are collapsed or expanded
  const allGroupsCollapsed = React.useMemo(() => {
    if (!groupedData) return false
    const allKeys = getAllGroupKeys(groupedData)
    return allKeys.length > 0 && allKeys.every(key => collapsedGroups.has(key))
  }, [groupedData, collapsedGroups, getAllGroupKeys])

  const allGroupsExpanded = React.useMemo(() => {
    return collapsedGroups.size === 0
  }, [collapsedGroups])

  const handleRowClick = (row: T) => {
    if (href) {
      router.push(href(row))
    } else if (onRowClick) {
      onRowClick(row)
    }
  }

  const isClickable = Boolean(href || onRowClick)
  // Filter by hiddenColumns only (hideOnMobile is handled separately in mobile rendering)
  const visibleColumns = React.useMemo(() =>
    columns.filter(c => !hiddenColumns.includes(c.key)),
    [columns, hiddenColumns]
  )

  const gridTemplate = buildGridTemplate(visibleColumns, isClickable, selectable)

  // Convert selectedIds array to a Set for O(1) lookups
  const selectedIdSet = React.useMemo(
    () => new Set(selectedIds || []),
    [selectedIds]
  )

  return (
    <div className={cn("space-y-4", className)}>
      {searchable && (
        <DataTableSearch
          search={search}
          setSearch={setSearch}
          searchPlaceholder={searchPlaceholder}
        />
      )}

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {/* Group Controls - shown when grouping is active */}
        {groupedData && collapsibleGroups && (
          <DataTableGroupControls
            groupConfigs={groupConfigs}
            collapsibleGroups={collapsibleGroups}
            allGroupsExpanded={allGroupsExpanded}
            allGroupsCollapsed={allGroupsCollapsed}
            expandAllGroups={expandAllGroups}
            collapseAllGroups={collapseAllGroups}
          />
        )}

        {/* Header */}
        <DataTableHeader
          visibleColumns={visibleColumns}
          gridTemplate={gridTemplate}
          isClickable={isClickable}
          sortConfigs={sortConfigs}
          onSort={handleSort}
          selectable={selectable}
          isAllSelected={isAllSelected}
          isSomeSelected={isSomeSelected}
          onToggleAll={onToggleAll}
        />

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty State */}
        {!loading && processedData.length === 0 && (
          <div className="py-12">
            {emptyState || (
              <p className="text-center text-muted-foreground">No data found</p>
            )}
          </div>
        )}

        {/* Data Rows */}
        {!loading && processedData.length > 0 && (
          <div className="divide-y">
            {groupedData ? (
              // Grouped rendering - recursive for nested groups
              <NestedGroupRenderer
                groups={groupedData}
                collapsedGroups={collapsedGroups}
                collapsibleGroups={collapsibleGroups}
                toggleGroup={toggleGroup}
                keyField={keyField}
                columns={columns}
                visibleColumns={visibleColumns}
                gridTemplate={gridTemplate}
                isClickable={isClickable}
                onRowClick={handleRowClick}
                groupCounts={groupCounts}
                selectable={selectable}
                selectedIdSet={selectedIdSet}
                onToggleRow={onToggleRow}
              />
            ) : (
              // Non-grouped rendering
              processedData.map((row) => (
                <DataTableRow
                  key={String(row[keyField])}
                  row={row}
                  columns={columns}
                  visibleColumns={visibleColumns}
                  gridTemplate={gridTemplate}
                  isClickable={isClickable}
                  onRowClick={handleRowClick}
                  selectable={selectable}
                  isSelected={selectedIdSet.has(String(row[keyField]))}
                  onToggleRow={() => onToggleRow?.(String(row[keyField]))}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
