/**
 * ColumnManager Component
 *
 * Popover component for managing column visibility in tables.
 * Allows users to show/hide columns and reset to defaults.
 */

"use client"

import * as React from "react"
import { Columns3, Eye, EyeOff, RotateCcw, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

// ============================================
// Types
// ============================================

export interface ColumnVisibilityConfig {
  key: string
  header: string
  canHide?: boolean      // Default: true
  defaultVisible?: boolean // Default: true
}

export interface ColumnManagerProps {
  columns: ColumnVisibilityConfig[]
  hiddenColumns: string[]
  onToggleColumn: (key: string) => void
  onResetColumns: () => void
  className?: string
}

// ============================================
// Component
// ============================================

export function ColumnManager({
  columns,
  hiddenColumns,
  onToggleColumn,
  onResetColumns,
  className,
}: ColumnManagerProps) {
  const [open, setOpen] = React.useState(false)

  // Calculate visibility stats
  const hidableColumns = columns.filter(col => col.canHide !== false)
  const visibleCount = hidableColumns.filter(col => !hiddenColumns.includes(col.key)).length
  const totalCount = hidableColumns.length

  // Check if any columns are hidden (to show reset button)
  const hasHiddenColumns = hiddenColumns.length > 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-9 px-3 gap-2", className)}
        >
          <Columns3 className="h-4 w-4 text-muted-foreground" />
          <span className="hidden sm:inline">Columns</span>
          <span className="text-xs text-muted-foreground">
            {visibleCount}/{totalCount}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-64 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Show/Hide Columns
          </span>
          {hasHiddenColumns && (
            <button
              onClick={() => {
                onResetColumns()
              }}
              className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>

        {/* Column List */}
        <div className="max-h-[300px] overflow-y-auto py-1">
          {columns.map((column) => {
            const isVisible = !hiddenColumns.includes(column.key)
            const canToggle = column.canHide !== false

            return (
              <button
                key={column.key}
                onClick={() => canToggle && onToggleColumn(column.key)}
                disabled={!canToggle}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors",
                  canToggle
                    ? "hover:bg-muted cursor-pointer"
                    : "cursor-not-allowed opacity-50"
                )}
              >
                {/* Visibility Icon */}
                <div
                  className={cn(
                    "h-4 w-4 rounded border flex items-center justify-center transition-colors",
                    isVisible
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-input bg-background"
                  )}
                >
                  {isVisible && <Check className="h-3 w-3" />}
                </div>

                {/* Column Name */}
                <span className="flex-1 text-left truncate">{column.header}</span>

                {/* Status Icon */}
                {canToggle && (
                  isVisible ? (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground/50" />
                  )
                )}

                {/* Locked indicator for non-hidable columns */}
                {!canToggle && (
                  <span className="text-[10px] text-muted-foreground uppercase">
                    Required
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Footer hint */}
        <div className="px-3 py-2 border-t bg-muted/50">
          <p className="text-[11px] text-muted-foreground">
            Click to toggle visibility. Hidden columns won&apos;t appear in the table.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================
// Compact Variant
// ============================================

export interface ColumnManagerCompactProps {
  columns: ColumnVisibilityConfig[]
  hiddenColumns: string[]
  onToggleColumn: (key: string) => void
  onResetColumns: () => void
}

/**
 * Compact version that just shows icon, no text
 */
export function ColumnManagerCompact({
  columns,
  hiddenColumns,
  onToggleColumn,
  onResetColumns,
}: ColumnManagerCompactProps) {
  return (
    <ColumnManager
      columns={columns}
      hiddenColumns={hiddenColumns}
      onToggleColumn={onToggleColumn}
      onResetColumns={onResetColumns}
      className="px-2"
    />
  )
}

// ============================================
// Hook for managing column visibility state
// ============================================

export interface UseColumnVisibilityOptions {
  columns: ColumnVisibilityConfig[]
  initialHiddenColumns?: string[]
  storageKey?: string // For localStorage persistence
}

export function useColumnVisibility({
  columns,
  initialHiddenColumns = [],
  storageKey,
}: UseColumnVisibilityOptions) {
  // Initialize from localStorage if available
  const getInitialHidden = React.useCallback(() => {
    if (storageKey && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`column-visibility-${storageKey}`)
        if (stored) {
          return JSON.parse(stored) as string[]
        }
      } catch {
        // Ignore parse errors
      }
    }
    // Fall back to columns with defaultVisible: false
    const defaultHidden = columns
      .filter(col => col.defaultVisible === false)
      .map(col => col.key)
    return [...new Set([...defaultHidden, ...initialHiddenColumns])]
  }, [columns, initialHiddenColumns, storageKey])

  const [hiddenColumns, setHiddenColumns] = React.useState<string[]>(getInitialHidden)

  // Persist to localStorage when changed
  React.useEffect(() => {
    if (storageKey && typeof window !== "undefined") {
      localStorage.setItem(
        `column-visibility-${storageKey}`,
        JSON.stringify(hiddenColumns)
      )
    }
  }, [hiddenColumns, storageKey])

  // Toggle a single column
  const toggleColumn = React.useCallback((key: string) => {
    setHiddenColumns(prev => {
      if (prev.includes(key)) {
        return prev.filter(k => k !== key)
      }
      return [...prev, key]
    })
  }, [])

  // Reset to default visibility
  const resetColumns = React.useCallback(() => {
    const defaultHidden = columns
      .filter(col => col.defaultVisible === false)
      .map(col => col.key)
    setHiddenColumns(defaultHidden)
  }, [columns])

  // Set hidden columns directly
  const setColumns = React.useCallback((hidden: string[]) => {
    setHiddenColumns(hidden)
  }, [])

  // Get list of visible columns
  const visibleColumns = React.useMemo(() => {
    return columns.filter(col => !hiddenColumns.includes(col.key))
  }, [columns, hiddenColumns])

  return {
    hiddenColumns,
    setHiddenColumns: setColumns,
    toggleColumn,
    resetColumns,
    visibleColumns,
    hasHiddenColumns: hiddenColumns.length > 0,
  }
}
