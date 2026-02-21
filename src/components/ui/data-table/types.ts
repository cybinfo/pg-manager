import * as React from "react"

// ============================================
// Column Width System
// All widths use proportional units to ensure
// tables fill their container properly
// ============================================
export const columnWidths = {
  // Primary columns - flexible, takes remaining space
  primary: 3,      // Main column (name, title) - largest
  secondary: 2,    // Secondary info (property, tenant)
  tertiary: 1.5,   // Tertiary info

  // Fixed-size columns (converted to proportional)
  status: 1,       // Status badges/dots
  date: 1,         // Date display
  dateTime: 1.2,   // DateTime with time
  badge: 1,        // Small badges (type, method)
  amount: 1,       // Currency amounts
  count: 0.8,      // Numeric counts
  actions: 1,      // Action buttons
  actionsWide: 1.5, // Multiple action buttons
  iconAction: 0.6, // Single icon button
  menu: 0.5,       // Chevron only
} as const

export type ColumnWidthKey = keyof typeof columnWidths

// ============================================
// Inline Edit Types (for Column interface)
// ============================================
export type EditType = "text" | "number" | "select" | "date" | "boolean"

export interface EditValidation {
  required?: boolean
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  patternMessage?: string
  custom?: (value: unknown) => string | null
}

export interface EditOption {
  value: string
  label: string
  disabled?: boolean
}

export interface Column<T> {
  key: string
  header: string
  width?: ColumnWidthKey | number
  render?: (row: T) => React.ReactNode
  className?: string
  hideOnMobile?: boolean
  /**
   * UI-009: Mobile priority (1 = highest, 3 = lowest)
   * Columns with lower priority numbers appear first on mobile.
   * Columns without priority default to their array position.
   */
  mobilePriority?: 1 | 2 | 3
  // Sorting options
  sortable?: boolean
  sortKey?: string  // Custom key for sorting (e.g., "property.name" for nested values)
  sortType?: "string" | "number" | "date"  // Type for proper comparison
  // Column visibility options (for Column Manager)
  canHide?: boolean  // Whether this column can be hidden (default: true, except for primary columns)
  defaultVisible?: boolean  // Whether this column is visible by default (default: true)

  // ============================================
  // Inline Edit Options
  // ============================================
  /** Whether this column is editable inline */
  editable?: boolean
  /** Input type for inline editing */
  editType?: EditType
  /** Database field name if different from key (e.g., for joined fields) */
  editField?: string
  /** Options for select type editing */
  editOptions?: EditOption[]
  /** Validation rules for the edit value */
  editValidation?: EditValidation
  /** Placeholder text when editing */
  editPlaceholder?: string
}

export type SortDirection = "asc" | "desc" | null

// Multi-column sort configuration
export interface SortConfig {
  key: string
  direction: "asc" | "desc"
}

export interface GroupConfig {
  key: string              // Field to group by (supports dot notation like "property.name")
  label?: string           // Display label for the group (e.g., "Property")
  renderLabel?: (value: unknown, count: number) => React.ReactNode  // Custom group header render
}

// Nested group structure for rendering
export interface NestedGroup<T> {
  key: string
  label: string
  depth: number
  config: GroupConfig
  rows: T[]
  children: NestedGroup<T>[]
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  onRowClick?: (row: T) => void
  href?: (row: T) => string
  loading?: boolean
  emptyState?: React.ReactNode
  searchable?: boolean
  searchPlaceholder?: string
  searchFields?: (keyof T)[]
  // External search control - use this for server-side search
  // When provided, search is controlled externally (no client-side filtering)
  externalSearch?: string
  onExternalSearchChange?: (query: string) => void
  className?: string
  // Sorting options - supports single or multi-column sorting
  // Single: { key: string; direction: "asc" | "desc" }
  // Multi: [{ key: string; direction: "asc" | "desc" }, ...]
  defaultSort?: SortConfig | SortConfig[]
  onSortChange?: (sortConfigs: SortConfig[]) => void
  // Grouping options - supports single or nested grouping
  groupBy?: GroupConfig | GroupConfig[] | string | string[]
  groupCounts?: Record<string, number>  // Server-side counts for accurate group totals
  collapsibleGroups?: boolean     // Allow groups to be collapsed
  defaultCollapsed?: boolean      // Start groups collapsed
  // Column visibility - list of column keys to hide
  hiddenColumns?: string[]
  // Row selection - opt-in via selectable prop
  selectable?: boolean
  selectedIds?: string[]
  onToggleRow?: (id: string) => void
  onToggleAll?: () => void
  isAllSelected?: boolean
  isSomeSelected?: boolean
}

// Helper to get nested value from object (e.g., "property.name")
export function getNestedValue<T>(obj: T, path: string): unknown {
  return path.split(".").reduce((acc: unknown, part) => {
    if (acc && typeof acc === "object" && part in acc) {
      return (acc as Record<string, unknown>)[part]
    }
    return undefined
  }, obj)
}

// Build grid template using fr units for proper distribution
export function getColumnFr(width?: ColumnWidthKey | number): number {
  if (typeof width === "number") return width
  if (width && width in columnWidths) return columnWidths[width]
  return columnWidths.tertiary // default
}

export function buildGridTemplate<T>(visibleColumns: Column<T>[], isClickable: boolean, selectable?: boolean): string {
  const prefix = selectable ? "auto " : ""
  return prefix + visibleColumns
    .map(c => `${getColumnFr(c.width)}fr`)
    .join(" ") + (isClickable ? ` ${columnWidths.menu}fr` : "")
}
