import { baseCronHandler } from "@/lib/cron-handler"
import { sendDailySummaries } from "@/lib/services/notification.service"

export const GET = (request: Request) =>
  baseCronHandler(request, {
    name: "daily-summaries",
    execute: async (supabase, today) => {
      const results = await sendDailySummaries(supabase, today)
      return {
        data: results,
        message: "Daily summaries processed",
      }
    },
  })
