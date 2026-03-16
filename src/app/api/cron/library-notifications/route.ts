/**
 * Cron Job: Library Notifications
 *
 * Runs daily to send email notifications for:
 * 1. Low hours warning (below threshold, e.g., 2 hours)
 * 2. Renewal reminder (3 days before end_date)
 * 3. Membership expiring soon (7 days before end_date)
 * 4. Membership expired (just expired today)
 *
 * Schedule: Daily at 9 AM via Vercel cron
 */

import { baseCronHandler } from "@/lib/cron-handler"
import { cronLogger, extractErrorMeta } from "@/lib/logger"
import { transformJoin } from "@/lib/supabase/transforms"
import { SYSTEM_ACTOR_ID } from "@/lib/constants"
import { getNowISO } from "@/lib/date-helpers"
import {
  sendLibraryLowHoursWarning,
  sendLibraryRenewalReminder,
  sendLibraryExpiringMembership,
  sendLibraryExpiredMembership,
  sendMonthlyAttendanceSummary,
} from "@/lib/email"

// Configuration
// Note: Low hours threshold is no longer meaningful in per-day model.
// hours_balance resets daily to the plan's daily allowance.
// We keep the low-hours check but it now only catches members whose
// daily allowance itself is very low (e.g., 2h plans) — unlikely to trigger
// for most members. The primary notifications are now subscription-expiry based.
const LOW_HOURS_DAILY_ALLOWANCE_THRESHOLD = 2 // Warn if daily allowance <= 2h
const RENEWAL_REMINDER_DAYS = 3 // Send renewal reminder 3 days before
const EXPIRING_DAYS_BEFORE = 7 // Send expiring notification 7 days before

