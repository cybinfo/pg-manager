/**
 * Library Member Creation Workflow
 *
 * Orchestrates the multi-step registration of a new library member:
 * 1. Resolve library + owner context
 * 2. Generate member code
 * 3. Create entity_members record (person already exists via PersonSelector)
 * 4. Create entity_memberships record
 * 5. Back-link current_subscription_id on the member
 * 6. Send welcome email (non-blocking, feature-gated by caller)
 * 7. Convert waitlist entry if applicable
 */

import { createClient } from "@/lib/supabase/client"
import { logger } from "@/lib/logger"
import { withCreatedBy } from "@/lib/audit"
import { computeEndDate, getNowISO } from "@/lib/date-helpers"
import { calcSlotHours, serializeTimeSlots } from "@/lib/time-slots"
import type { TimeSlot } from "@/lib/time-slots"

export interface CreateLibraryMemberInput {
  entity_id: string
  // Person reference — must already exist in people table (created via PersonSelector)
  person_id: string
  person_name: string
  person_phone?: string
  person_email?: string
  // Subscription
  plan_id: string
  plan_name?: string
  plan_hours_included?: number | null
  plan_base_price?: number
  start_date: string
  duration_months: number
  amount: number
  discount: number
  time_slots: TimeSlot[]
  // Optional: waitlist conversion
  waitlist_id?: string
  // Optional: feature gate for welcome email (resolved by caller)
  send_welcome_email?: boolean
}

export interface CreateLibraryMemberResult {
  success: boolean
  memberId?: string
  membershipId?: string
  error?: string
}

export async function createLibraryMember(
  supabase: ReturnType<typeof createClient>,
  input: CreateLibraryMemberInput,
  ownerId: string
): Promise<CreateLibraryMemberResult> {
  // Resolve library context
  const { data: library } = await supabase
    .from("entities").eq("type", "library")
    .select("owner_id, code, name")
    .eq("id", input.entity_id)
    .single()

  if (!library) {
    return { success: false, error: "Library not found" }
  }

  // Resolve workspace_id for this owner
  const { data: context } = await supabase
    .from("user_contexts")
    .select("workspace_id")
    .eq("user_id", ownerId)
    .single()

  const workspaceId = context?.workspace_id ?? null

  // Generate member code — find the highest existing suffix and increment
  const libraryCode = library.code || library.name.slice(0, 3).toUpperCase()
  const { data: existingMembers } = await supabase
    .from("entity_members")
    .select("member_code")
    .eq("entity_id", input.entity_id)
    .not("member_code", "is", null)
    .order("member_code", { ascending: false })
    .limit(100)

  let maxNum = 0
  for (const m of existingMembers || []) {
    const match = m.member_code?.match(/(\d+)$/)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num > maxNum) maxNum = num
    }
  }
  const memberCode = `${libraryCode}-${String(maxNum + 1).padStart(4, "0")}`

  // Validate that total slot hours don't exceed plan hours
  const validSlots = input.time_slots.filter((s: TimeSlot) => s.start && s.end)
  if (validSlots.length > 0 && input.plan_hours_included) {
    const totalSlotHours = validSlots.reduce((sum: number, s: TimeSlot) => sum + calcSlotHours(s), 0)
    if (totalSlotHours > input.plan_hours_included) {
      return {
        success: false,
        error: `Total slot hours (${totalSlotHours.toFixed(1)}h) exceeds plan limit (${input.plan_hours_included}h/day)`,
      }
    }
  }

  const endDate = computeEndDate(input.start_date, input.duration_months)
  const finalAmount = input.amount - input.discount
  const timeSlot = serializeTimeSlots(input.time_slots)
  const memberName = input.person_name.toUpperCase()

  // Create member record — person already exists via PersonSelector
  const memberData = withCreatedBy(
    {
      owner_id: library.owner_id,
      workspace_id: workspaceId,
      entity_id: input.entity_id,
      person_id: input.person_id,
      name: memberName,
      phone: input.person_phone || null,
      email: input.person_email || null,
      member_code: memberCode,
      id_proof_type: null,
      id_proof_number: null,
      preferred_slot: null,
      notes: null,
      status: "active",
      join_date: input.start_date,
      expiry_date: endDate,
      hours_balance: input.plan_hours_included || 0,
      hours_used: 0,
    },
    ownerId
  )

  const { data: member, error: memberError } = await supabase
    .from("entity_members")
    .insert(memberData)
    .select()
    .single()

  if (memberError || !member) {
    return { success: false, error: memberError?.message || "Failed to create member" }
  }

  // Create initial membership (payment recorded separately on the subscription detail page)
  const membershipData = withCreatedBy(
    {
      owner_id: library.owner_id,
      workspace_id: workspaceId,
      member_id: member.id,
      plan_id: input.plan_id || null,
      plan_name: input.plan_name || "Custom",
      hours_included: input.plan_hours_included || null,
      amount: input.amount,
      discount_amount: input.discount,
      final_amount: finalAmount,
      time_slot: timeSlot,
      start_date: input.start_date,
      end_date: endDate,
      hours_remaining: input.plan_hours_included || null,
      hours_used: 0,
      status: "active",
      payment_id: null,
    },
    ownerId
  )

  const { data: membership, error: membershipError } = await supabase
    .from("entity_memberships")
    .insert(membershipData)
    .select()
    .single()

  if (membershipError) {
    logger.error("Error creating initial membership", { detail: membershipError })
  }

  // Back-link current_subscription_id
  if (membership) {
    await supabase
      .from("entity_members")
      .update({ current_subscription_id: membership.id })
      .eq("id", member.id)
  }

  // Send welcome email (non-blocking — caller sets send_welcome_email based on feature flag)
  if (input.send_welcome_email && input.person_email) {
    import("@/lib/email")
      .then(({ sendLibraryMemberWelcomeEmail }) => {
        sendLibraryMemberWelcomeEmail({
          to: input.person_email!,
          memberName: memberName,
          libraryName: library.name,
          memberCode: memberCode,
          planName: input.plan_name,
          hoursIncluded: input.plan_hours_included ?? undefined,
        }).catch((err: unknown) => {
          logger.warn("Failed to send library member welcome email", {
            error: err instanceof Error ? err.message : String(err),
          })
        })
      })
      .catch((err: unknown) => {
        logger.warn("Failed to load email module", {
          error: err instanceof Error ? err.message : String(err),
        })
      })
  }

  // Convert waitlist entry if applicable
  if (input.waitlist_id) {
    const { error: waitlistError } = await supabase
      .from("entity_waitlist")
      .update({
        status: "converted",
        converted_member_id: member.id,
        converted_at: getNowISO(),
        updated_at: getNowISO(),
      })
      .eq("id", input.waitlist_id)

    if (waitlistError) {
      logger.error("Error updating waitlist entry during member conversion", { detail: waitlistError })
    }
  }

  return {
    success: true,
    memberId: member.id,
    membershipId: membership?.id,
  }
}
