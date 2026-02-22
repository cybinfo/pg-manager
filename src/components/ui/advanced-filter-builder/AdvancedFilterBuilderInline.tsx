"use client"

import * as React from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { FilterGroup } from "@/types/table-features.types"
import {
  useFilterBuilder,
  type FilterableColumn,
} from "@/lib/hooks/useFilterBuilder"
import { FilterRow, CombineModeToggle, AddFilterDropdown } from "./FilterRow"

export interface AdvancedFilterBuilderInlineProps {
  columns: FilterableColumn[]
  value: FilterGroup
  onChange: (group: FilterGroup) => void
  className?: string
}

/**
 * Inline variant that shows filters directly without popover
 */
export function AdvancedFilterBuilderInline({
  columns,
  value,
  onChange,
  className,
}: AdvancedFilterBuilderInlineProps) {
  const {
    addFilter,
    updateFilter,
    removeFilter,
    clearAllFilters,
    toggleCombineMode,
    findColumnForFilter,
  } = useFilterBuilder({ columns, value, onChange })

  return (
    <div className={cn("space-y-3", className)}>
      {/* Filter Rows */}
      {value.filters.map((filter, index) => (
        <React.Fragment key={filter.id}>
          {index > 0 && (
            <CombineModeToggle
              mode={value.combineMode}
              onToggle={toggleCombineMode}
            />
          )}
          <FilterRow
            filter={filter}
            column={findColumnForFilter(filter)}
            columns={columns}
            onUpdate={(updates) => updateFilter(filter.id, updates)}
            onRemove={() => removeFilter(filter.id)}
          />
        </React.Fragment>
      ))}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <AddFilterDropdown columns={columns} onSelect={addFilter} />
        {value.filters.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>
    </div>
  )
}
