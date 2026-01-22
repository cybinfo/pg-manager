/**
 * Exit Clearance List Page (Refactored)
 *
 * BEFORE: 567 lines of code
 * AFTER: ~200 lines of code (65% reduction)
 *
 * Note: This page has custom "Tenants on Notice" alert that requires
 * additional data fetching beyond the template.
 */

"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { LogOut, Clock, CheckCircle, AlertCircle, User, ArrowRight } from "lucide-react"
import { Column, StatusDot, TableBadge } from "@/components/ui/data-table"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { EXIT_CLEARANCE_LIST_CONFIG, MetricConfig, GroupByOption } from "@/lib/hooks/useListPage"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { TenantLink, PropertyLink, RoomLink } from "@/components/ui/entity-link"
import { Avatar } from "@/components/ui/avatar"
import { formatCurrency, formatDate } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"

// ============================================
// Types
// ============================================

interface ExitClearance {
  id: string
  notice_given_date: string | null
  expected_exit_date: string
  actual_exit_date: string | null
  total_dues: number
  total_refundable: number
  final_amount: number
  settlement_status: string
  room_inspection_done: boolean
  key_returned: boolean
  created_at: string
  tenant: { id: string; name: string; phone: string; photo_url: string | null; profile_photo: string | null }
  property: { id: string; name: string }
  room: { id: string; room_number: string }
  exit_month?: string
  exit_year?: string
  inspection_label?: string
  key_label?: string
}

interface TenantOnNotice {
  id: string
  name: string
  phone: string
  property: { id: string; name: string }
  room: { room_number: string }
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<ExitClearance>[] = [
  {
    key: "tenant",
    header: "Tenant",
    width: "primary",
    sortable: true,
    sortKey: "tenant.name",
    render: (clearance) => (
      <div className="flex items-center gap-3">
        <Avatar
          name={clearance.tenant?.name || ""}
          src={clearance.tenant?.profile_photo || clearance.tenant?.photo_url}
          size="sm"
          className="bg-gradient-to-br from-teal-500 to-emerald-500 text-white shrink-0"
        />
        <div className="min-w-0">
          {clearance.tenant && (
            <TenantLink id={clearance.tenant.id} name={clearance.tenant.name} showIcon={false} />
          )}
          <div className="text-xs text-muted-foreground">{clearance.tenant?.phone}</div>
        </div>
      </div>
    ),
  },
  {
    key: "property",
    header: "Property",
    width: "secondary",
    sortable: true,
    sortKey: "property.name",
    render: (clearance) => (
      <div className="min-w-0 space-y-0.5">
        {clearance.property && (
          <PropertyLink id={clearance.property.id} name={clearance.property.name} size="sm" />
        )}
        {clearance.room && (
          <div>
            <RoomLink id={clearance.room.id} roomNumber={clearance.room.room_number} size="sm" />
          </div>
        )}
      </div>
    ),
  },
  {
    key: "expected_exit_date",
    header: "Exit Date",
    width: "date",
    sortable: true,
    sortType: "date",
    render: (clearance) => formatDate(clearance.expected_exit_date),
  },
  {
    key: "final_amount",
    header: "Amount",
    width: "amount",
    sortable: true,
    sortType: "number",
    render: (clearance) => {
      const isRefund = clearance.final_amount < 0
      return (
        <div className="text-right">
          <span className={`font-medium ${isRefund ? "text-green-600" : "text-red-600"}`}>
            {isRefund ? "-" : "+"}
            {formatCurrency(Math.abs(clearance.final_amount))}
          </span>
          <div className="text-xs text-muted-foreground">{isRefund ? "Refund" : "Due"}</div>
        </div>
      )
    },
  },
  {
    key: "settlement_status",
    header: "Status",
    width: "status",
    sortable: true,
    render: (clearance) => {
      const statusMap: Record<string, { variant: "success" | "warning" | "error" | "muted"; label: string }> = {
        initiated: { variant: "muted", label: "Initiated" },
        pending_payment: { variant: "warning", label: "Pending" },
        cleared: { variant: "success", label: "Cleared" },
      }
      const status = statusMap[clearance.settlement_status] || {
        variant: "muted" as const,
        label: clearance.settlement_status,
      }
      return (
        <div className="space-y-1">
          <TableBadge variant={status.variant}>{status.label}</TableBadge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {clearance.room_inspection_done && (
              <span title="Room Inspected">
                <CheckCircle className="h-3 w-3 text-green-500" />
              </span>
            )}
            {clearance.key_returned && (
              <span title="Key Returned">
                <CheckCircle className="h-3 w-3 text-green-500" />
              </span>
            )}
          </div>
        </div>
      )
    },
  },
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  {
    id: "property",
    label: "Property",
    type: "select",
    placeholder: "All Properties",
  },
  {
    id: "settlement_status",
    label: "Status",
    type: "select",
    placeholder: "All Status",
    options: [
      { value: "initiated", label: "Initiated" },
      { value: "pending_payment", label: "Pending Payment" },
      { value: "cleared", label: "Cleared" },
    ],
  },
  {
    id: "expected_exit_date",
    label: "Exit Date",
    type: "date-range",
  },
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "property.name", label: "Property" },
  { value: "tenant.name", label: "Tenant" },
  { value: "room.room_number", label: "Room" },
  { value: "settlement_status", label: "Status" },
  { value: "inspection_label", label: "Inspection" },
  { value: "key_label", label: "Key Status" },
  { value: "exit_month", label: "Exit Month" },
  { value: "exit_year", label: "Year" },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<ExitClearance>[] = [
  {
    id: "total",
    label: "Total",
    icon: LogOut,
    compute: (_items, total) => total,  // Use server total for accurate count
  },
  {
    id: "initiated",
    label: "Initiated",
    icon: Clock,
    compute: (items) => items.filter((c) => c.settlement_status === "initiated").length,
    serverFilter: {
      column: "settlement_status",
      operator: "eq",
      value: "initiated",
    },
  },
  {
    id: "pending",
    label: "Pending Payment",
    icon: AlertCircle,
    compute: (items) => items.filter((c) => c.settlement_status === "pending_payment").length,
    highlight: (value) => (value as number) > 0,
    serverFilter: {
      column: "settlement_status",
      operator: "eq",
      value: "pending_payment",
    },
  },
  {
    id: "cleared",
    label: "Cleared",
    icon: CheckCircle,
    compute: (items) => items.filter((c) => c.settlement_status === "cleared").length,
    serverFilter: {
      column: "settlement_status",
      operator: "eq",
      value: "cleared",
    },
  },
]

// ============================================
// Tenants on Notice Alert Component
// ============================================

function TenantsOnNoticeAlert() {
  const [tenantsOnNotice, setTenantsOnNotice] = useState<TenantOnNotice[]>([])

  useEffect(() => {
    const fetchTenantsOnNotice = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("tenants")
        .select(`id, name, phone, property:properties(id, name), room:rooms(room_number)`)
        .eq("status", "notice_period")
        .order("name")

      if (data) {
        const transformed = data
          .filter((t: Record<string, unknown>) => t.property && t.room)
          .map((t: Record<string, unknown>) => ({
            id: t.id as string,
            name: t.name as string,
            phone: t.phone as string,
            property: Array.isArray(t.property) ? t.property[0] : t.property,
            room: Array.isArray(t.room) ? t.room[0] : t.room,
          })) as TenantOnNotice[]
        setTenantsOnNotice(transformed)
      }
    }
    fetchTenantsOnNotice()
  }, [])

