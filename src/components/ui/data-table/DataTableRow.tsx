"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronRight } from "lucide-react"
import { Column } from "./types"

interface DataTableRowProps<T> {
  row: T
  columns: Column<T>[]
  visibleColumns: Column<T>[]
  gridTemplate: string
  isClickable: boolean
  onRowClick: (row: T) => void
  selectable?: boolean
  isSelected?: boolean
  onToggleRow?: () => void
}

export function DataTableRow<T extends object>({
  row,
  columns,
  visibleColumns,
  gridTemplate,
  isClickable,
  onRowClick,
  selectable,
  isSelected,
  onToggleRow,
}: DataTableRowProps<T>) {
  return (
    <div
      className={cn(
        "px-4 py-3 transition-colors",
        isClickable && "cursor-pointer hover:bg-muted",
        isSelected && "bg-primary/5"
      )}
      onClick={() => onRowClick(row)}
    >
      {/* Desktop Row */}
      <div
        className="hidden md:grid items-center gap-4"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        {selectable && (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={!!isSelected}
              onChange={(e) => {
                e.stopPropagation()
                onToggleRow?.()
              }}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
              aria-label="Select row"
            />
          </div>
        )}
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
