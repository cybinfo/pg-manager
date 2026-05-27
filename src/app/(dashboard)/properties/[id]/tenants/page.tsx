"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Users, UserCheck, UserMinus, Clock, ArrowLeft, Building2 } from "lucide-react"
import { Column } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { TENANT_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createStatusMetric, createSumMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { createStatusFilter, createDateRangeFilter } from "@/lib/filter-presets"
import { TENANT_STATUS_OPTIONS } from "@/lib/filters/common-filters"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { statusColumn, currencyColumn, dateColumn, personNameWithAvatarColumn, phoneColumn, emailColumn } from "@/lib/columns"
import { getStatusInfo as getTenantStatusInfo } from "@/lib/status-config"
import { textFilterColumn, statusFilterColumn, dateFilterColumn, numberFilterColumn } from "@/lib/advanced-filter-builders"
import { brandGradient } from "@/lib/design-tokens"
import type { CSVColumn } from "@/lib/download-utils"
import { nestedColumn, dateExportColumn, currencyExportColumn } from "@/lib/export-columns"
import { logger } from "@/lib/logger"
import type { PropertyOption } from "@/types/properties.types"

type Property = PropertyOption & { address: string }

// ============================================
// Types
// ============================================

interface Tenant {
  id: string
  name: string
  email: string | null
  phone: string
  photo_url: string | null
  profile_photo: string | null
  check_in_date: string
  check_out_date: string | null
  monthly_rent: number
  security_deposit: number
  status: string
  notes: string | null
  created_at: string
  property: { id: string; name: string } | null
  room: { id: string; room_number: string } | null
  person: { id: string; name: string; photo_url: string | null } | null
  checkin_month?: string
  checkin_year?: string
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<Tenant>[] = [
  personNameWithAvatarColumn("Tenant", {
    avatarClassName: `${brandGradient.solid} text-white shrink-0`,
  }),
  {
    key: "room",
    header: "Room",
    width: "secondary",
    sortable: true,
    canHide: true,
    defaultVisible: true,
    render: (tenant) => (
      <span className="text-muted-foreground text-sm">
        Room {tenant.room?.room_number || "—"}
      </span>
    ),
  },
  currencyColumn("monthly_rent", "Rent", {
    editable: true,
    editType: "number",
    editValidation: { min: 0 },
  }),
  dateColumn("check_in_date", "Since", { hideOnMobile: true }),
  statusColumn((status) => getTenantStatusInfo("tenant", status), {
    editable: true,
    editType: "select",
    editOptions: TENANT_STATUS_OPTIONS,
  }),
  phoneColumn("phone", "Phone", { defaultVisible: false }),
  emailColumn("email", "Email", { defaultVisible: false }),
  currencyColumn("security_deposit", "Security Deposit", {
    defaultVisible: false,
    bold: false,
  }),
  dateColumn("check_out_date", "Check-out Date", { defaultVisible: false }),
  dateColumn("created_at", "Added On", { defaultVisible: false }),
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  createStatusFilter([
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "notice", label: "On Notice" },
    { value: "exited", label: "Exited" },
  ]),
  createDateRangeFilter("check_in_date", "Check-in Date"),
]

const groupByOptions: GroupByOption[] = [
  { value: "room.room_number", label: "Room" },
  { value: "status", label: "Status" },
  { value: "checkin_year", label: "Year" },
]

const advancedFilterColumns: FilterableColumn[] = [
  textFilterColumn("name", "Tenant Name"),
  statusFilterColumn([
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "notice", label: "On Notice" },
    { value: "exited", label: "Exited" },
  ]),
  numberFilterColumn("monthly_rent", "Monthly Rent"),
  dateFilterColumn("check_in_date", "Check-in Date"),
]

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createTotalMetric({ label: "Total Tenants", icon: Users }),
  createStatusMetric("active", "Active", UserCheck),
  createStatusMetric("notice", "On Notice", Clock),
  createStatusMetric("exited", "Exited", UserMinus),
  createSumMetric("monthly_rent", "total_rent", "Total Rent", Users, { format: "currency" }),
]

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  { key: "name", header: "Name" },
  { key: "phone", header: "Phone", format: (v) => String(v ?? "") },
  { key: "email", header: "Email", format: (v) => String(v ?? "") },
  nestedColumn("room_number", "Room", "room.room_number"),
  dateExportColumn("check_in_date", "Check-in Date"),
  currencyExportColumn("monthly_rent", "Monthly Rent"),
  { key: "status", header: "Status", format: (v) => String(v ?? "") },
]

// ============================================
// Page Component
// ============================================

export default function PropertyTenantsPage() {
  const params = useParams()
  const propertyId = params.id as string

  const [property, setProperty] = useState<Property | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [parentLoading, setParentLoading] = useState(true)

  useEffect(() => {
    const fetchProperty = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("properties")
        .select("id, name, address")
        .eq("id", propertyId)
        .is("deleted_at", null)
        .single()

      if (error || !data) {
        logger.error("[PropertyTenantsPage] Failed to fetch property", { propertyId, error: String(error) })
        setNotFound(true)
      } else {
        setProperty(data as Property)
      }
      setParentLoading(false)
    }
    fetchProperty()
  }, [propertyId])

  const config = useMemo(() => ({
    ...TENANT_LIST_CONFIG,
    fixedFilters: [{ column: "property_id", operator: "eq" as const, value: propertyId }],
  }), [propertyId])

  if (notFound) {
    return (
      <EmptyState
        icon={Building2}
        title="Property not found"
        description="The property you're looking for doesn't exist."
        action={{ label: "Back to Properties", href: "/properties" }}
      />
    )
  }

  if (parentLoading) return null

  const propertyName = property?.name ?? "..."

  return (
    <ListPageTemplate
      tableKey={`property-${propertyId}-tenants`}
      title={`Tenants in ${propertyName}`}
      description={property?.address || "Property tenants"}
      icon={Users}
      permission="tenants.view"
      breadcrumbs={[
        { label: "Properties", href: "/properties" },
        { label: propertyName, href: `/properties/${propertyId}` },
        { label: "Tenants" },
      ]}
      config={config}
      columns={columns}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      enableColumnManager={true}
      enableInlineEdit={true}
      exportColumns={exportColumns}
      exportFilename={`tenants-property-${propertyId}`}
      createHref={`/tenants/new?property_id=${propertyId}`}
      createLabel="Add Tenant"
      createPermission="tenants.create"
      detailHref={(tenant) => `/tenants/${tenant.id}`}
      headerActions={
        <Link href={`/properties/${propertyId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Property
          </Button>
        </Link>
      }
      emptyTitle="No tenants yet"
      emptyDescription={`${propertyName} has no tenants.`}
    />
  )
}
