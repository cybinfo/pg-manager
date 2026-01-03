"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  FileText,
  ArrowLeft,
  Loader2,
  Calendar,
  User,
  Building2,
  IndianRupee,
  Phone,
  Mail,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Download,
  Send,
  Printer,
  Home,
  CreditCard,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, formatDate } from "@/lib/format"
import { useAuth } from "@/lib/auth"
import { PageLoader } from "@/components/ui/page-loader"
import { PermissionGate } from "@/components/auth"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { StatusBadge } from "@/components/ui/status-badge"

interface LineItem {
  type: string
  description: string
  amount: number
}

interface Bill {
  id: string
  bill_number: string
  bill_date: string
  due_date: string
  period_start: string
  period_end: string
  for_month: string
  subtotal: number
  discount_amount: number
  late_fee: number
  previous_balance: number
  total_amount: number
  paid_amount: number
  balance_due: number
  status: string
  line_items: LineItem[]
  notes: string | null
  tenant: {
    id: string
    name: string
    phone: string
    email: string | null
  } | null
  property: {
    id: string
    name: string
    address: string
  } | null
  room: {
    room_number: string
  } | null
}

interface Payment {
  id: string
  amount: number
  payment_date: string
  payment_method: string
  reference_number: string | null
  notes: string | null
}

// Status labels for WhatsApp messages
const statusLabels: Record<string, string> = {
  pending: "Pending",
  partial: "Partial Payment",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
}

