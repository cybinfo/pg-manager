/**
 * Cron Job: Purge Soft-Deleted Records
 *
 * Runs weekly to hard-delete records that have been soft-deleted for 90+ days.
 * Required for DPDP Act compliance (C5 principle: 90-day retention).
 *
 * Schedule: Weekly on Sunday at 2 AM via Vercel cron
 */

import { baseCronHandler } from "@/lib/cron-handler"
import { cronLogger } from "@/lib/logger"
import { SOFT_DELETABLE_TABLES } from "@/lib/audit"

export const GET = (request: Request) =>
  baseCronHandler(request, {
    name: "purge-soft-deleted",
    execute: async (supabaseAdmin) => {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 90)
      const cutoffISO = cutoff.toISOString()

      let totalPurged = 0
      const errors: string[] = []

      for (const table of SOFT_DELETABLE_TABLES) {
        try {
          const { count, error } = await supabaseAdmin
            .from(table)
            .delete({ count: "exact" })
            .lt("deleted_at", cutoffISO)
            .not("deleted_at", "is", null)

          if (error) {
            errors.push(`${table}: ${error.message}`)
          } else {
            const purged = count ?? 0
            if (purged > 0) {
              cronLogger.info(`Purged ${purged} rows from ${table}`)
              totalPurged += purged
            }
          }
        } catch (err) {
          errors.push(`${table}: unexpected error`)
          cronLogger.error(`Error purging ${table}`, { error: err })
        }
      }

      cronLogger.info("Purge complete", { totalPurged, errors: errors.length })

      return {
        data: { purged: totalPurged, errors, cutoffDate: cutoffISO },
        message: `Purged ${totalPurged} soft-deleted records (90-day retention)`,
      }
    },
  })
