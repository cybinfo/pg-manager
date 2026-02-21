"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react"
import { Column, SortConfig } from "./types"

interface DataTableHeaderProps<T> {
  visibleColumns: Column<T>[]
  gridTemplate: string
  isClickable: boolean
  sortConfigs: SortConfig[]
  onSort: (column: Column<T>, event: React.MouseEvent) => void
  selectable?: boolean
  isAllSelected?: boolean
  isSomeSelected?: boolean
  onToggleAll?: () => void
}

export function DataTableHeader<T>({
  visibleColumns,
  gridTemplate,
  isClickable,
  sortConfigs,
  onSort,
  selectable,
  isAllSelected,
  isSomeSelected,
  onToggleAll,
}: DataTableHeaderProps<T>) {
  return (
    <div
      className="hidden md:grid gap-4 border-b bg-slate-50/80 px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider"
      style={{ gridTemplateColumns: gridTemplate }}
    >
      {selectable && (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={(el) => {
              if (el) el.indeterminate = !!isSomeSelected
            }}
            onChange={onToggleAll}
            className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
            aria-label="Select all rows"
          />
        </div>
      )}
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
            onClick={(e) => onSort(column, e)}
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
  )
}
