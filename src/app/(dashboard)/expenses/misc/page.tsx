/**
 * Miscellaneous Transactions List Page
 *
 * Track money in/out that doesn't fit into regular categories.
 * Includes PG collections, drawings, salaries, and other cash flow.
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeftRight,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Calendar,
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { formatCurrency, formatDate } from "@/lib/format"

import { PermissionGuard, FeatureGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import {
  PageHeader,
  MetricsBar,
  DataTable,
  TableBadge,
  EmptyState,
} from "@/components/ui"
import type { Column, MetricItem } from "@/components/ui"
import { PageLoading } from "@/components/ui/loading"

import type { MiscTransaction, MiscTransactionCategory } from "@/types/expense-enhanced.types"

export default function MiscTransactionsPage() {
  const router = useRouter()
  const { workspaceId } = useAuthContext()

  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<MiscTransaction[]>([])
  const [categories, setCategories] = useState<MiscTransactionCategory[]>([])

  // Filters
  const [typeFilter, setTypeFilter] = useState<"all" | "in" | "out">("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("")
  const [dateRange, setDateRange] = useState<"all" | "month" | "year">("month")

  // Load data
  const loadData = useCallback(async () => {
    if (!workspaceId) return

    const supabase = createClient()

    // Build date filter
    let dateFrom: string | null = null
    const now = new Date()
    if (dateRange === "month") {
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
    } else if (dateRange === "year") {
      dateFrom = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0]
    }

    // Load transactions
    let query = supabase
      .from("misc_transactions")
      .select(`
        *,
        category:misc_transaction_categories(id, name, name_hi, default_type)
      `)
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("transaction_date", { ascending: false })
      .limit(500)

    if (typeFilter !== "all") {
      query = query.eq("transaction_type", typeFilter)
    }

    if (categoryFilter) {
      query = query.eq("category_id", categoryFilter)
    }

    if (dateFrom) {
      query = query.gte("transaction_date", dateFrom)
    }

    const { data: transData, error } = await query

    if (error) {
      console.error("Failed to load transactions:", error)
    } else {
      const transformed = (transData || []).map((item: Record<string, unknown>) => ({
        ...item,
        category: transformJoin(item.category),
      })) as MiscTransaction[]
      setTransactions(transformed)
    }

    // Load categories for filter
    const { data: catData } = await supabase
      .from("misc_transaction_categories")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("sort_order")

    setCategories(catData || [])
    setLoading(false)
  }, [workspaceId, typeFilter, categoryFilter, dateRange])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Calculate metrics
  const totalIn = transactions
    .filter((t) => t.transaction_type === "in")
    .reduce((sum, t) => sum + t.amount, 0)

  const totalOut = transactions
    .filter((t) => t.transaction_type === "out")
    .reduce((sum, t) => sum + t.amount, 0)

  const netAmount = totalIn - totalOut

  const metrics: MetricItem[] = [
    {
      label: "Money In",
      value: formatCurrency(totalIn),
      icon: ArrowDownLeft,
      highlight: true,
    },
    {
      label: "Money Out",
      value: formatCurrency(totalOut),
      icon: ArrowUpRight,
    },
    {
      label: netAmount >= 0 ? "Net Surplus" : "Net Deficit",
      value: formatCurrency(Math.abs(netAmount)),
      icon: netAmount >= 0 ? TrendingUp : TrendingDown,
      highlight: netAmount >= 0,
    },
    {
      label: "Transactions",
      value: transactions.length.toString(),
      icon: ArrowLeftRight,
    },
  ]

  // Table columns
  const columns: Column<MiscTransaction>[] = [
    {
      key: "transaction_date",
      header: "Date",
      width: "date",
      sortable: true,
      render: (row) => formatDate(row.transaction_date),
    },
    {
      key: "transaction_type",
      header: "Type",
      width: "badge",
      render: (row) => (
        <TableBadge variant={row.transaction_type === "in" ? "success" : "error"}>
          {row.transaction_type === "in" ? (
            <><ArrowDownLeft className="h-3 w-3 mr-1" /> In</>
          ) : (
            <><ArrowUpRight className="h-3 w-3 mr-1" /> Out</>
          )}
        </TableBadge>
      ),
    },
    {
      key: "person_name",
      header: "Person / Description",
      width: "primary",
      render: (row) => (
        <div>
          <div className="font-medium">{row.person_name || "—"}</div>
          {row.description && (
            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
              {row.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "category_name",
      header: "Category",
      width: "secondary",
      render: (row) => (
        <TableBadge variant="muted">
          {row.category?.name || row.category_name || "Uncategorized"}
        </TableBadge>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      width: "amount",
      sortable: true,
      render: (row) => (
        <span className={row.transaction_type === "in" ? "text-green-600" : "text-red-600"}>
          {row.transaction_type === "in" ? "+" : "-"}{formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      key: "payment_mode",
      header: "Mode",
      width: "badge",
      render: (row) => {
        const modeLabels: Record<string, string> = {
          cash: "Cash",
          upi: "UPI",
          paytm: "Paytm",
          bank_transfer: "Bank",
          card: "Card",
          cheque: "Cheque",
          other: "Other",
        }
        return <TableBadge variant="muted">{modeLabels[row.payment_mode] || row.payment_mode}</TableBadge>
      },
    },
  ]

  if (loading) {
    return <PageLoading />
  }

  return (
    <FeatureGuard feature="expenses">
      <PermissionGuard permission="expenses.view">
        <div className="space-y-6">
          <PageHeader
            title="Miscellaneous Transactions"
            description="Track money in and out that doesn't fit regular categories"
            actions={
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href="/expenses/misc/categories">
                    Manage Categories
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/expenses/misc/new">
                    <Plus className="h-4 w-4 mr-2" />
                    New Transaction
                  </Link>
                </Button>
              </div>
            }
          />

          <MetricsBar items={metrics} />

          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            {/* Type Filter */}
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {(["all", "in", "out"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    typeFilter === type
                      ? "bg-white shadow text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {type === "all" ? "All" : type === "in" ? "Money In" : "Money Out"}
                </button>
              ))}
            </div>

            {/* Date Range */}
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              {(["month", "year", "all"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    dateRange === range
                      ? "bg-white shadow text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Calendar className="h-3 w-3 inline mr-1" />
                  {range === "month" ? "This Month" : range === "year" ? "This Year" : "All Time"}
                </button>
              ))}
            </div>

            {/* Category Filter */}
            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border rounded-lg bg-white"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {transactions.length === 0 ? (
            <EmptyState
              title="No transactions found"
              description={
                typeFilter !== "all" || categoryFilter || dateRange !== "all"
                  ? "Try adjusting your filters"
                  : "Start recording your miscellaneous money in and out"
              }
              action={{
                label: "Add Transaction",
                href: "/expenses/misc/new",
              }}
            />
          ) : (
            <DataTable
              columns={columns}
              data={transactions}
              keyField="id"
              onRowClick={(row) => router.push(`/expenses/misc/${row.id}`)}
              searchable
              searchPlaceholder="Search by person or description..."
            />
          )}
        </div>
      </PermissionGuard>
    </FeatureGuard>
  )
}
