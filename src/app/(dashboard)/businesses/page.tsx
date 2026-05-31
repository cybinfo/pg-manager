"use client"

import { Briefcase, MapPin, Building2, Users } from "lucide-react"
import { Column } from "@/components/ui/data-table"
import { dateColumn, booleanColumn, phoneColumn, emailColumn } from "@/lib/columns"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { BUSINESS_LIST_CONFIG } from "@/lib/hooks/useListPage"
import { createTotalMetric, createBooleanMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { ACTIVE_STATUS_FILTER } from "@/lib/filter-presets"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { brandGradient } from "@/lib/design-tokens"
import type { CSVColumn } from "@/lib/download-utils"
import { dateExportColumn } from "@/lib/export-columns"
import { GroupByOption } from "@/lib/hooks/useListPage"
import { BUSINESS_ENTITY_TYPE_OPTIONS } from "@/types/business.types"

interface Business {
  id: string
  name: string
  legal_name: string | null
  business_type: string | null
  gst_number: string | null
  pan_number: string | null
  phone: string | null
  email: string | null
  website: string | null
  is_active: boolean
  tags: string[]
  created_at: string
}

const columns: Column<Business>[] = [
  {
    key: "name",
    header: "Business",
    width: "primary",
    sortable: true,
    canHide: false,
    render: (business) => (
      <div className="flex items-center gap-3">
        <div className={`h-8 w-8 rounded-lg ${brandGradient.solid} flex items-center justify-center`}>
          <Briefcase className="h-4 w-4 text-white" />
        </div>
        <div>
          <div className="font-medium">{business.name}</div>
          {business.legal_name && (
            <div className="text-xs text-muted-foreground">{business.legal_name}</div>
          )}
        </div>
      </div>
    ),
  },
  {
    key: "business_type",
    header: "Type",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: true,
    render: (business) => business.business_type ? (
      <span className="capitalize text-sm">{business.business_type.replace("_", " ")}</span>
    ) : <span className="text-muted-foreground">—</span>,
  },
  {
    key: "gst_number",
    header: "GST",
    width: "secondary",
    canHide: true,
    defaultVisible: true,
    render: (business) => business.gst_number ? (
      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{business.gst_number}</code>
    ) : <span className="text-muted-foreground">—</span>,
  },
  phoneColumn("phone", "Phone", { defaultVisible: true }),
  emailColumn("email", "Email", { defaultVisible: false }),
  booleanColumn("is_active", "Status", {
    trueLabel: "Active",
    falseLabel: "Inactive",
    width: "status",
  }),
  {
    key: "website",
    header: "Website",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (business) => business.website ? (
      <a href={business.website} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
        {business.website.replace(/^https?:\/\//, "")}
      </a>
    ) : <span className="text-muted-foreground">—</span>,
  },
  {
    key: "pan_number",
    header: "PAN",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (business) => business.pan_number ? (
      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{business.pan_number}</code>
    ) : <span className="text-muted-foreground">—</span>,
  },
  dateColumn("created_at", "Added On", { defaultVisible: false }),
]

const filters: FilterConfig[] = [
  {
    id: "business_type",
    label: "Type",
    type: "select",
    placeholder: "All Types",
    options: BUSINESS_ENTITY_TYPE_OPTIONS,
  },
  ACTIVE_STATUS_FILTER,
]

const groupByOptions: GroupByOption[] = [
  { value: "business_type", label: "Business Type" },
  { value: "is_active", label: "Status" },
]

const advancedFilterColumns: FilterableColumn[] = [
  {
    key: "name",
    header: "Business Name",
    filterType: "text",
    filterOperators: ["contains", "eq", "neq", "starts", "ends"],
  },
  {
    key: "gst_number",
    header: "GST Number",
    filterType: "text",
    filterOperators: ["contains", "eq", "starts"],
  },
  {
    key: "business_type",
    header: "Type",
    filterType: "select",
    filterOperators: ["eq", "neq"],
    filterOptions: BUSINESS_ENTITY_TYPE_OPTIONS,
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
  createTotalMetric({ label: "Businesses", icon: Briefcase }),
  createBooleanMetric("is_active", true, "Active", Briefcase, { id: "active" }),
]

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  { key: "name", header: "Business Name" },
  { key: "legal_name", header: "Legal Name", format: (v) => String(v ?? "") },
  { key: "business_type", header: "Type", format: (v) => String(v ?? "") },
  { key: "gst_number", header: "GST Number", format: (v) => String(v ?? "") },
  { key: "pan_number", header: "PAN", format: (v) => String(v ?? "") },
  { key: "phone", header: "Phone", format: (v) => String(v ?? "") },
  { key: "email", header: "Email", format: (v) => String(v ?? "") },
  { key: "website", header: "Website", format: (v) => String(v ?? "") },
  { key: "is_active", header: "Active", format: (v) => (v ? "Yes" : "No") },
  dateExportColumn("created_at", "Added On"),
]

export default function BusinessesPage() {
  return (
    <ListPageTemplate
      tableKey="businesses"
      title="Businesses"
      description="Manage your businesses and brands"
      icon={Briefcase}
      permission="businesses.view"
      config={BUSINESS_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns as unknown as Column<Record<string, unknown>>[]}

      searchPlaceholder="Search by name, GST, phone..."
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
exportColumns={exportColumns}
      exportFilename="businesses"
      createHref="/businesses/new"
      createLabel="Add Business"
      createPermission="businesses.create"
      detailHref={(b) => `/businesses/${(b as Business).id}`}
      emptyTitle="No businesses yet"
      emptyDescription="Add your first business to start building the hierarchy"
    />
  )
}
