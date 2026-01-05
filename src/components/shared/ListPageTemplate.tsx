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

import { useState, useMemo } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import {
  useListPage,
  ListPageConfig,
  FilterConfig as HookFilterConfig,
  GroupByOption,
  MetricConfig,
} from "@/lib/hooks/useListPage"

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

  // Data config - accepts any config type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: ListPageConfig<any>

  // Filters
  filters?: FilterConfig[]
  filterConfigs?: HookFilterConfig[]

  // Grouping
  groupByOptions?: GroupByOption[]

  // Metrics - accepts any metrics type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metrics?: MetricConfig<any>[]

  // Table - accepts any column type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: Column<any>[]
  searchPlaceholder?: string

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

  // Data config
  config,

  // Filters
  filters: filterConfigs = [],
  filterConfigs: hookFilterConfigs,

  // Grouping
  groupByOptions = [],

  // Metrics
  metrics = [],

  // Table
  columns,
  searchPlaceholder,

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
}: ListPageTemplateProps) {
  // Use centralized hook
  const {
    data,
    filteredData,
    loading,
    filters,
    setFilter,
    clearFilters,
    filterOptions,
    selectedGroups,
    setSelectedGroups,
    metricsData,
    searchQuery,
    setSearchQuery,
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
  })

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

  // Loading state
  if (loading) {
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

      {/* Filters & Grouping */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Filters */}
        {mergedFilterConfigs.length > 0 && (
          <div className="flex-1">
            <ListPageFilters
              filters={mergedFilterConfigs}
              values={filters}
              onChange={(id, value) => setFilter(id, value)}
              onClear={clearFilters}
            />
          </div>
        )}

        {/* Group By Multi-Select */}
        {groupByOptions.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setGroupDropdownOpen(!groupDropdownOpen)}
              className="h-9 px-3 rounded-md border border-input bg-background text-sm flex items-center gap-2 hover:bg-slate-50"
            >
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span>
                {selectedGroups.length === 0
                  ? "Group by..."
                  : selectedGroups.length === 1
                    ? groupByOptions.find((o) => o.value === selectedGroups[0])?.label
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
                  {groupByOptions.map((opt) => {
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
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={filteredData}
        keyField="id"
        href={detailHref}
        onRowClick={onRowClick}
        searchable
        searchPlaceholder={searchPlaceholder || `Search ${title.toLowerCase()}...`}
        searchFields={config.searchFields as string[]}
        groupBy={groupConfig}
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
