// ============================================
// Centralized UI Component Exports
// Import from "@/components/ui" for all UI needs
// ============================================

// Core shadcn components
export { Button, buttonVariants } from "./button"
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "./card"
export { Checkbox } from "./checkbox"
export { Input } from "./input"
export { Label } from "./label"
export { Progress } from "./progress"
export { Textarea } from "./textarea"

// Dialog Components (shadcn)
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./dialog"

// Alert Dialog Components (shadcn)
export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "./alert-dialog"

// Dropdown Menu Components (shadcn)
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from "./dropdown-menu"

// Popover Components (shadcn)
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from "./popover"

// Command Components (shadcn / cmdk)
export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "./command"

// Tabs Components (shadcn)
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs"

// Badge Components (shadcn)
export { Badge, badgeVariants } from "./badge"
export type { BadgeProps } from "./badge"

// Data Display Components
export { DataTable, StatusDot, TableBadge } from "./data-table"
export type { Column, EditType as ColumnEditType, EditValidation as ColumnEditValidation, EditOption as ColumnEditOption } from "./data-table"
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

// Info Row Components (extended)
export { InfoRowGroup } from "./info-row"

// Detail Page Layout Components
export { DetailListSection } from "./detail-list-section"
export { MasonryGrid } from "./masonry-grid"
export { DetailPageContent, GridItem } from "./detail-page-content"
export { DraggableGrid } from "./draggable-grid"
export { SortableMasonry } from "./sortable-masonry"
export { DetailPageTemplate } from "./detail-page-template"

// Form Page Layout Components
export { FormPageTemplate, FormGrid } from "./form-page-template"
export type { FormPageTemplateProps, IconColor, FormGridProps } from "./form-page-template"

// Responsive Grid Components
export { ResponsiveGrid } from "./responsive-grid"

// Empty States
export {
  EmptyState,
  NoResultsState,
  NoDataState,
  ErrorState,
  NotFoundState,
} from "./empty-state"

// Inline Empty State
export { EmptyStateInline } from "./empty-state-inline"

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

// Page Loader
export { PageLoader } from "./page-loader"

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

// Audit & Activity Components
export { RecordMetadata, RecordMetadataInline, RecordMetadataContent } from "./record-metadata"
export { ActivityHistory, ActivityHistoryCompact, ActivityHistoryContent } from "./activity-history"
export { DetailPageAudit, AUDIT_ENTITY_TYPES } from "./detail-page-audit"
export type { AuditEntityType } from "./detail-page-audit"

// Table Advanced Features
export {
  ColumnManager,
  ColumnManagerCompact,
  useColumnVisibility,
} from "./column-manager"
export type { ColumnVisibilityConfig, ColumnManagerProps } from "./column-manager"

export {
  AdvancedFilterBuilder,
  AdvancedFilterBuilderInline,
} from "./advanced-filter-builder"
export type { FilterableColumn, AdvancedFilterBuilderProps } from "./advanced-filter-builder"

export {
  TableToolbar,
  TableToolbarCompact,
  ActiveFiltersSummary,
} from "./table-toolbar"
export type { TableToolbarProps, GroupByOption } from "./table-toolbar"

// Inline Edit Components
export { InlineEditCell, validateValue } from "./inline-edit"
export type {
  InlineEditCellProps,
  EditType,
  EditValidation,
  SelectOption as InlineEditSelectOption,
} from "./inline-edit"

// Table Row Actions
export { TableRowActions, createActionsColumn } from "./table-row-actions"
export type { TableRowActionsProps } from "./table-row-actions"

// Date Range Picker
export { DateRangePicker } from "./date-range-picker"
export type { DateRange, DateRangePreset } from "./date-range-picker"

// Animation Components
export { AnimatedNumber } from "./animated-number"

// Entity Selector (base component for Person/Product/Vendor selectors)
export { EntitySelector } from "./entity-selector"
export type { EntitySelectorConfig, EntitySelectorProps, QuickCreateFieldConfig } from "./entity-selector"

// Avatar Components
export { Avatar, AvatarGroup, getAvatarUrl } from "./avatar"

// Confirm Dialog
export { ConfirmDialog } from "./confirm-dialog"

// Form Dialog Components
export { FormDialog, DeleteDialog } from "./form-dialog"

// Pagination Components
export { Pagination, PaginationCompact } from "./pagination"

// Stat Card Components (unified)
export { StatCard, StatItem, StatsGrid } from "./stat-card"
export type { StatCardProps, StatItemProps, StatsGridProps, StatColorVariant } from "./stat-card"

// Quick Stats Grid Components (variant-based, specialized layouts)
export { QuickStatsGrid, InlineStats, SummaryCard } from "./quick-stats-grid"

// Chart Components
export { ChartContainer } from "./chart-container"

// Entity Link Components
export {
  PropertyLink,
  RoomLink,
  TenantLink,
  BillLink,
  PaymentLink,
  ExpenseLink,
  MeterReadingLink,
  ComplaintLink,
  VisitorLink,
  NoticeLink,
  ExitClearanceLink,
  MeterLink,
} from "./entity-link"

// Image Components
export { ImageLightbox, useLightbox } from "./image-lightbox"
export { ImageCropper } from "./image-cropper"

// Saved Views Components
export { SavedViewSelector } from "./saved-view-selector"
export type { SavedViewSelectorProps } from "./saved-view-selector"
export { ManageViewsDialog } from "./manage-views-dialog"
export type { ManageViewsDialogProps } from "./manage-views-dialog"
export { SaveViewDialog } from "./save-view-dialog"
export type { SaveViewDialogProps } from "./save-view-dialog"

// Submit Button & Form Actions
export { SubmitButton, FormActions } from "./submit-button"

// Theme Toggle
export { ThemeToggle } from "./theme-toggle"

// Print Button
export { PrintButton } from "./print-button"

// Keyboard Shortcuts
export { KeyboardShortcutsDialog } from "./keyboard-shortcuts-dialog"

// Help & Info Components
export { HelpTooltip } from "./help-tooltip"
export { InfoBanner } from "./info-banner"
