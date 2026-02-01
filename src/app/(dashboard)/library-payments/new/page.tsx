/**
 * New Library Payment Page
 *
 * Form to record a payment from a library member.
 */

"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Combobox } from "@/components/ui/combobox"
import { Select } from "@/components/ui/form-components"
import { ArrowLeft, CreditCard, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { withCreatedBy } from "@/lib/audit"
import { Currency } from "@/components/ui/currency"

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
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, workspaceId } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  const preselectedMember = searchParams.get("member")

  const [formData, setFormData] = useState({
    member_id: preselectedMember || "",
    payment_date: new Date().toISOString().split("T")[0],
    amount: "",
    payment_type: "subscription",
    payment_method: "cash",
    payment_reference: "",
    notes: "",
  })

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? "" : Number(value)) : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.member_id || !formData.amount) {
      toast.error("Please fill in required fields (Member, Amount)")
      return
    }

    if (!user || !workspaceId) {
      toast.error("Session expired. Please login again.")
      router.push("/login")
      return
    }

    if (!selectedMember) {
      toast.error("Please select a member")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

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

      const paymentData = withCreatedBy({
        owner_id: selectedMember.owner_id,
        workspace_id: selectedMember.workspace_id,
        member_id: formData.member_id,
        receipt_number: receiptNumber,
        payment_date: formData.payment_date,
        amount: Number(formData.amount),
        payment_type: formData.payment_type,
        payment_method: formData.payment_method,
        payment_reference: formData.payment_reference || null,
        notes: formData.notes || null,
        status: "completed",
      }, user.id)

      const { error } = await supabase.from("library_payments").insert(paymentData)

      if (error) {
        console.error("Error creating payment:", error)
        toast.error(`Failed to record payment: ${error.message}`)
        return
      }

      toast.success(`Payment recorded! Receipt: ${receiptNumber}`)

      if (preselectedMember) {
        router.push(`/library-members/${preselectedMember}`)
      } else {
        router.push("/library-payments")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to record payment. Please try again.")
    } finally {
      setLoading(false)
    }
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
              <div className="p-2 bg-green-100 rounded-lg">
                <CreditCard className="h-5 w-5 text-green-600" />
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
            <div className="space-y-2">
              <Label>Member *</Label>
              <Combobox
                options={memberOptions}
                value={formData.member_id}
                onValueChange={handleMemberChange}
                placeholder="Select a member..."
                searchPlaceholder="Search members..."
                emptyText="No members found"
                disabled={loading || loadingMembers || !!preselectedMember}
              />
              {selectedMember && (
                <p className="text-xs text-muted-foreground">
                  Hours Balance: {selectedMember.hours_balance.toFixed(1)}h
                </p>
              )}
            </div>

            {/* Payment Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_date">Payment Date *</Label>
                <Input
                  id="payment_date"
                  name="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹) *</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  placeholder="e.g., 1000"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  min={1}
                  step="0.01"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_type">Payment Type</Label>
                <Select
                  value={formData.payment_type}
                  onChange={handleChange}
                  name="payment_type"
                  disabled={loading}
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
                  value={formData.payment_method}
                  onChange={handleChange}
                  name="payment_method"
                  disabled={loading}
                  options={[
                    { value: "cash", label: "Cash" },
                    { value: "upi", label: "UPI" },
                    { value: "card", label: "Card" },
                    { value: "bank_transfer", label: "Bank Transfer" },
                  ]}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_reference">Reference Number</Label>
              <Input
                id="payment_reference"
                name="payment_reference"
                placeholder="UPI ID, Cheque No., Transaction ID..."
                value={formData.payment_reference}
                onChange={handleChange}
                disabled={loading}
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
                value={formData.notes}
                onChange={handleChange}
                disabled={loading}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href={preselectedMember ? `/library-members/${preselectedMember}` : "/library-payments"}>
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
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
