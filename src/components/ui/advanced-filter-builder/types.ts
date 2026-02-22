/**
 * Advanced Filter Builder Types
 *
 * All type definitions and interfaces for the filter builder components.
 */

export type { FilterableColumn } from "@/lib/hooks/useFilterBuilder"

export type {
  FilterGroup,
  AdvancedFilter,
  FilterOperator,
  FilterType,
  FilterSelectOption,
} from "@/types/table-features.types"

export interface AdvancedFilterBuilderProps {
  columns: import("@/lib/hooks/useFilterBuilder").FilterableColumn[]
  value: import("@/types/table-features.types").FilterGroup
  onChange: (group: import("@/types/table-features.types").FilterGroup) => void
  className?: string
}

export interface AdvancedFilterBuilderInlineProps {
  columns: import("@/lib/hooks/useFilterBuilder").FilterableColumn[]
  value: import("@/types/table-features.types").FilterGroup
  onChange: (group: import("@/types/table-features.types").FilterGroup) => void
  className?: string
}
