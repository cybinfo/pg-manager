import { baseCronHandler } from "@/lib/cron-handler"
import { sendPaymentReminders } from "@/lib/services/cron-notifications"

export const GET = (request: Request) =>
  baseCronHandler(request, {
    name: "payment-reminders",
    execute: async (supabase, today) => {
      const results = await sendPaymentReminders(supabase, today)
      return {
        data: results,
        message: "Payment reminders processed",
      }
    },
  })
