import type { SupabaseClient } from "@supabase/supabase-js"
import { apiLogger, extractErrorMeta } from "@/lib/logger"
import { validateEmail } from "@/lib/validators"
import { getNowISO } from "@/lib/date-helpers"

export interface UpdateUserEmailParams {
  requestingUserId: string
  targetUserId: string
  newEmail: string
  tenantId?: string
}

export interface UpdateUserEmailResult {
  success: true
  loginEmailUpdated: boolean
  message: string
}

export async function updateUserEmail(
  supabaseAdmin: SupabaseClient,
  params: UpdateUserEmailParams
): Promise<UpdateUserEmailResult> {
  const { requestingUserId, targetUserId, newEmail, tenantId } = params

  const { data: platformAdmin } = await supabaseAdmin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", requestingUserId)
    .single()

  const isPlatformAdmin = !!platformAdmin

  if (!isPlatformAdmin) {
    if (!tenantId) {
      throw new Error("Only platform admins can update user emails without tenant context")
    }

    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("owner_id")
      .eq("id", tenantId)
      .single()

    if (!tenant || tenant.owner_id !== requestingUserId) {
      throw new Error("You do not have permission to update this user's email")
    }
  }

  const emailValidation = validateEmail(newEmail, { blockDisposable: true })
  if (!emailValidation.isValid) {
    throw new Error(emailValidation.error || "Invalid email format")
  }

  const { data: contexts } = await supabaseAdmin
    .from("user_contexts")
    .select("context_type")
    .eq("user_id", targetUserId)

  const hasOwnerOrStaffContext = contexts?.some(
    (c: { context_type: string }) => c.context_type === "owner" || c.context_type === "staff"
  )

  if (tenantId) {
    const { error: tenantError } = await supabaseAdmin
      .from("tenants")
      .update({ email: newEmail })
      .eq("id", tenantId)

    if (tenantError) {
      apiLogger.error("Error updating tenants email", extractErrorMeta(tenantError))
      throw new Error("Failed to update tenant email")
    }
  }

  if (hasOwnerOrStaffContext) {
    const { data: actorWorkspace } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("owner_id", requestingUserId)
      .single()

    if (actorWorkspace) {
      await supabaseAdmin.from("audit_events").insert({
        entity_type: "tenant",
        entity_id: tenantId || targetUserId,
        action: "update",
        actor_id: requestingUserId,
        actor_type: isPlatformAdmin ? "system" : "owner",
        workspace_id: actorWorkspace.id,
        metadata: {
          operation: "email_updated",
          new_email: newEmail,
          login_email_updated: false,
          reason: "user_has_owner_or_staff_context",
        },
        created_at: getNowISO(),
      })
    }

    return {
      success: true,
      loginEmailUpdated: false,
      message: "Tenant record email updated. Login email unchanged (user has owner/staff access).",
    }
  }

  const { data: oldProfile } = await supabaseAdmin
    .from("user_profiles")
    .select("email")
    .eq("user_id", targetUserId)
    .single()

  const oldEmail = oldProfile?.email

  const { data: existingUser } = await supabaseAdmin
    .from("user_profiles")
    .select("user_id")
    .eq("email", newEmail)
    .neq("user_id", targetUserId)
    .single()

  if (existingUser) {
    throw Object.assign(new Error("Email is already in use by another account"), { code: "CONFLICT" })
  }

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
    targetUserId,
    { email: newEmail }
  )

  if (authError) {
    apiLogger.error("Error updating auth.users email", extractErrorMeta(authError))
    throw new Error(`Failed to update auth email: ${authError.message}`)
  }

  const { error: profileError } = await supabaseAdmin
    .from("user_profiles")
    .update({ email: newEmail })
    .eq("user_id", targetUserId)

  if (profileError) {
    apiLogger.error("Error updating user_profiles email", extractErrorMeta(profileError))
  }

  const { data: actorWs } = await supabaseAdmin
    .from("workspaces")
    .select("id")
    .eq("owner_id", requestingUserId)
    .single()

  if (actorWs) {
    await supabaseAdmin.from("audit_events").insert({
      entity_type: "tenant",
      entity_id: tenantId || targetUserId,
      action: "update",
      actor_id: requestingUserId,
      actor_type: isPlatformAdmin ? "system" : "owner",
      workspace_id: actorWs.id,
      changes: {
        before: { email: oldEmail },
        after: { email: newEmail },
        fields_changed: ["email"],
      },
      metadata: {
        operation: "email_updated",
        old_email: oldEmail,
        new_email: newEmail,
        login_email_updated: true,
        target_user_id: targetUserId,
      },
      created_at: getNowISO(),
    })
  }

  return {
    success: true,
    loginEmailUpdated: true,
    message: "Email updated successfully across all tables",
  }
}
