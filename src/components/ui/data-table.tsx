"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, Search, Loader2, FolderOpen, FolderClosed } from "lucide-react"
import { Input } from "@/components/ui/input"

// ============================================
// Column Width System
// All widths use proportional units to ensure
// tables fill their container properly
// ============================================
export const columnWidths = {
  // Primary columns - flexible, takes remaining space
  primary: 3,      // Main column (name, title) - largest
  secondary: 2,    // Secondary info (property, tenant)
  tertiary: 1.5,   // Tertiary info

  // Fixed-size columns (converted to proportional)
  status: 1,       // Status badges/dots
  date: 1,         // Date display
  dateTime: 1.2,   // DateTime with time
  badge: 1,        // Small badges (type, method)
  amount: 1,       // Currency amounts
  count: 0.8,      // Numeric counts
  actions: 1,      // Action buttons
  actionsWide: 1.5, // Multiple action buttons
  iconAction: 0.6, // Single icon button
  menu: 0.5,       // Chevron only
} as const

export type ColumnWidthKey = keyof typeof columnWidths

export interface Column<T> {
  key: string
  header: string
  width?: ColumnWidthKey | number
  render?: (row: T) => React.ReactNode
  className?: string
  hideOnMobile?: boolean
  /**
   * UI-009: Mobile priority (1 = highest, 3 = lowest)
   * Columns with lower priority numbers appear first on mobile.
   * Columns without priority default to their array position.
   */
  mobilePriority?: 1 | 2 | 3
  // Sorting options
  sortable?: boolean
  sortKey?: string  // Custom key for sorting (e.g., "property.name" for nested values)
  sortType?: "string" | "number" | "date"  // Type for proper comparison
}

export type SortDirection = "asc" | "desc" | null

// Multi-column sort configuration
export interface SortConfig {
  key: string
  direction: "asc" | "desc"
}

export interface GroupConfig {
  key: string              // Field to group by (supports dot notation like "property.name")
  label?: string           // Display label for the group (e.g., "Property")
  renderLabel?: (value: unknown, count: number) => React.ReactNode  // Custom group header render
}

// Nested group structure for rendering
interface NestedGroup<T> {
  key: string
  label: string
  depth: number
  config: GroupConfig
  rows: T[]
  children: NestedGroup<T>[]
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  onRowClick?: (row: T) => void
  href?: (row: T) => string
  loading?: boolean
  emptyState?: React.ReactNode
  searchable?: boolean
  searchPlaceholder?: string
  searchFields?: (keyof T)[]
  // External search control - use this for server-side search
  // When provided, search is controlled externally (no client-side filtering)
  externalSearch?: string
  onExternalSearchChange?: (query: string) => void
  className?: string
  // Sorting options - supports single or multi-column sorting
  // Single: { key: string; direction: "asc" | "desc" }
  // Multi: [{ key: string; direction: "asc" | "desc" }, ...]
  defaultSort?: SortConfig | SortConfig[]
  onSortChange?: (sortConfigs: SortConfig[]) => void
  // Grouping options - supports single or nested grouping
  groupBy?: GroupConfig | GroupConfig[] | string | string[]
  collapsibleGroups?: boolean     // Allow groups to be collapsed
  defaultCollapsed?: boolean      // Start groups collapsed
}

// Helper to get nested value from object (e.g., "property.name")
function getNestedValue<T>(obj: T, path: string): unknown {
  return path.split(".").reduce((acc: unknown, part) => {
    if (acc && typeof acc === "object" && part in acc) {
      return (acc as Record<string, unknown>)[part]
    }
    return undefined
  }, obj)
}

