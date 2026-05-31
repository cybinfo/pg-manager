"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Users, UserCheck, UserMinus, Clock, ArrowLeft } from "lucide-react"
import { NotFoundState } from "@/components/ui"
import { Column } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { TENANT_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createStatusMetric, createSumMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { createStatusFilter, createDateRangeFilter } from "@/lib/filter-presets"
import { TENANT_STATUS_OPTIONS, TENANT_HISTORY_STATUS_OPTIONS } from "@/lib/filters/common-filters"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { statusColumn, currencyColumn, dateColumn, personNameWithAvatarColumn, phoneColumn, emailColumn } from "@/lib/columns"
import { getStatusInfo as getTenantStatusInfo } from "@/lib/status-config"
import { textFilterColumn, statusFilterColumn, dateFilterColumn, numberFilterColumn } from "@/lib/advanced-filter-builders"
import { brandGradient } from "@/lib/design-tokens"
import type { CSVColumn } from "@/lib/download-utils"
import { dateExportColumn, currencyExportColumn } from "@/lib/export-columns"
import { transformJoin } from "@/lib/supabase/transforms"
import { logger } from "@/lib/logger"

interface Room {
  id: string
  room_number: string
  room_type: string
  total_beds: number
  occupied_beds: number
  property: { id: string; name: string } | null
}

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
  phoneColumn("phone", "Phone"),
  currencyColumn("monthly_rent", "Rent", {
  }),
  dateColumn("check_in_date", "Since", { hideOnMobile: true }),
  statusColumn((status) => getTenantStatusInfo("tenant", status), {
  }),
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
  createStatusFilter(TENANT_HISTORY_STATUS_OPTIONS),
  createDateRangeFilter("check_in_date", "Check-in Date"),
]

const groupByOptions: GroupByOption[] = [
  { value: "status", label: "Status" },
  { value: "checkin_year", label: "Year" },
]

const advancedFilterColumns: FilterableColumn[] = [
  textFilterColumn("name", "Tenant Name"),
  statusFilterColumn(TENANT_HISTORY_STATUS_OPTIONS),
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
  dateExportColumn("check_in_date", "Check-in Date"),
  currencyExportColumn("monthly_rent", "Monthly Rent"),
  { key: "status", header: "Status", format: (v) => String(v ?? "") },
]

// ============================================
// Page Component
// ============================================

export default function RoomTenantsPage() {
  const params = useParams()
  const roomId = params.id as string

  const [room, setRoom] = useState<Room | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [parentLoading, setParentLoading] = useState(true)

  useEffect(() => {
    const fetchRoom = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("rooms")
        .select(`id, room_number, room_type, total_beds, occupied_beds, property:properties(id, name)`)
        .eq("id", roomId)
        .single()

      if (error || !data) {
        logger.error("[RoomTenantsPage] Failed to fetch room", { roomId, error: String(error) })
        setNotFound(true)
      } else {
        const r = data as {
          id: string; room_number: string; room_type: string;
          total_beds: number; occupied_beds: number;
          property: { id: string; name: string }[] | null
        }
        setRoom({ ...r, property: transformJoin(r.property) })
      }
      setParentLoading(false)
    }
    fetchRoom()
  }, [roomId])

  const config = useMemo(() => ({
    ...TENANT_LIST_CONFIG,
    fixedFilters: [{ column: "room_id", operator: "eq" as const, value: roomId }],
  }), [roomId])

  if (notFound) {
    return <NotFoundState title="Room not found" backHref="/rooms" backLabel="All Rooms" />
  }

  if (parentLoading) return null

  const roomLabel = room ? `Room ${room.room_number}` : "..."
  const contextLine = [room?.property?.name, room?.room_type]
    .filter(Boolean)
    .join(" • ")

  const canAddTenant = room ? room.occupied_beds < room.total_beds : false

  return (
    <ListPageTemplate
      tableKey={`room-${roomId}-tenants`}
      title={`Tenants in ${roomLabel}`}
      description={contextLine || "Room tenants"}
      icon={Users}
      permission="tenants.view"
      breadcrumbs={[
        { label: "Rooms", href: "/rooms" },
        { label: roomLabel, href: `/rooms/${roomId}` },
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
exportColumns={exportColumns}
      exportFilename={`tenants-room-${roomId}`}
      createHref={canAddTenant ? `/tenants/new?room_id=${roomId}` : undefined}
      createLabel="Add Tenant"
      createPermission="tenants.create"
      detailHref={(tenant) => `/tenants/${tenant.id}`}
      headerActions={
        <Link href={`/rooms/${roomId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Room
          </Button>
        </Link>
      }
      emptyTitle="No tenants"
      emptyDescription={`${roomLabel} has no tenants.`}
    />
  )
}
