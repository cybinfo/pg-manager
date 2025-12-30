"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { DataTable, Column, StatusDot, TableBadge } from "@/components/ui/data-table"
import { MetricsBar, MetricItem } from "@/components/ui/metrics-bar"
import {
  FileText,
  Plus,
  Loader2,
  IndianRupee,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react"

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
    name: string
    phone: string
  } | null
  property: {
    name: string
  } | null
}

export default function BillsPage() {
  const router = useRouter()
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBills = async () => {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      const { data, error } = await supabase
        .from("bills")
        .select(`
          *,
          tenant:tenants(name, phone),
          property:properties(name)
        `)
        .eq("owner_id", user.id)
        .order("bill_date", { ascending: false })

      if (error) {
        console.error("Error fetching bills:", error)
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

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    })
  }

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

  const columns: Column<Bill>[] = [
    {
      key: "bill_number",
      header: "Bill",
      width: "primary",
      render: (bill) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <FileText className="h-4 w-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate">{bill.bill_number}</div>
            <div className="text-xs text-muted-foreground truncate">{bill.tenant?.name || "Unknown"}</div>
          </div>
        </div>
      ),
    },
    {
      key: "for_month",
      header: "Period",
      width: "tertiary",
      render: (bill) => bill.for_month,
    },
    {
      key: "total_amount",
      header: "Amount",
      width: "amount",
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
      render: (bill) => formatDate(bill.due_date),
    },
    {
      key: "status",
      header: "Status",
      width: "status",
      render: (bill) => {
        const info = getStatusInfo(bill.status)
        return <StatusDot status={info.status} label={info.label} />
      },
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bills"
        description="Generate and manage monthly bills for tenants"
        icon={FileText}
        actions={
          <Link href="/dashboard/bills/new">
            <Button variant="gradient">
              <Plus className="mr-2 h-4 w-4" />
              Generate Bill
            </Button>
          </Link>
        }
      />

      {bills.length > 0 && <MetricsBar items={metricsItems} />}

      <DataTable
        columns={columns}
        data={bills}
        keyField="id"
        href={(bill) => `/dashboard/bills/${bill.id}`}
        searchable
        searchPlaceholder="Search by bill number, tenant, or month..."
        searchFields={["bill_number", "for_month"]}
        emptyState={
          <div className="flex flex-col items-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No bills yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Generate your first bill to get started
            </p>
            <Link href="/dashboard/bills/new">
              <Button variant="gradient">
                <Plus className="mr-2 h-4 w-4" />
                Generate Bill
              </Button>
            </Link>
          </div>
        }
      />
    </div>
  )
}
