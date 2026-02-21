"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DetailSection } from "@/components/ui"
import { CreditCard, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { showSuccess, showError } from "@/lib/toast-helpers"

interface BillPaymentFormProps {
  billId: string
  tenantId: string | undefined
  propertyId: string | undefined
  balanceDue: number
  onClose: () => void
  onPaymentRecorded: () => void
}

export function BillPaymentForm({
  billId,
  tenantId,
  propertyId,
  balanceDue,
  onClose,
  onPaymentRecorded,
}: BillPaymentFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [paymentData, setPaymentData] = useState({
    amount: "",
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "cash",
    reference_number: "",
    notes: "",
  })

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        showError("Session expired")
        return
      }

      const amount = parseFloat(paymentData.amount)
      if (isNaN(amount) || amount <= 0) {
        showError("Please enter a valid amount")
        setSubmitting(false)
        return
      }

      const { error } = await (supabase
        .from("payments") as ReturnType<typeof supabase.from>)
        .insert({
          owner_id: user.id,
          tenant_id: tenantId,
          property_id: propertyId,
          bill_id: billId,
          amount: amount,
          payment_date: paymentData.payment_date,
          payment_method: paymentData.payment_method,
          reference_number: paymentData.reference_number || null,
          notes: paymentData.notes || null,
        } as Record<string, unknown>)

      if (error) {
        console.error("Error recording payment:", error)
        showError("Failed to record payment")
        setSubmitting(false)
        return
      }

      showSuccess("Payment recorded successfully")
      onClose()
      onPaymentRecorded()
    } catch {
      showError("Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  return (
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
              placeholder={`Max: ${balanceDue}`}
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
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </DetailSection>
  )
}
