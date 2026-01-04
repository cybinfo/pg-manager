"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Loader2,
  ArrowLeft,
  Receipt,
  Building2,
  Calendar,
  Wallet,
  FileText,
  Edit,
  Trash2,
  User,
  Hash,
} from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format"
import { useAuth } from "@/lib/auth"
import { PermissionGate } from "@/components/auth"
import { PageLoader } from "@/components/ui/page-loader"

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
  notes: string | null
  property_id: string | null
  expense_type_id: string
  expense_type: ExpenseType | null
  property: Property | null
  created_at: string
  updated_at: string
}

const paymentMethodLabels: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  card: "Card",
  cheque: "Cheque",
}

export default function ExpenseDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [expense, setExpense] = useState<Expense | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchExpense()
  }, [params.id])

  const fetchExpense = async () => {
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("expenses")
        .select(`
          *,
          expense_type:expense_types(id, name, code),
          property:properties(id, name)
        `)
        .eq("id", params.id)
        .single()

      if (error) throw error

      // Transform Supabase array joins
      const transformed = {
        ...data,
        expense_type: Array.isArray(data.expense_type)
          ? data.expense_type[0]
          : data.expense_type,
        property: Array.isArray(data.property)
          ? data.property[0]
          : data.property,
      }

      setExpense(transformed)
    } catch (error) {
      console.error("Error fetching expense:", error)
      toast.error("Failed to load expense")
      router.push("/expenses")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this expense? This action cannot be undone.")) {
      return
    }

    setDeleting(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", params.id)

      if (error) throw error

      toast.success("Expense deleted successfully")
      router.push("/expenses")
    } catch (error) {
      console.error("Error deleting expense:", error)
      toast.error("Failed to delete expense")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <PageLoader />
  }

  if (!expense) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Expense not found</p>
        <Link href="/expenses">
          <Button variant="link">Back to Expenses</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex items-center gap-4">
          <Link href="/expenses">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{expense.expense_type?.name || "Expense"}</h1>
            <p className="text-muted-foreground">
              {formatDate(expense.expense_date)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/expenses/${expense.id}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <PermissionGate permission="expenses.delete" hide>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Amount Card */}
      <Card className="bg-gradient-to-r from-rose-500 to-rose-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-rose-100 text-sm">Amount</p>
              <p className="text-4xl font-bold">
                {formatCurrency(Number(expense.amount))}
              </p>
            </div>
            <div className="p-4 bg-white/20 rounded-full">
              <Receipt className="h-8 w-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Expense Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Expense Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Category</span>
              <span className="font-medium">{expense.expense_type?.name || "N/A"}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDate(expense.expense_date)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Property</span>
              {expense.property ? (
                <Link href={`/properties/${expense.property.id}`} className="font-medium flex items-center gap-2 hover:text-primary transition-colors">
                  <Building2 className="h-4 w-4" />
                  {expense.property.name}
                </Link>
              ) : (
                <span className="font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  All Properties
                </span>
              )}
            </div>
            {expense.description && (
              <div className="py-2 border-b">
                <span className="text-muted-foreground block mb-1">Description</span>
                <p className="font-medium">{expense.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Payment Method</span>
              <span className="font-medium">
                {paymentMethodLabels[expense.payment_method] || expense.payment_method}
              </span>
            </div>
            {expense.vendor_name && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Vendor / Payee</span>
                <span className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {expense.vendor_name}
                </span>
              </div>
            )}
            {expense.reference_number && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Reference #</span>
                <span className="font-medium flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  {expense.reference_number}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {expense.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{expense.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>Created: {formatDateTime(expense.created_at)}</span>
            <span>Updated: {formatDateTime(expense.updated_at)}</span>
            <span>ID: {expense.id}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
