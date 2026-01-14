"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DetailHero,
  InfoCard,
  DetailSection,
  InfoRow,
} from "@/components/ui/detail-components"
import { StatusBadge } from "@/components/ui/status-badge"
import { Currency } from "@/components/ui/currency"
import { PageLoading } from "@/components/ui/loading"
import {
  FileText,
  Loader2,
  Calendar,
  User,
  Building2,
  IndianRupee,
  Phone,
  Mail,
  Plus,
  Send,
  Home,
  CreditCard,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, formatDate } from "@/lib/format"
import { useAuth } from "@/lib/auth"
import { PermissionGate } from "@/components/auth"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

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

const statusLabels: Record<string, string> = {
  pending: "Pending",
  partial: "Partial Payment",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
}

const statusConfig: Record<string, "warning" | "info" | "success" | "error" | "muted"> = {
  pending: "warning",
  partial: "info",
  paid: "success",
  overdue: "error",
  cancelled: "muted",
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

      const bill = billData as unknown as Bill & { tenant: Bill["tenant"] | Bill["tenant"][]; property: Bill["property"] | Bill["property"][] }
      const transformedBill: Bill = {
        ...bill,
        tenant: Array.isArray(bill.tenant) ? bill.tenant[0] : bill.tenant,
        property: Array.isArray(bill.property) ? bill.property[0] : bill.property,
        room: null,
      }

      if (transformedBill.tenant?.id) {
        const { data: tenantData } = await supabase
          .from("tenants")
          .select("room:rooms(room_number)")
          .eq("id", transformedBill.tenant.id)
          .single()

        const tenant = tenantData as unknown as { room: Bill["room"] | Bill["room"][] } | null
        if (tenant?.room) {
          transformedBill.room = Array.isArray(tenant.room) ? tenant.room[0] : tenant.room
        }
      }

      setBill(transformedBill)

      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("bill_id", billId)
        .order("payment_date", { ascending: false })

      if (!paymentsError && paymentsData) {
        setPayments(paymentsData as unknown as Payment[])
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

      const { error } = await (supabase
        .from("payments") as ReturnType<typeof supabase.from>)
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
        } as Record<string, unknown>)

      if (error) {
        console.error("Error recording payment:", error)
        toast.error("Failed to record payment")
        setSubmitting(false)
        return
      }

      toast.success("Payment recorded successfully")
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
    return <PageLoading message="Loading bill details..." />
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

  const isOverdue = new Date(bill.due_date) < new Date() && bill.balance_due > 0

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <DetailHero
        title={bill.bill_number}
        subtitle={`Bill for ${bill.for_month}`}
        backHref="/bills"
        backLabel="All Bills"
        status={bill.status === "paid" ? "active" : bill.status === "overdue" ? "inactive" : "warning"}
        avatar={
          <div className="p-3 bg-primary/10 rounded-lg">
            <FileText className="h-8 w-8 text-primary" />
          </div>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleWhatsAppShare}>
              <Send className="mr-2 h-4 w-4" />
              Share via WhatsApp
            </Button>
            {bill.status !== "paid" && (
              <Button size="sm" onClick={() => setShowPaymentForm(!showPaymentForm)}>
                <Plus className="mr-2 h-4 w-4" />
                Record Payment
              </Button>
            )}
            <PermissionGate permission="bills.delete" hide>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                disabled={submitting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </PermissionGate>
          </div>
        }
      />

      {/* Payment Form */}
      {showPaymentForm && (
        <DetailSection
          title="Record Payment"
          description="Add a new payment for this bill"
          icon={CreditCard}
        >
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
        </DetailSection>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <InfoCard
          label="Total Amount"
          value={<Currency amount={bill.total_amount} />}
          icon={IndianRupee}
          variant="default"
        />
        <InfoCard
          label="Paid"
          value={<Currency amount={bill.paid_amount} />}
          icon={IndianRupee}
          variant="success"
        />
        <InfoCard
          label="Balance Due"
          value={<Currency amount={bill.balance_due} />}
          icon={IndianRupee}
          variant={bill.balance_due > 0 ? "error" : "success"}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Bill Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Line Items */}
          <DetailSection
            title="Bill Breakdown"
            description="Itemized charges"
            icon={FileText}
          >
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
          </DetailSection>

          {/* Payment History */}
          <DetailSection
            title="Payment History"
            description="Payments received for this bill"
            icon={CreditCard}
          >
            {payments.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No payments recorded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex justify-between items-center py-3 border-b last:border-0">
                    <div>
                      <p className="font-medium text-green-600">+{formatCurrency(payment.amount)}</p>
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
          </DetailSection>

          {/* Notes */}
          {bill.notes && (
            <DetailSection
              title="Notes"
              description="Additional information"
              icon={FileText}
            >
              <p className="text-muted-foreground">{bill.notes}</p>
            </DetailSection>
          )}
        </div>

        {/* Right Column - Info */}
        <div className="space-y-6">
          {/* Bill Info */}
          <DetailSection
            title="Bill Information"
            description="Dates and status"
            icon={FileText}
          >
            <InfoRow label="Bill Number" value={bill.bill_number} />
            <InfoRow
              label="Status"
              value={
                <StatusBadge
                  status={statusConfig[bill.status] || "muted"}
                  label={statusLabels[bill.status] || bill.status}
                  size="sm"
                />
              }
            />
            <InfoRow label="Bill Date" value={formatDate(bill.bill_date)} icon={Calendar} />
            <InfoRow
              label="Due Date"
              value={
                <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                  {formatDate(bill.due_date)}
                </span>
              }
              icon={Calendar}
            />
            <InfoRow
              label="Billing Period"
              value={`${formatDate(bill.period_start)} - ${formatDate(bill.period_end)}`}
            />
          </DetailSection>

          {/* Tenant Info */}
          {bill.tenant && (
            <DetailSection
              title="Tenant Details"
              description="Billed to"
              icon={User}
            >
              <InfoRow label="Name" value={bill.tenant.name} />
              {bill.tenant.phone && (
                <InfoRow
                  label="Phone"
                  value={
                    <a href={`tel:${bill.tenant.phone}`} className="text-teal-600 hover:underline">
                      {bill.tenant.phone}
                    </a>
                  }
                  icon={Phone}
                />
              )}
              {bill.tenant.email && (
                <InfoRow
                  label="Email"
                  value={
                    <a href={`mailto:${bill.tenant.email}`} className="text-teal-600 hover:underline truncate">
                      {bill.tenant.email}
                    </a>
                  }
                  icon={Mail}
                />
              )}
              {bill.room && (
                <InfoRow label="Room" value={`Room ${bill.room.room_number}`} icon={Home} />
              )}
              <Link href={`/tenants/${bill.tenant.id}`}>
                <Button variant="outline" size="sm" className="w-full mt-3">
                  View Tenant
                </Button>
              </Link>
            </DetailSection>
          )}

          {/* Property Info */}
          {bill.property && (
            <DetailSection
              title="Property"
              description="Bill location"
              icon={Building2}
            >
              <InfoRow label="Name" value={bill.property.name} />
              {bill.property.address && (
                <InfoRow label="Address" value={bill.property.address} />
              )}
              <Link href={`/properties/${bill.property.id}`}>
                <Button variant="outline" size="sm" className="w-full mt-3">
                  View Property
                </Button>
              </Link>
            </DetailSection>
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
