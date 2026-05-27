import { baseCronHandler } from "@/lib/cron-handler"
import { cronLogger, extractErrorMeta } from "@/lib/logger"
import { isFeatureEnabled } from "@/lib/features/checks"
import type { WorkspaceModuleConfig } from "@/lib/features"

interface ScheduledNoticesResult {
  published: number
  skipped: number
}

export const GET = (request: Request) =>
  baseCronHandler<ScheduledNoticesResult>(request, {
    name: "scheduled-notices",
    execute: async (supabaseAdmin, today) => {
      const nowISO = today.toISOString()

      const { data: dueNotices, error: queryError } = await supabaseAdmin
        .from("notices")
        .select("id, owner_id, title")
        .eq("is_published", false)
        .lte("scheduled_at", nowISO)
        .is("deleted_at", null)

      if (queryError) {
        cronLogger.error("Error fetching due scheduled notices", extractErrorMeta(queryError))
        throw new Error("Failed to fetch scheduled notices")
      }

      let published = 0
      let skipped = 0

      for (const notice of (dueNotices || [])) {
        try {
          const { data: ws } = await supabaseAdmin
            .from("workspaces")
            .select("module_config")
            .eq("owner_user_id", notice.owner_id)
            .single()

          const wsConfig = ws?.module_config as WorkspaceModuleConfig | null
          if (!isFeatureEnabled(wsConfig, "notices", "noticeScheduling")) {
            skipped++
            continue
          }

          const { error: updateError } = await supabaseAdmin
            .from("notices")
            .update({ is_published: true })
            .eq("id", notice.id)

          if (updateError) {
            cronLogger.error("Error publishing notice", { noticeId: notice.id, ...extractErrorMeta(updateError) })
          } else {
            published++
            cronLogger.debug("Published scheduled notice", { noticeId: notice.id, title: notice.title })
          }
        } catch (err) {
          cronLogger.error("Error processing notice", { noticeId: notice.id, ...extractErrorMeta(err) })
        }
      }

      return {
        data: { published, skipped },
        message: `Published ${published} scheduled notice(s), skipped ${skipped} (feature disabled)`,
      }
    },
  })
