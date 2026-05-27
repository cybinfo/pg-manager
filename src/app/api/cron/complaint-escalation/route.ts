import { baseCronHandler } from "@/lib/cron-handler"
import { cronLogger, extractErrorMeta } from "@/lib/logger"
import { transformJoin } from "@/lib/supabase/transforms"
import { SYSTEM_ACTOR_ID } from "@/lib/constants"
import { getNowISO } from "@/lib/date-helpers"
import { isFeatureEnabled } from "@/lib/features/checks"
import type { WorkspaceModuleConfig } from "@/lib/features"
import { sendComplaintEscalationAlert } from "@/lib/email"
import { CONTACT } from "@/lib/constants/contact"

const ESCALATION_THRESHOLD_DAYS = 3

export const GET = (request: Request) =>
  baseCronHandler(request, {
    name: "complaint-escalation",
    execute: async (supabaseAdmin, today) => {
      const thresholdDate = new Date(today)
      thresholdDate.setDate(thresholdDate.getDate() - ESCALATION_THRESHOLD_DAYS)
      const thresholdDateStr = thresholdDate.toISOString()

      const results = {
        processed: 0,
        escalated: 0,
        errors: [] as string[],
      }

      const { data: staleComplaints, error: complaintsError } = await supabaseAdmin
        .from("complaints")
        .select(`
          id,
          title,
          priority,
          status,
          created_at,
          owner_id,
          tenant:tenants(id, name, person:people(name)),
          owner:owners(id, name, email)
        `)
        .not("status", "in", '("resolved","closed")')
        .lt("created_at", thresholdDateStr)
        .is("deleted_at", null)

      if (complaintsError) {
        cronLogger.error("Error fetching stale complaints", extractErrorMeta(complaintsError))
        throw new Error("Failed to fetch complaints")
      }

      cronLogger.info("Found stale complaints", { count: (staleComplaints || []).length })

      for (const complaint of staleComplaints || []) {
        results.processed++

        try {
          const owner = transformJoin(complaint.owner) as { id: string; name: string; email: string } | null
          if (!owner || !owner.email) continue

          const { data: ws } = await supabaseAdmin
            .from("workspaces")
            .select("module_config")
            .eq("owner_user_id", complaint.owner_id)
            .single()
          const wsConfig = ws?.module_config as WorkspaceModuleConfig | null

          if (!isFeatureEnabled(wsConfig, "complaints", "complaintEscalation")) continue

          const tenant = transformJoin(complaint.tenant) as { id: string; name: string; person?: { name: string } | null } | null
          const tenantPerson = tenant ? transformJoin((tenant as Record<string, unknown>).person) : null
          const tenantName = (tenantPerson as { name?: string } | null)?.name || tenant?.name || "Unknown"

          const createdAt = new Date(complaint.created_at)
          const daysOpen = Math.floor((today.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

          const complaintUrl = `${CONTACT.APP_URL}/complaints/${complaint.id}`

          const result = await sendComplaintEscalationAlert({
            to: owner.email,
            ownerName: owner.name,
            complaintTitle: complaint.title,
            tenantName,
            daysOpen,
            priority: complaint.priority,
            complaintUrl,
          })

          if (result.success) {
            results.escalated++
            cronLogger.debug("Sent complaint escalation alert", {
              complaintId: complaint.id,
              daysOpen,
              ownerEmail: owner.email,
            })
          } else {
            results.errors.push(`Escalation email failed for complaint ${complaint.id}: ${result.error}`)
          }
        } catch (err) {
          results.errors.push(`Error processing complaint ${complaint.id}: ${String(err)}`)
        }
      }

      if (results.escalated > 0) {
        await supabaseAdmin
          .from("audit_events")
          .insert({
            action: "complaint_escalation_alerts_sent",
            entity_type: "complaint",
            entity_id: null,
            actor_id: SYSTEM_ACTOR_ID,
            actor_type: "system",
            metadata: {
              processed: results.processed,
              escalated: results.escalated,
              errors_count: results.errors.length,
              triggered_by: "cron",
            },
            created_at: getNowISO(),
          })
      }

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
