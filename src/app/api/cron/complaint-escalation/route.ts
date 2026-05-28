import { baseCronHandler } from "@/lib/cron-handler"
import { escalateStaleComplaints } from "@/lib/services/complaints.service"

export const GET = (request: Request) =>
  baseCronHandler(request, {
    name: "complaint-escalation",
    execute: async (supabaseAdmin, today) => {
      const results = await escalateStaleComplaints(supabaseAdmin, today)
      return {
        data: {
          processed: results.processed,
          escalated: results.escalated,
          errors: results.errors.length > 0 ? results.errors : undefined,
        },
        message: `Processed ${results.processed} stale complaints, sent ${results.escalated} escalation alerts`,
      }
    },
  })
