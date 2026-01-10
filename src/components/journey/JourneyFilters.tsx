"use client"

import { useState, useCallback } from "react"
import { Search, X, Calendar, Filter, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  JourneyFilters as JourneyFiltersType,
  EventCategoryType,
  EventCategory,
  EVENT_CATEGORY_CONFIG,
  DEFAULT_JOURNEY_FILTERS,
} from "@/types/journey.types"

// ============================================
// Journey Filters Component
// ============================================

interface JourneyFiltersProps {
  filters: JourneyFiltersType
  onChange: (filters: JourneyFiltersType) => void
  onClear: () => void
  eventCounts?: Partial<Record<EventCategoryType, number>>
  totalEvents?: number
  loading?: boolean
  onRefresh?: () => void
  className?: string
}

export function JourneyFilters({
  filters,
  onChange,
  onClear,
  eventCounts = {},
  totalEvents = 0,
  loading = false,
  onRefresh,
  className,
}: JourneyFiltersProps) {
  const [showDatePicker, setShowDatePicker] = useState(false)

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.date_from !== null ||
    filters.date_to !== null ||
    filters.search_query.length > 0

  const toggleCategory = useCallback(
    (category: EventCategoryType) => {
      const newCategories = filters.categories.includes(category)
        ? filters.categories.filter(c => c !== category)
        : [...filters.categories, category]
      onChange({ ...filters, categories: newCategories })
    },
    [filters, onChange]
  )

  const setSearchQuery = useCallback(
    (search_query: string) => {
      onChange({ ...filters, search_query })
    },
    [filters, onChange]
  )

  const setDateRange = useCallback(
    (date_from: string | null, date_to: string | null) => {
      onChange({ ...filters, date_from, date_to })
      setShowDatePicker(false)
    },
    [filters, onChange]
  )

  const clearDateRange = useCallback(() => {
    onChange({ ...filters, date_from: null, date_to: null })
  }, [filters, onChange])

  // Categories to show (only those with events or currently selected)
  const categoriesToShow = Object.values(EventCategory).filter(
    cat => (eventCounts[cat] && eventCounts[cat]! > 0) || filters.categories.includes(cat)
  )

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search and actions row */}
      <div className="flex items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search events..."
            value={filters.search_query}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {filters.search_query && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Date range button */}
        <Button
          variant={filters.date_from || filters.date_to ? "default" : "outline"}
          size="sm"
          onClick={() => setShowDatePicker(!showDatePicker)}
          className={cn(
            filters.date_from || filters.date_to ? "bg-teal-600 hover:bg-teal-700" : ""
          )}
        >
          <Calendar className="w-4 h-4 mr-2" />
          {filters.date_from || filters.date_to ? "Date Set" : "Date Range"}
        </Button>

        {/* Refresh button */}
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        )}

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-slate-500 hover:text-slate-700"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Date range picker */}
      {showDatePicker && (
        <DateRangePicker
          dateFrom={filters.date_from}
          dateTo={filters.date_to}
          onChange={setDateRange}
          onClear={clearDateRange}
          onClose={() => setShowDatePicker(false)}
        />
      )}

      {/* Category chips */}
      {categoriesToShow.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500 mr-1">
            <Filter className="w-4 h-4 inline mr-1" />
            Filter:
          </span>

          {/* All button */}
          <CategoryChip
            label="All"
            count={totalEvents}
            isSelected={filters.categories.length === 0}
            onClick={() => onChange({ ...filters, categories: [] })}
          />

          {/* Category chips */}
          {categoriesToShow.map(category => {
            const config = EVENT_CATEGORY_CONFIG[category]
            const count = eventCounts[category] || 0
            const isSelected = filters.categories.includes(category)

            return (
              <CategoryChip
                key={category}
                label={config.label}
                count={count}
                isSelected={isSelected}
                onClick={() => toggleCategory(category)}
                colorClass={isSelected ? `${config.bgClass} ${config.textClass}` : undefined}
              />
            )
          })}
        </div>
      )}

      {/* Active filters summary */}
      {hasActiveFilters && (
        <div className="text-sm text-slate-500">
          Showing filtered results
          {filters.categories.length > 0 && (
            <> • {filters.categories.length} categories</>
          )}
          {(filters.date_from || filters.date_to) && (
            <> • Date range set</>
          )}
          {filters.search_query && (
            <> • &quot;{filters.search_query}&quot;</>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// Category Chip
// ============================================

interface CategoryChipProps {
  label: string
  count?: number
  isSelected: boolean
  onClick: () => void
  colorClass?: string
}

function CategoryChip({
  label,
  count,
  isSelected,
  onClick,
  colorClass,
}: CategoryChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
        isSelected
          ? colorClass || "bg-teal-100 text-teal-700"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      )}
    >
      {label}
      {count !== undefined && (
        <span
          className={cn(
            "text-xs px-1.5 py-0.5 rounded-full",
            isSelected ? "bg-white/30" : "bg-slate-200"
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}

// ============================================
// Date Range Picker
// ============================================

interface DateRangePickerProps {
  dateFrom: string | null
  dateTo: string | null
  onChange: (from: string | null, to: string | null) => void
  onClear: () => void
  onClose: () => void
}

function DateRangePicker({
  dateFrom,
  dateTo,
  onChange,
  onClear,
  onClose,
}: DateRangePickerProps) {
  const [localFrom, setLocalFrom] = useState(dateFrom || "")
  const [localTo, setLocalTo] = useState(dateTo || "")

  const handleApply = () => {
    onChange(localFrom || null, localTo || null)
  }

  const handleQuickSelect = (days: number) => {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - days)
    setLocalFrom(from.toISOString().split("T")[0])
    setLocalTo(to.toISOString().split("T")[0])
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-4 space-y-4">
      {/* Quick select buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => handleQuickSelect(7)}>
          Last 7 days
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleQuickSelect(30)}>
          Last 30 days
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleQuickSelect(90)}>
          Last 3 months
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleQuickSelect(365)}>
          Last year
        </Button>
      </div>

      {/* Date inputs */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-500 mb-1">
            From
          </label>
          <Input
            type="date"
            value={localFrom}
            onChange={e => setLocalFrom(e.target.value)}
            max={localTo || undefined}
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-500 mb-1">
            To
          </label>
          <Input
            type="date"
            value={localTo}
            onChange={e => setLocalTo(e.target.value)}
            min={localFrom || undefined}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear Dates
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleApply}>
            Apply
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// Compact Filters (for mobile)
// ============================================

interface CompactFiltersProps {
  filters: JourneyFiltersType
  onChange: (filters: JourneyFiltersType) => void
  onClear: () => void
  eventCounts?: Partial<Record<EventCategoryType, number>>
  className?: string
}

export function CompactFilters({
  filters,
  onChange,
  onClear,
  eventCounts = {},
  className,
}: CompactFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.date_from !== null ||
    filters.date_to !== null

  return (
    <div className={cn("space-y-2", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-between"
      >
        <span className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="bg-teal-100 text-teal-700 text-xs px-2 py-0.5 rounded-full">
              Active
            </span>
          )}
        </span>
      </Button>

      {isExpanded && (
        <JourneyFilters
          filters={filters}
          onChange={onChange}
          onClear={onClear}
          eventCounts={eventCounts}
        />
      )}
    </div>
  )
}

export default JourneyFilters
