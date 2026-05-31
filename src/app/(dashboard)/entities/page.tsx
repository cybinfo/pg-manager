"use client"

import { Building2, Library, MapPin } from "lucide-react"
import { Column, TableBadge } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { ENTITY_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { ACTIVE_STATUS_FILTER } from "@/lib/filter-presets"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { booleanColumn, dateColumn } from "@/lib/columns"
import type { CSVColumn } from "@/lib/download-utils"
import { dateExportColumn } from "@/lib/export-columns"
import { ENTITY_TYPE_LABELS } from "@/types/entity.types"
import type { EntityType } from "@/types/entity.types"
import { brandGradient } from "@/lib/design-tokens"

// ============================================
// Types
// ============================================

interface EntityItem {
  id: string
  name: string
  type: EntityType
  code: string | null
  address: string | null
  city: string | null
  state: string | null
  manager_name: string | null
  manager_phone: string | null
  total_seats: number
  occupied_seats: number
  is_active: boolean
  created_at: string
}

// ============================================
// Column Definitions
// ============================================

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  pg: Building2,
  library: Library,
}

const TYPE_VARIANT: Record<string, "info" | "success" | "warning" | "muted"> = {
  pg: "info",
  library: "success",
}

const columns: Column<EntityItem>[] = [
  {
    key: "name",
    header: "Entity",
    width: "primary",
    sortable: true,
    canHide: false,
    render: (entity) => {
      const Icon = TYPE_ICON[entity.type] || Building2
      return (
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 rounded-lg ${brandGradient.solid} flex items-center justify-center`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="font-medium">{entity.name}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              {entity.city && (
                <>
                  <MapPin className="h-3 w-3" />
                  {entity.city}
                  {entity.state && `, ${entity.state}`}
                </>
              )}
            </div>
          </div>
        </div>
      )
    },
  },
  {
    key: "type",
    header: "Type",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: true,
    render: (entity) => (
      <TableBadge variant={TYPE_VARIANT[entity.type] || "muted"}>
        {ENTITY_TYPE_LABELS[entity.type] || entity.type}
      </TableBadge>
    ),
  },
  booleanColumn("is_active", "Status", {
    trueLabel: "Active",
    falseLabel: "Inactive",
    width: "status",
    hideOnMobile: true,
  }),
  {
    key: "address",
    header: "Address",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (entity) => entity.address || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "manager_name",
    header: "Manager",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (entity) => entity.manager_name ? (
      <div>
        <div>{entity.manager_name}</div>
        {entity.manager_phone && (
          <div className="text-xs text-muted-foreground">{entity.manager_phone}</div>
        )}
      </div>
    ) : <span className="text-muted-foreground">—</span>,
  },
  dateColumn("created_at", "Added On", { defaultVisible: false }),
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  {
    id: "type",
    label: "Type",
    type: "select",
    placeholder: "All Types",
    options: Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => ({ value, label })),
  },
  {
    id: "city",
    label: "City",
    type: "select",
    placeholder: "All Cities",
  },
  ACTIVE_STATUS_FILTER,
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "type", label: "Type" },
  { value: "city", label: "City" },
  { value: "is_active", label: "Status" },
]

// ============================================
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  {
    key: "name",
    header: "Name",
    filterType: "text",
    filterOperators: ["contains", "eq", "neq", "starts", "ends"],
  },
  {
    key: "type",
    header: "Type",
    filterType: "select",
    filterOperators: ["eq", "neq"],
    filterOptions: Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => ({ value, label })),
  },
  {
    key: "city",
    header: "City",
    filterType: "text",
    filterOperators: ["contains", "eq", "neq", "starts"],
  },
  {
    key: "is_active",
    header: "Status",
    filterType: "select",
    filterOperators: ["eq", "neq"],
    filterOptions: [
      { value: "true", label: "Active" },
      { value: "false", label: "Inactive" },
    ],
  },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createTotalMetric({ label: "Total Entities", icon: Building2 }),
  {
    id: "pg_count",
    label: "PG / Hostels",
    icon: Building2,
    compute: (items) => items.filter((i) => i.type === "pg").length,
    serverFilter: { column: "type", operator: "eq", value: "pg" },
  },
  {
    id: "library_count",
    label: "Libraries",
    icon: Library,
    compute: (items) => items.filter((i) => i.type === "library").length,
    serverFilter: { column: "type", operator: "eq", value: "library" },
  },
]

// ============================================
// Export Columns
// ============================================

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  { key: "name", header: "Name" },
  { key: "type", header: "Type", format: (v) => ENTITY_TYPE_LABELS[v as EntityType] || String(v ?? "") },
  { key: "code", header: "Code", format: (v) => String(v ?? "") },
  { key: "city", header: "City", format: (v) => String(v ?? "") },
  { key: "state", header: "State", format: (v) => String(v ?? "") },
  { key: "address", header: "Address", format: (v) => String(v ?? "") },
  { key: "manager_name", header: "Manager", format: (v) => String(v ?? "") },
  { key: "manager_phone", header: "Manager Phone", format: (v) => String(v ?? "") },
  { key: "is_active", header: "Active", format: (v) => (v ? "Yes" : "No") },
  dateExportColumn("created_at", "Added On"),
]

// ============================================
// Page Component
// ============================================

export default function EntitiesPage() {
  return (
    <ListPageTemplate
      tableKey="entities"
      title="Entities"
      description="All locations — PG properties, libraries, and more"
      icon={Building2}
      permission="properties.view"
      config={ENTITY_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by name, city..."
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      exportColumns={exportColumns}
      exportFilename="entities"
      createHref="/entities/new"
      createLabel="Add Entity"
      createPermission="properties.create"
      detailHref={(entity) => `/entities/${entity.id}`}
      emptyTitle="No entities found"
      emptyDescription="Add your first property or library to get started"
    />
  )
}
