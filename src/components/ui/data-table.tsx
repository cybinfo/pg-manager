"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { ChevronRight, Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"

export interface Column<T> {
  key: string
  header: string
  width?: string
  render?: (row: T) => React.ReactNode
  className?: string
  hideOnMobile?: boolean
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
  className?: string
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
}: DataTableProps<T>) {
  const router = useRouter()
  const [search, setSearch] = React.useState("")

  const filteredData = React.useMemo(() => {
    if (!search || !searchFields) return data
    const lowerSearch = search.toLowerCase()
    return data.filter((row) =>
      searchFields.some((field) => {
        const value = row[field]
        return value && String(value).toLowerCase().includes(lowerSearch)
      })
    )
  }, [data, search, searchFields])

  const handleRowClick = (row: T) => {
    if (href) {
      router.push(href(row))
    } else if (onRowClick) {
      onRowClick(row)
    }
  }

  const isClickable = Boolean(href || onRowClick)

  return (
    <div className={cn("space-y-4", className)}>
      {searchable && (
        <div className="relative">
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
        <div className="hidden md:grid border-b bg-slate-50/80 px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider"
          style={{
            gridTemplateColumns: columns
              .filter(c => !c.hideOnMobile)
              .map(c => c.width || "1fr")
              .join(" ") + (isClickable ? " 40px" : "")
          }}
        >
          {columns.filter(c => !c.hideOnMobile).map((column) => (
            <div key={column.key} className={column.className}>
              {column.header}
            </div>
          ))}
          {isClickable && <div />}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredData.length === 0 && (
          <div className="py-12">
            {emptyState || (
              <p className="text-center text-muted-foreground">No data found</p>
            )}
          </div>
        )}

        {/* Data Rows */}
        {!loading && filteredData.length > 0 && (
          <div className="divide-y">
            {filteredData.map((row) => (
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
                  style={{
                    gridTemplateColumns: columns
                      .filter(c => !c.hideOnMobile)
                      .map(c => c.width || "1fr")
                      .join(" ") + (isClickable ? " 40px" : "")
                  }}
                >
                  {columns.filter(c => !c.hideOnMobile).map((column) => (
                    <div key={column.key} className={cn("text-sm", column.className)}>
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
                        <div className="font-medium text-sm">
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
      <span className={cn("h-2 w-2 rounded-full", colors[status])} />
      {label && <span className="text-sm">{label}</span>}
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
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
      variants[variant]
    )}>
      {children}
    </span>
  )
}
