/**
 * Library Subscription Detail Page
 *
 * Shows subscription details, payment summary with balance tracking,
 * payment history, and inline payment recording with partial payment support.
 */

"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useDetailPage, LIBRARY_SUBSCRIPTION_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { softDelete } from "@/lib/audit"
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog"
import { useAuth } from "@/lib/auth"
import { createClient } from "@/lib/supabase/client"
import {
  DetailHero,
  InfoCard,
  DetailSection,
  InfoRow,
  DetailListSection,
  DetailPageTemplate,
  Button,
  Input,
  Progress,
  Textarea,
} from "@/components/ui"
import { Select, FormField } from "@/components/ui/form-components"
import { StatusBadge } from "@/components/ui/status-badge"
import { Currency } from "@/components/ui/currency"
import { PageLoading } from "@/components/ui/loading"
import { Avatar } from "@/components/ui/avatar"
import { PermissionGuard, PermissionGate, FeatureGuard } from "@/components/auth"
import {
  CreditCard,
  Phone,
  Mail,
  Calendar,
  Clock,
  Receipt,
  Plus,
  MessageCircle,
  Loader2,
  CheckCircle,
  AlertTriangle,
  User,
  IndianRupee,
  Edit,
  Trash2,
} from "lucide-react"

// ============================================
// Time Slot Helpers
// ============================================

interface TimeSlotEntry {
  start: string
  end: string
}

