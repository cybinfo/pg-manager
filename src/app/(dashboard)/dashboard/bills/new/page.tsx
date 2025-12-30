"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Calculator,
  User,
  Building2,
  Calendar,
  IndianRupee
} from "lucide-react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/format"

interface Tenant {
  id: string
  name: string
  phone: string
  monthly_rent: number
  property_id: string
  property: {
    name: string
  } | null
  room: {
    room_number: string
  } | null
}

interface LineItem {
  id: string
  type: string
  description: string
  amount: number
}

interface PendingCharge {
  id: string
  amount: number
  for_period: string
  charge_type: {
    name: string
  } | null
}

export default function NewBillPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedTenant = searchParams.get("tenant")

  const [loading, setLoading] = useState(false)
  const [loadingTenants, setLoadingTenants] = useState(true)
  const [loadingCharges, setLoadingCharges] = useState(false)

  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenant, setSelectedTenant] = useState<string>("")
  const [pendingCharges, setPendingCharges] = useState<PendingCharge[]>([])

  const [formData, setFormData] = useState({
    for_month: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    bill_date: new Date().toISOString().split("T")[0],
    due_date: "",
    previous_balance: 0,
    discount_amount: 0,
    notes: "",
  })

  const [lineItems, setLineItems] = useState<LineItem[]>([])

  // Set default due date (5 days from bill date)
  useEffect(() => {
    const billDate = new Date(formData.bill_date)
    const dueDate = new Date(billDate)
    dueDate.setDate(dueDate.getDate() + 5)
    setFormData((prev) => ({
      ...prev,
      due_date: dueDate.toISOString().split("T")[0],
    }))
  }, [formData.bill_date])

  // Fetch tenants
  useEffect(() => {
    const fetchTenants = async () => {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      const { data, error } = await supabase
        .from("tenants")
        .select(`
          id,
          name,
          phone,
          monthly_rent,
          property_id,
          property:properties(name),
          room:rooms(room_number)
        `)
        .eq("owner_id", user.id)
        .eq("status", "active")
        .order("name")

      if (error) {
        console.error("Error fetching tenants:", error)
        toast.error("Failed to load tenants")
        return
      }

      const transformedTenants: Tenant[] = (data || []).map((t) => ({
        ...t,
        property: Array.isArray(t.property) ? t.property[0] : t.property,
        room: Array.isArray(t.room) ? t.room[0] : t.room,
      }))

      setTenants(transformedTenants)
      setLoadingTenants(false)

      // Pre-select tenant if provided
      if (preselectedTenant) {
        setSelectedTenant(preselectedTenant)
      }
    }

    fetchTenants()
  }, [router, preselectedTenant])

  // Fetch pending charges when tenant is selected
  useEffect(() => {
    const fetchPendingCharges = async () => {
      if (!selectedTenant) {
        setPendingCharges([])
        setLineItems([])
        return
      }

      setLoadingCharges(true)
      const supabase = createClient()

      // Get pending charges for this tenant
      const { data: charges, error } = await supabase
        .from("charges")
        .select(`
          id,
          amount,
          for_period,
          charge_type:charge_types(name)
        `)
        .eq("tenant_id", selectedTenant)
        .is("bill_id", null)
        .in("status", ["pending", "partial"])
        .order("due_date")

      if (error) {
        console.error("Error fetching charges:", error)
      }

      const transformedCharges: PendingCharge[] = (charges || []).map((c) => ({
        ...c,
        charge_type: Array.isArray(c.charge_type) ? c.charge_type[0] : c.charge_type,
      }))

      setPendingCharges(transformedCharges)

      // Auto-populate line items from pending charges
      const tenant = tenants.find((t) => t.id === selectedTenant)
      const items: LineItem[] = []

      // Add monthly rent
      if (tenant?.monthly_rent) {
        items.push({
          id: crypto.randomUUID(),
          type: "Rent",
          description: `Monthly Rent - ${formData.for_month}`,
          amount: tenant.monthly_rent,
        })
      }

      // Add pending charges
      transformedCharges.forEach((charge) => {
        items.push({
          id: charge.id,
          type: charge.charge_type?.name || "Charge",
          description: charge.for_period || "Pending charge",
          amount: Number(charge.amount),
        })
      })

      setLineItems(items)
      setLoadingCharges(false)
    }

    fetchPendingCharges()
  }, [selectedTenant, tenants, formData.for_month])

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: crypto.randomUUID(),
        type: "",
        description: "",
        amount: 0,
      },
    ])
  }

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(
      lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    )
  }

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id))
  }

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + Number(item.amount), 0)
    const total = subtotal + Number(formData.previous_balance) - Number(formData.discount_amount)
    return { subtotal, total }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedTenant) {
      toast.error("Please select a tenant")
      return
    }

    if (lineItems.length === 0) {
      toast.error("Please add at least one line item")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error("Session expired")
        router.push("/login")
        return
      }

      const tenant = tenants.find((t) => t.id === selectedTenant)
      const { subtotal, total } = calculateTotals()

      // Generate bill number
      const year = new Date(formData.bill_date).getFullYear()
      const { count } = await supabase
        .from("bills")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", user.id)

      const billNumber = `INV-${year}-${String((count || 0) + 1).padStart(4, "0")}`

      // Parse month for period
      const [monthName, yearStr] = formData.for_month.split(" ")
      const monthIndex = new Date(`${monthName} 1, ${yearStr}`).getMonth()
      const periodStart = new Date(parseInt(yearStr), monthIndex, 1)
      const periodEnd = new Date(parseInt(yearStr), monthIndex + 1, 0)

      // Create bill
      const { data: bill, error: billError } = await supabase
        .from("bills")
        .insert({
          owner_id: user.id,
          tenant_id: selectedTenant,
          property_id: tenant?.property_id,
          bill_number: billNumber,
          bill_date: formData.bill_date,
          due_date: formData.due_date,
          period_start: periodStart.toISOString().split("T")[0],
          period_end: periodEnd.toISOString().split("T")[0],
          for_month: formData.for_month,
          subtotal,
          discount_amount: Number(formData.discount_amount),
          previous_balance: Number(formData.previous_balance),
          total_amount: total,
          balance_due: total,
          status: "pending",
          line_items: lineItems.map((item) => ({
            type: item.type,
            description: item.description,
            amount: item.amount,
          })),
          notes: formData.notes || null,
          generated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (billError) {
        console.error("Error creating bill:", billError)
        throw billError
      }

      // Link pending charges to this bill
      const chargeIds = pendingCharges.map((c) => c.id)
      if (chargeIds.length > 0) {
        await supabase
          .from("charges")
          .update({ bill_id: bill.id })
          .in("id", chargeIds)
      }

      toast.success("Bill generated successfully!")
      router.push(`/dashboard/bills/${bill.id}`)
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to generate bill")
    } finally {
      setLoading(false)
    }
  }

  const { subtotal, total } = calculateTotals()

  if (loadingTenants) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/bills">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Generate Bill</h1>
          <p className="text-muted-foreground">Create a new bill for a tenant</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tenant Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Select Tenant</CardTitle>
                <CardDescription>Choose the tenant for this bill</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="w-full h-10 px-3 rounded-md border bg-background"
              required
            >
              <option value="">Select a tenant...</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name} - {tenant.property?.name} (Room {tenant.room?.room_number})
                </option>
              ))}
            </select>

            {selectedTenant && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                {(() => {
                  const tenant = tenants.find((t) => t.id === selectedTenant)
                  return tenant ? (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Property:</span>
                        <span className="ml-2 font-medium">{tenant.property?.name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Room:</span>
                        <span className="ml-2 font-medium">{tenant.room?.room_number}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Monthly Rent:</span>
                        <span className="ml-2 font-medium">{formatCurrency(tenant.monthly_rent)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Phone:</span>
                        <span className="ml-2 font-medium">{tenant.phone}</span>
                      </div>
                    </div>
                  ) : null
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bill Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Bill Details</CardTitle>
                <CardDescription>Set billing period and dates</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>For Month</Label>
                <Input
                  value={formData.for_month}
                  onChange={(e) => setFormData({ ...formData, for_month: e.target.value })}
                  placeholder="January 2024"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Bill Date</Label>
                <Input
                  type="date"
                  value={formData.bill_date}
                  onChange={(e) => setFormData({ ...formData, bill_date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Previous Balance (if any)</Label>
                <Input
                  type="number"
                  value={formData.previous_balance}
                  onChange={(e) => setFormData({ ...formData, previous_balance: parseFloat(e.target.value) || 0 })}
                  min="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Line Items</CardTitle>
                  <CardDescription>Add charges to this bill</CardDescription>
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="mr-1 h-4 w-4" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingCharges ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : lineItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No line items yet. Add items or select a tenant to auto-populate.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lineItems.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="flex-1 grid grid-cols-3 gap-3">
                      <Input
                        placeholder="Type (e.g., Rent)"
                        value={item.type}
                        onChange={(e) => updateLineItem(item.id, "type", e.target.value)}
                      />
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                      />
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={item.amount || ""}
                          onChange={(e) => updateLineItem(item.id, "amount", parseFloat(e.target.value) || 0)}
                          className="pl-7"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLineItem(item.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Totals */}
            <div className="mt-6 pt-4 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {Number(formData.previous_balance) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Previous Balance</span>
                  <span>{formatCurrency(Number(formData.previous_balance))}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">Discount</span>
                  <Input
                    type="number"
                    value={formData.discount_amount}
                    onChange={(e) => setFormData({ ...formData, discount_amount: parseFloat(e.target.value) || 0 })}
                    className="w-24 h-8"
                    min="0"
                  />
                </div>
                <span className="text-sm">-{formatCurrency(Number(formData.discount_amount))}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total Amount</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes (Optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full min-h-[80px] px-3 py-2 rounded-md border bg-background resize-none"
              placeholder="Add any notes for this bill..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href="/dashboard/bills">
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading || !selectedTenant}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generate Bill
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
