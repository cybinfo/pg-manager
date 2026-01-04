"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { DataTable, Column, StatusDot, TableBadge, GroupConfig } from "@/components/ui/data-table"
import { MetricsBar, MetricItem } from "@/components/ui/metrics-bar"
import { ListPageFilters, FilterConfig } from "@/components/ui/list-page-filters"
import { PermissionGuard } from "@/components/auth"
import { PageLoader } from "@/components/ui/page-loader"
import { Checkbox } from "@/components/ui/checkbox"
import {
  FileText,
  Plus,
  IndianRupee,
  AlertCircle,
  CheckCircle,
  Clock,
  Layers,
  ChevronDown
} from "lucide-react"
import { TenantLink, PropertyLink } from "@/components/ui/entity-link"
import { formatCurrency, formatDate } from "@/lib/format"
import { toast } from "sonner"

interface Bill {
  id: string
  bill_number: string
  bill_date: string
  due_date: string
  for_month: string
  total_amount: number
  paid_amount: number
  balance_due: number
  status: string
  tenant: {
    id: string
    name: string
    phone: string
  } | null
  property: {
    id: string
    name: string
  } | null
}

interface Property {
  id: string
  name: string
}

// Group by options for bills - supports multi-select for nested grouping
const billGroupByOptions = [
  { value: "property.name", label: "Property" },
  { value: "status", label: "Status" },
  { value: "for_month", label: "Period" },
]

