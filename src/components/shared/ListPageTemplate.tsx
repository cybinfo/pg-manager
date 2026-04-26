/**
 * ListPageTemplate Component
 *
 * Centralized template for all list pages. Eliminates ~1600 lines of duplicate code.
 * Provides: Header, Metrics, Filters, Grouping, DataTable, Empty State
 *
 * Supports both flat props (original API) and grouped config objects (new API).
 * Both styles are fully backward compatible.
 *
 * @example
 * // Original flat props style (still fully supported):
 * <ListPageTemplate
 *   title="Tenants"
 *   description="Manage all your tenants"
 *   icon={Users}
 *   permission="tenants.view"
 *   config={TENANT_LIST_CONFIG}
 *   filters={tenantFilters}
 *   groupByOptions={tenantGroupOptions}
 *   metrics={tenantMetrics}
 *   columns={tenantColumns}
 *   createHref="/tenants/new"
 *   createLabel="Add Tenant"
 *   detailHref={(item) => `/tenants/${item.id}`}
 * />
 *
 * @example
 * // New grouped props style:
 * <ListPageTemplate
 *   title="Tenants"
 *   description="Manage all your tenants"
 *   icon={Users}
 *   permissions={{ view: "tenants.view", create: "tenants.create", edit: "tenants.update" }}
 *   config={TENANT_LIST_CONFIG}
 *   columns={tenantColumns}
 *   actions={{ createHref: "/tenants/new", createLabel: "Add Tenant", detailHref: (t) => `/tenants/${t.id}` }}
 *   emptyState={{ title: "No tenants yet", description: "Add your first tenant" }}
 *   inlineEdit={{ enabled: true }}
 * />
 */

