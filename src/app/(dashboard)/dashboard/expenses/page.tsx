"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { DataTable, Column, TableBadge } from "@/components/ui/data-table"
import { MetricsBar, MetricItem } from "@/components/ui/metrics-bar"
import {
  Loader2,
  Plus,
  Receipt,
  TrendingDown,
  Download,
  Calendar,
  BarChart3,
  Wallet,
} from "lucide-react"
import { toast } from "sonner"

interface ExpenseType {
  id: string
  name: string
  code: string
}

interface Property {
  id: string
  name: string
}

interface Expense {
  id: string
  amount: number
  expense_date: string
  description: string | null
  vendor_name: string | null
  reference_number: string | null
  payment_method: string
  property_id: string | null
  expense_type_id: string
  expense_type: ExpenseType | null
  property: Property | null
  created_at: string
}

const paymentMethodLabels: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank",
  card: "Card",
  cheque: "Cheque",
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const supabase = createClient()

      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select(`
          *,
          expense_type:expense_types(id, name, code),
          property:properties(id, name)
        `)
        .order("expense_date", { ascending: false })

      if (expensesError) throw expensesError

      const transformedExpenses = (expensesData || []).map((expense) => ({
        ...expense,
        expense_type: Array.isArray(expense.expense_type)
          ? expense.expense_type[0]
          : expense.expense_type,
        property: Array.isArray(expense.property)
          ? expense.property[0]
          : expense.property,
      }))

      setExpenses(transformedExpenses)
    } catch (error) {
      console.error("Error fetching expenses:", error)
      toast.error("Failed to load expenses")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    })
  }

  // Calculate stats
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
  const yearStart = new Date(now.getFullYear(), 0, 1)

  const thisMonthExpenses = expenses.filter(e => new Date(e.expense_date) >= thisMonthStart)
  const lastMonthExpenses = expenses.filter(e => {
    const date = new Date(e.expense_date)
    return date >= lastMonthStart && date <= lastMonthEnd
  })
  const ytdExpenses = expenses.filter(e => new Date(e.expense_date) >= yearStart)

  const thisMonthTotal = thisMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const lastMonthTotal = lastMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const ytdTotal = ytdExpenses.reduce((sum, e) => sum + Number(e.amount), 0)

  // Find top category this month
  const categoryTotals: Record<string, { name: string; total: number }> = {}
  thisMonthExpenses.forEach((e) => {
    const catName = e.expense_type?.name || "Unknown"
    if (!categoryTotals[catName]) {
      categoryTotals[catName] = { name: catName, total: 0 }
    }
    categoryTotals[catName].total += Number(e.amount)
  })
  const topCategory = Object.values(categoryTotals).sort((a, b) => b.total - a.total)[0]

  const metricsItems: MetricItem[] = [
    {
      label: "This Month",
      value: `₹${thisMonthTotal.toLocaleString("en-IN")}`,
      icon: TrendingDown,
      trend: lastMonthTotal > 0 ? {
        value: Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100),
        isPositive: thisMonthTotal < lastMonthTotal
      } : undefined
    },
    { label: "Last Month", value: `₹${lastMonthTotal.toLocaleString("en-IN")}`, icon: Calendar },
    { label: "Year to Date", value: `₹${ytdTotal.toLocaleString("en-IN")}`, icon: BarChart3 },
    { label: "Top Category", value: topCategory?.name || "—", icon: Wallet },
  ]

  const exportToCSV = () => {
    const headers = ["Date", "Category", "Description", "Vendor", "Property", "Amount", "Payment Method", "Reference"]
    const rows = expenses.map((e) => [
      e.expense_date,
      e.expense_type?.name || "",
      e.description || "",
      e.vendor_name || "",
      e.property?.name || "All Properties",
      e.amount,
      paymentMethodLabels[e.payment_method] || e.payment_method,
      e.reference_number || "",
    ])

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `expenses-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Expenses exported to CSV")
  }

  const columns: Column<Expense>[] = [
    {
      key: "expense_type",
      header: "Category",
      width: "primary",
      render: (expense) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-rose-100 flex items-center justify-center">
            <Receipt className="h-4 w-4 text-rose-600" />
          </div>
          <div>
            <div className="font-medium">{expense.expense_type?.name || "Expense"}</div>
            <div className="text-xs text-muted-foreground">
              {expense.vendor_name || expense.description || "No description"}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      width: "amount",
      render: (expense) => (
        <span className="font-semibold text-rose-600 tabular-nums">
          -₹{Number(expense.amount).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      key: "payment_method",
      header: "Method",
      width: "badge",
      hideOnMobile: true,
      render: (expense) => (
        <TableBadge variant="muted">
          {paymentMethodLabels[expense.payment_method] || expense.payment_method}
        </TableBadge>
      ),
    },
    {
      key: "property",
      header: "Property",
      width: "tertiary",
      hideOnMobile: true,
      render: (expense) => expense.property?.name || "General",
    },
    {
      key: "expense_date",
      header: "Date",
      width: "date",
      render: (expense) => formatDate(expense.expense_date),
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Track and manage property expenses"
        icon={Receipt}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Link href="/dashboard/expenses/new">
              <Button variant="gradient">
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </Link>
          </div>
        }
      />

      {expenses.length > 0 && <MetricsBar items={metricsItems} />}

      <DataTable
        columns={columns}
        data={expenses}
        keyField="id"
        href={(expense) => `/dashboard/expenses/${expense.id}`}
        searchable
        searchPlaceholder="Search vendor, description, reference..."
        searchFields={["vendor_name", "description", "reference_number"]}
        emptyState={
          <div className="flex flex-col items-center py-8">
            <Receipt className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No expenses yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start tracking your property expenses
            </p>
            <Link href="/dashboard/expenses/new">
              <Button variant="gradient">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Expense
              </Button>
            </Link>
          </div>
        }
      />
    </div>
  )
}
