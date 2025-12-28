"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Loader2,
  Plus,
  Receipt,
  Search,
  TrendingDown,
  Building2,
  Calendar,
  Download,
  Filter,
  Wallet,
  BarChart3,
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

interface Stats {
  thisMonth: number
  lastMonth: number
  ytd: number
  topCategory: string | null
  topCategoryAmount: number
}

const paymentMethodLabels: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  card: "Card",
  cheque: "Cheque",
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterProperty, setFilterProperty] = useState<string>("all")
  const [filterMethod, setFilterMethod] = useState<string>("all")
  const [stats, setStats] = useState<Stats>({
    thisMonth: 0,
    lastMonth: 0,
    ytd: 0,
    topCategory: null,
    topCategoryAmount: 0,
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const supabase = createClient()

      // Fetch expenses with relations
      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select(`
          *,
          expense_type:expense_types(id, name, code),
          property:properties(id, name)
        `)
        .order("expense_date", { ascending: false })

      if (expensesError) throw expensesError

      // Transform Supabase array joins to single objects
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

      // Fetch expense types
      const { data: typesData } = await supabase
        .from("expense_types")
        .select("id, name, code")
        .eq("is_enabled", true)
        .order("display_order")

      setExpenseTypes(typesData || [])

      // Fetch properties
      const { data: propertiesData } = await supabase
        .from("properties")
        .select("id, name")
        .order("name")

      setProperties(propertiesData || [])

      // Calculate stats
      const now = new Date()
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      const yearStart = new Date(now.getFullYear(), 0, 1)

      const thisMonthExpenses = transformedExpenses.filter(
        (e) => new Date(e.expense_date) >= thisMonthStart
      )
      const lastMonthExpenses = transformedExpenses.filter((e) => {
        const date = new Date(e.expense_date)
        return date >= lastMonthStart && date <= lastMonthEnd
      })
      const ytdExpenses = transformedExpenses.filter(
        (e) => new Date(e.expense_date) >= yearStart
      )

      const thisMonthTotal = thisMonthExpenses.reduce(
        (sum, e) => sum + Number(e.amount),
        0
      )
      const lastMonthTotal = lastMonthExpenses.reduce(
        (sum, e) => sum + Number(e.amount),
        0
      )
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

      const sortedCategories = Object.values(categoryTotals).sort(
        (a, b) => b.total - a.total
      )

      setStats({
        thisMonth: thisMonthTotal,
        lastMonth: lastMonthTotal,
        ytd: ytdTotal,
        topCategory: sortedCategories[0]?.name || null,
        topCategoryAmount: sortedCategories[0]?.total || 0,
      })
    } catch (error) {
      console.error("Error fetching expenses:", error)
      toast.error("Failed to load expenses")
    } finally {
      setLoading(false)
    }
  }

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.reference_number?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory =
      filterCategory === "all" || expense.expense_type_id === filterCategory

    const matchesProperty =
      filterProperty === "all" ||
      (filterProperty === "none" && !expense.property_id) ||
      expense.property_id === filterProperty

    const matchesMethod =
      filterMethod === "all" || expense.payment_method === filterMethod

    return matchesSearch && matchesCategory && matchesProperty && matchesMethod
  })

  const exportToCSV = () => {
    const headers = [
      "Date",
      "Category",
      "Description",
      "Vendor",
      "Property",
      "Amount",
      "Payment Method",
      "Reference",
    ]
    const rows = filteredExpenses.map((e) => [
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-muted-foreground">Track and manage property expenses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Link href="/dashboard/expenses/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ₹{stats.thisMonth.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.lastMonth > 0 && (
                <>
                  {stats.thisMonth > stats.lastMonth ? "↑" : "↓"}{" "}
                  {Math.abs(
                    Math.round(
                      ((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100
                    )
                  )}
                  % vs last month
                </>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Last Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ₹{stats.lastMonth.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-muted-foreground">Previous month total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Year to Date</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ₹{stats.ytd.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date().getFullYear()} total expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Top Category</CardTitle>
            <Wallet className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats.topCategory || "N/A"}
            </p>
            {stats.topCategoryAmount > 0 && (
              <p className="text-xs text-muted-foreground">
                ₹{stats.topCategoryAmount.toLocaleString("en-IN")} this month
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vendor, description, reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="all">All Categories</option>
                {expenseTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              <select
                value={filterProperty}
                onChange={(e) => setFilterProperty(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="all">All Properties</option>
                <option value="none">General (No Property)</option>
                {properties.map((prop) => (
                  <option key={prop.id} value={prop.id}>
                    {prop.name}
                  </option>
                ))}
              </select>
              <select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="all">All Methods</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="card">Card</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      {expenses.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No expenses yet</h3>
            <p className="text-muted-foreground mb-4">
              Start tracking your property expenses to understand your costs better.
            </p>
            <Link href="/dashboard/expenses/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Expense
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : filteredExpenses.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Filter className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              No expenses match your filters
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredExpenses.map((expense) => (
            <Link key={expense.id} href={`/dashboard/expenses/${expense.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-rose-100 rounded-lg">
                        <Receipt className="h-5 w-5 text-rose-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {expense.expense_type?.name || "Expense"}
                          </p>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {paymentMethodLabels[expense.payment_method]}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {expense.vendor_name || expense.description || "No description"}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(expense.expense_date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          {expense.property && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {expense.property.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-rose-600">
                        -₹{Number(expense.amount).toLocaleString("en-IN")}
                      </p>
                      {expense.reference_number && (
                        <p className="text-xs text-muted-foreground">
                          Ref: {expense.reference_number}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
