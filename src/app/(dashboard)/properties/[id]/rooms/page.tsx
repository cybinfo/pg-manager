"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Home, Bed, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react"
import { NotFoundState } from "@/components/ui"
import { Column } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { ROOM_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createStatusMetric, createSumMetric, MetricConfig } from "@/lib/metric-factories"
import { ROOM_STATUS } from "@/lib/status"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { ROOM_TYPE_FILTER, createStatusFilter } from "@/lib/filter-presets"
import { ROOM_STATUS_OPTIONS } from "@/lib/filters/common-filters"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { statusColumn, currencyColumn, dateColumn, badgeColumn, booleanColumn } from "@/lib/columns"
import { ROOM_TYPES } from "@/types/rooms.types"
import type { CSVColumn } from "@/lib/download-utils"
import { currencyExportColumn, dateExportColumn } from "@/lib/export-columns"
import { logger } from "@/lib/logger"
import type { PropertyOption } from "@/types/properties.types"

type Property = PropertyOption & { address: string }

const ROOM_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  ROOM_TYPES.map(({ value, label }) => [value, label])
)

// ============================================
// Types
// ============================================

interface Room {
  id: string
  room_number: string
  room_type: string
  floor: number
  rent_amount: number
  deposit_amount: number
  total_beds: number
  occupied_beds: number
  status: string
  is_active: boolean
  has_ac: boolean
  has_attached_bathroom: boolean
  has_balcony: boolean
  notes: string | null
  created_at: string
  property: { id: string; name: string }
  ac_label?: string
  bathroom_label?: string
  beds_label?: string
  floor_label?: string
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<Room>[] = [
  {
    key: "room_number",
    header: "Room",
    width: "primary",
    sortable: true,
    canHide: false,
    render: (room) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center">
          <Home className="h-4 w-4 text-violet-600" />
        </div>
        <div>
          <div className="font-medium">Room {room.room_number}</div>
        </div>
      </div>
    ),
  },
  badgeColumn("room_type", "Type", ROOM_TYPE_LABELS, { hideOnMobile: true }),
  {
    key: "beds",
    header: "Beds",
    width: "count",
    sortable: true,
    sortKey: "total_beds",
    sortType: "number",
    canHide: true,
    defaultVisible: true,
    editable: true,
    editType: "number",
    editField: "total_beds",
    editValidation: { required: true, min: 1 },
    render: (room) => (
      <span className="tabular-nums">{room.occupied_beds}/{room.total_beds}</span>
    ),
  },
  currencyColumn("rent_amount", "Rent", {
    editable: true,
    editType: "number",
    editValidation: { min: 0 },
  }),
  statusColumn(ROOM_STATUS, {
    editable: true,
    editType: "select",
    editOptions: ROOM_STATUS_OPTIONS,
  }),
  {
    key: "floor",
    header: "Floor",
    width: "count",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: false,
    render: (room) => <span className="tabular-nums">{room.floor}</span>,
  },
  currencyColumn("deposit_amount", "Deposit", { defaultVisible: false, bold: false }),
  booleanColumn("has_ac", "AC", { defaultVisible: false }),
  booleanColumn("has_attached_bathroom", "Attached Bath", { defaultVisible: false }),
  booleanColumn("has_balcony", "Balcony", { defaultVisible: false }),
  booleanColumn("is_active", "Active", {
    trueLabel: "Active",
    falseLabel: "Inactive",
    defaultVisible: false,
  }),
  {
    key: "notes",
    header: "Notes",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (room) => room.notes ? (
      <span className="truncate max-w-[150px]" title={room.notes}>{room.notes}</span>
    ) : <span className="text-muted-foreground">—</span>,
  },
  dateColumn("created_at", "Added On", { defaultVisible: false }),
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  createStatusFilter(ROOM_STATUS_OPTIONS),
  ROOM_TYPE_FILTER,
]

const groupByOptions: GroupByOption[] = [
  { value: "floor_label", label: "Floor" },
  { value: "room_type", label: "Room Type" },
  { value: "status", label: "Status" },
  { value: "beds_label", label: "Capacity" },
]