"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { LucideIcon, Plus, Layers, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { DataTable, Column, GroupConfig } from "@/components/ui/data-table"
import { MetricsBar, MetricItem } from "@/components/ui/metrics-bar"
import { ListPageFilters, FilterConfig } from "@/components/ui/list-page-filters"
import { PermissionGuard, FeatureGuard } from "@/components/auth"
import { FeatureFlagKey } from "@/lib/features"
import { PageSkeleton } from "@/components/ui/loading"
import { ErrorState } from "@/components/ui/empty-state"
import { Pagination } from "@/components/ui/pagination"
import { Checkbox } from "@/components/ui/checkbox"
import { ColumnManager, type ColumnVisibilityConfig } from "@/components/ui/column-manager"
import { AdvancedFilterBuilder, type FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { InlineEditCell } from "@/components/ui/inline-edit"
import {
  useListPage,
  ListPageConfig,
  FilterConfig as HookFilterConfig,
  GroupByOption,
  MetricConfig,
  TableViewConfig,
} from "@/lib/hooks/useListPage"
import { ExportButton } from "@/components/ui/export-button"
import type { CSVColumn } from "@/lib/download-utils"
import { useTableViews } from "@/lib/hooks/useTableViews"
import { buildDetailHref } from "@/lib/hooks/useBackNavigation"
import { useInlineEdit } from "@/lib/hooks/useInlineEdit"
import { useRowSelection } from "@/lib/hooks/useRowSelection"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { SavedViewSelector } from "@/components/ui/saved-view-selector"


// ============================================
// Internal Types
// ============================================

/**
 * Generic row type for list page data.
 *
 * Column<T> and MetricConfig<T> use T in both covariant and contravariant
 * positions (e.g., `render: (row: T) => ReactNode`), making them invariant.
 * This means Column<Tenant> is NOT assignable to Column<Record<string, unknown>>
 * in TypeScript's strict type system.
 *
 * Since all ~30 consumer pages pass domain-specific types (Column<Tenant>,
 * Column<Bill>, etc.) without explicit generic annotation, and TypeScript
 * cannot infer the generic from JSX props with invariant type parameters,
 * we use this flexible row type at the component boundary. The generic
 * `ListPageTemplateProps<T>` interface is still available for consumers
 * who want explicit type safety by specifying `<ListPageTemplate<Tenant> ...>`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FlexibleRow = any

/**
 * Extended column type that includes groupable metadata.
 * Consumer pages may define columns with these extra properties
 * to enable auto-derived group-by options.
 */
interface GroupableColumnExtension {
  groupable?: boolean
  groupKey?: string
  groupLabel?: string
}

// ============================================
// Grouped Config Types (New API)
// ============================================

/**
 * Permission configuration for the list page.
 * Groups all permission-related props into a single object.
 */
export interface ListPagePermissions {
  /** Permission required to view this page (e.g., "tenants.view") */
  view: string
  /** Permission required to create new items (e.g., "tenants.create") */
  create?: string
  /** Permission required to edit items (e.g., "tenants.update") */
  edit?: string
  /** Permission required to delete items (e.g., "tenants.delete") */
  delete?: string
  /** Feature flag that must be enabled for this page */
  feature?: FeatureFlagKey
}

/**
 * Action configuration for the list page.
 * Groups create button, detail navigation, row click, and header actions.
 *
 * @typeParam T - The data row type. Defaults to Record<string, unknown>.
 */
export interface ListPageActions<T extends Record<string, unknown> = Record<string, unknown>> {
  /** URL for the "create new" button */
  createHref?: string
  /** Label for the "create new" button (default: "Add New") */
  createLabel?: string
  /** Function to generate detail page URL from a row item */
  detailHref?: (item: T) => string
  /** Callback when a row is clicked */
  onRowClick?: (item: T) => void
  /** Additional action buttons rendered in the page header */
  headerActions?: React.ReactNode
}

/**
 * Empty state configuration for when no data is present.
 */
export interface ListPageEmptyState {
  /** Icon to show in empty state (defaults to the page icon) */
  icon?: LucideIcon
  /** Title text for empty state */
  title?: string
  /** Description text for empty state */
  description?: string
}

/**
 * Inline editing configuration.
 */
export interface ListPageInlineEditConfig {
  /** Enable inline editing for editable columns */
  enabled?: boolean
  /** Permission required to edit (e.g., "tenants.update"). Defaults to derived from view permission */
  permission?: string
  /** Custom callback for row updates. If not provided, uses default Supabase update */
  onRowUpdate?: (id: string, updates: Record<string, unknown>) => Promise<boolean>
}

// ============================================
// Component Props (Supports Both Flat & Grouped)
// ============================================

/**
 * Props for ListPageTemplate component.
 *
 * The generic type parameter `T` represents the shape of each data row.
 * When using the new grouped `actions` prop, specify `T` explicitly for
 * type-safe callbacks:
 *
 * ```tsx
 * <ListPageTemplate<Tenant>
 *   actions={{ detailHref: (t) => `/tenants/${t.id}` }}
 *   ...
 * />
 * ```
 *
 * For the original flat props API, explicit generic annotation is not required.
 *
 * Both flat props (original API) and grouped config objects (new API)
 * are supported. Flat props take precedence when both are provided.
 */
export interface ListPageTemplateProps<T extends Record<string, unknown> = Record<string, unknown>> {
  // Page info
  title: string
  description: string
  icon: LucideIcon
  breadcrumbs?: { label: string; href?: string }[]

  // --- Permission props (flat style, original API) ---
  /** @deprecated Use `permissions.view` instead. Still fully supported for backward compatibility. */
  permission?: string
  /** @deprecated Use `permissions.feature` instead. Still fully supported for backward compatibility. */
  feature?: FeatureFlagKey

  // --- Permission props (grouped style, new API) ---
  permissions?: ListPagePermissions

  // Saved Views
  tableKey?: string
  enableSavedViews?: boolean

  // Data config
  config: ListPageConfig<T>

  // Filters
  filters?: FilterConfig[]
  filterConfigs?: HookFilterConfig[]

  // Advanced Filters
  advancedFilterColumns?: FilterableColumn[]
  enableAdvancedFilters?: boolean

  // Grouping
  groupByOptions?: GroupByOption[]

  // Metrics
  metrics?: MetricConfig<T>[]

  // Table
  columns: Column<T>[]
  searchPlaceholder?: string

  // Column Management
  enableColumnManager?: boolean

  // --- Action props (flat style, original API) ---
  /** @deprecated Use `actions.createHref` instead. Still fully supported for backward compatibility. */
  createHref?: string
  /** @deprecated Use `actions.createLabel` instead. Still fully supported for backward compatibility. */
  createLabel?: string
  /** @deprecated Use `permissions.create` instead. Still fully supported for backward compatibility. */
  createPermission?: string
  /** @deprecated Use `actions.headerActions` instead. Still fully supported for backward compatibility. */
  headerActions?: React.ReactNode
  /** @deprecated Use `actions.detailHref` instead. Still fully supported for backward compatibility. */
  detailHref?: (item: T) => string
  /** @deprecated Use `actions.onRowClick` instead. Still fully supported for backward compatibility. */
  onRowClick?: (item: T) => void

  // --- Action props (grouped style, new API) ---
  actions?: ListPageActions<T>

  // --- Empty state props (flat style, original API) ---
  /** @deprecated Use `emptyState.icon` instead. Still fully supported for backward compatibility. */
  emptyIcon?: LucideIcon
  /** @deprecated Use `emptyState.title` instead. Still fully supported for backward compatibility. */
  emptyTitle?: string
  /** @deprecated Use `emptyState.description` instead. Still fully supported for backward compatibility. */
  emptyDescription?: string

  // --- Empty state props (grouped style, new API) ---
  emptyState?: ListPageEmptyState

  // --- Inline edit props (flat style, original API) ---
  /** @deprecated Use `inlineEdit.enabled` instead. Still fully supported for backward compatibility. */
  enableInlineEdit?: boolean
  /** @deprecated Use `inlineEdit.permission` or `permissions.edit` instead. Still fully supported for backward compatibility. */
  editPermission?: string
  /** @deprecated Use `inlineEdit.onRowUpdate` instead. Still fully supported for backward compatibility. */
  onRowUpdate?: (id: string, updates: Record<string, unknown>) => Promise<boolean>

  // --- Inline edit props (grouped style, new API) ---
  inlineEdit?: ListPageInlineEditConfig

  // --- CSV Export ---
  /** Column definitions for CSV export. When provided, shows an Export CSV button in the header. */
  exportColumns?: CSVColumn<T>[]
  /** Base filename for CSV export (default: derived from title). Date is appended automatically. */
  exportFilename?: string

  // --- Bulk Actions ---
  /** Enable row selection and render bulk actions bar when rows are selected */
  bulkActions?: BulkActionConfig
}

/**
 * Configuration for bulk actions on the list page.
 * When provided, enables row selection checkboxes and renders
 * a bulk actions bar above the table when rows are selected.
 */
export interface BulkActionConfig {
  /** Permission required to use bulk actions (e.g., "library_members.edit") */
  permission?: string
  /** Render function for the bulk actions bar. Receives selected IDs and a clear function. */
  renderActions: (selectedIds: string[], clearSelection: () => void, refetch: () => void) => React.ReactNode
}

// ============================================
// Component
// ============================================

/**
 * The component implementation uses FlexibleRow internally to handle the
 * TypeScript variance limitation where Column<SpecificType> is not assignable
 * to Column<Record<string, unknown>>. The exported ListPageTemplateProps<T>
 * interface provides proper generics for consumers who specify T explicitly.
 */
export function ListPageTemplate({
  // Page info
  title,
  description,
  icon: Icon,
  breadcrumbs,

  // Permission (flat - original)
  permission: flatPermission,
  feature: flatFeature,

  // Permission (grouped - new)
  permissions,

  // Saved Views
  tableKey,
  enableSavedViews = true,

  // Data config
  config,

  // Filters
  filters: filterConfigs = [],
  filterConfigs: hookFilterConfigs,

  // Advanced Filters
  advancedFilterColumns = [],
  enableAdvancedFilters = false,

  // Grouping
  groupByOptions = [],

  // Metrics
  metrics = [],

  // Table
  columns,
  searchPlaceholder,

  // Column Management
  enableColumnManager = false,

  // Actions (flat - original)
  createHref: flatCreateHref,
  createLabel: flatCreateLabel,
  createPermission: flatCreatePermission,
  headerActions: flatHeaderActions,
  detailHref: flatDetailHref,
  onRowClick: flatOnRowClick,

  // Actions (grouped - new)
  actions,

  // Empty state (flat - original)
  emptyIcon: flatEmptyIcon,
  emptyTitle: flatEmptyTitle,
  emptyDescription: flatEmptyDescription,

  // Empty state (grouped - new)
  emptyState,

  // Inline Editing (flat - original)
  enableInlineEdit: flatEnableInlineEdit,
  editPermission: flatEditPermission,
  onRowUpdate: flatOnRowUpdate,

  // Inline Editing (grouped - new)
  inlineEdit,

  // CSV Export
  exportColumns,
  exportFilename,

  // Bulk Actions
  bulkActions,
}: ListPageTemplateProps<FlexibleRow>) {
  // ============================================
  // Resolve flat + grouped props (flat props take precedence for backward compat)
  // ============================================
  const permission = flatPermission || permissions?.view || ""
  const feature = flatFeature || permissions?.feature
  const createHref = flatCreateHref ?? actions?.createHref
  const createLabel = flatCreateLabel ?? actions?.createLabel ?? "Add New"
  const createPermission = flatCreatePermission ?? permissions?.create
  const headerActions = flatHeaderActions ?? actions?.headerActions
  const baseDetailHref = flatDetailHref ?? actions?.detailHref
  const onRowClick = flatOnRowClick ?? actions?.onRowClick

  // Wrap detailHref to append `from` query param for back navigation
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const detailHref = baseDetailHref
    ? (item: FlexibleRow) => buildDetailHref(baseDetailHref(item), pathname, searchParams.toString() || undefined)
    : undefined

  const EmptyIcon = flatEmptyIcon ?? emptyState?.icon
  const emptyTitle = flatEmptyTitle ?? emptyState?.title ?? `No ${title.toLowerCase()} yet`
  const emptyDescription = flatEmptyDescription ?? emptyState?.description ?? `Add your first ${title.toLowerCase().slice(0, -1)} to get started`

  const enableInlineEdit = flatEnableInlineEdit ?? inlineEdit?.enabled ?? false
  const editPermission = flatEditPermission ?? inlineEdit?.permission ?? permissions?.edit
  const onRowUpdate = flatOnRowUpdate ?? inlineEdit?.onRowUpdate

  // Track if initial load is complete (to avoid unmounting DataTable during search)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

  // Saved views state
  const [viewConfig, setViewConfig] = useState<TableViewConfig | null>(null)
  const showSavedViews = enableSavedViews && !!tableKey

  // Use saved views hook (only if tableKey is provided)
  const tableViews = useTableViews({
    tableKey: tableKey || "",
    onViewApplied: (config) => setViewConfig(config),
  })

  // Use centralized hook
  const {
    data,
    filteredData,
    loading,
    error,
    refetch,
    filters,
    setFilter,
    clearFilters,
    filterOptions,
    // Advanced filters
    advancedFilters,
    setAdvancedFilters,
    clearAdvancedFilters: _clearAdvancedFilters,
    selectedGroups,
    setSelectedGroups,
    groupCounts,
    metricsData,
    searchQuery,
    setSearchQuery,
    sortConfig,
    handleSortChange,
    pagination,
    setPage,
    setPageSize,
    // Column visibility
    hiddenColumns,
    toggleColumn,
    resetColumnVisibility,
    getViewConfig,
    applyViewConfig,
  } = useListPage<FlexibleRow>({
    config,
    filters: hookFilterConfigs || filterConfigs.map((f) => ({
      id: f.id,
      label: f.label,
      type: f.type as "select" | "date" | "date-range" | "text",
      options: f.options,
    })),
    groupByOptions,
    metrics,
    initialViewConfig: tableViews.activeView?.config,
    tableKey,
  })

  // Apply view config when it changes from saved views
  useEffect(() => {
    if (viewConfig !== null) {
      applyViewConfig(viewConfig)
    }
  }, [viewConfig, applyViewConfig])

  // ============================================
  // Inline Edit Setup
  // ============================================
  const { hasPermission, workspaceId } = useAuthContext()

  // Derive edit permission from view permission (e.g., "tenants.view" -> "tenants.update")
  const derivedEditPermission = editPermission || permission.replace(".view", ".update")
  const canEdit = enableInlineEdit && hasPermission(derivedEditPermission)

  // Use inline edit hook
  const { updateRow: inlineUpdateRow, saving: inlineSaving } = useInlineEdit({
    table: config.table,
    workspaceId,
    onSuccess: () => {
      // Trigger a refetch to get updated data
      // The hook doesn't expose refetch directly, but data updates via subscription or page reload
    },
  })

  // Handle row update - use custom callback or default inline update
  const handleRowUpdate = useCallback(
    async (id: string, updates: Record<string, unknown>): Promise<boolean> => {
      if (onRowUpdate) {
        return onRowUpdate(id, updates)
      }
      return inlineUpdateRow(id, updates)
    },
    [onRowUpdate, inlineUpdateRow]
  )

  // Enhance columns with inline edit capability
  const enhancedColumns: Column<FlexibleRow>[] = useMemo(() => {
    if (!canEdit) return columns

    return columns.map((col) => {
      // Skip non-editable columns
      if (!col.editable) return col

      // Create enhanced column with InlineEditCell wrapper
      return {
        ...col,
        render: (row: FlexibleRow) => {
          const fieldName = col.editField || col.key
          const value = row[col.key]

          return (
            <InlineEditCell
              value={value}
              field={fieldName}
              editType={col.editType || "text"}
              editOptions={col.editOptions}
              validation={col.editValidation}
              placeholder={col.editPlaceholder}
              disabled={inlineSaving}
              onSave={(field, newValue) => handleRowUpdate(row.id, { [field]: newValue })}
              renderDisplay={col.render ? () => col.render!(row) : undefined}
            />
          )
        },
      }
    })
  }, [columns, canEdit, inlineSaving, handleRowUpdate])

  // ============================================
  // Row Selection (for Bulk Actions)
  // ============================================
  const enableBulkActions = !!bulkActions && (!bulkActions.permission || hasPermission(bulkActions.permission))
  const {
    selectedIds: bulkSelectedIds,
    toggleRow: bulkToggleRow,
    toggleAll: bulkToggleAll,
    clearSelection: bulkClearSelection,
    isAllSelected: bulkIsAllSelected,
    isSomeSelected: bulkIsSomeSelected,
  } = useRowSelection(enableBulkActions ? filteredData : [])

  // Group dropdown state
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false)

  // Handle Escape key to close group dropdown
  useEffect(() => {
    if (!groupDropdownOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        setGroupDropdownOpen(false)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [groupDropdownOpen])

  // Build metrics items for MetricsBar
  const metricsItems = useMemo(() => {
    return metricsData.map((m) => ({
      label: m.label,
      value: m.value,
      icon: m.icon as LucideIcon | undefined,
      highlight: m.highlight,
    })) as MetricItem[]
  }, [metricsData])

  // Build group config for DataTable
  const groupConfig: GroupConfig[] | undefined = useMemo(() => {
    if (selectedGroups.length === 0) return undefined
    return selectedGroups.map((key) => ({
      key,
      label: groupByOptions.find((o) => o.value === key)?.label,
    }))
  }, [selectedGroups, groupByOptions])

  // Merge filter options from hook with static options
  const mergedFilterConfigs: FilterConfig[] = useMemo(() => {
    return filterConfigs.map((f) => ({
      ...f,
      options: f.options || filterOptions[f.id] || [],
    }))
  }, [filterConfigs, filterOptions])

  // Build column visibility config from columns
  const columnVisibilityConfig: ColumnVisibilityConfig[] = useMemo(() => {
    return columns.map((col) => ({
      key: col.key,
      header: col.header,
      canHide: col.canHide !== false,
      defaultVisible: col.defaultVisible !== false,
    }))
  }, [columns])

  // Derive groupable columns from columns if no explicit groupByOptions provided
  const finalGroupByOptions = useMemo(() => {
    if (groupByOptions.length > 0) return groupByOptions
    // Auto-derive from columns with groupable: true (extended column properties)
    return columns
      .filter((col: Column<FlexibleRow> & GroupableColumnExtension) => col.groupable === true)
      .map((col: Column<FlexibleRow> & GroupableColumnExtension) => ({
        value: col.groupKey || col.key,
        label: col.groupLabel || col.header,
      }))
  }, [groupByOptions, columns])

  // Mark initial load as complete once data has loaded
  useEffect(() => {
    if (!loading && !initialLoadComplete) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInitialLoadComplete(true)
    }
  }, [loading, initialLoadComplete])

  // Only show full-page loader for initial load
  // After that, keep DataTable mounted to preserve search focus
  if (loading && !initialLoadComplete) {
    return <PageSkeleton variant="list" />
  }

  // Show error state if data failed to load
  if (error && !initialLoadComplete) {
    return <ErrorState message="Failed to load data. Please try again." onRetry={refetch} />
  }

  // Render content
  const content = (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={title}
        description={description}
        icon={Icon}
        breadcrumbs={breadcrumbs || [{ label: title }]}
        actions={
          <div className="flex items-center gap-2">
            {/* Saved Views Selector */}
            {showSavedViews && (
              <SavedViewSelector
                views={tableViews.views}
                activeViewId={tableViews.activeViewId}
                loading={tableViews.loading}
                currentConfig={getViewConfig()}
                onApplyView={tableViews.applyView}
                onResetToDefault={() => {
                  tableViews.resetToSystemDefault()
                  applyViewConfig(null)
                }}
                onCreateView={tableViews.createView}
                onUpdateView={tableViews.updateView}
                onDeleteView={tableViews.deleteView}
                onSetDefault={tableViews.setDefaultView}
                onClearDefault={tableViews.clearDefaultView}
              />
            )}
            {exportColumns && exportColumns.length > 0 && (
              <ExportButton
                data={filteredData}
                filename={exportFilename || title.toLowerCase().replace(/\s+/g, "-")}
                columns={exportColumns}
              />
            )}
            {headerActions}
            {createHref && (
              createPermission ? (
                <PermissionGuard permission={createPermission}>
                  <Link href={createHref}>
                    <Button variant="gradient">
                      <Plus className="mr-2 h-4 w-4" />
                      {createLabel}
                    </Button>
                  </Link>
                </PermissionGuard>
              ) : (
                <Link href={createHref}>
                  <Button variant="gradient">
                    <Plus className="mr-2 h-4 w-4" />
                    {createLabel}
                  </Button>
                </Link>
              )
            )}
          </div>
        }
      />

      {/* Metrics */}
      {data.length > 0 && metricsItems.length > 0 && (
        <MetricsBar items={metricsItems} />
      )}

      {/* Filters & Grouping & Tools */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Simple Filters - only show if advanced filters are NOT enabled */}
        {mergedFilterConfigs.length > 0 && !enableAdvancedFilters && (
          <div className="flex-1">
            <ListPageFilters
              filters={mergedFilterConfigs}
              values={filters}
              onChange={(id, value) => setFilter(id, value)}
              onClear={clearFilters}
            />
          </div>
        )}

        {/* Right-side tools: Advanced Filters, Grouping, Column Manager */}
        <div className="flex items-center gap-2">
          {/* Advanced Filter Builder */}
          {enableAdvancedFilters && advancedFilterColumns.length > 0 && (
            <AdvancedFilterBuilder
              columns={advancedFilterColumns}
              value={advancedFilters}
              onChange={setAdvancedFilters}
            />
          )}

          {/* Group By Multi-Select */}
          {finalGroupByOptions.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setGroupDropdownOpen(!groupDropdownOpen)}
                aria-expanded={groupDropdownOpen}
                aria-haspopup="true"
                className="h-9 px-3 rounded-md border border-input bg-background text-sm flex items-center gap-2 hover:bg-muted"
              >
                <Layers className="h-4 w-4 text-muted-foreground" />
                <span className="hidden sm:inline">
                  {selectedGroups.length === 0
                    ? "Group by..."
                    : selectedGroups.length === 1
                      ? finalGroupByOptions.find((o) => o.value === selectedGroups[0])?.label
                      : `${selectedGroups.length} levels`}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    groupDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {groupDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setGroupDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-1 w-56 bg-card border rounded-lg shadow-lg z-20 py-1">
                    <div className="px-3 py-2 border-b">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        Group by (select order)
                      </p>
                    </div>
                    {finalGroupByOptions.map((opt) => {
                      const isSelected = selectedGroups.includes(opt.value)
                      const orderIndex = selectedGroups.indexOf(opt.value)

                      return (
                        <label
                          key={opt.value}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-muted cursor-pointer"
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedGroups([...selectedGroups, opt.value])
                              } else {
                                setSelectedGroups(
                                  selectedGroups.filter((v) => v !== opt.value)
                                )
                              }
                            }}
                          />
                          <span className="text-sm flex-1">{opt.label}</span>
                          {isSelected && (
                            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                              {orderIndex + 1}
                            </span>
                          )}
                        </label>
                      )
                    })}
                    {selectedGroups.length > 0 && (
                      <div className="border-t mt-1 pt-1 px-3 py-2">
                        <button
                          onClick={() => {
                            setSelectedGroups([])
                            setGroupDropdownOpen(false)
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Clear grouping
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Column Manager */}
          {enableColumnManager && (
            <ColumnManager
              columns={columnVisibilityConfig}
              hiddenColumns={hiddenColumns}
              onToggleColumn={toggleColumn}
              onResetColumns={resetColumnVisibility}
            />
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {enableBulkActions && bulkSelectedIds.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <span className="text-sm font-medium">
            {bulkSelectedIds.length} selected
          </span>
          <div className="h-4 w-px bg-border" />
          {bulkActions.renderActions(bulkSelectedIds, bulkClearSelection, refetch)}
          <button
            onClick={bulkClearSelection}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* DataTable */}
      <DataTable
        columns={enhancedColumns}
        data={filteredData}
        keyField="id"
        href={detailHref}
        onRowClick={onRowClick}
        searchable
        searchPlaceholder={searchPlaceholder || `Search ${title.toLowerCase()}...`}
        searchFields={config.searchFields as string[]}
        externalSearch={searchQuery}
        onExternalSearchChange={setSearchQuery}
        groupBy={groupConfig}
        groupCounts={groupCounts}
        defaultSort={sortConfig}
        onSortChange={handleSortChange}
        hiddenColumns={hiddenColumns}
        selectable={enableBulkActions}
        selectedIds={enableBulkActions ? bulkSelectedIds : undefined}
        onToggleRow={enableBulkActions ? bulkToggleRow : undefined}
        onToggleAll={enableBulkActions ? bulkToggleAll : undefined}
        isAllSelected={enableBulkActions ? bulkIsAllSelected : undefined}
        isSomeSelected={enableBulkActions ? bulkIsSomeSelected : undefined}
        emptyState={
          <div className="flex flex-col items-center py-8">
            {EmptyIcon ? (
              <EmptyIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
            ) : (
              <Icon className="h-12 w-12 text-muted-foreground/50 mb-4" />
            )}
            <h3 className="text-lg font-medium mb-2">{emptyTitle}</h3>
            <p className="text-muted-foreground text-center mb-4">
              {emptyDescription}
            </p>
            {createHref && (
              <Link href={createHref}>
                <Button variant="gradient">
                  <Plus className="mr-2 h-4 w-4" />
                  {createLabel}
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {/* Pagination - show when there's data and grouping is not active */}
      {pagination.total > 0 && selectedGroups.length === 0 && (
        <Pagination
          pagination={pagination}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          showTotal
          showPageSize
        />
      )}
      {/* When grouping is active, show simple count (pagination doesn't apply) */}
      {pagination.total > 0 && selectedGroups.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing all {pagination.total} results
        </div>
      )}
    </div>
  )

  // Wrap with permission and feature guards
  // Skip PermissionGuard when no permission is specified (e.g., Activity Log)
  if (feature && permission) {
    return (
      <FeatureGuard feature={feature}>
        <PermissionGuard permission={permission}>{content}</PermissionGuard>
      </FeatureGuard>
    )
  }

  if (feature) {
    return (
      <FeatureGuard feature={feature}>
        {content}
      </FeatureGuard>
    )
  }

  if (permission) {
    return <PermissionGuard permission={permission}>{content}</PermissionGuard>
  }

  return content
}

// ============================================
// Export
// ============================================

export default ListPageTemplate
