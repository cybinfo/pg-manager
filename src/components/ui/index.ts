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
  PhoneInput,
  EmailInput,
  DateInput,
  SearchInput,
  Textarea,
  FormSection,
  ToggleSwitch,
} from "./form-components"

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

// Currency & Money Display
export {
  Currency,
  AmountDisplay,
  AmountWithTrend,
  DuesSummary,
  PaymentAmount,
} from "./currency"

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
