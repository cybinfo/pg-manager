"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  DetailHero,
  InfoCard,
  DetailSection,
  InfoRow,
} from "@/components/ui/detail-components"
import { Currency } from "@/components/ui/currency"
import { PageLoading } from "@/components/ui/loading"
import {
  Receipt,
  Building2,
  Calendar,
  Wallet,
  FileText,
  Edit,
  Trash2,
  User,
  Hash,
  Clock,
} from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format"
import { PermissionGate } from "@/components/auth"

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
    return <PageLoading message="Loading expense details..." />
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
      {/* Hero Header */}
      <DetailHero
        title={expense.expense_type?.name || "Expense"}
        subtitle={formatDate(expense.expense_date)}
        backHref="/expenses"
        backLabel="All Expenses"
        avatar={
          <div className="p-3 bg-rose-100 rounded-lg">
            <Receipt className="h-8 w-8 text-rose-600" />
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/expenses/${expense.id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
            <PermissionGate permission="expenses.delete" hide>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </PermissionGate>
          </div>
        }
      />

      {/* Amount Card */}
      <InfoCard
        label="Amount"
        value={<Currency amount={expense.amount} />}
        icon={Receipt}
        variant="error"
        className="max-w-sm"
      />

      <div className="grid md:grid-cols-2 gap-6">
        {/* Expense Details */}
        <DetailSection
          title="Expense Details"
          description="Category and description"
          icon={Receipt}
        >
          <InfoRow label="Category" value={expense.expense_type?.name || "N/A"} />
          <InfoRow
            label="Date"
            value={formatDate(expense.expense_date)}
            icon={Calendar}
          />
          <InfoRow
            label="Property"
            value={
              expense.property ? (
                <Link href={`/properties/${expense.property.id}`} className="text-primary hover:underline flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {expense.property.name}
                </Link>
              ) : (
                <span>All Properties</span>
              )
            }
          />
          {expense.description && (
            <InfoRow label="Description" value={expense.description} />
          )}
        </DetailSection>

        {/* Payment Information */}
        <DetailSection
          title="Payment Information"
          description="Method and vendor details"
          icon={Wallet}
        >
          <InfoRow
            label="Payment Method"
            value={paymentMethodLabels[expense.payment_method] || expense.payment_method}
          />
          {expense.vendor_name && (
            <InfoRow
              label="Vendor / Payee"
              value={expense.vendor_name}
              icon={User}
            />
          )}
          {expense.reference_number && (
            <InfoRow
              label="Reference #"
              value={expense.reference_number}
              icon={Hash}
            />
          )}
        </DetailSection>

        {/* Notes */}
        {expense.notes && (
          <DetailSection
            title="Notes"
            description="Additional information"
            icon={FileText}
            className="md:col-span-2"
          >
            <p className="text-muted-foreground whitespace-pre-wrap">{expense.notes}</p>
          </DetailSection>
        )}

        {/* Metadata */}
        <DetailSection
          title="Record Info"
          description="Creation and update timestamps"
          icon={Clock}
          className="md:col-span-2"
        >
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <span>Created: {formatDateTime(expense.created_at)}</span>
            <span>Updated: {formatDateTime(expense.updated_at)}</span>
            <span>ID: {expense.id}</span>
          </div>
        </DetailSection>
      </div>
    </div>
  )
}
