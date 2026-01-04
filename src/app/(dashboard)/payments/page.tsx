"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { DataTable, Column, TableBadge } from "@/components/ui/data-table"
import { MetricsBar, MetricItem } from "@/components/ui/metrics-bar"
import { ListPageFilters, FilterConfig } from "@/components/ui/list-page-filters"
import { PermissionGuard } from "@/components/auth"
import { PageLoader } from "@/components/ui/page-loader"
import { Checkbox } from "@/components/ui/checkbox"
import {
  CreditCard,
  Plus,
  IndianRupee,
  Bell,
  Receipt,
  Wallet,
  Banknote,
  Layers,
  ChevronDown
} from "lucide-react"
import { TenantLink, PropertyLink } from "@/components/ui/entity-link"
import { WhatsAppIconButton } from "@/components/whatsapp-button"
import { messageTemplates } from "@/lib/notifications"
import { formatCurrency, formatDate } from "@/lib/format"
import { toast } from "sonner"

interface Payment {
  id: string
  amount: number
  payment_method: string
  payment_date: string
  for_period: string | null
  reference_number: string | null
  receipt_number: string | null
  notes: string | null
  created_at: string
  tenant: {
    id: string
    name: string
    phone: string
  }
  property: {
    id: string
    name: string
  }
  charge_type: {
    id: string
    name: string
  } | null
  // Computed fields for grouping
  payment_month?: string
  payment_year?: string
}

const paymentMethodLabels: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank",
  cheque: "Cheque",
  card: "Card",
}

interface Property {
  id: string
  name: string
}

