"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Building2,
  User,
  Banknote,
  CreditCard,
  Smartphone,
} from "lucide-react"
import { Column, TableBadge } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { MetricsBar, MetricItem } from "@/components/ui/metrics-bar"
import { DataTable } from "@/components/ui/data-table"
import { TenantLink, PropertyLink } from "@/components/ui/entity-link"
import { Avatar } from "@/components/ui/avatar"
import { PageLoader } from "@/components/ui/page-loader"
import { formatCurrency, formatDate } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import { PermissionGuard } from "@/components/auth"
import { Select, FormField } from "@/components/ui/form-components"
import { Label } from "@/components/ui/label"

// ============================================
// Types
// ============================================

interface Refund {
  id: string
  refund_type: string
  amount: number
  payment_mode: string
  reference_number: string | null
  status: string
  refund_date: string | null
  due_date: string | null
  reason: string | null
  notes: string | null
  created_at: string
  tenant: { id: string; name: string; phone: string; photo_url: string | null } | null
  property: { id: string; name: string } | null
  exit_clearance: { id: string; expected_exit_date: string } | null
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<Refund>[] = [
  {
    key: "tenant",
    header: "Tenant",
    width: "primary",
    sortable: true,
    sortKey: "tenant.name",
    render: (refund) => (
      <div className="flex items-center gap-3">
        <Avatar
          name={refund.tenant?.name || "Unknown"}
          src={refund.tenant?.photo_url}
          size="sm"
          className="bg-gradient-to-br from-teal-500 to-emerald-500 text-white shrink-0"
        />
        <div className="min-w-0">
          {refund.tenant ? (
            <TenantLink id={refund.tenant.id} name={refund.tenant.name} showIcon={false} />
          ) : (
            <span className="text-muted-foreground">Unknown</span>
          )}
          <div className="text-xs text-muted-foreground">{refund.tenant?.phone}</div>
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
    render: (refund) => (
      <div className="min-w-0">
        {refund.property ? (
          <PropertyLink id={refund.property.id} name={refund.property.name} size="sm" />
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </div>
    ),
  },
  {
    key: "amount",
    header: "Amount",
    width: "amount",
    sortable: true,
    sortType: "number",
    render: (refund) => (
      <div className="text-right">
        <span className="font-semibold text-green-600">
          {formatCurrency(refund.amount)}
        </span>
        <div className="text-xs text-muted-foreground capitalize">
          {refund.refund_type.replace(/_/g, " ")}
        </div>
      </div>
    ),
  },
  {
    key: "payment_mode",
    header: "Mode",
    width: "badge",
    render: (refund) => {
      const modeIcons: Record<string, React.ReactNode> = {
        cash: <Banknote className="h-3.5 w-3.5" />,
        upi: <Smartphone className="h-3.5 w-3.5" />,
        bank_transfer: <Building2 className="h-3.5 w-3.5" />,
        cheque: <CreditCard className="h-3.5 w-3.5" />,
      }
      return (
        <div className="flex items-center gap-1.5 text-sm">
          {modeIcons[refund.payment_mode] || <Wallet className="h-3.5 w-3.5" />}
          <span className="capitalize">{refund.payment_mode.replace(/_/g, " ")}</span>
        </div>
      )
    },
  },
  {
    key: "refund_date",
    header: "Date",
    width: "date",
    sortable: true,
    sortType: "date",
    render: (refund) => (
      <div>
        {refund.refund_date ? formatDate(refund.refund_date) : "—"}
        {refund.reference_number && (
          <div className="text-xs text-muted-foreground truncate max-w-[100px]" title={refund.reference_number}>
            Ref: {refund.reference_number}
          </div>
        )}
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    width: "status",
    sortable: true,
    render: (refund) => {
      const statusMap: Record<string, { variant: "success" | "warning" | "error" | "muted"; label: string }> = {
        pending: { variant: "warning", label: "Pending" },
        processing: { variant: "muted", label: "Processing" },
        completed: { variant: "success", label: "Completed" },
        failed: { variant: "error", label: "Failed" },
        cancelled: { variant: "error", label: "Cancelled" },
      }
      const status = statusMap[refund.status] || { variant: "muted" as const, label: refund.status }
      return <TableBadge variant={status.variant}>{status.label}</TableBadge>
    },
  },
]

// ============================================
// Page Component
// ============================================

export default function RefundsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [filteredRefunds, setFilteredRefunds] = useState<Refund[]>([])

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([])
  const [propertyFilter, setPropertyFilter] = useState<string>("all")

  useEffect(() => {
    fetchRefunds()
    fetchProperties()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [refunds, statusFilter, typeFilter, propertyFilter])

  const fetchRefunds = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("refunds")
      .select(`
        *,
        tenant:tenants(id, name, phone, photo_url),
        property:properties(id, name),
        exit_clearance:exit_clearance(id, expected_exit_date)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching refunds:", error)
    } else {
      const transformed = (data || []).map((r: Record<string, unknown>) => ({
        ...r,
        tenant: transformJoin(r.tenant as Record<string, unknown>[] | Record<string, unknown> | null),
        property: transformJoin(r.property as Record<string, unknown>[] | Record<string, unknown> | null),
        exit_clearance: transformJoin(r.exit_clearance as Record<string, unknown>[] | Record<string, unknown> | null),
      })) as Refund[]
      setRefunds(transformed)
    }
    setLoading(false)
  }

  const fetchProperties = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("properties")
      .select("id, name")
      .order("name")
    if (data) setProperties(data)
  }

  const applyFilters = () => {
    let filtered = [...refunds]

    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter)
    }
    if (typeFilter !== "all") {
      filtered = filtered.filter((r) => r.refund_type === typeFilter)
    }
    if (propertyFilter !== "all") {
      filtered = filtered.filter((r) => r.property?.id === propertyFilter)
    }

    setFilteredRefunds(filtered)
  }

  // Calculate metrics
  const totalRefunds = refunds.length
  const pendingCount = refunds.filter((r) => r.status === "pending").length
  const completedCount = refunds.filter((r) => r.status === "completed").length
  const pendingAmount = refunds
    .filter((r) => r.status === "pending")
    .reduce((sum, r) => sum + r.amount, 0)
  const completedAmount = refunds
    .filter((r) => r.status === "completed")
    .reduce((sum, r) => sum + r.amount, 0)

  const metrics: MetricItem[] = [
    { label: "Total Refunds", value: totalRefunds, icon: Wallet },
    { label: "Pending", value: pendingCount, icon: Clock, highlight: pendingCount > 0 },
    { label: "Completed", value: completedCount, icon: CheckCircle },
    { label: "Pending Amount", value: formatCurrency(pendingAmount), icon: AlertCircle, highlight: pendingAmount > 0 },
    { label: "Paid Out", value: formatCurrency(completedAmount), icon: Banknote },
  ]

  if (loading) return <PageLoader />

  return (
    <PermissionGuard permission="payments.view">
      <div className="space-y-6">
        <PageHeader
          title="Refunds"
          description="Track and manage tenant refunds"
          icon={Wallet}
          actions={
            <Link href="/refunds/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Refund
              </Button>
            </Link>
          }
        />

        <MetricsBar items={metrics} />

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="w-[180px]">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Status</Label>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: "all", label: "All Status" },
                    { value: "pending", label: "Pending" },
                    { value: "processing", label: "Processing" },
                    { value: "completed", label: "Completed" },
                    { value: "failed", label: "Failed" },
                    { value: "cancelled", label: "Cancelled" },
                  ]}
                />
              </div>

              <div className="w-[180px]">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Type</Label>
                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  options={[
                    { value: "all", label: "All Types" },
                    { value: "deposit_refund", label: "Deposit Refund" },
                    { value: "overpayment", label: "Overpayment" },
                    { value: "adjustment", label: "Adjustment" },
                    { value: "other", label: "Other" },
                  ]}
                />
              </div>

              <div className="w-[200px]">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Property</Label>
                <Select
                  value={propertyFilter}
                  onChange={(e) => setPropertyFilter(e.target.value)}
                  options={[
                    { value: "all", label: "All Properties" },
                    ...properties.map((p) => ({ value: p.id, label: p.name })),
                  ]}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        {filteredRefunds.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No refunds found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {refunds.length === 0
                  ? "No refunds have been recorded yet"
                  : "No refunds match your filters"}
              </p>
              <Link href="/refunds/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Record a Refund
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <DataTable
            columns={columns}
            data={filteredRefunds}
            keyField="id"
            onRowClick={(refund) => router.push(`/refunds/${refund.id}`)}
            searchable
            searchPlaceholder="Search by tenant, property, or reference..."
          />
        )}
      </div>
    </PermissionGuard>
  )
}
