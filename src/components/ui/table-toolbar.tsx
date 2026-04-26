/**
 * TableToolbar Component
 *
 * Unified toolbar for list pages combining:
 * - Search input
 * - Filter controls (simple or advanced)
 * - Group by dropdown
 * - Column manager
 */

"use client"

import * as React from "react"
import { Search, Layers, ChevronDown, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import {
  ColumnManager,
  type ColumnVisibilityConfig,
} from "./column-manager"
import {
  AdvancedFilterBuilder,
  type FilterableColumn,
} from "./advanced-filter-builder"
import { ListPageFilters, type FilterConfig } from "./list-page-filters"
import type { FilterGroup } from "@/types/table-features.types"
import { createEmptyFilterGroup } from "@/types/table-features.types"

// ============================================
// Types
// ============================================

export interface GroupByOption {
  value: string
  label: string
}

export interface TableToolbarProps {
  // Search
  searchQuery: string
  onSearchChange: (query: string) => void
  searchPlaceholder?: string

  // Simple Filters (backward compatible)
  simpleFilters?: FilterConfig[]
  simpleFilterValues?: Record<string, string>
  onSimpleFilterChange?: (id: string, value: string) => void
  onClearSimpleFilters?: () => void

  // Advanced Filters
  advancedFilterColumns?: FilterableColumn[]
  advancedFilters?: FilterGroup
  onAdvancedFiltersChange?: (group: FilterGroup) => void

  // Grouping
  groupByOptions?: GroupByOption[]
  selectedGroups?: string[]
  onGroupChange?: (groups: string[]) => void

  // Column Management
  columns?: ColumnVisibilityConfig[]
  hiddenColumns?: string[]
  onToggleColumn?: (key: string) => void
  onResetColumns?: () => void

  // UI Options
  className?: string
  showSearch?: boolean
  filterMode?: "simple" | "advanced" | "both"  // Default: "simple"
}

// ============================================
// Main Component
// ============================================

export function TableToolbar({
  // Search
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",

  // Simple Filters
  simpleFilters = [],
  simpleFilterValues = {},
  onSimpleFilterChange,
  onClearSimpleFilters,

  // Advanced Filters
  advancedFilterColumns = [],
  advancedFilters,
  onAdvancedFiltersChange,

  // Grouping
  groupByOptions = [],
  selectedGroups = [],
  onGroupChange,

  // Column Management
  columns = [],
  hiddenColumns = [],
  onToggleColumn,
  onResetColumns,

  // UI Options
  className,
  showSearch = true,
  filterMode = "simple",
}: TableToolbarProps) {
  // Group dropdown state
  const [groupDropdownOpen, setGroupDropdownOpen] = React.useState(false)

  // Determine which filter UI to show
  const showSimpleFilters =
    (filterMode === "simple" || filterMode === "both") &&
    simpleFilters.length > 0 &&
    onSimpleFilterChange

  const showAdvancedFilters =
    (filterMode === "advanced" || filterMode === "both") &&
    advancedFilterColumns.length > 0 &&
    onAdvancedFiltersChange

  const showGrouping = groupByOptions.length > 0 && onGroupChange
  const showColumnManager = columns.length > 0 && onToggleColumn && onResetColumns

  // Ensure advancedFilters has a value
  const currentAdvancedFilters = advancedFilters || createEmptyFilterGroup()

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Main Row: Search, Filters, Grouping, Columns */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        {showSearch && (
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 bg-card"
            />
          </div>
        )}

        {/* Spacer to push controls to the right */}
        <div className="flex-1" />

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <AdvancedFilterBuilder
            columns={advancedFilterColumns}
            value={currentAdvancedFilters}
            onChange={onAdvancedFiltersChange}
          />
        )}

        {/* Group By */}
        {showGrouping && (
          <div className="relative">
            <button
              onClick={() => setGroupDropdownOpen(!groupDropdownOpen)}
              className="h-9 px-3 rounded-md border border-input bg-background text-sm flex items-center gap-2 hover:bg-muted"
            >
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="hidden sm:inline">
                {selectedGroups.length === 0
                  ? "Group by..."
                  : selectedGroups.length === 1
                    ? groupByOptions.find((o) => o.value === selectedGroups[0])?.label
                    : `${selectedGroups.length} levels`}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  groupDropdownOpen && "rotate-180"
                )}
              />
            </button>

            {groupDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setGroupDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-1 w-56 bg-card border rounded-lg shadow-lg z-20 py-1">
                  <div className="px-3 py-2 border-b">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Group by (select order)
                    </p>
                  </div>
                  {groupByOptions.map((opt) => {
                    const isSelected = selectedGroups.includes(opt.value)
                    const orderIndex = selectedGroups.indexOf(opt.value)

                    return (
                      <label
                        key={opt.value}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              onGroupChange([...selectedGroups, opt.value])
                            } else {
                              onGroupChange(
                                selectedGroups.filter((v) => v !== opt.value)
                              )
                            }
                          }}
                        />
                        <span className="text-sm flex-1">{opt.label}</span>
                        {isSelected && (
                          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                            {orderIndex + 1}
                          </span>
                        )}
                      </label>
                    )
                  })}
                  {selectedGroups.length > 0 && (
                    <div className="border-t mt-1 pt-1 px-3 py-2">
                      <button
                        onClick={() => {
                          onGroupChange([])
                          setGroupDropdownOpen(false)
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Clear grouping
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Column Manager */}
        {showColumnManager && (
          <ColumnManager
            columns={columns}
            hiddenColumns={hiddenColumns}
            onToggleColumn={onToggleColumn}
            onResetColumns={onResetColumns}
          />
        )}
      </div>

      {/* Simple Filters Row (if enabled) */}
      {showSimpleFilters && (
        <ListPageFilters
          filters={simpleFilters}
          values={simpleFilterValues}
          onChange={onSimpleFilterChange}
          onClear={onClearSimpleFilters || (() => {})}
        />
      )}
    </div>
  )
}

// ============================================
// Compact Variant
// ============================================

export interface TableToolbarCompactProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  searchPlaceholder?: string
  rightContent?: React.ReactNode
  className?: string
}