const advancedFilterColumns: FilterableColumn[] = [
  {
    key: "room_number",
    header: "Room Number",
    filterType: "text",
    filterOperators: ["contains", "eq", "starts"],
  },
  {
    key: "room_type",
    header: "Room Type",
    filterType: "select",
    filterOperators: ["eq", "neq", "in", "not_in"],
    filterOptions: ROOM_TYPES.map(({ value, label }) => ({ value, label })),
  },
  {
    key: "status",
    header: "Status",
    filterType: "select",
    filterOperators: ["eq", "neq", "in", "not_in"],
    filterOptions: ROOM_STATUS_OPTIONS,
  },
  {
    key: "rent_amount",
    header: "Rent Amount",
    filterType: "number",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
  },
  {
    key: "total_beds",
    header: "Total Beds",
    filterType: "number",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte"],
  },
  {
    key: "floor",
    header: "Floor",
    filterType: "number",
    filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte"],
  },
]

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createTotalMetric({ label: "Total Rooms", icon: Home }),
  createStatusMetric("available", "Available Rooms", CheckCircle),
  createSumMetric("total_beds", "total_beds", "Total Beds", Bed, { format: "number" }),
  {
    id: "occupied_beds",
    label: "Occupied Beds",
    icon: AlertCircle,
    compute: (items: Record<string, unknown>[], _total: number, serverData?: Record<string, number>) => {
      const totalBeds = serverData?.total_beds ?? items.reduce((sum: number, r) => sum + (Number(r.total_beds) || 0), 0)
      const occupiedBeds = serverData?.occupied_beds ?? items.reduce((sum: number, r) => sum + (Number(r.occupied_beds) || 0), 0)
      const rate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0
      return `${occupiedBeds} (${rate}%)`
    },
    serverSum: { column: "occupied_beds" },
  },
]

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  { key: "room_number", header: "Room Number" },
  { key: "floor", header: "Floor Number", format: (v) => String(v ?? "") },
  { key: "room_type", header: "Room Type", format: (v) => ROOM_TYPE_LABELS[String(v)] || String(v ?? "") },
  { key: "total_beds", header: "Total Beds", format: (v) => String(v ?? "") },
  { key: "occupied_beds", header: "Occupied Beds", format: (v) => String(v ?? "") },
  currencyExportColumn("rent_amount", "Rent Amount"),
  currencyExportColumn("deposit_amount", "Deposit Amount"),
  { key: "status", header: "Status", format: (v) => String(v ?? "") },
  { key: "is_active", header: "Active", format: (v) => (v ? "Yes" : "No") },
  dateExportColumn("created_at", "Added On"),
]

// ============================================
// Page Component
// ============================================

export default function PropertyRoomsPage() {
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
        logger.error("[PropertyRoomsPage] Failed to fetch property", { propertyId, error: String(error) })
        setNotFound(true)
      } else {
        setProperty(data as Property)
      }
      setParentLoading(false)
    }
    fetchProperty()
  }, [propertyId])

  const config = useMemo(() => ({
    ...ROOM_LIST_CONFIG,
    fixedFilters: [{ column: "property_id", operator: "eq" as const, value: propertyId }],
  }), [propertyId])

  if (notFound) {
    return <NotFoundState title="Property not found" backHref="/properties" backLabel="All Properties" />
  }

  if (parentLoading) return null

  const propertyName = property?.name ?? "..."

  return (
    <ListPageTemplate
      tableKey={`property-${propertyId}-rooms`}
      title={`Rooms in ${propertyName}`}
      description={property?.address || "Property rooms"}
      icon={Home}
      permission="rooms.view"
      breadcrumbs={[
        { label: "Properties", href: "/properties" },
        { label: propertyName, href: `/properties/${propertyId}` },
        { label: "Rooms" },
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
      exportFilename={`rooms-property-${propertyId}`}
      createHref={`/rooms/new?property_id=${propertyId}`}
      createLabel="Add Room"
      createPermission="rooms.create"
      detailHref={(room) => `/rooms/${room.id}`}
      headerActions={
        <Link href={`/properties/${propertyId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Property
          </Button>
        </Link>
      }
      emptyTitle="No rooms yet"
      emptyDescription={`${propertyName} has no rooms configured.`}
    />
  )
}
