/**
 * Cron Job: Library Notifications
 *
 * Runs daily to send email notifications for:
 * 1. Low hours warning (below threshold, e.g., 2 hours)
 * 2. Membership expiring soon (7 days before end_date)
 * 3. Membership expired (just expired today)
 *
 * Schedule: Daily at 9 AM via Vercel cron
 */

import { validateCronRequest } from "@/lib/api-middleware"
import { cronLogger, extractErrorMeta } from "@/lib/logger"
import { apiSuccess, internalError } from "@/lib/api-response"
import {
  sendLibraryLowHoursWarning,
  sendLibraryExpiringMembership,
  sendLibraryExpiredMembership,
} from "@/lib/email"

// Configuration
const LOW_HOURS_THRESHOLD = 2 // Send warning when hours_balance <= 2
const EXPIRING_DAYS_BEFORE = 7 // Send expiring notification 7 days before

export async function GET(request: Request) {
  try {
    // SECURITY: Rate limiting + cron secret validation
    const { success, response, supabase: supabaseAdmin } = await validateCronRequest(request)
    if (!success || !supabaseAdmin) return response!

    const today = new Date()
    const todayStr = today.toISOString().split("T")[0]
    const expiringDate = new Date(today)
    expiringDate.setDate(expiringDate.getDate() + EXPIRING_DAYS_BEFORE)
    const expiringDateStr = expiringDate.toISOString().split("T")[0]

    cronLogger.info("Library notifications started", {
      date: todayStr,
      expiringCheckDate: expiringDateStr,
      lowHoursThreshold: LOW_HOURS_THRESHOLD,
    })

    const results = {
      lowHoursWarnings: 0,
      expiringNotifications: 0,
      expiredNotifications: 0,
      errors: [] as string[],
    }

    // 1. Low Hours Warning - Active members with low balance
    const { data: lowHoursMembers, error: lowHoursError } = await supabaseAdmin
      .from("library_members")
      .select(`
        id,
        name,
        email,
        member_code,
        hours_balance,
        preferred_slot,
        library:libraries(id, name, phone),
        current_subscription:library_memberships(hours_included)
      `)
      .eq("status", "active")
      .not("email", "is", null)
      .lte("hours_balance", LOW_HOURS_THRESHOLD)
      .gt("hours_balance", 0) // Don't send for 0 or negative

    if (lowHoursError) {
      cronLogger.error("Error fetching low hours members", extractErrorMeta(lowHoursError))
      results.errors.push(`Low hours query failed: ${lowHoursError.message}`)
    } else if (lowHoursMembers && lowHoursMembers.length > 0) {
      cronLogger.info("Found members with low hours", { count: lowHoursMembers.length })

      for (const member of lowHoursMembers) {
        try {
          const library = Array.isArray(member.library) ? member.library[0] : member.library
          const subscription = Array.isArray(member.current_subscription)
            ? member.current_subscription[0]
            : member.current_subscription

          if (!member.email || !library) continue

          const result = await sendLibraryLowHoursWarning({
            to: member.email,
            memberName: member.name,
            memberCode: member.member_code || undefined,
            libraryName: library.name,
            hoursRemaining: member.hours_balance,
            totalHours: subscription?.hours_included || 0,
            timeSlot: member.preferred_slot || undefined,
            ownerPhone: library.phone || undefined,
          })

          if (result.success) {
            results.lowHoursWarnings++
            cronLogger.debug("Sent low hours warning", {
              memberId: member.id,
              memberName: member.name,
              hoursBalance: member.hours_balance,
            })
          } else {
            results.errors.push(`Low hours email failed for ${member.email}: ${result.error}`)
          }
        } catch (err) {
          results.errors.push(`Error processing low hours for ${member.id}: ${String(err)}`)
        }
      }
    }

    // 2. Membership Expiring Soon (in EXPIRING_DAYS_BEFORE days)
    const { data: expiringMemberships, error: expiringError } = await supabaseAdmin
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
          library:libraries(id, name, phone)
        )
      `)
      .eq("status", "active")
      .eq("end_date", expiringDateStr)

    if (expiringError) {
      cronLogger.error("Error fetching expiring memberships", extractErrorMeta(expiringError))
      results.errors.push(`Expiring query failed: ${expiringError.message}`)
    } else if (expiringMemberships && expiringMemberships.length > 0) {
      cronLogger.info("Found expiring memberships", { count: expiringMemberships.length })

      for (const membership of expiringMemberships) {
        try {
          const member = Array.isArray(membership.member) ? membership.member[0] : membership.member
          if (!member || !member.email) continue

          const library = Array.isArray(member.library) ? member.library[0] : member.library
          if (!library) continue

          const result = await sendLibraryExpiringMembership({
            to: member.email,
            memberName: member.name,
            memberCode: member.member_code || undefined,
            libraryName: library.name,
            expiryDate: new Date(membership.end_date),
            daysRemaining: EXPIRING_DAYS_BEFORE,
            planName: membership.plan_name,
            hoursRemaining: membership.hours_remaining || 0,
            timeSlot: membership.time_slot || undefined,
            ownerPhone: library.phone || undefined,
          })

          if (result.success) {
            results.expiringNotifications++
            cronLogger.debug("Sent expiring membership notification", {
              membershipId: membership.id,
              memberName: member.name,
              expiryDate: membership.end_date,
            })
          } else {
            results.errors.push(`Expiring email failed for ${member.email}: ${result.error}`)
          }
        } catch (err) {
          results.errors.push(`Error processing expiring membership ${membership.id}: ${String(err)}`)
        }
      }
    }

    // 3. Membership Expired (just expired yesterday - send notification today)
    const yesterdayStr = new Date(today.getTime() - 86400000).toISOString().split("T")[0]

    const { data: expiredMemberships, error: expiredError } = await supabaseAdmin
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
          library:libraries(id, name, phone)
        )
      `)
      .eq("status", "expired")
      .eq("end_date", yesterdayStr)

    if (expiredError) {
      cronLogger.error("Error fetching expired memberships", extractErrorMeta(expiredError))
      results.errors.push(`Expired query failed: ${expiredError.message}`)
    } else if (expiredMemberships && expiredMemberships.length > 0) {
      cronLogger.info("Found just-expired memberships", { count: expiredMemberships.length })

      for (const membership of expiredMemberships) {
        try {
          const member = Array.isArray(membership.member) ? membership.member[0] : membership.member
          if (!member || !member.email) continue

          const library = Array.isArray(member.library) ? member.library[0] : member.library
          if (!library) continue

          const result = await sendLibraryExpiredMembership({
            to: member.email,
            memberName: member.name,
            memberCode: member.member_code || undefined,
            libraryName: library.name,
            expiryDate: new Date(membership.end_date),
            planName: membership.plan_name,
            hoursRemaining: membership.hours_remaining || 0,
            ownerPhone: library.phone || undefined,
          })

          if (result.success) {
            results.expiredNotifications++
            cronLogger.debug("Sent expired membership notification", {
              membershipId: membership.id,
              memberName: member.name,
              expiryDate: membership.end_date,
            })
          } else {
            results.errors.push(`Expired email failed for ${member.email}: ${result.error}`)
          }
        } catch (err) {
          results.errors.push(`Error processing expired membership ${membership.id}: ${String(err)}`)
        }
      }
    }

    cronLogger.info("Library notifications complete", results)

    return apiSuccess(
      {
        lowHoursWarnings: results.lowHoursWarnings,
        expiringNotifications: results.expiringNotifications,
        expiredNotifications: results.expiredNotifications,
        totalSent: results.lowHoursWarnings + results.expiringNotifications + results.expiredNotifications,
        errors: results.errors.length > 0 ? results.errors : undefined,
      },
      {
        message: `Sent ${results.lowHoursWarnings} low hours, ${results.expiringNotifications} expiring, ${results.expiredNotifications} expired notifications`,
      }
    )
  } catch (error) {
    cronLogger.error("Library notifications cron error", extractErrorMeta(error))
    return internalError("Internal server error")
  }
}
