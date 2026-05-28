import type { SupabaseClient } from "@supabase/supabase-js"
import { withCreatedBy } from "@/lib/audit"
import { getNowISO } from "@/lib/date-helpers"
import { logger } from "@/lib/logger"

export async function grantPlatformAdmin(
  supabase: SupabaseClient,
  targetUserId: string,
  grantedByUserId: string,
  targetEmail: string | null,
  targetName: string,
  notes: string | null
): Promise<{ success: true }> {
  if (targetUserId === grantedByUserId) {
    throw new Error("You are already a platform admin")
  }

  const { data: existing, error: checkError } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", targetUserId)
    .maybeSingle()

  if (checkError) {
    logger.error("Failed to check existing platform admin", { error: String(checkError) })
    throw new Error("Failed to verify admin status")
  }

  if (existing) {
    throw new Error(`${targetName} is already a platform admin`)
  }

  const { error: insertError } = await supabase
    .from("platform_admins")
    .insert(
      withCreatedBy(
        { user_id: targetUserId, notes },
        grantedByUserId
      )
    )

  if (insertError) {
    logger.error("Failed to insert platform admin", { error: String(insertError) })
    throw new Error(insertError.message)
  }

  await supabase.from("audit_events").insert({
    entity_type: "platform_admin",
    entity_id: targetUserId,
    action: "create",
    actor_id: grantedByUserId,
    actor_type: "owner",
    workspace_id: null,
    changes: {
      after: {
        user_id: targetUserId,
        name: targetName,
        email: targetEmail,
        notes,
      },
    },
    metadata: {
      event: "platform_admin.granted",
      granted_to_name: targetName,
      granted_to_email: targetEmail,
    },
    created_at: getNowISO(),
  })

  return { success: true }
}