export default function BillsPage() {
  const router = useRouter()
  const [bills, setBills] = useState<Bill[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false)

  useEffect(() => {
    const fetchBills = async () => {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      // Fetch properties for filter
      const { data: propertiesData } = await supabase
        .from("properties")
        .select("id, name")
        .order("name")
      setProperties(propertiesData || [])

      const { data, error } = await supabase
        .from("bills")
        .select(`
          *,
          tenant:tenants(id, name, phone),
          property:properties(id, name)
        `)
        .eq("owner_id", user.id)
        .order("bill_date", { ascending: false })

      if (error) {
        console.error("Error fetching bills:", error)
        toast.error("Failed to load bills")
        setLoading(false)
        return
      }

      const transformedBills: Bill[] = (data || []).map((bill) => ({
        ...bill,
        tenant: Array.isArray(bill.tenant) ? bill.tenant[0] : bill.tenant,
        property: Array.isArray(bill.property) ? bill.property[0] : bill.property,
      }))

      setBills(transformedBills)
      setLoading(false)
    }

    fetchBills()
  }, [router])

  const getStatusInfo = (status: string): { status: "success" | "warning" | "error" | "muted"; label: string } => {
    switch (status) {
      case "paid":
        return { status: "success", label: "Paid" }
      case "pending":
        return { status: "warning", label: "Pending" }
      case "partial":
        return { status: "warning", label: "Partial" }
      case "overdue":
        return { status: "error", label: "Overdue" }
      default:
        return { status: "muted", label: status }
    }
  }

  // Calculate stats
  const total = bills.reduce((sum, b) => sum + Number(b.total_amount), 0)
  const pending = bills
    .filter((b) => b.status === "pending" || b.status === "partial")
    .reduce((sum, b) => sum + Number(b.balance_due), 0)
  const overdue = bills
    .filter((b) => b.status === "overdue")
    .reduce((sum, b) => sum + Number(b.balance_due), 0)
  const collected = bills.reduce((sum, b) => sum + Number(b.paid_amount), 0)

  const metricsItems: MetricItem[] = [
    { label: "Total Billed", value: formatCurrency(total), icon: FileText },
    { label: "Collected", value: formatCurrency(collected), icon: CheckCircle },
    { label: "Pending", value: formatCurrency(pending), icon: Clock, highlight: pending > 0 },
    { label: "Overdue", value: formatCurrency(overdue), icon: AlertCircle, highlight: overdue > 0 },
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
      id: "status",
      label: "Status",
      type: "select",
      placeholder: "All Status",
      options: [
        { value: "pending", label: "Pending" },
        { value: "partial", label: "Partial" },
        { value: "paid", label: "Paid" },
        { value: "overdue", label: "Overdue" },
      ],
    },
    {
      id: "date",
      label: "Bill Date",
      type: "date-range",
    },
  ]

  // Apply filters
  const filteredBills = bills.filter((bill) => {
    if (filters.property && filters.property !== "all" && bill.property?.id !== filters.property) {
      return false
    }
    if (filters.status && filters.status !== "all" && bill.status !== filters.status) {
      return false
    }
    if (filters.date_from) {
      const billDate = new Date(bill.bill_date)
      if (billDate < new Date(filters.date_from)) return false
    }
    if (filters.date_to) {
      const billDate = new Date(bill.bill_date)
      if (billDate > new Date(filters.date_to)) return false
    }
    return true
  })

  const columns: Column<Bill>[] = [
    {
      key: "bill_number",
      header: "Bill",
      width: "primary",
      sortable: true,
      render: (bill) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <FileText className="h-4 w-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate">{bill.bill_number}</div>
            {bill.tenant && (
              <div><TenantLink id={bill.tenant.id} name={bill.tenant.name} size="sm" /></div>
            )}
            {bill.property && (
              <div><PropertyLink id={bill.property.id} name={bill.property.name} size="sm" /></div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "for_month",
      header: "Period",
      width: "tertiary",
      sortable: true,
      render: (bill) => bill.for_month,
    },
    {
      key: "total_amount",
      header: "Amount",
      width: "amount",
      sortable: true,
      sortType: "number",
      render: (bill) => (
        <div>
          <div className="font-medium tabular-nums">{formatCurrency(bill.total_amount)}</div>
          {bill.balance_due > 0 && bill.status !== "paid" && (
            <div className="text-xs text-rose-600">Due: {formatCurrency(bill.balance_due)}</div>
          )}
        </div>
      ),
    },
    {
      key: "due_date",
      header: "Due",
      width: "date",
      hideOnMobile: true,
      sortable: true,
      sortType: "date",
      render: (bill) => formatDate(bill.due_date),
    },
    {
      key: "status",
      header: "Status",
      width: "status",
      sortable: true,
      render: (bill) => {
        const info = getStatusInfo(bill.status)
        return <StatusDot status={info.status} label={info.label} />
      },
    },
  ]

  if (loading) {
    return <PageLoader />
  }

  return (
    <PermissionGuard permission="bills.view">
    <div className="space-y-6">
      <PageHeader
        title="Bills"
        description="Generate and manage monthly bills for tenants"
        icon={FileText}
        breadcrumbs={[{ label: "Bills" }]}
        actions={
          <Link href="/bills/new">
            <Button variant="gradient">
              <Plus className="mr-2 h-4 w-4" />
              Generate Bill
            </Button>
          </Link>
        }
      />

      {bills.length > 0 && <MetricsBar items={metricsItems} />}

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
                  ? billGroupByOptions.find(o => o.value === selectedGroups[0])?.label
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
                {billGroupByOptions.map((opt) => {
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
        data={filteredBills}
        keyField="id"
        href={(bill) => `/bills/${bill.id}`}
        searchable
        searchPlaceholder="Search by bill number, tenant, or month..."
        searchFields={["bill_number", "for_month"]}
        groupBy={selectedGroups.length > 0 ? selectedGroups.map(key => ({
          key,
          label: billGroupByOptions.find(o => o.value === key)?.label
        })) : undefined}
        emptyState={
          <div className="flex flex-col items-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No bills found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {bills.length === 0
                ? "Generate your first bill to get started"
                : "No bills match your filters"}
            </p>
            {bills.length === 0 && (
              <Link href="/bills/new">
                <Button variant="gradient">
                  <Plus className="mr-2 h-4 w-4" />
                  Generate Bill
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
