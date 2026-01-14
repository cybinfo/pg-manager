// ============================================
// Centralized UI Component Exports
// Import from "@/components/ui" for all UI needs
// ============================================

// Core shadcn components
export { Button, buttonVariants } from "./button"
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "./card"
export { Input } from "./input"
export { Label } from "./label"

// Data Display Components
export { DataTable, StatusDot, TableBadge } from "./data-table"
export type { Column } from "./data-table"
export { MetricsBar, MetricsBarCompact } from "./metrics-bar"
export type { MetricItem } from "./metrics-bar"

// Page Layout Components
export { PageHeader, PageHeaderSimple } from "./page-header"
export { SectionDivider, Divider, Section } from "./section-divider"

// Status & Badge Components
export { StatusBadge, PriorityBadge, StatusIndicator } from "./status-badge"

// Form Components
export {
  FormField,
  Select,
  CurrencyInput,
  EmailInput,
  DateInput,
  SearchInput,
  TextareaWithCount,
  FormSection,
  ToggleSwitch,
} from "./form-components"

// UI-003: Base Textarea (shadcn) - use for simple cases
export { Textarea } from "./textarea"

// UI-001: Consolidated phone input components
export { PhoneInput, SimplePhoneInput } from "./phone-input"

// Combobox Components (searchable dropdowns)
export { Combobox, MultiCombobox, AsyncCombobox } from "./combobox"
export type { ComboboxOption } from "./combobox"

// Detail Page Components
export {
  DetailHero,
  InfoCard,
  DetailSection,
  InfoRow,
  ActionMenu,
  QuickActions,
} from "./detail-components"

// Empty States
export {
  EmptyState,
  NoResultsState,
  NoDataState,
  ErrorState,
} from "./empty-state"

// Loading States
export {
  Spinner,
  PageLoading,
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  SkeletonMetricsBar,
  SkeletonPageHeader,
  PageSkeleton,
  LoadingContent,
} from "./loading"

// File Upload Components
export { FileUpload, ProfilePhotoUpload } from "./file-upload"

// Currency & Money Display
export {
  Currency,
  AmountDisplay,
  AmountWithTrend,
  DuesSummary,
  PaymentAmount,
} from "./currency"

// List Page Filters
export {
  ListPageFilters,
  useListFilters,
} from "./list-page-filters"
export type { FilterConfig, FilterOption, ListPageFiltersProps } from "./list-page-filters"

// Design Tokens (centralized styling constants)
export {
  colors,
  statusColors,
  spacing,
  typography,
  borders,
  shadows,
  animations,
  presets,
  iconSizes,
  zIndex,
} from "@/lib/design-tokens"
