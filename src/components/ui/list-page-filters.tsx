"use client"

import { X, Filter } from "lucide-react"
import { Button } from "./button"
import { Select } from "@/components/ui/form-components"
import { DatePicker } from "@/components/ui/date-picker"
import { cn } from "@/lib/utils"

export interface FilterOption {
  value: string
  label: string
}

export interface FilterConfig {
  id: string
  label: string
  type: "select" | "date" | "date-range"
  options?: FilterOption[]
  placeholder?: string
}

export interface ListPageFiltersProps {
  filters: FilterConfig[]
  values: Record<string, string>
  onChange: (id: string, value: string) => void
  onClear: () => void
  className?: string
}

export function ListPageFilters({
  filters,
  values,
  onChange,
  onClear,
  className,
}: ListPageFiltersProps) {
  const hasActiveFilters = Object.values(values).some(
    (v) => v && v !== "all" && v !== ""
  )

  return (
    <div className={cn("space-y-3", className)}>
      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Filter Icon */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filters:</span>
        </div>

        {/* Filter Controls */}
        {filters.map((filter) => (
          <div key={filter.id} className="flex items-center gap-1">
            {filter.type === "select" && (
              <Select
                value={values[filter.id] || "all"}
                onChange={(e) => onChange(filter.id, e.target.value)}
                aria-label={filter.label}
                options={[
                  { value: "all", label: filter.placeholder || `All ${filter.label}` },
                  ...(filter.options || []),
                ]}
                className="h-9 min-w-[140px]"
              />
            )}

            {filter.type === "date" && (
              <DatePicker
                value={values[filter.id] || ""}
                onChange={(val) => onChange(filter.id, val)}
                placeholder={filter.placeholder || filter.label}
                className="h-9 min-w-[150px]"
              />
            )}

            {filter.type === "date-range" && (
              <div className="flex items-center gap-2">
                <DatePicker
                  value={values[`${filter.id}_from`] || ""}
                  onChange={(val) => onChange(`${filter.id}_from`, val)}
                  placeholder="From"
                  className="h-9 w-[160px]"
                />
                <span className="text-muted-foreground text-sm">to</span>
                <DatePicker
                  value={values[`${filter.id}_to`] || ""}
                  onChange={(val) => onChange(`${filter.id}_to`, val)}
                  placeholder="To"
                  className="h-9 w-[160px]"
                />
              </div>
            )}
          </div>
        ))}

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-9 px-3 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Active Filters Summary (Optional - for complex filter sets) */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => {
            const value = values[filter.id]
            if (!value || value === "all" || value === "") return null

            const option = filter.options?.find((o) => o.value === value)
            const displayValue = option?.label || value

            return (
              <span
                key={filter.id}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
              >
                {filter.label}: {displayValue}
                <button
                  onClick={() => onChange(filter.id, "all")}
                  className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                  aria-label={`Remove ${filter.label} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Helper hook for managing filter state
export function useListFilters(initialFilters: Record<string, string> = {}) {
  const [filters, setFilters] = useState<Record<string, string>>(initialFilters)

  const updateFilter = (id: string, value: string) => {
    setFilters((prev) => ({ ...prev, [id]: value }))
  }

  const clearFilters = () => {
    setFilters({})
  }

  const hasActiveFilters = Object.values(filters).some(
    (v) => v && v !== "all" && v !== ""
  )

  return {
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    setFilters,
  }
}

// Need to import useState for the hook
import { useState } from "react"
