"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Loader2,
  ArrowLeft,
  Receipt,
  Building2,
  Calendar,
  Wallet,
  FileText,
} from "lucide-react"
import { toast } from "sonner"
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

export default function NewExpensePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([])
  const [properties, setProperties] = useState<Property[]>([])

  const [formData, setFormData] = useState({
    expense_type_id: "",
    property_id: "",
    amount: "",
    expense_date: new Date().toISOString().split("T")[0],
    vendor_name: "",
    reference_number: "",
    payment_method: "cash",
    description: "",
    notes: "",
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      // Fetch expense types - create defaults if none exist
      let { data: typesData, error: typesError } = await supabase
        .from("expense_types")
        .select("id, name, code")
        .eq("is_enabled", true)
        .order("display_order")

      if (typesError) {
        console.error("Error fetching expense types:", typesError)
      }

      // If no expense types exist, create defaults
      if (!typesData || typesData.length === 0) {
        await supabase.rpc("create_default_expense_types", { p_owner_id: user.id })

        // Fetch again after creating defaults
        const { data: newTypesData } = await supabase
          .from("expense_types")
          .select("id, name, code")
          .eq("is_enabled", true)
          .order("display_order")

        typesData = newTypesData
      }

      setExpenseTypes(typesData || [])

      // Fetch properties
      const { data: propertiesData } = await supabase
        .from("properties")
        .select("id, name")
        .order("name")

      setProperties(propertiesData || [])
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("Failed to load form data")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.expense_type_id) {
      toast.error("Please select an expense category")
      return
    }

    if (!formData.amount || Number(formData.amount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    if (!formData.expense_date) {
      toast.error("Please select a date")
      return
    }

    setSubmitting(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      const { error } = await supabase.from("expenses").insert({
        owner_id: user.id,
        expense_type_id: formData.expense_type_id,
        property_id: formData.property_id || null,
        amount: Number(formData.amount),
        expense_date: formData.expense_date,
        vendor_name: formData.vendor_name || null,
        reference_number: formData.reference_number || null,
        payment_method: formData.payment_method,
        description: formData.description || null,
        notes: formData.notes || null,
      })

      if (error) {
        console.error("Error creating expense:", error)
        toast.error(`Failed to add expense: ${error.message}`)
        return
      }

      toast.success("Expense added successfully")
      router.push("/expenses")
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to add expense")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <PageLoader />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/expenses">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add Expense</h1>
          <p className="text-muted-foreground">Record a new property expense</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-100 rounded-lg">
                <Receipt className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <CardTitle>Expense Details</CardTitle>
                <CardDescription>Basic information about the expense</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="expense_type_id">Category *</Label>
                <select
                  id="expense_type_id"
                  name="expense_type_id"
                  value={formData.expense_type_id}
                  onChange={handleChange}
                  required
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="">Select category</option>
                  {expenseTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="property_id">Property</Label>
                <select
                  id="property_id"
                  name="property_id"
                  value={formData.property_id}
                  onChange={handleChange}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="">All Properties (General)</option>
                  {properties.map((prop) => (
                    <option key={prop.id} value={prop.id}>
                      {prop.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Leave empty for expenses that apply to all properties
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹) *</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expense_date">Date *</Label>
                <Input
                  id="expense_date"
                  name="expense_date"
                  type="date"
                  value={formData.expense_date}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                placeholder="Brief description of the expense"
                value={formData.description}
                onChange={handleChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Vendor & Payment */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Payment Information</CardTitle>
                <CardDescription>Vendor and payment details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vendor_name">Vendor / Payee</Label>
                <Input
                  id="vendor_name"
                  name="vendor_name"
                  placeholder="Name of vendor or payee"
                  value={formData.vendor_name}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference_number">Reference / Invoice #</Label>
                <Input
                  id="reference_number"
                  name="reference_number"
                  placeholder="Invoice or receipt number"
                  value={formData.reference_number}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method</Label>
              <select
                id="payment_method"
                name="payment_method"
                value={formData.payment_method}
                onChange={handleChange}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="card">Card</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <FileText className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <CardTitle>Additional Notes</CardTitle>
                <CardDescription>Any extra information about this expense</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <textarea
              id="notes"
              name="notes"
              placeholder="Add any additional notes here..."
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 rounded-md border border-input bg-background resize-none"
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href="/expenses">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Expense
          </Button>
        </div>
      </form>
    </div>
  )
}
