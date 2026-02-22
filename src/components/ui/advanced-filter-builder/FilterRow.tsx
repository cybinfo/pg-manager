"use client"

import * as React from "react"
import { Plus, X, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type {
  FilterGroup,
  AdvancedFilter,
  FilterOperator,
  FilterType,
  FilterSelectOption,
} from "@/types/table-features.types"
import {
  FILTER_OPERATOR_LABELS,
  operatorRequiresValue,
  operatorRequiresTwoValues,
} from "@/types/table-features.types"
import {
  useFilterRow,
  type FilterableColumn,
} from "@/lib/hooks/useFilterBuilder"

// ============================================
// CombineModeToggle
// ============================================

interface CombineModeToggleProps {
  mode: "and" | "or"
  onToggle: () => void
}

export function CombineModeToggle({ mode, onToggle }: CombineModeToggleProps) {
  return (
    <div className="flex items-center justify-center">
      <button
        onClick={onToggle}
        className={cn(
          "px-3 py-1 text-xs font-medium rounded-full border transition-colors",
          mode === "and"
            ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
            : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
        )}
      >
        {mode.toUpperCase()}
      </button>
    </div>
  )
}

// ============================================
// FilterRow Component
// ============================================

interface FilterRowProps {
  filter: AdvancedFilter
  column: FilterableColumn | undefined
  columns: FilterableColumn[]
  onUpdate: (updates: Partial<AdvancedFilter>) => void
  onRemove: () => void
}

export function FilterRow({
  filter,
  column,
  columns,
  onUpdate,
  onRemove,
}: FilterRowProps) {
  const {
    availableOperators,
    filterOptions,
    updateCondition,
    addCondition,
    removeCondition,
    changeColumn,
  } = useFilterRow({ filter, column, onUpdate, onRemove })

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      {/* Column Selector + Remove */}
      <div className="flex items-center gap-2">
        <ColumnDropdown
          columns={columns}
          selected={filter.column}
          onSelect={changeColumn}
        />
        <button
          onClick={onRemove}
          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Conditions */}
      <div className="space-y-2 pl-1">
        {filter.conditions.map((condition, condIndex) => (
          <React.Fragment key={condIndex}>
            {/* AND/OR toggle between conditions */}
            {condIndex > 0 && (
              <div className="flex items-center gap-2 py-1">
                <button
                  onClick={() =>
                    onUpdate({
                      combineMode: filter.combineMode === "and" ? "or" : "and",
                    })
                  }
                  className="text-[10px] font-medium text-muted-foreground hover:text-foreground"
                >
                  {filter.combineMode.toUpperCase()}
                </button>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}

            {/* Condition Row */}
            <div className="flex items-center gap-2">
              {/* Operator */}
              <OperatorDropdown
                operators={availableOperators}
                selected={condition.operator}
                onSelect={(op) => updateCondition(condIndex, { operator: op })}
              />

              {/* Value Input(s) */}
              {operatorRequiresValue(condition.operator) && (
                <>
                  <FilterValueInput
                    filterType={filter.filterType}
                    value={condition.value}
                    onChange={(v) => updateCondition(condIndex, { value: v })}
                    options={filterOptions}
                    placeholder="Value"
                  />
                  {operatorRequiresTwoValues(condition.operator) && (
                    <>
                      <span className="text-xs text-muted-foreground">and</span>
                      <FilterValueInput
                        filterType={filter.filterType}
                        value={condition.secondValue}
                        onChange={(v) =>
                          updateCondition(condIndex, { secondValue: v })
                        }
                        options={filterOptions}
                        placeholder="Value"
                      />
                    </>
                  )}
                </>
              )}

              {/* Remove condition */}
              {filter.conditions.length > 1 && (
                <button
                  onClick={() => removeCondition(condIndex)}
                  className="p-1 text-muted-foreground hover:text-destructive rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Add condition button */}
      <button
        onClick={addCondition}
        className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 pl-1"
      >
        <Plus className="h-3 w-3" />
        Add condition
      </button>
    </div>
  )
}

// ============================================
// Sub-components
// ============================================

interface ColumnDropdownProps {
  columns: FilterableColumn[]
  selected: string
  onSelect: (column: FilterableColumn) => void
}

function ColumnDropdown({ columns, selected, onSelect }: ColumnDropdownProps) {
  const [open, setOpen] = React.useState(false)
  const selectedColumn = columns.find(c => (c.filterKey || c.key) === selected)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-slate-100 hover:bg-slate-200 rounded transition-colors">
          {selectedColumn?.header || "Select column"}
          <ChevronDown className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-1">
        {columns.map(col => (
          <button
            key={col.key}
            onClick={() => {
              onSelect(col)
              setOpen(false)
            }}
            className={cn(
              "w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-100",
              (col.filterKey || col.key) === selected && "bg-slate-100"
            )}
          >
            {col.header}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

interface OperatorDropdownProps {
  operators: FilterOperator[]
  selected: FilterOperator
  onSelect: (operator: FilterOperator) => void
}

function OperatorDropdown({ operators, selected, onSelect }: OperatorDropdownProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 px-2 py-1.5 text-xs bg-muted hover:bg-muted/80 border rounded min-w-[100px] justify-between transition-colors">
          <span className="truncate">{FILTER_OPERATOR_LABELS[selected]}</span>
          <ChevronDown className="h-3 w-3 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-1">
        {operators.map(op => (
          <button
            key={op}
            onClick={() => {
              onSelect(op)
              setOpen(false)
            }}
            className={cn(
              "w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-100",
              op === selected && "bg-slate-100"
            )}
          >
            {FILTER_OPERATOR_LABELS[op]}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

interface FilterValueInputProps {
  filterType: FilterType
  value: string | number | boolean | null | undefined
  onChange: (value: string | number | null) => void
  options?: FilterSelectOption[]
  placeholder?: string
}

function FilterValueInput({
  filterType,
  value,
  onChange,
  options,
  placeholder = "Value",
}: FilterValueInputProps) {
  // Select input for select/multi-select with options
  if ((filterType === "select" || filterType === "multi-select") && options) {
    return (
      <select
        value={value === null || value === undefined ? "" : String(value)}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-8 px-2 text-sm border rounded bg-card flex-1 min-w-[120px]"
      >
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    )
  }

  // Date input
  if (filterType === "date") {
    return (
      <Input
        type="date"
        value={value === null || value === undefined ? "" : String(value)}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-8 text-sm flex-1 min-w-[120px]"
      />
    )
  }

  // Number input
  if (filterType === "number") {
    return (
      <Input
        type="number"
        value={value === null || value === undefined ? "" : String(value)}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        placeholder={placeholder}
        className="h-8 text-sm flex-1 min-w-[100px]"
      />
    )
  }

  // Default: text input
  return (
    <Input
      type="text"
      value={value === null || value === undefined ? "" : String(value)}
      onChange={(e) => onChange(e.target.value || null)}
      placeholder={placeholder}
      className="h-8 text-sm flex-1 min-w-[120px]"
    />
  )
}

// ============================================
// AddFilterDropdown
// ============================================

interface AddFilterDropdownProps {
  columns: FilterableColumn[]
  onSelect: (column: FilterableColumn) => void
}

export function AddFilterDropdown({ columns, onSelect }: AddFilterDropdownProps) {
  const [open, setOpen] = React.useState(false)

  if (columns.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center">
        No filterable columns available
      </p>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="w-full inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3">
          <Plus className="h-4 w-4" />
          Add Filter
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Select Column
        </div>
        {columns.map(col => (
          <button
            key={col.key}
            onClick={() => {
              onSelect(col)
              setOpen(false)
            }}
            className="w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-100 flex items-center justify-between"
          >
            <span>{col.header}</span>
            <span className="text-[10px] text-muted-foreground uppercase">
              {col.filterType}
            </span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
