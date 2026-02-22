"use client"

import * as React from "react"
import { Filter, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { FilterGroup } from "@/types/table-features.types"
import {
  useFilterBuilder,
  type FilterableColumn,
} from "@/lib/hooks/useFilterBuilder"
import { FilterRow, CombineModeToggle, AddFilterDropdown } from "./FilterRow"

export interface AdvancedFilterBuilderProps {
  columns: FilterableColumn[]
  value: FilterGroup
  onChange: (group: FilterGroup) => void
  className?: string
}

export function AdvancedFilterBuilder({
  columns,
  value,
  onChange,
  className,
}: AdvancedFilterBuilderProps) {
  const [open, setOpen] = React.useState(false)

  const {
    activeFilterCount,
    addFilter,
    updateFilter,
    removeFilter,
    clearAllFilters,
    toggleCombineMode,
    findColumnForFilter,
  } = useFilterBuilder({ columns, value, onChange })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 px-3 gap-2",
            activeFilterCount > 0 && "border-primary text-primary",
            className
          )}
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[480px] p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Filters</span>
          </div>
          {value.filters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>

        {/* Filter List */}
        <div className="max-h-[400px] overflow-y-auto">
          {value.filters.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No filters applied</p>
              <p className="text-xs">Add a filter to narrow down results</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
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
            </div>
          )}
        </div>

        {/* Add Filter */}
        <div className="border-t p-3 bg-muted/50">
          <AddFilterDropdown
            columns={columns}
            onSelect={addFilter}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