function formatTime12h(time: string): string {
  const [h, m] = time.split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`
}

function parseTimeSlots(raw: string | null): TimeSlotEntry[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.map((s: { start: string; end: string }) => ({
        start: s.start || "",
        end: s.end || "",
      }))
    }
  } catch (error) {
    logger.error("Failed to parse subscription data", { error: String(error) })
  }
  if (raw.includes("-")) {
    const [st, et] = raw.split("-")
    return [{ start: st.trim(), end: et.trim() }]
  }
  return []
}

function calcSlotHours(slot: TimeSlotEntry): number {
  if (!slot.start || !slot.end) return 0
  const [sh, sm] = slot.start.split(":").map(Number)
  const [eh, em] = slot.end.split(":").map(Number)
  let hours = (eh * 60 + em - sh * 60 - sm) / 60
  if (hours < 0) hours += 24
  return hours
}

function formatTimeSlotsDisplay(raw: string | null): React.ReactNode {
  const slots = parseTimeSlots(raw)
  if (slots.length === 0) return raw || "Full Day"
  if (slots.length === 1) {
    const s = slots[0]
    return `${formatTime12h(s.start)} \u2013 ${formatTime12h(s.end)} (${calcSlotHours(s).toFixed(1)}h)`
  }
  const total = slots.reduce((sum: number, s: TimeSlotEntry) => sum + calcSlotHours(s), 0)
  return (
    <span className="flex flex-col gap-0.5">
      {slots.map((s: TimeSlotEntry, i: number) => (
        <span key={i}>
          {formatTime12h(s.start)} &ndash; {formatTime12h(s.end)} ({calcSlotHours(s).toFixed(1)}h)
        </span>
      ))}
      <span className="text-xs text-muted-foreground">Total: {total.toFixed(1)}h</span>
    </span>
  )
}
import { formatDate } from "@/lib/format"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { logger } from "@/lib/logger"
import { LIBRARY_MEMBERSHIP_STATUS_CONFIG } from "@/types/library.types"
import type { LibraryMembership, LibraryPayment } from "@/types/library.types"
import { LIBRARY_PAYMENT_METHOD_OPTIONS, LIBRARY_PAYMENT_METHOD_LABELS } from "@/lib/status"
import { getTodayISO } from "@/lib/date-helpers"
import { showSuccess, showError } from "@/lib/toast-helpers"

// ============================================
// Types
// ============================================

interface SubscriptionMember {
  id: string
  name: string
  member_code: string | null
  phone: string | null
  email: string | null
  person?: {
    id: string
    name?: string
    photo_url?: string
    phone?: string
    email?: string
  } | null
}

interface SubscriptionPlan {
  id: string
  name: string
  hours_included: number | null
  base_price: number
}

interface SubscriptionRecord extends LibraryMembership {
  member?: SubscriptionMember | null
  plan?: SubscriptionPlan | null
}

// ============================================
// Helper: Payment Status
// ============================================

function getPaymentStatus(finalAmount: number, totalPaid: number) {
  if (totalPaid >= finalAmount) {
    return { label: "Fully Paid", variant: "success" as const, color: "text-success" }
  }
  if (totalPaid > 0) {
    return { label: "Partial", variant: "warning" as const, color: "text-warning" }
  }
  return { label: "Unpaid", variant: "error" as const, color: "text-destructive" }
}

// ============================================
// Helper: Duration in days
// ============================================

function getDurationDays(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

// ============================================
// Payment Form Component
// ============================================

function RecordPaymentForm({
  subscription,
  balanceDue,
  onSuccess,
}: {
  subscription: SubscriptionRecord
  balanceDue: number
  onSuccess: () => void
}) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    amount: "",
    payment_method: "cash",
    payment_date: getTodayISO(),
    payment_reference: "",
    notes: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const amount = Number(formData.amount)
    if (!amount || amount <= 0) {
      showError("Please enter a valid amount")
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const { withCreatedBy } = await import("@/lib/audit")

      // Generate receipt number
      const { data: lastPayment } = await supabase
        .from("library_payments")
        .select("receipt_number")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      let nextNumber = 1
      if (lastPayment?.receipt_number) {
        const match = lastPayment.receipt_number.match(/(?:PYMT-)?LIB-(\d+)/)
        if (match) nextNumber = parseInt(match[1], 10) + 1
      }
      const receiptNumber = `PYMT-LIB-${nextNumber.toString().padStart(6, "0")}`

      const paymentData = withCreatedBy({
        owner_id: subscription.owner_id,
        workspace_id: subscription.workspace_id,
        member_id: subscription.member_id,
        membership_id: subscription.id,
        receipt_number: receiptNumber,
        payment_date: formData.payment_date,
        amount,
        payment_type: "subscription",
        payment_method: formData.payment_method,
        payment_reference: formData.payment_reference || null,
        notes: formData.notes || null,
        status: "completed",
      }, user.id)

      const { error } = await supabase.from("library_payments").insert(paymentData)

      if (error) {
        throw new Error(error.message)
      }

      showSuccess(`Payment of Rs. ${amount} recorded successfully`)
      setFormData({
        amount: "",
        payment_method: "cash",
        payment_date: getTodayISO(),
        payment_reference: "",
        notes: "",
      })
      setIsOpen(false)
      onSuccess()
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to record payment")
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) {
    return (
      <PermissionGate permission="library_payments.create" hide>
        <Button
          onClick={() => {
            setFormData((prev) => ({
              ...prev,
              amount: balanceDue > 0 ? balanceDue.toString() : "",
            }))
            setIsOpen(true)
          }}
          size="sm"
          disabled={balanceDue <= 0}
        >
          <Plus className="mr-1 h-3 w-3" />
          Record Payment
        </Button>
      </PermissionGate>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded-lg bg-muted/30 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">Record Payment</h4>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Amount (Rs.)" htmlFor="pay-amount" required>
          <Input
            id="pay-amount"
            type="number"
            placeholder={`Max: ${balanceDue}`}
            value={formData.amount}
            onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
            disabled={saving}
            min={1}
            max={balanceDue > 0 ? balanceDue : undefined}
            step="0.01"
          />
        </FormField>
        <FormField label="Payment Date" htmlFor="pay-date" required>
          <Input
            id="pay-date"
            type="date"
            value={formData.payment_date}
            onChange={(e) => setFormData((prev) => ({ ...prev, payment_date: e.target.value }))}
            disabled={saving}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Payment Method</label>
          <Select
            value={formData.payment_method}
            onChange={(e) => setFormData((prev) => ({ ...prev, payment_method: e.target.value }))}
            name="payment_method"
            disabled={saving}
            options={LIBRARY_PAYMENT_METHOD_OPTIONS}
          />
        </div>
        <FormField label="Reference" htmlFor="pay-ref">
          <Input
            id="pay-ref"
            placeholder="UPI ID, Transaction ID..."
            value={formData.payment_reference}
            onChange={(e) => setFormData((prev) => ({ ...prev, payment_reference: e.target.value }))}
            disabled={saving}
          />
        </FormField>
      </div>

      <FormField label="Notes" htmlFor="pay-notes">
        <Textarea
          id="pay-notes"
          placeholder="Optional notes..."
          value={formData.notes}
          onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
          disabled={saving}
          rows={2}
        />
      </FormField>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} size="sm">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Recording...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Record Payment
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

// ============================================
// Page Component
// ============================================

export default function LibrarySubscriptionDetailPage() {
  return (
    <PermissionGuard permission="library_members.view">
      <LibrarySubscriptionDetailContent />
    </PermissionGuard>
  )
}

function LibrarySubscriptionDetailContent() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()

  const {
    data: subscription,
    related,
    loading,
    refetch,
  } = useDetailPage<SubscriptionRecord>({
    config: LIBRARY_SUBSCRIPTION_DETAIL_CONFIG,
    id: params.id as string,
  })

  const { backHref, backLabel } = useBackNavigation({
    defaultHref: "/library-subscriptions",
    defaultLabel: "All Subscriptions",
  })

  const { confirm: confirmDelete, ConfirmDialogElement } = useConfirmDialog()

  const handleDelete = () => {
    confirmDelete({
      title: "Delete Subscription",
      description: "Are you sure you want to delete this subscription? This action cannot be undone.",
      destructive: true,
      onConfirm: async () => {
        if (!user) return
        const { error } = await softDelete("library_memberships", params.id as string, user.id)
        if (!error) {
          showSuccess("Subscription deleted")
          router.push("/library-subscriptions")
        } else {
          showError("Failed to delete subscription")
        }
      },
    })
  }

  if (loading) {
    return <PageLoading message="Loading subscription details..." />
  }

  if (!subscription) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <h2 className="text-lg font-semibold">Not Found</h2>
        <p className="text-muted-foreground mt-1">The requested subscription could not be found.</p>
      </div>
    )
  }

  const payments = (related.payments || []) as LibraryPayment[]

  // Compute payment summary
  const totalPaid = payments
    .filter((p: LibraryPayment) => p.status === "completed")
    .reduce((sum: number, p: LibraryPayment) => sum + (p.amount || 0), 0)
  const balanceDue = Math.max(0, subscription.final_amount - totalPaid)
  const paidPercentage = subscription.final_amount > 0
    ? Math.min(100, Math.round((totalPaid / subscription.final_amount) * 100))
    : 0
  const paymentStatus = getPaymentStatus(subscription.final_amount, totalPaid)

  // Member info
  const member = subscription.member
  const displayName = member?.person?.name || member?.name || "Unknown Member"
  const photoUrl = member?.person?.photo_url
  const memberPhone = member?.person?.phone || member?.phone
  const memberEmail = member?.person?.email || member?.email

  // Subscription status
  const statusConfig = LIBRARY_MEMBERSHIP_STATUS_CONFIG[subscription.status as keyof typeof LIBRARY_MEMBERSHIP_STATUS_CONFIG]
  const durationDays = getDurationDays(subscription.start_date, subscription.end_date)

  // Check if expired
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endDate = new Date(subscription.end_date)
  endDate.setHours(0, 0, 0, 0)
  const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <DetailHero
        title={subscription.plan_name}
        subtitle={
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <Link
              href={`/library-members/${member?.id}`}
              className="flex items-center gap-2 hover:text-primary hover:underline"
            >
              <Avatar name={displayName} src={photoUrl} size="sm" />
              <span>{displayName}</span>
            </Link>
            {member?.member_code && (
              <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">{member.member_code}</span>
            )}
            {subscription.time_slot && (() => {
              const slots = parseTimeSlots(subscription.time_slot)
              const display = slots.length > 0
                ? slots.map((s: TimeSlotEntry) => `${formatTime12h(s.start)}\u2013${formatTime12h(s.end)}`).join(", ")
                : subscription.time_slot
              return (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                  {display}
                </span>
              )
            })()}
          </div>
        }
        backHref={backHref}
        backLabel={backLabel}
        breadcrumbs={[
          { label: "Subscriptions", href: "/library-subscriptions" },
          { label: subscription.plan_name || "Details" },
        ]}
        status={statusConfig?.variant || "muted"}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Actions: Call, WhatsApp, Email */}
            {memberPhone && (
              <a href={`tel:${memberPhone}`}>
                <Button variant="outline" size="icon" className="h-9 w-9" title="Call Member">
                  <Phone className="h-4 w-4" />
                </Button>
              </a>
            )}
            {memberPhone && (
              <a href={`https://wa.me/91${memberPhone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="icon" className="h-9 w-9 text-green-600 hover:text-green-700" title="WhatsApp">
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </a>
            )}
            {memberEmail && (
              <a href={`mailto:${memberEmail}`}>
                <Button variant="outline" size="icon" className="h-9 w-9" title="Email Member">
                  <Mail className="h-4 w-4" />
                </Button>
              </a>
            )}
            <Link href={`/library-members/${member?.id}`}>
              <Button variant="outline" size="sm">
                <User className="mr-2 h-4 w-4" />
                View Member
              </Button>
            </Link>
            <PermissionGate permission="library_members.edit" hide>
              <Link href={`/library-subscriptions/${subscription.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </Link>
            </PermissionGate>
            <PermissionGate permission="library_members.edit" hide>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </PermissionGate>
          </div>
        }
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard
          label="Subscription Amount"
          value={<Currency amount={subscription.final_amount} />}
          icon={IndianRupee}
          variant="default"
        />
        <InfoCard
          label="Total Paid"
          value={<Currency amount={totalPaid} />}
          icon={CheckCircle}
          variant={totalPaid > 0 ? "success" : "default"}
        />
        <InfoCard
          label="Balance Due"
          value={<Currency amount={balanceDue} />}
          icon={AlertTriangle}
          variant={balanceDue > 0 ? "error" : "success"}
        />
        <InfoCard
          label="Payments"
          value={payments.length}
          icon={Receipt}
          variant="default"
        />
      </div>

      <DetailPageTemplate layoutKey="subscription-detail" entityType="library_membership" record={subscription}>
        {/* Subscription Details */}
        <DetailSection
          title="Subscription Details"
          description="Plan and period information"
          icon={Clock}
        >
          <InfoRow label="Plan" value={subscription.plan_name} icon={CreditCard} />
          {subscription.time_slot && (
            <InfoRow label="Time Slot" value={formatTimeSlotsDisplay(subscription.time_slot)} icon={Clock} />
          )}
          {subscription.hours_included && (
            <InfoRow label="Hours/Day" value={`${subscription.hours_included}h`} icon={Clock} />
          )}
          <InfoRow label="Start Date" value={formatDate(subscription.start_date)} icon={Calendar} />
          <InfoRow label="End Date" value={
            <span className="flex items-center gap-2">
              {formatDate(subscription.end_date)}
              {subscription.status === "active" && daysRemaining >= 0 && (
                <StatusBadge
                  status={daysRemaining <= 7 ? "warning" : "success"}
                  label={`${daysRemaining}d left`}
                  size="sm"
                />
              )}
              {subscription.status === "active" && daysRemaining < 0 && (
                <StatusBadge
                  status="error"
                  label={`${Math.abs(daysRemaining)}d overdue`}
                  size="sm"
                />
              )}
            </span>
          } icon={Calendar} />
          <InfoRow label="Duration" value={`${durationDays} days`} icon={Calendar} />
          <InfoRow label="Status" value={
            <StatusBadge
              status={statusConfig?.variant || "muted"}
              label={statusConfig?.label || subscription.status}
              size="sm"
            />
          } icon={CheckCircle} />
          {subscription.hours_used > 0 && (
            <InfoRow label="Hours Used" value={`${subscription.hours_used.toFixed(1)}h`} icon={Clock} />
          )}
          {subscription.hours_remaining != null && (
            <InfoRow label="Hours Remaining" value={`${subscription.hours_remaining.toFixed(1)}h`} icon={Clock} />
          )}
        </DetailSection>

        {/* Payment Summary */}
        <DetailSection
          title="Payment Summary"
          description="Balance and payment progress"
          icon={CreditCard}
        >
          <InfoRow label="Subscription Amount" value={<Currency amount={subscription.final_amount} />} icon={IndianRupee} />
          {subscription.discount_amount > 0 && (
            <InfoRow
              label="Discount"
              value={<span className="text-success">-<Currency amount={subscription.discount_amount} /></span>}
              icon={IndianRupee}
            />
          )}
          <InfoRow
            label="Total Paid"
            value={<span className="text-success font-medium"><Currency amount={totalPaid} /></span>}
            icon={CheckCircle}
          />
          <InfoRow
            label="Balance Due"
            value={
              <span className={balanceDue > 0 ? "text-destructive font-semibold" : "text-success font-medium"}>
                <Currency amount={balanceDue} />
              </span>
            }
            icon={AlertTriangle}
          />
          <InfoRow
            label="Payment Status"
            value={
              <StatusBadge
                status={paymentStatus.variant}
                label={paymentStatus.label === "Partial"
                  ? `Partial (${paidPercentage}%)`
                  : paymentStatus.label}
                size="sm"
              />
            }
            icon={Receipt}
          />

          {/* Progress bar */}
          <div className="pt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>Payment Progress</span>
              <span>{paidPercentage}%</span>
            </div>
            <Progress value={paidPercentage} className="h-2" />
          </div>
        </DetailSection>

        {/* Payment History */}
        <DetailListSection
          title="Payment History"
          description={`${payments.length} payment(s) recorded`}
          icon={Receipt}
          items={payments}
          keyExtractor={(payment) => payment.id}
          renderItem={(payment) => (
            <Link href={`/library-payments/${payment.id}`}>
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{payment.receipt_number || "Payment"}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(payment.payment_date)} {" "}
                    {LIBRARY_PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method}
                  </p>
                  {payment.payment_reference && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ref: {payment.payment_reference}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm text-success">
                    +<Currency amount={payment.amount} />
                  </p>
                  <StatusBadge
                    status={payment.status === "completed" ? "success" : payment.status === "refunded" ? "error" : "warning"}
                    label={payment.status}
                    size="sm"
                  />
                </div>
              </div>
            </Link>
          )}
          initialLimit={10}
          viewAllHref={`/library-payments?membership=${subscription.id}`}
          viewAllMode="auto"
          emptyIcon={Receipt}
          emptyText="No payments recorded for this subscription"
          actions={
            <FeatureGuard module="subscriptions" feature="partialPayment">
              <RecordPaymentForm
                subscription={subscription}
                balanceDue={balanceDue}
                onSuccess={refetch}
              />
            </FeatureGuard>
          }
        />

        {/* Record Payment (standalone section when no payments yet) */}
        {payments.length === 0 && balanceDue > 0 && (
          <FeatureGuard module="subscriptions" feature="partialPayment">
            <DetailSection
              title="Record Payment"
              description="Record a partial or full payment for this subscription"
              icon={Plus}
            >
              <RecordPaymentForm
                subscription={subscription}
                balanceDue={balanceDue}
                onSuccess={refetch}
              />
            </DetailSection>
          </FeatureGuard>
        )}
      </DetailPageTemplate>
      {ConfirmDialogElement}
    </div>
  )
}
