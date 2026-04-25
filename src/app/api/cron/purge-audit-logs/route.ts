/**
 * Cron Job: Purge Old Audit Logs
 *
 * Runs monthly to hard-delete audit_events older than 1 year.
 * Required for E3 compliance (audit logs retained 1 year then purged).
 *
 * Schedule: Monthly on the 1st at 3 AM via Vercel cron
 */

import { baseCronHandler } from "@/lib/cron-handler"
import { cronLogger } from "@/lib/logger"

export const GET = (request: Request) =>
  baseCronHandler(request, {
    name: "purge-audit-logs",
    execute: async (supabaseAdmin) => {
      const cutoff = new Date()
      cutoff.setFullYear(cutoff.getFullYear() - 1)
      const cutoffISO = cutoff.toISOString()

      const { count, error } = await supabaseAdmin
        .from("audit_events")
        .delete({ count: "exact" })
        .lt("created_at", cutoffISO)

      if (error) {
        cronLogger.error("Failed to purge audit logs", { error: error.message })
        throw new Error(error.message)
      }

      const purged = count ?? 0
      cronLogger.info("Audit log purge complete", { purged, cutoffDate: cutoffISO })

      return {
        data: { purged, cutoffDate: cutoffISO },
        message: `Purged ${purged} audit log entries older than 1 year`,
      }
    },
  })
