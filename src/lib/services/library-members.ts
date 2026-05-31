/**
 * Library Members Service
 *
 * DB operations for library member lifecycle extracted from page handlers.
 * Pages retain form state, validation, and redirect logic.
 */

import type { createClient } from "@/lib/supabase/client"
import { withCreatedBy } from "@/lib/audit"
import { getNowISO, computeEndDate } from "@/lib/date-helpers"
import { serializeTimeSlots } from "@/lib/time-slots"
import type { TimeSlot } from "@/lib/time-slots"
import { logger } from "@/lib/logger"

type SupabaseClient = ReturnType<typeof createClient>

export interface RenewLibraryMembershipParams {
  userId: string
  member: {
    id: string
    owner_id: string
    workspace_id: string
  }
  planId: string
  planName: string
  hoursIncluded: number
  startDate: string
  durationMonths: number
  amount: number
  discount: number
  timeSlots: TimeSlot[]
}

export interface RenewLibraryMembershipResult {
  membershipId: string
}

/**
 * Creates a new membership record, updates the member's status and current
 * subscription pointer, and marks prior active memberships as upgraded.
 * Returns the new membership ID so the page can redirect to it.
 */
export async function renewLibraryMembership(
  supabase: SupabaseClient,
  params: RenewLibraryMembershipParams
): Promise<RenewLibraryMembershipResult> {
  const {
    userId,
    member,
    planId,
    planName,
    hoursIncluded,
    startDate,
    durationMonths,
    amount,
    discount,
    timeSlots,
  } = params

  const finalAmount = amount - discount
  const endDate = computeEndDate(startDate, durationMonths)
  const timeSlot = serializeTimeSlots(timeSlots)

  const membershipData = withCreatedBy(
    {
      owner_id: member.owner_id,
      workspace_id: member.workspace_id,
      member_id: member.id,
      plan_id: planId || null,
      plan_name: planName || "Custom Renewal",
      hours_included: hoursIncluded || null,
      amount,
      discount_amount: discount,
      final_amount: finalAmount,
      time_slot: timeSlot,
      start_date: startDate,
      end_date: endDate,
      hours_remaining: null,
      hours_used: 0,
      status: "active",
      payment_id: null,
    },
    userId
  )

  const { data: membership, error: membershipError } = await supabase
    .from("entity_memberships")
    .insert(membershipData)
    .select()
    .single()

  if (membershipError) {
    logger.error("renewLibraryMembership: error creating membership", { detail: membershipError })
    throw new Error(membershipError.message)
  }

  // Update member — hours_balance is the daily allowance (per-day model)
  const { error: memberUpdateError } = await supabase
    .from("entity_members")
    .update({
      hours_balance: hoursIncluded,
      current_subscription_id: membership.id,
      expiry_date: endDate,
      status: "active",
      left_date: null,
      updated_at: getNowISO(),
    })
    .eq("id", member.id)

  if (memberUpdateError) {
    logger.error("renewLibraryMembership: error updating member", { detail: memberUpdateError })
  }

  // Mark previous active memberships as upgraded
  await supabase
    .from("entity_memberships")
    .update({ status: "upgraded" })
    .eq("member_id", member.id)
    .eq("status", "active")
    .neq("id", membership.id)

  return { membershipId: membership.id }
}