// Row component extracted for reuse in grouped/non-grouped views
function DataTableRow<T extends object>({
  row,
  columns,
  visibleColumns,
  gridTemplate,
  isClickable,
  onRowClick,
}: {
  row: T
  columns: Column<T>[]
  visibleColumns: Column<T>[]
  gridTemplate: string
  isClickable: boolean
  onRowClick: (row: T) => void
}) {
  return (
    <div
      className={cn(
        "px-4 py-3 transition-colors",
        isClickable && "cursor-pointer hover:bg-slate-50"
      )}
      onClick={() => onRowClick(row)}
    >
      {/* Desktop Row */}
      <div
        className="hidden md:grid items-center gap-4"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        {visibleColumns.map((column) => (
          <div key={column.key} className={cn("text-sm min-w-0", column.className)}>
            {column.render
              ? column.render(row)
              : String((row as Record<string, unknown>)[column.key] ?? "")}
          </div>
        ))}
        {isClickable && (
          <div className="flex justify-end">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Mobile Row - UI-009: Priority-based column visibility */}
      <div className="md:hidden space-y-1">
        {columns
          // Filter out columns hidden on mobile
          .filter(col => !col.hideOnMobile)
          // Sort by mobilePriority (lower = higher priority), then by original order
          .sort((a, b) => {
            const priorityA = a.mobilePriority ?? 99
            const priorityB = b.mobilePriority ?? 99
            return priorityA - priorityB
          })
          // Take top 3 most important columns
          .slice(0, 3)
          .map((column, index) => (
          <div key={column.key} className="flex items-center justify-between">
            {index === 0 ? (
              <div className="font-medium text-sm flex-1 min-w-0">
                {column.render
                  ? column.render(row)
                  : String((row as Record<string, unknown>)[column.key] ?? "")}
              </div>
            ) : (
              <>
                <span className="text-xs text-muted-foreground">{column.header}</span>
                <span className="text-sm">
                  {column.render
                    ? column.render(row)
                    : String((row as Record<string, unknown>)[column.key] ?? "")}
                </span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Recursive component for rendering nested groups
function NestedGroupRenderer<T extends object>({
  groups,
  collapsedGroups,
  collapsibleGroups,
  toggleGroup,
  keyField,
  columns,
  visibleColumns,
  gridTemplate,
  isClickable,
  onRowClick,
}: {
  groups: NestedGroup<T>[]
  collapsedGroups: Set<string>
  collapsibleGroups: boolean
  toggleGroup: (key: string) => void
  keyField: keyof T
  columns: Column<T>[]
  visibleColumns: Column<T>[]
  gridTemplate: string
  isClickable: boolean
  onRowClick: (row: T) => void
}) {
  // Depth-based styling
  const getDepthStyles = (depth: number) => {
    const bgColors = [
      "bg-slate-100/80 hover:bg-slate-100",      // depth 0
      "bg-slate-50/80 hover:bg-slate-50",        // depth 1
      "bg-white hover:bg-slate-50/50",           // depth 2+
    ]
    const countBgColors = [
      "bg-slate-200",   // depth 0
      "bg-slate-150",   // depth 1
      "bg-slate-100",   // depth 2+
    ]
    return {
      bg: bgColors[Math.min(depth, bgColors.length - 1)],
      countBg: countBgColors[Math.min(depth, countBgColors.length - 1)],
      paddingLeft: `${1 + depth * 1.5}rem`, // Indent based on depth
    }
  }

  // Get total row count including nested children
  const getTotalRowCount = (group: NestedGroup<T>): number => {
    if (group.children.length === 0) {
      return group.rows.length
    }
    return group.children.reduce((sum, child) => sum + getTotalRowCount(child), 0)
  }

  return (
    <>
      {groups.map((group) => {
        const isCollapsed = collapsedGroups.has(group.key)
        const GroupIcon = isCollapsed ? FolderClosed : FolderOpen
        const styles = getDepthStyles(group.depth)
        const hasChildren = group.children.length > 0
        const rowCount = getTotalRowCount(group)

        return (
          <div key={group.key}>
            {/* Group Header */}
            <div
              className={cn(
                "py-2.5 border-b flex items-center gap-3",
                styles.bg,
                collapsibleGroups && "cursor-pointer"
              )}
              style={{ paddingLeft: styles.paddingLeft, paddingRight: "1rem" }}
              onClick={() => toggleGroup(group.key)}
            >
              {collapsibleGroups && (
                <GroupIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {group.config.label && (
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    {group.config.label}:
                  </span>
                )}
                <span className={cn(
                  "text-sm truncate",
                  group.depth === 0 ? "font-medium" : "font-normal"
                )}>
                  {group.config.renderLabel
                    ? group.config.renderLabel(group.label, rowCount)
                    : group.label}
                </span>
              </div>
              <span className={cn(
                "text-xs text-muted-foreground px-2 py-0.5 rounded-full",
                styles.countBg
              )}>
                {rowCount}
              </span>
            </div>

            {/* Group Content (children or rows) */}
            {!isCollapsed && (
              hasChildren ? (
                // Render nested groups
                <NestedGroupRenderer
                  groups={group.children}
                  collapsedGroups={collapsedGroups}
                  collapsibleGroups={collapsibleGroups}
                  toggleGroup={toggleGroup}
                  keyField={keyField}
                  columns={columns}
                  visibleColumns={visibleColumns}
                  gridTemplate={gridTemplate}
                  isClickable={isClickable}
                  onRowClick={onRowClick}
                />
              ) : (
                // Render data rows at leaf level
                <div className="divide-y">
                  {group.rows.map((row) => (
                    <DataTableRow
                      key={String(row[keyField])}
                      row={row}
                      columns={columns}
                      visibleColumns={visibleColumns}
                      gridTemplate={gridTemplate}
                      isClickable={isClickable}
                      onRowClick={onRowClick}
                    />
                  ))}
                </div>
              )
            )}
          </div>
        )
      })}
    </>
  )
}

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
  collapsibleGroups = true,
  defaultCollapsed = false,
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
          // asc → desc
          newConfigs = [...sortConfigs]
          newConfigs[existingIndex] = { key: sortKey, direction: "desc" }
        } else {
          // desc → remove from multi-sort
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

    // Apply multi-column sorting
    if (sortConfigs.length > 0) {
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
  }, [data, search, searchFields, sortConfigs, columns, isExternalSearch])

  // Build nested group structure recursively
  const buildNestedGroups = React.useCallback(
    (rows: T[], configs: GroupConfig[], depth: number, parentKey: string): NestedGroup<T>[] => {
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

      // Convert to NestedGroup array
      return Array.from(groups.entries())
        .sort(([, a], [, b]) => a.label.localeCompare(b.label))
        .map(([key, { label, rows: groupRows }]) => {
          const fullKey = parentKey ? `${parentKey}::${key}` : key
          return {
            key: fullKey,
            label,
            depth,
            config: currentConfig,
            rows: groupRows,
            children: remainingConfigs.length > 0
              ? buildNestedGroups(groupRows, remainingConfigs, depth + 1, fullKey)
              : [],
          }
        })
    },
    []
  )

  // Group data if groupBy is specified
  const groupedData = React.useMemo(() => {
    if (groupConfigs.length === 0) return null
    return buildNestedGroups(processedData, groupConfigs, 0, "")
  }, [processedData, groupConfigs, buildNestedGroups])

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

  const handleRowClick = (row: T) => {
    if (href) {
      router.push(href(row))
    } else if (onRowClick) {
      onRowClick(row)
    }
  }

  const isClickable = Boolean(href || onRowClick)
  const visibleColumns = columns.filter(c => !c.hideOnMobile)

  // Build grid template using fr units for proper distribution
  const getColumnFr = (width?: ColumnWidthKey | number): number => {
    if (typeof width === "number") return width
    if (width && width in columnWidths) return columnWidths[width]
    return columnWidths.tertiary // default
  }

  const gridTemplate = visibleColumns
    .map(c => `${getColumnFr(c.width)}fr`)
    .join(" ") + (isClickable ? ` ${columnWidths.menu}fr` : "")

  return (
    <div className={cn("space-y-4", className)}>
      {searchable && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
      )}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {/* Header */}
        <div
          className="hidden md:grid gap-4 border-b bg-slate-50/80 px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          {visibleColumns.map((column) => {
            const sortKey = column.sortKey || column.key
            const sortIndex = sortConfigs.findIndex((s) => s.key === sortKey)
            const isSorted = sortIndex >= 0
            const sortConfig = isSorted ? sortConfigs[sortIndex] : null
            const isMultiSort = sortConfigs.length > 1
            const SortIcon = isSorted
              ? sortConfig?.direction === "asc" ? ChevronUp : ChevronDown
              : ChevronsUpDown

            return (
              <div
                key={column.key}
                className={cn(
                  "truncate flex items-center gap-1",
                  column.sortable && "cursor-pointer hover:text-foreground select-none",
                  column.className
                )}
                onClick={(e) => handleSort(column, e)}
                title={column.sortable ? "Click to sort. Shift+click to add secondary sort." : undefined}
              >
                <span>{column.header}</span>
                {column.sortable && (
                  <span className="inline-flex items-center gap-0.5">
                    {/* Show sort order number when multi-sorting */}
                    {isSorted && isMultiSort && (
                      <span className="text-[10px] font-bold text-primary bg-primary/10 rounded px-1 min-w-[14px] text-center">
                        {sortIndex + 1}
                      </span>
                    )}
                    <SortIcon
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 transition-colors",
                        isSorted ? "text-primary" : "text-muted-foreground/50"
                      )}
                    />
                  </span>
                )}
              </div>
            )
          })}
          {isClickable && <div />}
        </div>

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
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Status dot component for tables
export function StatusDot({
  status,
  label
}: {
  status: "success" | "warning" | "error" | "muted"
  label?: string
}) {
  const colors = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    error: "bg-rose-500",
    muted: "bg-slate-400",
  }

  return (
    <div className="flex items-center gap-2">
      <span className={cn("h-2 w-2 rounded-full shrink-0", colors[status])} />
      {label && <span className="text-sm truncate">{label}</span>}
    </div>
  )
}

// Badge component for tables
export function TableBadge({
  variant = "default",
  children,
}: {
  variant?: "default" | "success" | "warning" | "error" | "muted"
  children: React.ReactNode
}) {
  const variants = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    error: "bg-rose-50 text-rose-700",
    muted: "bg-slate-50 text-slate-500",
  }

  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
      variants[variant]
    )}>
      {children}
    </span>
  )
}
