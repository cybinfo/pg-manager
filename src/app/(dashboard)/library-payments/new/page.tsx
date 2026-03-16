/**
 * New Library Payment Page
 *
 * Form to record a payment from a library member.
 */

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useFormPage } from "@/lib/hooks/useFormPage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Combobox } from "@/components/ui/combobox"
import { Select, FormField } from "@/components/ui/form-components"
import { Label } from "@/components/ui/label"
import { ArrowLeft, CreditCard, Loader2 } from "lucide-react"
import { requiredSelect, requiredAmount, requiredDate } from "@/lib/validation"
import { Currency } from "@/components/ui/currency"
import { getTodayISO } from "@/lib/date-helpers"
import { LIBRARY_PAYMENT_METHOD_OPTIONS } from "@/lib/status"
import { PermissionGuard } from "@/components/auth"

interface Member {
  id: string
  name: string
  member_code: string | null
  hours_balance: number
  owner_id: string
  workspace_id: string
  person?: { id: string; name?: string } | null
}

export default function NewLibraryPaymentPage() {
  return (
    <PermissionGuard permission="library_payments.create">
      <NewLibraryPaymentContent />
    </PermissionGuard>
  )
}

function NewLibraryPaymentContent() {
  const [members, setMembers] = useState<Member[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  const {
    formData, setFormData,
    handleChange,
    handleSubmit,
    saving,
    searchParams,
    workspaceId,
    errors,
    validateField,
  } = useFormPage({
    table: "library_payments",
    initialData: {
      member_id: "",
      payment_date: getTodayISO(),
      amount: "",
      payment_type: "subscription",
      payment_method: "cash",
      payment_reference: "",
      notes: "",
    },
    redirectTo: "/library-payments",
    successMessage: "Payment recorded!",
    errorMessage: "Failed to record payment",
    validationSchema: {
      member_id: requiredSelect("Member"),
      amount: requiredAmount("Amount"),
      payment_date: requiredDate("Payment date"),
    },
    customSubmit: async (data, userId, supabase): Promise<string | void> => {
      if (!selectedMember) {
        throw new Error("Please select a member")
      }

      // Generate receipt number
      const { data: lastPayment } = await supabase
        .from("library_payments")
        .select("receipt_number")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      let nextNumber = 1
      if (lastPayment?.receipt_number) {
        const match = lastPayment.receipt_number.match(/LIB-(\d+)/)
        if (match) nextNumber = parseInt(match[1], 10) + 1
      }
      const receiptNumber = `LIB-${nextNumber.toString().padStart(6, "0")}`

      const { withCreatedBy } = await import("@/lib/audit")

      const paymentData = withCreatedBy({
        owner_id: selectedMember.owner_id,
        workspace_id: selectedMember.workspace_id,
        member_id: data.member_id,
        receipt_number: receiptNumber,
        payment_date: data.payment_date,
        amount: Number(data.amount),
        payment_type: data.payment_type,
        payment_method: data.payment_method,
        payment_reference: data.payment_reference || null,
        notes: data.notes || null,
        status: "completed",
      }, userId)

      const { error } = await supabase.from("library_payments").insert(paymentData)

      if (error) {
        throw new Error(error.message)
      }

      // Send receipt email (fire and forget)
      try {
        // Fetch member email from people table
        const { data: personData } = await supabase
          .from("library_members")
          .select("email, person:people(email), library:libraries(name, phone)")
          .eq("id", data.member_id)
          .single()

        const email = personData?.person?.email || personData?.email
        if (email) {
          const { sendLibraryPaymentReceiptEmail } = await import("@/lib/email")
          const displayName = selectedMember.person?.name || selectedMember.name
          const libraryName = personData?.library?.name || "Library"
          const ownerPhone = personData?.library?.phone || undefined

          sendLibraryPaymentReceiptEmail({
            to: email,
            memberName: displayName,
            libraryName,
            amount: Number(data.amount),
            paymentMethod: data.payment_method as string,
            paymentType: data.payment_type as string,
            receiptNumber,
            paymentDate: new Date(data.payment_date as string),
            ownerPhone,
          }).catch(() => {}) // non-blocking
        }
      } catch {
        // Non-blocking: email failure should not affect payment recording
      }

      // Redirect to member detail if came from there
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search)
        const preselectedMember = urlParams.get("member")
        if (preselectedMember) {
          return `/library-members/${preselectedMember}`
        }
      }
    },
  })

  const preselectedMember = searchParams.get("member")

  // Pre-fill member_id from URL param
  useEffect(() => {
    if (preselectedMember && !formData.member_id) {
      setFormData((prev) => ({ ...prev, member_id: preselectedMember }))
    }
  }, [preselectedMember, formData.member_id, setFormData])

  useEffect(() => {
    async function fetchMembers() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("library_members")
        .select("id, name, member_code, hours_balance, owner_id, workspace_id, person:people(id, name)")
        .eq("status", "active")
        .is("deleted_at", null)
        .order("name")

      if (!error && data) {
        setMembers(data)
        // If preselected, set the member
        if (preselectedMember) {
          const member = data.find((m: Member) => m.id === preselectedMember)
          if (member) setSelectedMember(member)
        }
      }
      setLoadingMembers(false)
    }

    fetchMembers()
  }, [preselectedMember])

  const handleMemberChange = (memberId: string) => {
    setFormData((prev) => ({ ...prev, member_id: memberId }))
    const member = members.find((m) => m.id === memberId)
    setSelectedMember(member || null)
  }

  const memberOptions = members.map((m) => {
    const displayName = m.person?.name || m.name
    return {
      value: m.id,
      label: m.member_code ? `${displayName} (${m.member_code})` : displayName,
    }
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={preselectedMember ? `/library-members/${preselectedMember}` : "/library-payments"}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Record Payment</h1>
          <p className="text-muted-foreground">
            Record a payment from a library member
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <CreditCard className="h-5 w-5 text-success" />
              </div>
              <div>
                <CardTitle>Payment Details</CardTitle>
                <CardDescription>
                  Enter payment information
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Member Selection */}
            <FormField label="Member" required error={errors.member_id} hint={selectedMember ? `Hours Balance: ${selectedMember.hours_balance.toFixed(1)}h` : undefined}>
              <Combobox
                options={memberOptions}
                value={formData.member_id as string}
                onValueChange={handleMemberChange}
                placeholder="Select a member..."
                searchPlaceholder="Search members..."
                emptyText="No members found"
                disabled={saving || loadingMembers || !!preselectedMember}
              />
            </FormField>

            {/* Payment Info */}
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Payment Date" htmlFor="payment_date" required error={errors.payment_date}>
                <Input
                  id="payment_date"
                  name="payment_date"
                  type="date"
                  value={formData.payment_date as string}
                  onChange={handleChange}
                  disabled={saving}
                />
              </FormField>
              <FormField label="Amount (Rs.)" htmlFor="amount" required error={errors.amount}>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  placeholder="e.g., 1000"
                  value={formData.amount as string}
                  onChange={handleChange}
                  onBlur={() => validateField("amount")}
                  disabled={saving}
                  min={1}
                  step="0.01"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_type">Payment Type</Label>
                <Select
                  value={formData.payment_type as string}
                  onChange={handleChange}
                  name="payment_type"
                  disabled={saving}
                  options={[
                    { value: "subscription", label: "Subscription" },
                    { value: "locker_rent", label: "Locker Rent" },
                    { value: "locker_deposit", label: "Locker Deposit" },
                    { value: "fine", label: "Fine" },
                    { value: "other", label: "Other" },
                  ]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select
                  value={formData.payment_method as string}
                  onChange={handleChange}
                  name="payment_method"
                  disabled={saving}
                  options={LIBRARY_PAYMENT_METHOD_OPTIONS}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_reference">Reference Number</Label>
              <Input
                id="payment_reference"
                name="payment_reference"
                placeholder="UPI ID, Cheque No., Transaction ID..."
                value={formData.payment_reference as string}
                onChange={handleChange}
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                Optional: UPI reference, cheque number, or transaction ID
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Any additional notes..."
                value={formData.notes as string}
                onChange={handleChange}
                disabled={saving}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href={preselectedMember ? `/library-members/${preselectedMember}` : "/library-payments"}>
            <Button type="button" variant="outline" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording...
              </>
            ) : (
              "Record Payment"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
