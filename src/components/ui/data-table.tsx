"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, Search, Loader2 } from "lucide-react"
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
  // Sorting options
  sortable?: boolean
  sortKey?: string  // Custom key for sorting (e.g., "property.name" for nested values)
  sortType?: "string" | "number" | "date"  // Type for proper comparison
}

export type SortDirection = "asc" | "desc" | null

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
  className?: string
  // Sorting options
  defaultSort?: { key: string; direction: "asc" | "desc" }
  onSortChange?: (key: string | null, direction: SortDirection) => void
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
  className,
  defaultSort,
  onSortChange,
}: DataTableProps<T>) {
  const router = useRouter()
  const [search, setSearch] = React.useState("")
  const [sortColumn, setSortColumn] = React.useState<string | null>(defaultSort?.key ?? null)
  const [sortDirection, setSortDirection] = React.useState<SortDirection>(defaultSort?.direction ?? null)

  // Handle column header click for sorting
  const handleSort = (column: Column<T>) => {
    if (!column.sortable) return

    const sortKey = column.sortKey || column.key
    let newDirection: SortDirection

    if (sortColumn !== sortKey) {
      // New column: start with ascending
      newDirection = "asc"
    } else {
      // Same column: cycle through asc → desc → null
      newDirection = sortDirection === "asc" ? "desc" : sortDirection === "desc" ? null : "asc"
    }

    setSortColumn(newDirection ? sortKey : null)
    setSortDirection(newDirection)
    onSortChange?.(newDirection ? sortKey : null, newDirection)
  }

  // Filter and sort data
  const processedData = React.useMemo(() => {
    let result = [...data]

    // Apply search filter
    if (search && searchFields) {
      const lowerSearch = search.toLowerCase()
      result = result.filter((row) =>
        searchFields.some((field) => {
          const value = row[field]
          return value && String(value).toLowerCase().includes(lowerSearch)
        })
      )
    }

    // Apply sorting
    if (sortColumn && sortDirection) {
      const column = columns.find((c) => (c.sortKey || c.key) === sortColumn)
      const sortType = column?.sortType || "string"

      result.sort((a, b) => {
        const aVal = getNestedValue(a, sortColumn)
        const bVal = getNestedValue(b, sortColumn)

        // Handle null/undefined values
        if (aVal == null && bVal == null) return 0
        if (aVal == null) return sortDirection === "asc" ? 1 : -1
        if (bVal == null) return sortDirection === "asc" ? -1 : 1

        let comparison = 0

        if (sortType === "number") {
          comparison = Number(aVal) - Number(bVal)
        } else if (sortType === "date") {
          comparison = new Date(String(aVal)).getTime() - new Date(String(bVal)).getTime()
        } else {
          // String comparison (case-insensitive)
          comparison = String(aVal).toLowerCase().localeCompare(String(bVal).toLowerCase())
        }

        return sortDirection === "asc" ? comparison : -comparison
      })
    }

    return result
  }, [data, search, searchFields, sortColumn, sortDirection, columns])

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
            const isSorted = sortColumn === sortKey
            const SortIcon = isSorted
              ? sortDirection === "asc" ? ChevronUp : ChevronDown
              : ChevronsUpDown

            return (
              <div
                key={column.key}
                className={cn(
                  "truncate flex items-center gap-1",
                  column.sortable && "cursor-pointer hover:text-foreground select-none",
                  column.className
                )}
                onClick={() => handleSort(column)}
              >
                <span>{column.header}</span>
                {column.sortable && (
                  <SortIcon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-colors",
                      isSorted ? "text-primary" : "text-muted-foreground/50"
                    )}
                  />
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
            {processedData.map((row) => (
              <div
                key={String(row[keyField])}
                className={cn(
                  "px-4 py-3 transition-colors",
                  isClickable && "cursor-pointer hover:bg-slate-50"
                )}
                onClick={() => handleRowClick(row)}
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

                {/* Mobile Row */}
                <div className="md:hidden space-y-1">
                  {columns.slice(0, 3).map((column, index) => (
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
            ))}
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
