/**
 * Library Attendance Service
 *
 * Handles check-in logic for library members:
 * 1. Guard against duplicate active check-ins
 * 2. Detect late entry vs on-time based on time-slot JSON
 * 3. Insert the attendance record
 * 4. Update library_seats status to "occupied" when a seat is assigned
 */

import { createClient } from "@/lib/supabase/client"
import { logger } from "@/lib/logger"
import { withCreatedBy } from "@/lib/audit"
import { getNowISO } from "@/lib/date-helpers"
import { parseTimeSlots } from "@/lib/time-slots"

export interface CheckInInput {
  memberId: string
  libraryId: string
  workspaceId: string | null
  seatId: string | null
  checkInTime: string         // ISO datetime string (e.g. "2026-05-27T09:30")
  notes: string | null
  membershipId: string | null  // current_subscription_id from the member
  /** Serialized time_slot JSON stored on the member — used for late-entry detection */
  memberTimeSlot: string | null
}

export interface CheckInResult {
  success: boolean
  attendanceId?: string
  error?: string
}

export async function checkInLibraryMember(
  supabase: ReturnType<typeof createClient>,
  input: CheckInInput,
  ownerId: string
): Promise<CheckInResult> {
  if (!input.workspaceId) {
    return { success: false, error: "Workspace not found" }
  }

  // Resolve owner_user_id from workspace
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("owner_user_id")
    .eq("id", input.workspaceId)
    .single()

  if (!workspace) {
    return { success: false, error: "Workspace not found" }
  }

  // Guard against duplicate active check-in (no check_out_time means currently checked in)
  const { data: activeCheckIn } = await supabase
    .from("library_attendance")
    .select("id")
    .eq("member_id", input.memberId)
    .is("check_out_time", null)
    .is("deleted_at", null)
    .single()

  if (activeCheckIn) {
    return { success: false, error: "Member already has an active check-in. Please check out first." }
  }

  const checkInTime = new Date(input.checkInTime).toISOString()
  const attendanceDate = input.checkInTime.split("T")[0]

  // Late-entry detection — check if check-in time falls outside any assigned time slot
  let isLate = false
  let scheduledSlot: string | null = null
  if (input.memberTimeSlot) {
    const slots = parseTimeSlots(input.memberTimeSlot)
    if (slots.length > 0) {
      const checkInDate = new Date(checkInTime)
      const checkInMinutes = checkInDate.getHours() * 60 + checkInDate.getMinutes()
      const inAnySlot = slots.some((s) => {
        const [sh, sm] = s.start.split(":").map(Number)
        const [eh, em] = s.end.split(":").map(Number)
        const slotStart = sh * 60 + sm
        const slotEnd = eh * 60 + em
        return checkInMinutes >= slotStart && checkInMinutes <= slotEnd
      })
      isLate = !inAnySlot
      scheduledSlot = slots.map((s) => `${s.start}-${s.end}`).join(", ")
    }
  }

  const attendanceData = withCreatedBy(
    {
      owner_id: workspace.owner_user_id,
      workspace_id: input.workspaceId,
      member_id: input.memberId,
      membership_id: input.membershipId,
      attendance_date: attendanceDate,
      check_in_time: checkInTime,
      seat_id: input.seatId || null,
      notes: input.notes || null,
      is_late: isLate,
      scheduled_slot: scheduledSlot,
    },
    ownerId
  )

  const { data: newAttendance, error } = await supabase
    .from("library_attendance")
    .insert(attendanceData)
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // Update seat status to occupied when a specific seat was assigned
  if (input.seatId) {
    const { error: seatError } = await supabase
      .from("library_seats")
      .update({
        status: "occupied",
        current_member_id: input.memberId,
        updated_at: getNowISO(),
      })
      .eq("id", input.seatId)

    if (seatError) {
      // Non-blocking — check-in is already recorded
      logger.error("Error updating seat status after check-in", { detail: seatError })
    }
  }

  return { success: true, attendanceId: newAttendance.id }
}
