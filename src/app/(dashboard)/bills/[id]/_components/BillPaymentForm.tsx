"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/form-components"
import { DetailSection } from "@/components/ui"
import { CreditCard, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { withCreatedBy } from "@/lib/audit"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { getTodayISO } from "@/lib/date-helpers"
import { DatePicker } from "@/components/ui/date-picker"
import { labelsToOptions, PAYMENT_METHODS } from "@/lib/status"
import { logger } from "@/lib/logger"

const BILL_PAYMENT_METHOD_OPTIONS = labelsToOptions(PAYMENT_METHODS, [
  "cash", "upi", "bank_transfer", "cheque", "other",
])

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
  const { user } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [paymentData, setPaymentData] = useState({
    amount: "",
    payment_date: getTodayISO(),
    payment_method: "cash",
    reference_number: "",
    notes: "",
  })

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (!user) {
        showError("Session expired")
        return
      }

      const supabase = createClient()

      const amount = parseFloat(paymentData.amount)
      if (isNaN(amount) || amount <= 0) {
        showError("Please enter a valid amount")
        setSubmitting(false)
        return
      }

      const { error } = await (supabase
        .from("payments") as ReturnType<typeof supabase.from>)
        .insert(withCreatedBy({
          owner_id: user.id,
          tenant_id: tenantId,
          entity_id: propertyId,
          bill_id: billId,
          amount: amount,
          payment_date: paymentData.payment_date,
          payment_method: paymentData.payment_method,
          reference_number: paymentData.reference_number || null,
          notes: paymentData.notes || null,
        }, user.id))

      if (error) {
        logger.error("Error recording payment:", { detail: error })
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
            <DatePicker
              id="payment_date"
              value={paymentData.payment_date}
              onChange={(val) => setPaymentData({ ...paymentData, payment_date: val })}
            />
          </div>
          <div>
            <Label htmlFor="payment_method">Payment Method</Label>
            <Select
              id="payment_method"
              value={paymentData.payment_method}
              onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
              options={BILL_PAYMENT_METHOD_OPTIONS}
            />
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
