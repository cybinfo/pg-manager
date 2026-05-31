/**
 * Library Subscriptions Service
 *
 * DB operations for library subscription payments extracted from page handlers.
 * Pages retain form state, reset, and toast notifications.
 */

import type { createClient } from "@/lib/supabase/client"
import { withCreatedBy } from "@/lib/audit"
import { logger } from "@/lib/logger"

type SupabaseClient = ReturnType<typeof createClient>

export interface RecordLibrarySubscriptionPaymentParams {
  userId: string
  subscription: {
    id: string
    owner_id: string
    workspace_id: string
    member_id: string
  }
  amount: number
  paymentMethod: string
  paymentDate: string
  paymentReference: string | null
  notes: string | null
}

export interface RecordLibrarySubscriptionPaymentResult {
  receiptNumber: string
}

/**
 * Generates a sequential receipt number, inserts the payment record, and
 * returns the receipt number. Throws on DB error.
 */
export async function recordLibrarySubscriptionPayment(
  supabase: SupabaseClient,
  params: RecordLibrarySubscriptionPaymentParams
): Promise<RecordLibrarySubscriptionPaymentResult> {
  const {
    userId,
    subscription,
    amount,
    paymentMethod,
    paymentDate,
    paymentReference,
    notes,
  } = params

  // Generate sequential receipt number
  const { data: lastPayment } = await supabase
    .from("entity_payments")
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

  const paymentData = withCreatedBy(
    {
      owner_id: subscription.owner_id,
      workspace_id: subscription.workspace_id,
      member_id: subscription.member_id,
      membership_id: subscription.id,
      receipt_number: receiptNumber,
      payment_date: paymentDate,
      amount,
      payment_type: "subscription",
      payment_method: paymentMethod,
      payment_reference: paymentReference || null,
      notes: notes || null,
      status: "completed",
    },
    userId
  )

  const { error } = await supabase.from("entity_payments").insert(paymentData)

  if (error) {
    logger.error("recordLibrarySubscriptionPayment: error inserting payment", { detail: error })
    throw new Error(error.message)
  }

  return { receiptNumber }
}
