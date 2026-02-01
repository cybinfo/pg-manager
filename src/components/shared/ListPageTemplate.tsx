/**
 * ListPageTemplate Component
 *
 * Centralized template for all list pages. Eliminates ~1600 lines of duplicate code.
 * Provides: Header, Metrics, Filters, Grouping, DataTable, Empty State
 *
 * @example
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
 */

"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import Link from "next/link"
import { LucideIcon, Plus, Layers, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { DataTable, Column, GroupConfig } from "@/components/ui/data-table"
import { MetricsBar, MetricItem } from "@/components/ui/metrics-bar"
import { ListPageFilters, FilterConfig } from "@/components/ui/list-page-filters"
import { PermissionGuard, FeatureGuard } from "@/components/auth"
import { FeatureFlagKey } from "@/lib/features"
import { PageLoader } from "@/components/ui/page-loader"
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
import { useTableViews } from "@/lib/hooks/useTableViews"
import { useInlineEdit } from "@/lib/hooks/useInlineEdit"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { SavedViewSelector } from "@/components/ui/saved-view-selector"
import type { FilterGroup } from "@/types/table-features.types"
import { createEmptyFilterGroup, hasActiveAdvancedFilters } from "@/types/table-features.types"

// ============================================
// Types
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ListPageTemplateProps {
  // Page info
  title: string
  description: string
  icon: LucideIcon
  permission: string
  feature?: FeatureFlagKey // Optional feature flag
  breadcrumbs?: { label: string; href?: string }[]

  // Saved Views
  tableKey?: string // Unique key for this table (e.g., "tenants", "payments")
  enableSavedViews?: boolean // Default: true when tableKey is provided

  // Data config - accepts any config type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: ListPageConfig<any>

  // Filters
  filters?: FilterConfig[]
  filterConfigs?: HookFilterConfig[]

  // Advanced Filters
  advancedFilterColumns?: FilterableColumn[]
  enableAdvancedFilters?: boolean // Default: false

  // Grouping
  groupByOptions?: GroupByOption[]

  // Metrics - accepts any metrics type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metrics?: MetricConfig<any>[]

  // Table - accepts any column type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: Column<any>[]
  searchPlaceholder?: string

  // Column Management
  enableColumnManager?: boolean // Default: false

  // Actions
  createHref?: string
  createLabel?: string
  createPermission?: string
  headerActions?: React.ReactNode

  // Navigation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  detailHref?: (item: any) => string

  // Empty state
  emptyIcon?: LucideIcon
  emptyTitle?: string
  emptyDescription?: string

  // Callbacks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRowClick?: (item: any) => void

  // ============================================
  // Inline Editing Options
  // ============================================
  /** Enable inline editing for editable columns */
  enableInlineEdit?: boolean
  /** Permission required to edit (e.g., "tenants.update"). Defaults to derived from permission prop */
  editPermission?: string
  /** Custom callback for row updates. If not provided, uses default Supabase update */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRowUpdate?: (id: string, updates: Record<string, unknown>) => Promise<boolean>
}

// ============================================
// Component
// ============================================

export function ListPageTemplate({
  // Page info
  title,
  description,
  icon: Icon,
  permission,
  feature,
  breadcrumbs,

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

  // Actions
  createHref,
  createLabel = "Add New",
  createPermission,
  headerActions,

  // Navigation
  detailHref,

  // Empty state
  emptyIcon: EmptyIcon,
  emptyTitle = `No ${title.toLowerCase()} yet`,
  emptyDescription = `Add your first ${title.toLowerCase().slice(0, -1)} to get started`,

  // Callbacks
  onRowClick,

  // Inline Editing
  enableInlineEdit = false,
  editPermission,
  onRowUpdate,
}: ListPageTemplateProps) {
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
    filters,
    setFilter,
    clearFilters,
    filterOptions,
    // Advanced filters
    advancedFilters,
    setAdvancedFilters,
    clearAdvancedFilters,
    selectedGroups,
    setSelectedGroups,
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useListPage<any>({
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enhancedColumns: Column<any>[] = useMemo(() => {
    if (!canEdit) return columns

    return columns.map((col) => {
      // Skip non-editable columns
      if (!col.editable) return col

      // Create enhanced column with InlineEditCell wrapper
      return {
        ...col,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        render: (row: any) => {
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

  // Group dropdown state
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false)

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      canHide: (col as any).canHide !== false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      defaultVisible: (col as any).defaultVisible !== false,
    }))
  }, [columns])

  // Derive groupable columns from columns if no explicit groupByOptions provided
  const finalGroupByOptions = useMemo(() => {
    if (groupByOptions.length > 0) return groupByOptions
    // Auto-derive from columns with groupable: true
    return columns
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((col) => (col as any).groupable === true)
      .map((col) => ({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value: (col as any).groupKey || col.key,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        label: (col as any).groupLabel || col.header,
      }))
  }, [groupByOptions, columns])

  // Mark initial load as complete once data has loaded
  useEffect(() => {
    if (!loading && !initialLoadComplete) {
      setInitialLoadComplete(true)
    }
  }, [loading, initialLoadComplete])

  // Only show full-page loader for initial load
  // After that, keep DataTable mounted to preserve search focus
  if (loading && !initialLoadComplete) {
    return <PageLoader />
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
                className="h-9 px-3 rounded-md border border-input bg-background text-sm flex items-center gap-2 hover:bg-slate-50"
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
                  <div className="absolute right-0 mt-1 w-56 bg-white border rounded-lg shadow-lg z-20 py-1">
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
                          className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer"
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
        defaultSort={sortConfig}
        onSortChange={handleSortChange}
        hiddenColumns={hiddenColumns}
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

      {/* Pagination */}
      {pagination.total > pagination.pageSize && (
        <Pagination
          pagination={pagination}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          showTotal
          showPageSize
        />
      )}
    </div>
  )

  // Wrap with permission and feature guards
  if (feature) {
    return (
      <FeatureGuard feature={feature}>
        <PermissionGuard permission={permission}>{content}</PermissionGuard>
      </FeatureGuard>
    )
  }

  return <PermissionGuard permission={permission}>{content}</PermissionGuard>
}

// ============================================
// Export
// ============================================

export default ListPageTemplate