/**
 * Compact toolbar with just search and optional right content
 */
export function TableToolbarCompact({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  rightContent,
  className,
}: TableToolbarCompactProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-card"
        />
      </div>
      {rightContent && (
        <div className="flex items-center gap-2">
          {rightContent}
        </div>
      )}
    </div>
  )
}

// ============================================
// Active Filters Summary
// ============================================

export interface ActiveFiltersSummaryProps {
  simpleFilters?: { id: string; label: string; value: string; displayValue?: string }[]
  advancedFilterCount?: number
  groupByLabels?: string[]
  hiddenColumnCount?: number
  onClearSimpleFilter?: (id: string) => void
  onClearAdvancedFilters?: () => void
  onClearGrouping?: () => void
  onResetColumns?: () => void
  className?: string
}

/**
 * Shows active filters, grouping, and hidden columns summary
 */
export function ActiveFiltersSummary({
  simpleFilters = [],
  advancedFilterCount = 0,
  groupByLabels = [],
  hiddenColumnCount = 0,
  onClearSimpleFilter,
  onClearAdvancedFilters,
  onClearGrouping,
  onResetColumns,
  className,
}: ActiveFiltersSummaryProps) {
  const hasAnything =
    simpleFilters.length > 0 ||
    advancedFilterCount > 0 ||
    groupByLabels.length > 0 ||
    hiddenColumnCount > 0

  if (!hasAnything) return null

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* Simple Filters */}
      {simpleFilters.map((filter) => (
        <span
          key={filter.id}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
        >
          {filter.label}: {filter.displayValue || filter.value}
          {onClearSimpleFilter && (
            <button
              onClick={() => onClearSimpleFilter(filter.id)}
              className="ml-0.5 hover:bg-primary/20 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}

      {/* Advanced Filters */}
      {advancedFilterCount > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-info/10 text-info text-xs font-medium">
          {advancedFilterCount} advanced filter{advancedFilterCount > 1 ? "s" : ""}
          {onClearAdvancedFilters && (
            <button
              onClick={onClearAdvancedFilters}
              className="ml-0.5 hover:bg-info/20 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      )}

      {/* Grouping */}
      {groupByLabels.length > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium">
          <Layers className="h-3 w-3" />
          Grouped: {groupByLabels.join(" → ")}
          {onClearGrouping && (
            <button
              onClick={onClearGrouping}
              className="ml-0.5 hover:bg-warning/20 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      )}

      {/* Hidden Columns */}
      {hiddenColumnCount > 0 && (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-foreground text-xs font-medium">
          {hiddenColumnCount} column{hiddenColumnCount > 1 ? "s" : ""} hidden
          {onResetColumns && (
            <button
              onClick={onResetColumns}
              className="ml-0.5 hover:bg-muted rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      )}
    </div>
  )
}
