import { baseCronHandler } from "@/lib/cron-handler"
import { generateAutoBills } from "@/lib/services/cron-notifications"

export const GET = (request: Request) =>
  baseCronHandler(request, {
    name: "auto-billing",
    execute: async (supabaseAdmin, today) => {
      const { billsGenerated, ownersProcessed } = await generateAutoBills(supabaseAdmin, today)

      return {
        data: { billsGenerated, ownersProcessed },
        message: `Generated ${billsGenerated} bills for ${ownersProcessed} owners`,
      }
    },
  })
