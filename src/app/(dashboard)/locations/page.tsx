"use client"

import { MapPin, Briefcase, Clock, Phone } from "lucide-react"
import { Column } from "@/components/ui/data-table"
import { dateColumn, booleanColumn, phoneColumn } from "@/lib/columns"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { LOCATION_LIST_CONFIG } from "@/lib/hooks/useListPage"
import { createTotalMetric, createBooleanMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { ACTIVE_STATUS_FILTER } from "@/lib/filter-presets"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { brandGradient } from "@/lib/design-tokens"
import type { CSVColumn } from "@/lib/download-utils"
import { dateExportColumn } from "@/lib/export-columns"
import { GroupByOption } from "@/lib/hooks/useListPage"
import { TableBadge } from "@/components/ui/data-table"

interface LocationItem {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  phone: string | null
  email: string | null
  is_active: boolean
  is_primary: boolean
  opening_time: string | null
  closing_time: string | null
  created_at: string
  business?: { id: string; name: string; logo_url: string | null }
}

const columns: Column<LocationItem>[] = [
  {
    key: "name",
    header: "Location",
    width: "primary",
    sortable: true,
    canHide: false,
    editable: true,
    editType: "text",
    editValidation: { required: true, minLength: 2 },
    render: (location) => (
      <div className="flex items-center gap-3">
        <div className={`h-8 w-8 rounded-lg ${brandGradient.solid} flex items-center justify-center`}>
          <MapPin className="h-4 w-4 text-white" />
        </div>
        <div>
          <div className="font-medium flex items-center gap-2">
            {location.name}
            {location.is_primary && (
              <TableBadge variant="info" className="text-[10px]">Primary</TableBadge>
            )}
          </div>
          {(location.city || location.state) && (
            <div className="text-xs text-muted-foreground">
              {location.city}{location.state && `, ${location.state}`}
            </div>
          )}
        </div>
      </div>
    ),
  },
  {
    key: "business",
    header: "Business",
    width: "secondary",
    sortable: false,
    canHide: true,
    defaultVisible: true,
    render: (location) => location.business ? (
      <div className="flex items-center gap-2">
        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm">{location.business.name}</span>
      </div>
    ) : <span className="text-muted-foreground">—</span>,
  },
  {
    key: "address",
    header: "Address",
    width: "secondary",
    canHide: true,
    defaultVisible: true,
    render: (location) => location.address ? (
      <span className="text-sm">{location.address}</span>
    ) : <span className="text-muted-foreground">—</span>,
  },
  {
    key: "pincode",
    header: "Pincode",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (location) => location.pincode || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "opening_time",
    header: "Hours",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (location) => (location.opening_time && location.closing_time) ? (
      <div className="flex items-center gap-1.5 text-sm">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        {location.opening_time} – {location.closing_time}
      </div>
    ) : <span className="text-muted-foreground">—</span>,
  },
  phoneColumn("phone", "Phone", { defaultVisible: false }),
  booleanColumn("is_active", "Status", {
    trueLabel: "Active",
    falseLabel: "Inactive",
    width: "status",
    editable: true,
    editType: "boolean",
  }),
  dateColumn("created_at", "Added On", { defaultVisible: false }),
]

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

const groupByOptions: GroupByOption[] = [
  { value: "city", label: "City" },
  { value: "state", label: "State" },
  { value: "is_active", label: "Status" },
]

const advancedFilterColumns: FilterableColumn[] = [
  {
    key: "name",
    header: "Location Name",
    filterType: "text",
    filterOperators: ["contains", "eq", "neq", "starts", "ends"],
  },
  {
    key: "city",
    header: "City",
    filterType: "text",
    filterOperators: ["contains", "eq", "starts"],
  },
  {
    key: "state",
    header: "State",
    filterType: "text",
    filterOperators: ["contains", "eq", "starts"],
  },
  {
    key: "pincode",
    header: "Pincode",
    filterType: "text",
    filterOperators: ["contains", "eq", "starts"],
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

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createTotalMetric({ label: "Locations", icon: MapPin }),
  createBooleanMetric("is_active", true, "Active", MapPin, { id: "active" }),
]

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  { key: "name", header: "Location Name" },
  { key: "address", header: "Address", format: (v) => String(v ?? "") },
  { key: "city", header: "City", format: (v) => String(v ?? "") },
  { key: "state", header: "State", format: (v) => String(v ?? "") },
  { key: "pincode", header: "Pincode", format: (v) => String(v ?? "") },
  { key: "phone", header: "Phone", format: (v) => String(v ?? "") },
  { key: "email", header: "Email", format: (v) => String(v ?? "") },
  { key: "is_active", header: "Active", format: (v) => (v ? "Yes" : "No") },
  { key: "is_primary", header: "Primary", format: (v) => (v ? "Yes" : "No") },
  dateExportColumn("created_at", "Added On"),
]

export default function LocationsPage() {
  return (
    <ListPageTemplate
      tableKey="locations"
      title="Locations"
      description="Physical premises across all your businesses"
      icon={MapPin}
      permission="locations.view"
      config={LOCATION_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns as unknown as Column<Record<string, unknown>>[]}
      searchPlaceholder="Search by name, city, address..."
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      enableInlineEdit={true}
      exportColumns={exportColumns}
      exportFilename="locations"
      createHref="/locations/new"
      createLabel="Add Location"
      createPermission="locations.create"
      detailHref={(l) => `/locations/${(l as LocationItem).id}`}
      emptyTitle="No locations yet"
      emptyDescription="Add a location to a business to get started"
    />
  )
}