export const GET = (request: Request) =>
  baseCronHandler(request, {
    name: "library-notifications",
    execute: async (supabaseAdmin, today) => {
      const todayStr = today.toISOString().split("T")[0]
      const expiringDate = new Date(today)
      expiringDate.setDate(expiringDate.getDate() + EXPIRING_DAYS_BEFORE)
      const expiringDateStr = expiringDate.toISOString().split("T")[0]

      cronLogger.info("Library notifications config", {
        expiringCheckDate: expiringDateStr,
        lowHoursDailyAllowanceThreshold: LOW_HOURS_DAILY_ALLOWANCE_THRESHOLD,
      })

      const renewalReminderDate = new Date(today)
      renewalReminderDate.setDate(renewalReminderDate.getDate() + RENEWAL_REMINDER_DAYS)
      const renewalReminderDateStr = renewalReminderDate.toISOString().split("T")[0]

      const results = {
        lowHoursWarnings: 0,
        renewalReminders: 0,
        expiringNotifications: 0,
        monthlySummaries: 0,
        expiredNotifications: 0,
        errors: [] as string[],
      }

      // 1. Low Hours Warning - Active members whose daily allowance is very low
      // In the per-day model, hours_balance resets daily. Instead of checking
      // a depleting pool, we warn members whose plan gives them very few daily hours.
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
        .lte("hours_balance", LOW_HOURS_DAILY_ALLOWANCE_THRESHOLD)
        .gt("hours_balance", 0) // Don't send for 0 or negative

      if (lowHoursError) {
        cronLogger.error("Error fetching low hours members", extractErrorMeta(lowHoursError))
        results.errors.push(`Low hours query failed: ${lowHoursError.message}`)
      } else if (lowHoursMembers && lowHoursMembers.length > 0) {
        cronLogger.info("Found members with low hours", { count: lowHoursMembers.length })

        for (const member of lowHoursMembers) {
          try {
            const library = transformJoin(member.library)
            const subscription = transformJoin(member.current_subscription)

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

      // 2. Renewal Reminder (RENEWAL_REMINDER_DAYS days before expiry)
      const { data: renewalMemberships, error: renewalError } = await supabaseAdmin
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
        .eq("status", "active")
        .eq("end_date", renewalReminderDateStr)

      if (renewalError) {
        cronLogger.error("Error fetching renewal reminder memberships", extractErrorMeta(renewalError))
        results.errors.push(`Renewal reminder query failed: ${renewalError.message}`)
      } else if (renewalMemberships && renewalMemberships.length > 0) {
        cronLogger.info("Found memberships for renewal reminder", { count: renewalMemberships.length })

        for (const membership of renewalMemberships) {
          try {
            const member = transformJoin(membership.member)
            if (!member || !member.email) continue

            const library = transformJoin(member.library)
            if (!library) continue

            const result = await sendLibraryRenewalReminder({
              to: member.email,
              memberName: member.name,
              memberCode: member.member_code || undefined,
              libraryName: library.name,
              expiryDate: new Date(membership.end_date),
              daysRemaining: RENEWAL_REMINDER_DAYS,
              planName: membership.plan_name,
              hoursRemaining: membership.hours_remaining || 0,
              ownerPhone: library.phone || undefined,
            })

            if (result.success) {
              results.renewalReminders++
              cronLogger.debug("Sent renewal reminder", {
                membershipId: membership.id,
                memberName: member.name,
                expiryDate: membership.end_date,
              })
            } else {
              results.errors.push(`Renewal reminder email failed for ${member.email}: ${result.error}`)
            }
          } catch (err) {
            results.errors.push(`Error processing renewal reminder for ${membership.id}: ${String(err)}`)
          }
        }
      }

      // 3. Membership Expiring Soon (in EXPIRING_DAYS_BEFORE days)
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
            const member = transformJoin(membership.member)
            if (!member || !member.email) continue

            const library = transformJoin(member.library)
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

      // 4. Membership Expired (just expired yesterday - send notification today)
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
            const member = transformJoin(membership.member)
            if (!member || !member.email) continue

            const library = transformJoin(member.library)
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

      // 5. Monthly Attendance Summary (send on 1st of each month)
      if (today.getDate() === 1) {
        const lastMonth = new Date(today)
        lastMonth.setMonth(lastMonth.getMonth() - 1)
        const monthNames = ["January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"]
        const summaryMonth = monthNames[lastMonth.getMonth()]
        const summaryYear = lastMonth.getFullYear()

        // Calculate first and last day of previous month
        const firstDayOfMonth = new Date(summaryYear, lastMonth.getMonth(), 1).toISOString().split("T")[0]
        const lastDayOfMonth = new Date(summaryYear, lastMonth.getMonth() + 1, 0).toISOString().split("T")[0]

        // Fetch active members with email
        const { data: activeMembers, error: activeMembersError } = await supabaseAdmin
          .from("library_members")
          .select(`
            id,
            name,
            email,
            member_code,
            hours_balance,
            library:libraries(id, name, phone)
          `)
          .eq("status", "active")
          .not("email", "is", null)

        if (activeMembersError) {
          cronLogger.error("Error fetching active members for summary", extractErrorMeta(activeMembersError))
          results.errors.push(`Monthly summary query failed: ${activeMembersError.message}`)
        } else if (activeMembers && activeMembers.length > 0) {
          cronLogger.info("Sending monthly attendance summaries", { count: activeMembers.length })

          for (const member of activeMembers) {
            try {
              const library = transformJoin(member.library)
              if (!member.email || !library) continue

              // Fetch attendance records for this member in the previous month
              const { data: attendanceRecords } = await supabaseAdmin
                .from("library_attendance")
                .select("check_in_time, check_out_time, hours_used")
                .eq("member_id", member.id)
                .gte("check_in_time", `${firstDayOfMonth}T00:00:00`)
                .lte("check_in_time", `${lastDayOfMonth}T23:59:59`)

              if (!attendanceRecords || attendanceRecords.length === 0) continue

              // Calculate stats
              const uniqueDays = new Set(
                attendanceRecords.map((r: { check_in_time: string }) =>
                  r.check_in_time.split("T")[0]
                )
              )
              const totalDays = uniqueDays.size
              const totalHours = attendanceRecords.reduce(
                (sum: number, r: { hours_used: number | null }) => sum + (r.hours_used || 0),
                0
              )
              const avgHours = totalDays > 0 ? totalHours / totalDays : 0

              const result = await sendMonthlyAttendanceSummary({
                to: member.email,
                memberName: member.name,
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

              if (result.success) {
                results.monthlySummaries++
                cronLogger.debug("Sent monthly attendance summary", {
                  memberId: member.id,
                  memberName: member.name,
                  totalDays,
                  totalHours: totalHours.toFixed(1),
                })
              } else {
                results.errors.push(`Monthly summary failed for ${member.email}: ${result.error}`)
              }
            } catch (err) {
              results.errors.push(`Error processing monthly summary for ${member.id}: ${String(err)}`)
            }
          }
        }
      }

      // Log audit event for notification batch
      const totalSent = results.lowHoursWarnings + results.renewalReminders + results.expiringNotifications + results.expiredNotifications + results.monthlySummaries
      if (totalSent > 0) {
        await supabaseAdmin
          .from("audit_events")
          .insert({
            action: "library_notifications_sent",
            entity_type: "library_member",
            entity_id: null,
            actor_id: SYSTEM_ACTOR_ID,
            actor_type: "system",
            metadata: {
              low_hours_warnings: results.lowHoursWarnings,
              renewal_reminders: results.renewalReminders,
              expiring_notifications: results.expiringNotifications,
              expired_notifications: results.expiredNotifications,
              monthly_summaries: results.monthlySummaries,
              total_sent: totalSent,
              errors_count: results.errors.length,
              triggered_by: "cron",
            },
            created_at: getNowISO(),
          })
      }

      return {
        data: {
          lowHoursWarnings: results.lowHoursWarnings,
          renewalReminders: results.renewalReminders,
          expiringNotifications: results.expiringNotifications,
          expiredNotifications: results.expiredNotifications,
          monthlySummaries: results.monthlySummaries,
          totalSent,
          errors: results.errors.length > 0 ? results.errors : undefined,
        },
        message: `Sent ${results.lowHoursWarnings} low hours, ${results.renewalReminders} renewal reminders, ${results.expiringNotifications} expiring, ${results.expiredNotifications} expired, ${results.monthlySummaries} monthly summary notifications`,
      }
    },
  })