// Group by options for payments - supports multi-select for nested grouping
const paymentGroupByOptions = [
  { value: "property.name", label: "Property" },
  { value: "tenant.name", label: "Tenant" },
  { value: "payment_method", label: "Method" },
  { value: "for_period", label: "Period" },
  { value: "payment_month", label: "Month" },
  { value: "payment_year", label: "Year" },
  { value: "charge_type.name", label: "Charge Type" },
]

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false)

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    const supabase = createClient()

    // Fetch properties for filter
    const { data: propertiesData } = await supabase
      .from("properties")
      .select("id, name")
      .order("name")
    setProperties(propertiesData || [])

    const { data, error } = await supabase
      .from("payments")
      .select(`
        *,
        tenant:tenants(id, name, phone),
        property:properties(id, name),
        charge_type:charge_types(id, name)
      `)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching payments:", error)
      toast.error("Failed to load payments")
      setLoading(false)
      return
    }

    // Transform Supabase joins from arrays to objects
    const transformed = (data || []).map((payment) => {
      const date = new Date(payment.payment_date)
      return {
        ...payment,
        tenant: transformJoin(payment.tenant),
        property: transformJoin(payment.property),
        charge_type: transformJoin(payment.charge_type),
        payment_month: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        payment_year: date.getFullYear().toString(),
      }
    })

    setPayments(transformed)
    setLoading(false)
  }

  // Calculate stats
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonthPayments = payments.filter(p => new Date(p.payment_date) >= firstOfMonth)
  const totalThisMonth = thisMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0)
  const totalAll = payments.reduce((sum, p) => sum + Number(p.amount), 0)

  const methodCounts = payments.reduce((acc, p) => {
    acc[p.payment_method] = (acc[p.payment_method] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const topMethod = Object.entries(methodCounts).sort((a, b) => b[1] - a[1])[0]

  const metricsItems: MetricItem[] = [
    { label: "This Month", value: formatCurrency(totalThisMonth), icon: IndianRupee },
    { label: "All Time", value: formatCurrency(totalAll), icon: Wallet },
    { label: "Transactions", value: payments.length, icon: Receipt },
    { label: "Top Method", value: topMethod ? paymentMethodLabels[topMethod[0]] || topMethod[0] : "—", icon: Banknote },
  ]

  // Filter configuration
  const filterConfigs: FilterConfig[] = [
    {
      id: "property",
      label: "Property",
      type: "select",
      placeholder: "All Properties",
      options: properties.map(p => ({ value: p.id, label: p.name })),
    },
    {
      id: "payment_method",
      label: "Method",
      type: "select",
      placeholder: "All Methods",
      options: [
        { value: "cash", label: "Cash" },
        { value: "upi", label: "UPI" },
        { value: "bank_transfer", label: "Bank Transfer" },
        { value: "cheque", label: "Cheque" },
        { value: "card", label: "Card" },
      ],
    },
    {
      id: "date",
      label: "Date",
      type: "date-range",
    },
  ]

  // Apply filters
  const filteredPayments = payments.filter((payment) => {
    if (filters.property && filters.property !== "all" && payment.property?.id !== filters.property) {
      return false
    }
    if (filters.payment_method && filters.payment_method !== "all" && payment.payment_method !== filters.payment_method) {
      return false
    }
    if (filters.date_from) {
      const paymentDate = new Date(payment.payment_date)
      if (paymentDate < new Date(filters.date_from)) return false
    }
    if (filters.date_to) {
      const paymentDate = new Date(payment.payment_date)
      if (paymentDate > new Date(filters.date_to)) return false
    }
    return true
  })

  const columns: Column<Payment>[] = [
    {
      key: "tenant",
      header: "Tenant",
      width: "primary",
      sortable: true,
      sortKey: "tenant.name",
      render: (payment) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs font-bold shrink-0">
            ₹
          </div>
          <div className="min-w-0">
            <div><TenantLink id={payment.tenant.id} name={payment.tenant.name} /></div>
            {payment.property && (
              <div><PropertyLink id={payment.property.id} name={payment.property.name} size="sm" /></div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      width: "amount",
      sortable: true,
      sortType: "number",
      render: (payment) => (
        <span className="font-semibold text-emerald-600 tabular-nums">
          {formatCurrency(Number(payment.amount))}
        </span>
      ),
    },
    {
      key: "payment_method",
      header: "Method",
      width: "badge",
      hideOnMobile: true,
      sortable: true,
      render: (payment) => (
        <TableBadge variant="default">
          {paymentMethodLabels[payment.payment_method] || payment.payment_method}
        </TableBadge>
      ),
    },
    {
      key: "payment_date",
      header: "Date",
      width: "date",
      sortable: true,
      sortType: "date",
      render: (payment) => formatDate(payment.payment_date),
    },
    {
      key: "actions",
      header: "",
      width: "iconAction",
      render: (payment) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <WhatsAppIconButton
            phone={payment.tenant.phone}
            message={messageTemplates.simpleReceipt({
              tenantName: payment.tenant.name,
              amount: Number(payment.amount),
              receiptNumber: payment.receipt_number || payment.id.slice(0, 8).toUpperCase(),
            })}
          />
        </div>
      ),
    },
  ]

  if (loading) {
    return <PageLoader />
  }

  return (
    <PermissionGuard permission="payments.view">
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Track and manage all tenant payments"
        icon={CreditCard}
        breadcrumbs={[{ label: "Payments" }]}
        actions={
          <div className="flex gap-2">
            <Link href="/payments/reminders">
              <Button variant="outline" size="sm">
                <Bell className="mr-2 h-4 w-4" />
                Reminders
              </Button>
            </Link>
            <Link href="/payments/new">
              <Button variant="gradient">
                <Plus className="mr-2 h-4 w-4" />
                Record Payment
              </Button>
            </Link>
          </div>
        }
      />

      {payments.length > 0 && <MetricsBar items={metricsItems} />}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <ListPageFilters
            filters={filterConfigs}
            values={filters}
            onChange={(id, value) => setFilters(prev => ({ ...prev, [id]: value }))}
            onClear={() => setFilters({})}
          />
        </div>

        {/* Group By Multi-Select */}
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
                  ? paymentGroupByOptions.find(o => o.value === selectedGroups[0])?.label
                  : `${selectedGroups.length} levels`}
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${groupDropdownOpen ? "rotate-180" : ""}`} />
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
                {paymentGroupByOptions.map((opt) => {
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
                            setSelectedGroups(selectedGroups.filter(v => v !== opt.value))
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
      </div>

      <DataTable
        columns={columns}
        data={filteredPayments}
        keyField="id"
        href={(payment) => `/payments/${payment.id}`}
        searchable
        searchPlaceholder="Search by tenant, receipt #..."
        searchFields={["receipt_number", "reference_number"]}
        groupBy={selectedGroups.length > 0 ? selectedGroups.map(key => ({
          key,
          label: paymentGroupByOptions.find(o => o.value === key)?.label
        })) : undefined}
        emptyState={
          <div className="flex flex-col items-center py-8">
            <CreditCard className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No payments found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {payments.length === 0
                ? "Start recording payments from your tenants"
                : "No payments match your filters"}
            </p>
            {payments.length === 0 && (
              <Link href="/payments/new">
                <Button variant="gradient">
                  <Plus className="mr-2 h-4 w-4" />
                  Record Payment
                </Button>
              </Link>
            )}
          </div>
        }
      />
    </div>
    </PermissionGuard>
  )
}
