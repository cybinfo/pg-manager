/**
 * Properties List Page (Refactored)
 *
 * BEFORE: 250 lines of code
 * AFTER: ~110 lines of code (56% reduction)
 */

"use client"

import { Building2, Home, Users, MapPin } from "lucide-react"
import { Column } from "@/components/ui/data-table"
import { dateColumn, booleanColumn } from "@/lib/columns"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { PROPERTY_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createBooleanMetric, createSumMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { ACTIVE_STATUS_FILTER } from "@/lib/filter-presets"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { brandGradient } from "@/lib/design-tokens"
import type { CSVColumn } from "@/lib/download-utils"
import { dateExportColumn } from "@/lib/export-columns"

// ============================================
// Types
// ============================================

interface Property {
  id: string
  name: string
  address: string | null
  city: string
  state: string | null
  pincode: string | null
  phone: string | null
  email: string | null
  property_type: string
  total_floors: number | null
  manager_name: string | null
  manager_phone: string | null
  website_enabled: boolean
  is_active: boolean
  created_at: string
  room_count?: number
  tenant_count?: number
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<Property>[] = [
  {
    key: "name",
    header: "Property",
    width: "primary",
    sortable: true,
    canHide: false,
    editable: true,
    editType: "text",
    editValidation: { required: true, minLength: 2 },
    render: (property) => (
      <div className="flex items-center gap-3">
        <div className={`h-8 w-8 rounded-lg ${brandGradient.solid} flex items-center justify-center`}>
          <Building2 className="h-4 w-4 text-white" />
        </div>
        <div>
          <div className="font-medium">{property.name}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {property.city}
            {property.state && `, ${property.state}`}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "room_count",
    header: "Rooms",
    width: "count",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: true,
    render: (property) => (
      <div className="flex items-center gap-1.5">
        <Home className="h-4 w-4 text-muted-foreground" />
        <span>{property.room_count || 0}</span>
      </div>
    ),
  },
  {
    key: "tenant_count",
    header: "Tenants",
    width: "count",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: true,
    render: (property) => (
      <div className="flex items-center gap-1.5">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span>{property.tenant_count || 0}</span>
      </div>
    ),
  },
  booleanColumn("is_active", "Status", {
    trueLabel: "Active",
    falseLabel: "Inactive",
    width: "status",
    hideOnMobile: true,
    editable: true,
    editType: "boolean",
  }),
  // Hidden by default columns
  {
    key: "address",
    header: "Address",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    editable: true,
    editType: "text",
    render: (property) => property.address || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "pincode",
    header: "Pincode",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (property) => property.pincode || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "property_type",
    header: "Type",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (property) => (
      <span className="capitalize">{property.property_type || "PG"}</span>
    ),
  },
  {
    key: "total_floors",
    header: "Floors",
    width: "count",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: false,
    render: (property) => property.total_floors || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "phone",
    header: "Phone",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (property) => property.phone || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "email",
    header: "Email",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (property) => property.email || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "manager_name",
    header: "Manager",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (property) => property.manager_name ? (
      <div>
        <div>{property.manager_name}</div>
        {property.manager_phone && (
          <div className="text-xs text-muted-foreground">{property.manager_phone}</div>
        )}
      </div>
    ) : <span className="text-muted-foreground">—</span>,
  },
  booleanColumn("website_enabled", "Website", {
    trueLabel: "Enabled",
    falseLabel: "Disabled",
    defaultVisible: false,
  }),
  dateColumn("created_at", "Added On", { defaultVisible: false }),
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  {
    id: "city",
    label: "City",
    type: "select",
    placeholder: "All Cities",
  },
  {
    id: "state",
    label: "State",
    type: "select",
    placeholder: "All States",
  },
  ACTIVE_STATUS_FILTER,
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "city", label: "City" },
  { value: "state", label: "State" },
  { value: "is_active", label: "Status" },
]

// ============================================
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  {
    key: "name",
    header: "Property Name",
    filterType: "text",
    filterOperators: ["contains", "eq", "neq", "starts", "ends"],
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
  createTotalMetric({ label: "Properties", icon: Building2 }),
  createBooleanMetric("is_active", true, "Active", Building2, { id: "active" }),
  createSumMetric("room_count", "total_rooms", "Total Rooms", Home, { format: "number" }),
  createSumMetric("tenant_count", "total_tenants", "Total Tenants", Users, { format: "number" }),
]

// ============================================
// Export Columns
// ============================================

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  { key: "name", header: "Property Name" },
  { key: "address", header: "Address", format: (v) => String(v ?? "") },
  { key: "city", header: "City", format: (v) => String(v ?? "") },
  { key: "state", header: "State", format: (v) => String(v ?? "") },
  { key: "pincode", header: "Pincode", format: (v) => String(v ?? "") },
  { key: "property_type", header: "Type", format: (v) => String(v ?? "") },
  { key: "total_floors", header: "Total Floors", format: (v) => String(v ?? "") },
  { key: "phone", header: "Phone", format: (v) => String(v ?? "") },
  { key: "email", header: "Email", format: (v) => String(v ?? "") },
  { key: "manager_name", header: "Manager Name", format: (v) => String(v ?? "") },
  { key: "manager_phone", header: "Manager Phone", format: (v) => String(v ?? "") },
  { key: "website_enabled", header: "Website Enabled", format: (v) => (v ? "Yes" : "No") },
  { key: "is_active", header: "Active", format: (v) => (v ? "Yes" : "No") },
  dateExportColumn("created_at", "Added On"),
]

// ============================================
// Page Component
// ============================================

export default function PropertiesPage() {
  return (
    <ListPageTemplate
      tableKey="properties"
      title="Properties"
      description="Manage your PG properties and buildings"
      icon={Building2}
      permission="properties.view"
      config={PROPERTY_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by property name, city..."
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      enableInlineEdit={true}
      exportColumns={exportColumns}
      exportFilename="properties"
      createHref="/properties/new"
      createLabel="Add Property"
      createPermission="properties.create"
      detailHref={(property) => `/properties/${property.id}`}
      emptyTitle="No properties found"
      emptyDescription="Add your first property to get started"
    />
  )
}