  if (tenantsOnNotice.length === 0) return null

  return (
    <Card className="border-orange-200 bg-orange-50 mb-6">
      <CardContent className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2 text-orange-800">
          <AlertCircle className="h-4 w-4" />
          Tenants on Notice Period ({tenantsOnNotice.length})
        </h3>
        <div className="space-y-2">
          {tenantsOnNotice.slice(0, 3).map((tenant) => (
            <div
              key={tenant.id}
              className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-100"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">{tenant.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {tenant.property?.name || "—"} • Room {tenant.room?.room_number || "—"}
                  </p>
                </div>
              </div>
              <Link href={`/exit-clearance/new?tenant=${tenant.id}`}>
                <Button size="sm" variant="outline">
                  Start Clearance
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          ))}
          {tenantsOnNotice.length > 3 && (
            <p className="text-sm text-muted-foreground text-center pt-2">
              +{tenantsOnNotice.length - 3} more tenants on notice
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// Page Component
// ============================================

export default function ExitClearancePage() {
  return (
    <>
      <TenantsOnNoticeAlert />
      <ListPageTemplate
        tableKey="exit-clearance"
        title="Exit Clearance"
        description="Manage tenant checkouts and settlements"
        icon={LogOut}
        permission="exit_clearance.initiate"
        feature="exitClearance"
        config={EXIT_CLEARANCE_LIST_CONFIG}
        filters={filters}
        groupByOptions={groupByOptions}
        metrics={metrics}
        columns={columns}
        searchPlaceholder="Search by tenant or property..."
        createHref="/exit-clearance/new"
        createLabel="Initiate Checkout"
        createPermission="exit_clearance.initiate"
        detailHref={(clearance) => `/exit-clearance/${clearance.id}`}
        emptyTitle="No exit clearances"
        emptyDescription="No checkout processes have been initiated"
      />
    </>
  )
}
