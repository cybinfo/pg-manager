/**
 * Library Notification Service
 *
 * Six notification workflows extracted from the library-notifications cron route.
 * Each function accepts a Supabase admin client and the current Date, performs its
 * own query + email loop, and returns { sent, errors }.
 *
 * Also contains expireLibraryMemberships — the business logic extracted from the
 * expire-library-memberships cron route.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { cronLogger, extractErrorMeta } from "@/lib/logger"
import { transformJoin } from "@/lib/supabase/transforms"
import { formatDateIndian, addDays, getTodayISO, getNowISO } from "@/lib/date-helpers"
import { isFeatureEnabled } from "@/lib/features/checks"
import type { WorkspaceModuleConfig } from "@/lib/features"
import {
  sendLibraryLowHoursWarning,
  sendLibraryRenewalReminder,
  sendLibraryExpiringMembership,
  sendLibraryExpiredMembership,
  sendMonthlyAttendanceSummary,
  sendLockerRenewalReminder,
  sendWaitlistSeatAvailableEmail,
} from "@/lib/email"
import { logCronAudit } from "@/lib/cron-handler"
import {
  LOW_HOURS_DAILY_ALLOWANCE_THRESHOLD,
  RENEWAL_REMINDER_DAYS,
  EXPIRING_DAYS_BEFORE,
} from "@/lib/constants/business-rules"
import { MONTH_NAMES } from "@/lib/format"

export interface NotificationResult {
  sent: number
  errors: string[]
}

// ============================================================================
// 1. Low Hours Warning
// ============================================================================

export async function sendLowHoursWarnings(
  supabase: SupabaseClient
): Promise<NotificationResult> {
  const result: NotificationResult = { sent: 0, errors: [] }

  const { data: lowHoursMembers, error: lowHoursError } = await supabase
    .from("library_members")
    .select(`
      id,
      name,
      email,
      member_code,
      hours_balance,
      preferred_slot,
      person:people(name),
      library:libraries(id, name, phone),
      current_subscription:library_memberships(hours_included)
    `)
    .eq("status", "active")
    .not("email", "is", null)
    .lte("hours_balance", LOW_HOURS_DAILY_ALLOWANCE_THRESHOLD)
    .gt("hours_balance", 0)

  if (lowHoursError) {
    cronLogger.error("Error fetching low hours members", extractErrorMeta(lowHoursError))
    result.errors.push(`Low hours query failed: ${lowHoursError.message}`)
    return result
  }

  if (!lowHoursMembers || lowHoursMembers.length === 0) return result

  cronLogger.info("Found members with low hours", { count: lowHoursMembers.length })

  for (const member of lowHoursMembers) {
    try {
      const library = transformJoin(member.library)
      const subscription = transformJoin(member.current_subscription)
      const person = transformJoin(member.person)
      const memberName = (person?.name as string) || member.name

      if (!member.email || !library) continue

      const emailResult = await sendLibraryLowHoursWarning({
        to: member.email,
        memberName,
        memberCode: member.member_code || undefined,
        libraryName: library.name,
        hoursRemaining: member.hours_balance,
        totalHours: subscription?.hours_included || 0,
        timeSlot: member.preferred_slot || undefined,
        ownerPhone: library.phone || undefined,
      })

      if (emailResult.success) {
        result.sent++
        cronLogger.debug("Sent low hours warning", {
          memberId: member.id,
          memberName,
          hoursBalance: member.hours_balance,
        })
      } else {
        result.errors.push(`Low hours email failed for ${member.email}: ${emailResult.error}`)
      }
    } catch (err) {
      result.errors.push(`Error processing low hours for ${member.id}: ${String(err)}`)
    }
  }

  return result
}

// ============================================================================
// 2. Renewal Reminder (RENEWAL_REMINDER_DAYS before expiry)
// ============================================================================

export async function sendRenewalReminders(
  supabase: SupabaseClient,
  today: Date
): Promise<NotificationResult> {
  const result: NotificationResult = { sent: 0, errors: [] }
  const renewalReminderDateStr = addDays(today, RENEWAL_REMINDER_DAYS).toISOString().split("T")[0]

  const { data: renewalMemberships, error: renewalError } = await supabase
    .from("library_memberships")
    .select(`
      id,
      plan_name,
      end_date,
      hours_remaining,
      member:library_members!library_memberships_member_id_fkey(
        id,
        name,
        email,
        member_code,
        person:people(name),
        library:libraries(id, name, phone)
      )
    `)
    .eq("status", "active")
    .eq("end_date", renewalReminderDateStr)

  if (renewalError) {
    cronLogger.error("Error fetching renewal reminder memberships", extractErrorMeta(renewalError))
    result.errors.push(`Renewal reminder query failed: ${renewalError.message}`)
    return result
  }

  if (!renewalMemberships || renewalMemberships.length === 0) return result

  cronLogger.info("Found memberships for renewal reminder", { count: renewalMemberships.length })

  for (const membership of renewalMemberships) {
    try {
      const member = transformJoin(membership.member)
      if (!member || !member.email) continue

      const library = transformJoin(member.library)
      if (!library) continue

      const renewalPerson = transformJoin(member.person)
      const renewalMemberName = (renewalPerson?.name as string) || member.name

      // Check if renewalReminders feature is enabled for this workspace
      if (library.id) {
        const { data: libWs } = await supabase
          .from("libraries")
          .select("workspace_id")
          .eq("id", library.id)
          .single()
        if (libWs?.workspace_id) {
          const { data: ws } = await supabase
            .from("workspaces")
            .select("module_config")
            .eq("id", libWs.workspace_id)
            .single()
          const wsConfig = ws?.module_config as WorkspaceModuleConfig | null
          if (!isFeatureEnabled(wsConfig, "subscriptions", "renewalReminders")) continue
        }
      }

      const emailResult = await sendLibraryRenewalReminder({
        to: member.email,
        memberName: renewalMemberName,
        memberCode: member.member_code || undefined,
        libraryName: library.name,
        expiryDate: new Date(membership.end_date),
        daysRemaining: RENEWAL_REMINDER_DAYS,
        planName: membership.plan_name,
        hoursRemaining: membership.hours_remaining || 0,
        ownerPhone: library.phone || undefined,
      })

      if (emailResult.success) {
        result.sent++
        cronLogger.debug("Sent renewal reminder", {
          membershipId: membership.id,
          memberName: renewalMemberName,
          expiryDate: membership.end_date,
        })
      } else {
        result.errors.push(`Renewal reminder email failed for ${member.email}: ${emailResult.error}`)
      }
    } catch (err) {
      result.errors.push(`Error processing renewal reminder for ${membership.id}: ${String(err)}`)
    }
  }

  return result
}

// ============================================================================
// 3. Membership Expiring Soon (EXPIRING_DAYS_BEFORE days away)
// ============================================================================

export async function sendExpiringMembershipAlerts(
  supabase: SupabaseClient,
  today: Date
): Promise<NotificationResult> {
  const result: NotificationResult = { sent: 0, errors: [] }
  const expiringDateStr = addDays(today, EXPIRING_DAYS_BEFORE).toISOString().split("T")[0]

  const { data: expiringMemberships, error: expiringError } = await supabase
    .from("library_memberships")
    .select(`
      id,
      plan_name,
      end_date,
      hours_remaining,
      time_slot,
      member:library_members!library_memberships_member_id_fkey(
        id,
        name,
        email,
        member_code,
        person:people(name),
        library:libraries(id, name, phone)
      )
    `)
    .eq("status", "active")
    .eq("end_date", expiringDateStr)

  if (expiringError) {
    cronLogger.error("Error fetching expiring memberships", extractErrorMeta(expiringError))
    result.errors.push(`Expiring query failed: ${expiringError.message}`)
    return result
  }

  if (!expiringMemberships || expiringMemberships.length === 0) return result

  cronLogger.info("Found expiring memberships", { count: expiringMemberships.length })

  for (const membership of expiringMemberships) {
    try {
      const member = transformJoin(membership.member)
      if (!member || !member.email) continue

      const library = transformJoin(member.library)
      if (!library) continue

      const expiringPerson = transformJoin(member.person)
      const expiringMemberName = (expiringPerson?.name as string) || member.name

      const emailResult = await sendLibraryExpiringMembership({
        to: member.email,
        memberName: expiringMemberName,
        memberCode: member.member_code || undefined,
        libraryName: library.name,
        expiryDate: new Date(membership.end_date),
        daysRemaining: EXPIRING_DAYS_BEFORE,
        planName: membership.plan_name,
        hoursRemaining: membership.hours_remaining || 0,
        timeSlot: membership.time_slot || undefined,
        ownerPhone: library.phone || undefined,
      })

      if (emailResult.success) {
        result.sent++
        cronLogger.debug("Sent expiring membership notification", {
          membershipId: membership.id,
          memberName: expiringMemberName,
          expiryDate: membership.end_date,
        })
      } else {
        result.errors.push(`Expiring email failed for ${member.email}: ${emailResult.error}`)
      }
    } catch (err) {
      result.errors.push(`Error processing expiring membership ${membership.id}: ${String(err)}`)
    }
  }

  return result
}

// ============================================================================
// 4. Membership Expired (expired yesterday)
// ============================================================================

export async function sendExpiredMembershipAlerts(
  supabase: SupabaseClient,
  today: Date
): Promise<NotificationResult> {
  const result: NotificationResult = { sent: 0, errors: [] }
  const yesterdayStr = new Date(today.getTime() - 86400000).toISOString().split("T")[0]

  const { data: expiredMemberships, error: expiredError } = await supabase
    .from("library_memberships")
    .select(`
      id,
      plan_name,
      end_date,
      hours_remaining,
      member:library_members!library_memberships_member_id_fkey(
        id,
        name,
        email,
        member_code,
        person:people(name),
        library:libraries(id, name, phone)
      )
    `)
    .eq("status", "expired")
    .eq("end_date", yesterdayStr)

  if (expiredError) {
    cronLogger.error("Error fetching expired memberships", extractErrorMeta(expiredError))
    result.errors.push(`Expired query failed: ${expiredError.message}`)
    return result
  }

  if (!expiredMemberships || expiredMemberships.length === 0) return result

  cronLogger.info("Found just-expired memberships", { count: expiredMemberships.length })

  for (const membership of expiredMemberships) {
    try {
      const member = transformJoin(membership.member)
      if (!member || !member.email) continue

      const library = transformJoin(member.library)
      if (!library) continue

      const expiredPerson = transformJoin(member.person)
      const expiredMemberName = (expiredPerson?.name as string) || member.name

      const emailResult = await sendLibraryExpiredMembership({
        to: member.email,
        memberName: expiredMemberName,
        memberCode: member.member_code || undefined,
        libraryName: library.name,
        expiryDate: new Date(membership.end_date),
        planName: membership.plan_name,
        hoursRemaining: membership.hours_remaining || 0,
        ownerPhone: library.phone || undefined,
      })

      if (emailResult.success) {
        result.sent++
        cronLogger.debug("Sent expired membership notification", {
          membershipId: membership.id,
          memberName: expiredMemberName,
          expiryDate: membership.end_date,
        })
      } else {
        result.errors.push(`Expired email failed for ${member.email}: ${emailResult.error}`)
      }
    } catch (err) {
      result.errors.push(`Error processing expired membership ${membership.id}: ${String(err)}`)
    }
  }

  return result
}

// ============================================================================
// 5. Monthly Attendance Summary (runs only on 1st of each month)
// ============================================================================

export async function sendMonthlyAttendanceSummaries(
  supabase: SupabaseClient,
  today: Date
): Promise<NotificationResult> {
  const result: NotificationResult = { sent: 0, errors: [] }

  // Only run on the 1st of each month
  if (today.getDate() !== 1) return result

  const lastMonth = new Date(today)
  lastMonth.setMonth(lastMonth.getMonth() - 1)
  const summaryMonth = MONTH_NAMES[lastMonth.getMonth()]
  const summaryYear = lastMonth.getFullYear()

  const firstDayOfMonth = new Date(summaryYear, lastMonth.getMonth(), 1).toISOString().split("T")[0]
  const lastDayOfMonth = new Date(summaryYear, lastMonth.getMonth() + 1, 0).toISOString().split("T")[0]

  const { data: activeMembers, error: activeMembersError } = await supabase
    .from("library_members")
    .select(`
      id,
      name,
      email,
      member_code,
      hours_balance,
      person:people(name),
      library:libraries(id, name, phone)
    `)
    .eq("status", "active")
    .not("email", "is", null)

  if (activeMembersError) {
    cronLogger.error("Error fetching active members for summary", extractErrorMeta(activeMembersError))
    result.errors.push(`Monthly summary query failed: ${activeMembersError.message}`)
    return result
  }

  if (!activeMembers || activeMembers.length === 0) return result

  cronLogger.info("Sending monthly attendance summaries", { count: activeMembers.length })

  for (const member of activeMembers) {
    try {
      const library = transformJoin(member.library)
      const memberPerson = transformJoin(member.person)
      const memberDisplayName = (memberPerson?.name as string) || member.name
      if (!member.email || !library) continue

      const { data: attendanceRecords } = await supabase
        .from("library_attendance")
        .select("check_in_time, check_out_time, hours_used")
        .eq("member_id", member.id)
        .gte("check_in_time", `${firstDayOfMonth}T00:00:00`)
        .lte("check_in_time", `${lastDayOfMonth}T23:59:59`)

      if (!attendanceRecords || attendanceRecords.length === 0) continue

      const uniqueDays = new Set(
        attendanceRecords.map((r: { check_in_time: string }) => r.check_in_time.split("T")[0])
      )
      const totalDays = uniqueDays.size
      const totalHours = attendanceRecords.reduce(
        (sum: number, r: { hours_used: number | null }) => sum + (r.hours_used || 0),
        0
      )
      const avgHours = totalDays > 0 ? totalHours / totalDays : 0

      const emailResult = await sendMonthlyAttendanceSummary({
        to: member.email,
        memberName: memberDisplayName,
        libraryName: library.name,
        memberCode: member.member_code || undefined,
        month: summaryMonth,
        year: summaryYear,
        totalDaysAttended: totalDays,
        totalHours,
        averageHoursPerDay: avgHours,
        hoursRemaining: member.hours_balance || 0,
        ownerPhone: library.phone || undefined,
      })

      if (emailResult.success) {
        result.sent++
        cronLogger.debug("Sent monthly attendance summary", {
          memberId: member.id,
          memberName: memberDisplayName,
          totalDays,
          totalHours: totalHours.toFixed(1),
        })
      } else {
        result.errors.push(`Monthly summary failed for ${member.email}: ${emailResult.error}`)
      }
    } catch (err) {
      result.errors.push(`Error processing monthly summary for ${member.id}: ${String(err)}`)
    }
  }

  return result
}

// ============================================================================
// 6. Locker Renewal Reminders (expiring within 7 days)
// ============================================================================

export async function sendLockerRenewalReminders(
  supabase: SupabaseClient,
  today: Date
): Promise<NotificationResult> {
  const result: NotificationResult = { sent: 0, errors: [] }
  const todayStr = today.toISOString().split("T")[0]
  const lockerRenewalDateStr = addDays(today, 7).toISOString().split("T")[0]

  const { data: expiringLockers, error: lockersError } = await supabase
    .from("library_locker_assignments")
    .select(`
      id,
      end_date,
      locker:library_lockers(id, locker_number, library_id),
      member:library_members!library_locker_assignments_member_id_fkey(
        id,
        name,
        email,
        person:people(name),
        library:libraries(id, name, workspace_id)
      )
    `)
    .eq("status", "active")
    .gte("end_date", todayStr)
    .lte("end_date", lockerRenewalDateStr)

  if (lockersError) {
    cronLogger.error("Error fetching expiring lockers", extractErrorMeta(lockersError))
    result.errors.push(`Locker renewal query failed: ${lockersError.message}`)
    return result
  }

  if (!expiringLockers || expiringLockers.length === 0) return result

  cronLogger.info("Found expiring locker assignments", { count: expiringLockers.length })

  for (const assignment of expiringLockers) {
    try {
      const locker = transformJoin(assignment.locker)
      const member = transformJoin(assignment.member)
      if (!locker || !member || !member.email) continue

      const library = transformJoin(member.library)
      if (!library) continue

      const wsConfig = await (async () => {
        const { data: ws } = await supabase
          .from("workspaces")
          .select("module_config")
          .eq("id", library.workspace_id)
          .single()
        return ws?.module_config as WorkspaceModuleConfig | null
      })()

      if (!isFeatureEnabled(wsConfig, "lockers", "lockerRenewal")) continue

      const memberPerson = transformJoin(member.person)
      const memberName = (memberPerson?.name as string) || member.name

      const expiryDate = new Date(assignment.end_date)
      const daysUntil = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      const emailResult = await sendLockerRenewalReminder({
        to: member.email,
        memberName,
        libraryName: library.name,
        lockerNumber: String(locker.locker_number),
        expiryDate: formatDateIndian(expiryDate),
        daysUntilExpiry: daysUntil,
      })

      if (emailResult.success) {
        result.sent++
        cronLogger.debug("Sent locker renewal reminder", {
          assignmentId: assignment.id,
          memberName,
          daysUntil,
        })
      } else {
        result.errors.push(`Locker renewal email failed for ${member.email}: ${emailResult.error}`)
      }
    } catch (err) {
      result.errors.push(`Error processing locker renewal for ${assignment.id}: ${String(err)}`)
    }
  }

  return result
}

// ============================================================================
// 7. Expire Library Memberships (extracted from expire-library-memberships cron)
// ============================================================================

export interface ExpireMembershipsResult {
  membershipsExpired: number
  membersUpdated: number
  waitlistNotificationsSent: number
  errors: { membership_id: string; error: string }[]
}

export async function expireLibraryMemberships(
  supabase: SupabaseClient
): Promise<ExpireMembershipsResult> {
  const todayStr = getTodayISO()

  const { data: expiredMemberships, error: membershipError } = await supabase
    .from("library_memberships")
    .select(`
      id,
      member_id,
      plan_name,
      end_date,
      hours_remaining,
      member:library_members!library_memberships_member_id_fkey(
        id,
        name,
        library_id,
        current_subscription_id,
        owner_id,
        workspace_id,
        person:people(name)
      )
    `)
    .eq("status", "active")
    .lt("end_date", todayStr)

  if (membershipError) {
    cronLogger.error("Error fetching expired memberships", extractErrorMeta(membershipError))
    throw new Error("Failed to fetch memberships")
  }

  let membershipsExpired = 0
  let membersUpdated = 0
  let waitlistNotificationsSent = 0
  const errors: { membership_id: string; error: string }[] = []

  const expiredIds = (expiredMemberships || []).map((m: { id: string }) => m.id)
  const memberIdsFromExpired = (expiredMemberships || []).map((m: { member_id: string }) => m.member_id)

  const membersWithOtherActiveMap = new Map<string, string>()
  if (memberIdsFromExpired.length > 0) {
    const { data: otherActiveMemberships } = await supabase
      .from("library_memberships")
      .select("id, member_id")
      .in("member_id", memberIdsFromExpired)
      .eq("status", "active")
      .not("id", "in", `(${expiredIds.join(",")})`)

    if (otherActiveMemberships) {
      for (const m of otherActiveMemberships) {
        if (!membersWithOtherActiveMap.has(m.member_id)) {
          membersWithOtherActiveMap.set(m.member_id, m.id)
        }
      }
    }
  }

  for (const membership of expiredMemberships || []) {
    try {
      const member = transformJoin(membership.member)
      const memberPerson = member ? transformJoin(member.person) : null
      const memberDisplayName = (memberPerson?.name as string) || member?.name || "Unknown"

      const { error: updateError } = await supabase
        .from("library_memberships")
        .update({ status: "expired", updated_at: getNowISO() })
        .eq("id", membership.id)

      if (updateError) {
        throw new Error(`Failed to update membership: ${updateError.message}`)
      }

      membershipsExpired++

      cronLogger.debug("Expired membership", {
        membershipId: membership.id,
        memberName: memberDisplayName,
        endDate: membership.end_date,
        planName: membership.plan_name,
      })

      if (member && member.current_subscription_id === membership.id) {
        const otherActiveMembershipId = membersWithOtherActiveMap.get(membership.member_id)

        if (!otherActiveMembershipId) {
          const { error: memberUpdateError } = await supabase
            .from("library_members")
            .update({
              status: "expired",
              current_subscription_id: null,
              hours_balance: 0,
              expiry_date: todayStr,
              updated_at: getNowISO(),
            })
            .eq("id", membership.member_id)

          if (memberUpdateError) {
            cronLogger.warn("Failed to update member status", {
              memberId: membership.member_id,
              error: memberUpdateError.message,
            })
          } else {
            membersUpdated++
            cronLogger.info("Member expired", { memberId: membership.member_id, memberName: memberDisplayName })
          }

          if (member.workspace_id) {
            await logCronAudit(supabase, member.owner_id, {
              entityType: "library_member",
              entityId: membership.member_id,
              action: "update",
              metadata: {
                operation: "auto_expire_membership",
                membership_id: membership.id,
                plan_name: membership.plan_name,
                end_date: membership.end_date,
              },
            })
          }
        } else {
          await supabase
            .from("library_members")
            .update({ current_subscription_id: otherActiveMembershipId, updated_at: getNowISO() })
            .eq("id", membership.member_id)

          cronLogger.debug("Switched to next active membership", {
            memberId: membership.member_id,
            newMembershipId: otherActiveMembershipId,
          })
        }
      }
    } catch (err) {
      cronLogger.error("Error processing membership", { membershipId: membership.id, ...extractErrorMeta(err) })
      errors.push({
        membership_id: membership.id,
        error: err instanceof Error ? err.message : "Unknown error",
      })
    }
  }

  // Safety check: members with expired expiry_date still showing active
  const { data: staleMembers, error: staleMemberError } = await supabase
    .from("library_members")
    .select("id, name, expiry_date, owner_id, workspace_id")
    .eq("status", "active")
    .not("expiry_date", "is", null)
    .lt("expiry_date", todayStr)

  if (!staleMemberError && staleMembers && staleMembers.length > 0) {
    cronLogger.info("Found stale active members", { count: staleMembers.length })

    const staleMemberIds = staleMembers.map((m: { id: string }) => m.id)
    const { data: staleMembersWithActive } = await supabase
      .from("library_memberships")
      .select("member_id")
      .in("member_id", staleMemberIds)
      .eq("status", "active")

    const staleMembersWithActiveSet = new Set(
      staleMembersWithActive?.map((m: { member_id: string }) => m.member_id) || []
    )

    for (const member of staleMembers) {
      if (!staleMembersWithActiveSet.has(member.id)) {
        const { error: updateError } = await supabase
          .from("library_members")
          .update({
            status: "expired",
            current_subscription_id: null,
            hours_balance: 0,
            updated_at: getNowISO(),
          })
          .eq("id", member.id)

        if (!updateError) {
          membersUpdated++
          cronLogger.info("Fixed stale member status", { memberId: member.id, memberName: member.name })

          if (member.workspace_id) {
            await logCronAudit(supabase, member.owner_id, {
              entityType: "library_member",
              entityId: member.id,
              action: "update",
              metadata: { operation: "auto_expire_stale_member", expiry_date: member.expiry_date },
            })
          }
        }
      }
    }
  }

  // Notify waitlisted members when seats became available
  if (membersUpdated > 0) {
    try {
      const libraryIdsFromExpired = new Set<string>()
      for (const membership of expiredMemberships || []) {
        const member = transformJoin(membership.member)
        if (member?.library_id) libraryIdsFromExpired.add(member.library_id)
      }

      for (const libraryId of libraryIdsFromExpired) {
        const { data: libraryRecord } = await supabase
          .from("libraries")
          .select("workspace_id")
          .eq("id", libraryId)
          .single()

        if (libraryRecord?.workspace_id) {
          const { data: ws } = await supabase
            .from("workspaces")
            .select("module_config")
            .eq("id", libraryRecord.workspace_id)
            .single()
          const wsConfig = ws?.module_config as WorkspaceModuleConfig | null
          if (!isFeatureEnabled(wsConfig, "waitlist", "waitlistNotifications")) continue
        }

        const { data: waitlistEntries } = await supabase
          .from("library_waitlist")
          .select(`
            id,
            queue_position,
            person:people(id, name, email),
            library:libraries(id, name, phone)
          `)
          .eq("library_id", libraryId)
          .eq("status", "waiting")
          .is("deleted_at", null)
          .order("queue_position", { ascending: true })
          .limit(5)

        if (waitlistEntries && waitlistEntries.length > 0) {
          for (const entry of waitlistEntries) {
            const person = transformJoin(entry.person)
            const library = transformJoin(entry.library)

            if (!person?.email || !library) continue

            try {
              const emailResult = await sendWaitlistSeatAvailableEmail({
                to: person.email,
                personName: person.name,
                libraryName: library.name,
                queuePosition: entry.queue_position || 1,
                ownerPhone: library.phone || undefined,
              })

              if (emailResult.success) {
                waitlistNotificationsSent++
                cronLogger.debug("Sent waitlist seat available email", {
                  personName: person.name,
                  libraryId,
                  queuePosition: entry.queue_position,
                })
              }
            } catch (err) {
              cronLogger.warn("Failed to send waitlist email", { waitlistId: entry.id, ...extractErrorMeta(err) })
            }
          }
        }
      }
    } catch (err) {
      cronLogger.warn("Error processing waitlist notifications", extractErrorMeta(err))
    }
  }

  return { membershipsExpired, membersUpdated, waitlistNotificationsSent, errors }
}
