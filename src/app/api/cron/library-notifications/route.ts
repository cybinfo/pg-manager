/**
 * Cron Job: Library Notifications
 *
 * Runs daily to send email notifications for:
 * 1. Low hours warning (below threshold, e.g., 2 hours)
 * 2. Renewal reminder (3 days before end_date)
 * 3. Membership expiring soon (7 days before end_date)
 * 4. Membership expired (just expired today)
 * 5. Monthly attendance summary (1st of each month)
 * 6. Locker renewal reminders (expiring within 7 days)
 *
 * Schedule: Daily at 9 AM via Vercel cron
 */

import { baseCronHandler } from "@/lib/cron-handler"
import { cronLogger } from "@/lib/logger"
import { SYSTEM_ACTOR_ID } from "@/lib/constants"
import { getNowISO } from "@/lib/date-helpers"
import {
  sendLowHoursWarnings,
  sendRenewalReminders,
  sendExpiringMembershipAlerts,
  sendExpiredMembershipAlerts,
  sendMonthlyAttendanceSummaries,
  sendLockerRenewalReminders,
} from "@/lib/services/library-notifications"

export const GET = (request: Request) =>
  baseCronHandler(request, {
    name: "library-notifications",
    execute: async (supabaseAdmin, today) => {
      cronLogger.info("Library notifications started", {
        date: today.toISOString().split("T")[0],
      })

      const [lowHours, renewal, expiring, expired, monthly, locker] = await Promise.all([
        sendLowHoursWarnings(supabaseAdmin),
        sendRenewalReminders(supabaseAdmin, today),
        sendExpiringMembershipAlerts(supabaseAdmin, today),
        sendExpiredMembershipAlerts(supabaseAdmin, today),
        sendMonthlyAttendanceSummaries(supabaseAdmin, today),
        sendLockerRenewalReminders(supabaseAdmin, today),
      ])

      const totalSent = lowHours.sent + renewal.sent + expiring.sent + expired.sent + monthly.sent + locker.sent
      const allErrors = [...lowHours.errors, ...renewal.errors, ...expiring.errors, ...expired.errors, ...monthly.errors, ...locker.errors]

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
              low_hours_warnings: lowHours.sent,
              renewal_reminders: renewal.sent,
              expiring_notifications: expiring.sent,
              expired_notifications: expired.sent,
              monthly_summaries: monthly.sent,
              locker_renewal_reminders: locker.sent,
              total_sent: totalSent,
              errors_count: allErrors.length,
              triggered_by: "cron",
            },
            created_at: getNowISO(),
          })
      }

      return {
        data: {
          lowHoursWarnings: lowHours.sent,
          renewalReminders: renewal.sent,
          expiringNotifications: expiring.sent,
          expiredNotifications: expired.sent,
          monthlySummaries: monthly.sent,
          lockerRenewalReminders: locker.sent,
          totalSent,
          errors: allErrors.length > 0 ? allErrors : undefined,
        },
        message: `Sent ${lowHours.sent} low hours, ${renewal.sent} renewal reminders, ${expiring.sent} expiring, ${expired.sent} expired, ${monthly.sent} monthly summaries, ${locker.sent} locker renewal notifications`,
      }
    },
  })
