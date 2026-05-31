"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useDetailPage, LIBRARY_SUBSCRIPTION_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { softDelete } from "@/lib/audit"
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog"
import { useAuth } from "@/lib/auth"
import { createClient } from "@/lib/supabase/client"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { logger } from "@/lib/logger"
import { recordLibrarySubscriptionPayment } from "@/lib/services/library-subscriptions"
import { LIBRARY_MEMBERSHIP_STATUS_CONFIG } from "@/types/library.types"
import type { LibraryMembership, LibraryPayment } from "@/types/library.types"
import { LIBRARY_PAYMENT_METHOD_OPTIONS } from "@/lib/status"
import { getTodayISO } from "@/lib/date-helpers"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { getDurationDays } from "@/lib/time-slots"

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface SubscriptionMember {
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

export interface SubscriptionPlan {
  id: string
  name: string
  hours_included: number | null
  base_price: number
}

export interface SubscriptionRecord extends LibraryMembership {
  member?: SubscriptionMember | null
  plan?: SubscriptionPlan | null
}

export interface PaymentFormData {
  amount: string
  payment_method: string
  payment_date: string
  payment_reference: string
  notes: string
}

// ──────────────────────────────────────────────
// Payment status helper (pure — no JSX)
// ──────────────────────────────────────────────

export function getPaymentStatus(finalAmount: number, totalPaid: number) {
  if (totalPaid >= finalAmount) {
    return { label: "Fully Paid", variant: "success" as const, color: "text-success" }
  }
  if (totalPaid > 0) {
    return { label: "Partial", variant: "warning" as const, color: "text-warning" }
  }
  return { label: "Unpaid", variant: "error" as const, color: "text-destructive" }
}

// ──────────────────────────────────────────────
// Payment form hook (used by RecordPaymentForm)
// ──────────────────────────────────────────────

export function usePaymentForm({
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
  const [formData, setFormData] = useState<PaymentFormData>({
    amount: "",
    payment_method: "cash",
    payment_date: getTodayISO(),
    payment_reference: "",
    notes: "",
  })

  const openForm = () => {
    setFormData((prev) => ({
      ...prev,
      amount: balanceDue > 0 ? balanceDue.toString() : "",
    }))
    setIsOpen(true)
  }

  const closeForm = () => setIsOpen(false)

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

      await recordLibrarySubscriptionPayment(supabase, {
        userId: user.id,
        subscription: {
          id: subscription.id,
          owner_id: subscription.owner_id,
          workspace_id: subscription.workspace_id,
          member_id: subscription.member_id,
        },
        amount,
        paymentMethod: formData.payment_method,
        paymentDate: formData.payment_date,
        paymentReference: formData.payment_reference || null,
        notes: formData.notes || null,
      })

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
      logger.error("usePaymentForm: payment insert failed", { error: String(err) })
      showError(err instanceof Error ? err.message : "Failed to record payment")
    } finally {
      setSaving(false)
    }
  }

  return {
    isOpen,
    saving,
    formData,
    setFormData,
    openForm,
    closeForm,
    handleSubmit,
    paymentMethodOptions: LIBRARY_PAYMENT_METHOD_OPTIONS,
  }
}

// ──────────────────────────────────────────────
// Main detail hook
// ──────────────────────────────────────────────

export function useLibrarySubscriptionDetail() {
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
        const { error } = await softDelete("entity_memberships", params.id as string, user.id)
        if (!error) {
          showSuccess("Subscription deleted")
          router.push("/library-subscriptions")
        } else {
          showError("Failed to delete subscription")
        }
      },
    })
  }

  // Derived data (computed only when subscription is loaded)
  const payments = (related.payments || []) as LibraryPayment[]

  const totalPaid = payments
    .filter((p: LibraryPayment) => p.status === "completed")
    .reduce((sum: number, p: LibraryPayment) => sum + (p.amount || 0), 0)

  const balanceDue = subscription ? Math.max(0, subscription.final_amount - totalPaid) : 0

  const paidPercentage = subscription && subscription.final_amount > 0
    ? Math.min(100, Math.round((totalPaid / subscription.final_amount) * 100))
    : 0

  const paymentStatus = subscription
    ? getPaymentStatus(subscription.final_amount, totalPaid)
    : null

  // Member info
  const member = subscription?.member
  const displayName = member?.person?.name || member?.name || "Unknown Member"
  const photoUrl = member?.person?.photo_url
  const memberPhone = member?.person?.phone || member?.phone
  const memberEmail = member?.person?.email || member?.email

  // Subscription status
  const statusConfig = subscription
    ? LIBRARY_MEMBERSHIP_STATUS_CONFIG[subscription.status as keyof typeof LIBRARY_MEMBERSHIP_STATUS_CONFIG]
    : null

  const durationDays = subscription
    ? getDurationDays(subscription.start_date, subscription.end_date)
    : 0

  // Days remaining calculation
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endDate = subscription ? new Date(subscription.end_date) : null
  if (endDate) endDate.setHours(0, 0, 0, 0)
  const daysRemaining = endDate
    ? Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return {
    // Data
    subscription,
    payments,
    loading,
    refetch,
    // Navigation
    router,
    backHref,
    backLabel,
    params,
    // Delete
    handleDelete,
    ConfirmDialogElement,
    // Payment summary
    totalPaid,
    balanceDue,
    paidPercentage,
    paymentStatus,
    // Member info
    member,
    displayName,
    photoUrl,
    memberPhone,
    memberEmail,
    // Subscription computed
    statusConfig,
    durationDays,
    daysRemaining,
  }
}
