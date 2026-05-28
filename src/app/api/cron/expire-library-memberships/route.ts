import { baseCronHandler } from "@/lib/cron-handler"
import { expireLibraryMemberships } from "@/lib/services/library-notifications"

export const GET = (request: Request) =>
  baseCronHandler(request, {
    name: "expire-library-memberships",
    execute: async (supabaseAdmin, _) => {
      const { membershipsExpired, membersUpdated, waitlistNotificationsSent, errors } =
        await expireLibraryMemberships(supabaseAdmin)

      return {
        data: {
          membershipsExpired,
          membersUpdated,
          waitlistNotificationsSent,
          errors: errors.length > 0 ? errors : undefined,
        },
        message: `Expired ${membershipsExpired} memberships, updated ${membersUpdated} members, sent ${waitlistNotificationsSent} waitlist notifications`,
      }
    },
  })