export default function BillDetailPage() {
  const router = useRouter()
  const params = useParams()
  const billId = params.id as string
  const { hasPermission } = useAuth()

  const [bill, setBill] = useState<Bill | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Payment form state
  const [paymentData, setPaymentData] = useState({
    amount: "",
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "cash",
    reference_number: "",
    notes: "",
  })

  useEffect(() => {
    const fetchBill = async () => {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      // Fetch bill with relations
      const { data: billData, error: billError } = await supabase
        .from("bills")
        .select(`
          *,
          tenant:tenants(id, name, phone, email),
          property:properties(id, name, address)
        `)
        .eq("id", billId)
        .eq("owner_id", user.id)
        .single()

      if (billError || !billData) {
        console.error("Error fetching bill:", billError)
        toast.error("Bill not found")
        router.push("/bills")
        return
      }

      // Transform data
      const transformedBill: Bill = {
        ...billData,
        tenant: Array.isArray(billData.tenant) ? billData.tenant[0] : billData.tenant,
        property: Array.isArray(billData.property) ? billData.property[0] : billData.property,
        room: null, // Will fetch separately if needed
      }

      // Fetch room info if tenant exists
      if (transformedBill.tenant?.id) {
        const { data: tenantData } = await supabase
          .from("tenants")
          .select("room:rooms(room_number)")
          .eq("id", transformedBill.tenant.id)
          .single()

        if (tenantData?.room) {
          transformedBill.room = Array.isArray(tenantData.room) ? tenantData.room[0] : tenantData.room
        }
      }

      setBill(transformedBill)

      // Fetch payments linked to this bill
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("bill_id", billId)
        .order("payment_date", { ascending: false })

      if (!paymentsError && paymentsData) {
        setPayments(paymentsData)
      }

      setLoading(false)
    }

    fetchBill()
  }, [router, billId])

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !bill) {
        toast.error("Session expired")
        return
      }

      const amount = parseFloat(paymentData.amount)
      if (isNaN(amount) || amount <= 0) {
        toast.error("Please enter a valid amount")
        setSubmitting(false)
        return
      }

      // Create payment linked to this bill
      const { error } = await supabase
        .from("payments")
        .insert({
          owner_id: user.id,
          tenant_id: bill.tenant?.id,
          property_id: bill.property?.id,
          bill_id: bill.id,
          amount: amount,
          payment_date: paymentData.payment_date,
          payment_method: paymentData.payment_method,
          reference_number: paymentData.reference_number || null,
          notes: paymentData.notes || null,
        })

      if (error) {
        console.error("Error recording payment:", error)
        toast.error("Failed to record payment")
        setSubmitting(false)
        return
      }

      toast.success("Payment recorded successfully")

      // Refresh the page to show updated data
      window.location.reload()
    } catch {
      toast.error("Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  const handleWhatsAppShare = () => {
    if (!bill || !bill.tenant?.phone) {
      toast.error("Tenant phone number not available")
      return
    }

    const phone = bill.tenant.phone.replace(/\D/g, "")
    const phoneWithCountry = phone.startsWith("91") ? phone : `91${phone}`

    const message = `*Bill: ${bill.bill_number}*

Dear ${bill.tenant.name},

Your bill for ${bill.for_month} has been generated.

*Bill Details:*
Property: ${bill.property?.name}
Bill Date: ${formatDate(bill.bill_date)}
Due Date: ${formatDate(bill.due_date)}

*Amount Breakdown:*
${bill.line_items.map((item) => `${item.type}: ${formatCurrency(item.amount)}`).join("\n")}
${bill.discount_amount > 0 ? `Discount: -${formatCurrency(bill.discount_amount)}` : ""}
${bill.late_fee > 0 ? `Late Fee: +${formatCurrency(bill.late_fee)}` : ""}
${bill.previous_balance > 0 ? `Previous Balance: ${formatCurrency(bill.previous_balance)}` : ""}

*Total Amount: ${formatCurrency(bill.total_amount)}*
*Paid: ${formatCurrency(bill.paid_amount)}*
*Balance Due: ${formatCurrency(bill.balance_due)}*

Status: ${statusLabels[bill.status] || bill.status}

Thank you,
ManageKar`

    const whatsappUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, "_blank")
  }

  const handleDelete = async () => {
    if (!bill) return

    setSubmitting(true)
    const supabase = createClient()

    const { error } = await supabase
      .from("bills")
      .delete()
      .eq("id", bill.id)

    if (error) {
      console.error("Delete error:", error)
      toast.error("Failed to delete bill: " + error.message)
      setSubmitting(false)
    } else {
      toast.success("Bill deleted successfully")
      router.push("/bills")
    }
  }

  if (loading) {
    return <PageLoader />
  }

  if (!bill) {
    return (
      <div className="text-center py-12">
        <p>Bill not found</p>
        <Link href="/bills">
          <Button className="mt-4">Back to Bills</Button>
        </Link>
      </div>
    )
  }

  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/bills">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{bill.bill_number}</h1>
              <StatusBadge status={bill.status as "pending" | "partial" | "paid" | "overdue"} size="lg" />
            </div>
            <p className="text-muted-foreground">Bill for {bill.for_month}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleWhatsAppShare}>
            <Send className="mr-2 h-4 w-4" />
            Share via WhatsApp
          </Button>
          {bill.status !== "paid" && (
            <Button onClick={() => setShowPaymentForm(!showPaymentForm)}>
              <Plus className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          )}
          <PermissionGate permission="bills.delete" hide>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={submitting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Payment Form */}
      {showPaymentForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Record Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder={`Max: ${bill.balance_due}`}
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="payment_date">Payment Date *</Label>
                  <Input
                    id="payment_date"
                    type="date"
                    value={paymentData.payment_date}
                    onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <select
                    id="payment_method"
                    className="w-full h-10 px-3 rounded-md border bg-background"
                    value={paymentData.payment_method}
                    onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reference_number">Reference Number</Label>
                  <Input
                    id="reference_number"
                    placeholder="Transaction ID / Cheque No."
                    value={paymentData.reference_number}
                    onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    placeholder="Any additional notes"
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Record Payment
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowPaymentForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Bill Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Amount Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{formatCurrency(bill.total_amount)}</p>
                <p className="text-sm text-muted-foreground">Total Amount</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{formatCurrency(bill.paid_amount)}</p>
                <p className="text-sm text-muted-foreground">Paid</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${bill.balance_due > 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatCurrency(bill.balance_due)}
                </p>
                <p className="text-sm text-muted-foreground">Balance Due</p>
              </CardContent>
            </Card>
          </div>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bill Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bill.line_items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{item.type}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <p className="font-semibold">{formatCurrency(item.amount)}</p>
                  </div>
                ))}

                <div className="pt-3 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatCurrency(bill.subtotal)}</span>
                  </div>
                  {bill.discount_amount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-{formatCurrency(bill.discount_amount)}</span>
                    </div>
                  )}
                  {bill.late_fee > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Late Fee</span>
                      <span>+{formatCurrency(bill.late_fee)}</span>
                    </div>
                  )}
                  {bill.previous_balance > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Previous Balance</span>
                      <span>{formatCurrency(bill.previous_balance)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>{formatCurrency(bill.total_amount)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No payments recorded yet</p>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex justify-between items-center py-3 border-b last:border-0">
                      <div>
                        <p className="font-medium">{formatCurrency(payment.amount)}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(payment.payment_date)} via {payment.payment_method}
                        </p>
                        {payment.reference_number && (
                          <p className="text-xs text-muted-foreground">Ref: {payment.reference_number}</p>
                        )}
                      </div>
                      <Link href={`/payments/${payment.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {bill.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{bill.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Info */}
        <div className="space-y-6">
          {/* Bill Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Bill Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Bill Number</p>
                <p className="font-medium">{bill.bill_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bill Date</p>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(bill.bill_date)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className={`font-medium flex items-center gap-2 ${
                  new Date(bill.due_date) < new Date() && bill.balance_due > 0 ? "text-red-600" : ""
                }`}>
                  <Calendar className="h-4 w-4" />
                  {formatDate(bill.due_date)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Billing Period</p>
                <p className="font-medium">
                  {formatDate(bill.period_start)} - {formatDate(bill.period_end)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Tenant Info */}
          {bill.tenant && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Tenant Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{bill.tenant.name}</p>
                </div>
                {bill.tenant.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {bill.tenant.phone}
                    </p>
                  </div>
                )}
                {bill.tenant.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {bill.tenant.email}
                    </p>
                  </div>
                )}
                {bill.room && (
                  <div>
                    <p className="text-sm text-muted-foreground">Room</p>
                    <p className="font-medium flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Room {bill.room.room_number}
                    </p>
                  </div>
                )}
                <Link href={`/tenants/${bill.tenant.id}`}>
                  <Button variant="outline" className="w-full">View Tenant</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Property Info */}
          {bill.property && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Property
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{bill.property.name}</p>
                </div>
                {bill.property.address && (
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{bill.property.address}</p>
                  </div>
                )}
                <Link href={`/properties/${bill.property.id}`}>
                  <Button variant="outline" className="w-full">View Property</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Bill"
        description={`Are you sure you want to delete bill "${bill.bill_number}"? This will permanently remove the bill and unlink any associated payments. This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        loading={submitting}
        onConfirm={handleDelete}
      />
    </div>
  )
}
