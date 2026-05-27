/**
 * Library Member Creation Workflow
 *
 * Orchestrates the multi-step registration of a new library member:
 * 1. Resolve library + owner context
 * 2. Generate member code
 * 3. Create person record (people table — single source of truth)
 * 4. Create library_members record
 * 5. Create library_memberships record
 * 6. Back-link current_subscription_id on the member
 * 7. Update person with supplemental fields (gender, DOB, father/guardian)
 * 8. Send welcome email (non-blocking, feature-gated by caller)
 * 9. Convert waitlist entry if applicable
 */

import { createClient } from "@/lib/supabase/client"
import { logger } from "@/lib/logger"
import { withCreatedBy } from "@/lib/audit"
import { computeEndDate, getNowISO } from "@/lib/date-helpers"
import { calcSlotHours, serializeTimeSlots } from "@/lib/time-slots"
import type { TimeSlot } from "@/lib/time-slots"

export interface CreateLibraryMemberInput {
  library_id: string
  // Personal info
  name: string
  phone: string
  email: string
  photo_url: string
  gender: string
  father_name: string
  date_of_birth: string
  id_proof_type: string
  id_proof_number: string
  preferred_slot: string
  notes: string
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
    .from("libraries")
    .select("owner_id, code, name")
    .eq("id", input.library_id)
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
    .from("library_members")
    .select("member_code")
    .eq("library_id", input.library_id)
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
  const memberName = input.name.toUpperCase()

  // Create person record (central registry — non-blocking failure)
  const personData = withCreatedBy(
    {
      owner_id: library.owner_id,
      name: memberName,
      phone: input.phone || null,
      email: input.email || null,
      photo_url: input.photo_url || null,
      gender: input.gender || null,
      date_of_birth: input.date_of_birth || null,
      tags: ["library_member"],
    },
    ownerId
  )

  const { data: person, error: personError } = await supabase
    .from("people")
    .insert(personData)
    .select("id")
    .single()

  if (personError) {
    logger.error("Error creating person record for library member", { detail: personError })
    // Non-blocking — member creation continues without person_id
  }

  // Create member record
  const memberData = withCreatedBy(
    {
      owner_id: library.owner_id,
      workspace_id: workspaceId,
      library_id: input.library_id,
      person_id: person?.id || null,
      name: memberName,
      phone: input.phone,
      email: input.email || null,
      member_code: memberCode,
      id_proof_type: input.id_proof_type || null,
      id_proof_number: input.id_proof_number || null,
      preferred_slot: input.preferred_slot || null,
      notes: input.notes || null,
      status: "active",
      join_date: input.start_date,
      expiry_date: endDate,
      hours_balance: input.plan_hours_included || 0,
      hours_used: 0,
    },
    ownerId
  )

  const { data: member, error: memberError } = await supabase
    .from("library_members")
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
    .from("library_memberships")
    .insert(membershipData)
    .select()
    .single()

  if (membershipError) {
    logger.error("Error creating initial membership", { detail: membershipError })
  }

  // Back-link current_subscription_id
  if (membership) {
    await supabase
      .from("library_members")
      .update({ current_subscription_id: membership.id })
      .eq("id", member.id)
  }

  // Update person with supplemental fields
  if (person?.id) {
    const personUpdates: Record<string, unknown> = {}
    if (input.gender) personUpdates.gender = input.gender
    if (input.date_of_birth) personUpdates.date_of_birth = input.date_of_birth
    if (input.father_name) {
      personUpdates.emergency_contacts = [
        { name: input.father_name.toUpperCase(), phone: "", relation: "Father/Guardian" },
      ]
    }
    if (Object.keys(personUpdates).length > 0) {
      const { error: personUpdateError } = await supabase
        .from("people")
        .update(personUpdates)
        .eq("id", person.id)
      if (personUpdateError) {
        logger.error("Error updating person supplemental fields", { detail: personUpdateError })
      }
    }
  }

  // Send welcome email (non-blocking — caller sets send_welcome_email based on feature flag)
  if (input.send_welcome_email && input.email) {
    import("@/lib/email")
      .then(({ sendLibraryMemberWelcomeEmail }) => {
        sendLibraryMemberWelcomeEmail({
          to: input.email,
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
      .from("library_waitlist")
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
