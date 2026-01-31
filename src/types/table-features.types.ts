/**
 * Table Features Type Definitions
 *
 * Types for advanced table features: column management, advanced filtering,
 * and enhanced grouping capabilities.
 */

// ============================================
// Filter Operators
// ============================================

/**
 * Available filter operators for advanced filtering.
 * Maps to Supabase query methods.
 */
export type FilterOperator =
  | "eq"           // Equal: column = value
  | "neq"          // Not equal: column != value
  | "contains"     // String contains (ilike %val%)
  | "starts"       // Starts with (ilike val%)
  | "ends"         // Ends with (ilike %val)
  | "gt"           // Greater than: column > value
  | "gte"          // Greater or equal: column >= value
  | "lt"           // Less than: column < value
  | "lte"          // Less or equal: column <= value
  | "in"           // IN array: column IN (values)
  | "not_in"       // NOT IN array: column NOT IN (values)
  | "is_null"      // IS NULL
  | "is_not_null"  // IS NOT NULL
  | "between"      // Range: column BETWEEN val1 AND val2

/**
 * Human-readable labels for filter operators
 */
export const FILTER_OPERATOR_LABELS: Record<FilterOperator, string> = {
  eq: "equals",
  neq: "does not equal",
  contains: "contains",
  starts: "starts with",
  ends: "ends with",
  gt: "greater than",
  gte: "greater than or equal",
  lt: "less than",
  lte: "less than or equal",
  in: "is one of",
  not_in: "is not one of",
  is_null: "is empty",
  is_not_null: "is not empty",
  between: "is between",
}

/**
 * Operators available per filter type
 */
export const OPERATORS_BY_TYPE: Record<FilterType, FilterOperator[]> = {
  text: ["eq", "neq", "contains", "starts", "ends", "is_null", "is_not_null"],
  number: ["eq", "neq", "gt", "gte", "lt", "lte", "between", "is_null", "is_not_null"],
  date: ["eq", "neq", "gt", "gte", "lt", "lte", "between", "is_null", "is_not_null"],
  select: ["eq", "neq", "in", "not_in", "is_null", "is_not_null"],
  "multi-select": ["in", "not_in", "is_null", "is_not_null"],
}

// ============================================
// Filter Conditions
// ============================================

/**
 * Filter type determines what input to show and which operators are available
 */
export type FilterType = "text" | "number" | "date" | "select" | "multi-select"

/**
 * A single filter condition (operator + value)
 */
export interface FilterCondition {
  operator: FilterOperator
  value?: string | number | boolean | null
  secondValue?: string | number | null  // For "between" operator
}

/**
 * An advanced filter on a specific column
 */
export interface AdvancedFilter {
  id: string                       // Unique ID for this filter
  column: string                   // Column to filter on
  columnLabel?: string             // Human-readable column name
  filterType: FilterType           // Type of filter input
  conditions: FilterCondition[]    // One or more conditions
  combineMode: "and" | "or"        // How to combine multiple conditions
}

/**
 * A group of filters with AND/OR logic
 */
export interface FilterGroup {
  filters: AdvancedFilter[]
  combineMode: "and" | "or"        // How to combine filters in the group
}

// ============================================
// Column Metadata
// ============================================

/**
 * Extended column configuration for advanced features.
 * These properties can be added to Column<T> definitions.
 */
export interface ColumnMeta {
  // Visibility
  defaultVisible?: boolean         // Default: true - whether column shows by default
  canHide?: boolean                // Default: true - whether column can be hidden

  // Grouping
  groupable?: boolean              // Default: false - whether column can be used for grouping
  groupKey?: string                // Key for grouping (e.g., "property.id" for FK columns)
  groupLabel?: string              // Label when grouped (e.g., "Property")

  // Filtering
  filterable?: boolean             // Default: false - whether column can be filtered
  filterType?: FilterType          // Type of filter input
  filterKey?: string               // Database column to filter on (defaults to column key)
  filterOperators?: FilterOperator[] // Specific operators allowed (defaults based on filterType)
  filterOptions?: FilterSelectOption[] // Options for select/multi-select filters
}

/**
 * Option for select-type filters
 */
export interface FilterSelectOption {
  value: string
  label: string
}

// ============================================
// Enhanced Column Type
// ============================================

/**
 * Column definition with metadata for advanced features.
 * Extends the base Column type with ColumnMeta properties.
 */
export interface EnhancedColumn<T> {
  // Base column properties (from data-table.tsx)
  key: string
  header: string
  width?: string | number
  render?: (row: T) => React.ReactNode
  className?: string
  hideOnMobile?: boolean
  mobilePriority?: 1 | 2 | 3
  sortable?: boolean
  sortKey?: string
  sortType?: "string" | "number" | "date"

  // Enhanced properties from ColumnMeta
  defaultVisible?: boolean
  canHide?: boolean
  groupable?: boolean
  groupKey?: string
  groupLabel?: string
  filterable?: boolean
  filterType?: FilterType
  filterKey?: string
  filterOperators?: FilterOperator[]
  filterOptions?: FilterSelectOption[]
}

// ============================================
// View Configuration Extensions
// ============================================

/**
 * Extended table view config with advanced filter support.
 * Extends TableViewConfig from useListPage.ts
 */
export interface ExtendedTableViewConfig {
  sort?: { key: string; direction: "asc" | "desc" }[]
  filters?: Record<string, string>      // Simple filters (backward compat)
  advancedFilters?: FilterGroup         // New: advanced filter group
  groupBy?: string[]
  pageSize?: number
  hiddenColumns?: string[]              // Already existed, now fully utilized
}

// ============================================
// Helper Functions
// ============================================

/**
 * Check if an operator requires a value
 */
export function operatorRequiresValue(operator: FilterOperator): boolean {
  return !["is_null", "is_not_null"].includes(operator)
}

/**
 * Check if an operator requires two values (between)
 */
export function operatorRequiresTwoValues(operator: FilterOperator): boolean {
  return operator === "between"
}

/**
 * Get default operators for a filter type
 */
export function getDefaultOperators(filterType: FilterType): FilterOperator[] {
  return OPERATORS_BY_TYPE[filterType] || ["eq"]
}

/**
 * Create an empty filter condition
 */
export function createEmptyCondition(filterType: FilterType): FilterCondition {
  return {
    operator: getDefaultOperators(filterType)[0],
    value: null,
  }
}

/**
 * Create an empty advanced filter
 */
export function createEmptyFilter(
  column: string,
  columnLabel: string,
  filterType: FilterType
): AdvancedFilter {
  return {
    id: crypto.randomUUID(),
    column,
    columnLabel,
    filterType,
    conditions: [createEmptyCondition(filterType)],
    combineMode: "and",
  }
}

/**
 * Create an empty filter group
 */
export function createEmptyFilterGroup(): FilterGroup {
  return {
    filters: [],
    combineMode: "and",
  }
}

/**
 * Check if a filter group has any active filters
 */
export function hasActiveAdvancedFilters(group: FilterGroup | undefined): boolean {
  if (!group || group.filters.length === 0) return false

  return group.filters.some(filter =>
    filter.conditions.some(condition => {
      if (!operatorRequiresValue(condition.operator)) return true
      if (condition.value === null || condition.value === undefined || condition.value === "") return false
      if (operatorRequiresTwoValues(condition.operator)) {
        return condition.secondValue !== null && condition.secondValue !== undefined && condition.secondValue !== ""
      }
      return true
    })
  )
}
