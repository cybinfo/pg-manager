"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { DataTable, Column, TableBadge } from "@/components/ui/data-table"
import { MetricsBar, MetricItem } from "@/components/ui/metrics-bar"
import { ListPageFilters, FilterConfig } from "@/components/ui/list-page-filters"
import { PermissionGuard } from "@/components/auth"
import { PageLoader } from "@/components/ui/page-loader"
import {
  CreditCard,
  Plus,
  IndianRupee,
  Bell,
  Receipt,
  Wallet,
  Banknote
} from "lucide-react"
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

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Record<string, string>>({})

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
    const transformed = (data || []).map((payment) => ({
      ...payment,
      tenant: Array.isArray(payment.tenant) ? payment.tenant[0] : payment.tenant,
      property: Array.isArray(payment.property) ? payment.property[0] : payment.property,
      charge_type: Array.isArray(payment.charge_type) ? payment.charge_type[0] : payment.charge_type,
    }))

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
    if (filters.property && filters.property !== "all" && payment.property.id !== filters.property) {
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
            <div className="font-medium truncate">{payment.tenant.name}</div>
            <div className="text-xs text-muted-foreground truncate">{payment.property.name}</div>
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
      <ListPageFilters
        filters={filterConfigs}
        values={filters}
        onChange={(id, value) => setFilters(prev => ({ ...prev, [id]: value }))}
        onClear={() => setFilters({})}
      />

      <DataTable
        columns={columns}
        data={filteredPayments}
        keyField="id"
        href={(payment) => `/payments/${payment.id}`}
        searchable
        searchPlaceholder="Search by tenant, receipt #..."
        searchFields={["receipt_number", "reference_number"]}
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
