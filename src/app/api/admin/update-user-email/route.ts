import { NextRequest } from "next/server"
import { z } from "zod"
import { apiLogger, extractErrorMeta } from "@/lib/logger"
import {
  apiSuccess,
  apiError,
  forbidden,
  badRequest,
  internalError,
} from "@/lib/api-response"
import { validateEmail } from "@/lib/validators"
import { withApiMiddleware, getAdminSupabaseClient } from "@/lib/api-middleware"
import { getNowISO } from "@/lib/date-helpers"

const UpdateUserEmailSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
  newEmail: z.string().email("Invalid email format"),
  tenantId: z.string().uuid("Invalid tenant ID format").optional(),
})

type UpdateUserEmailBody = z.infer<typeof UpdateUserEmailSchema>

export async function POST(request: NextRequest) {
  return withApiMiddleware(request, {
    requireAuth: true,
    requireCsrf: true,
    limiter: "sensitive",
    bodySchema: UpdateUserEmailSchema,
  }, async (ctx) => {
    const { userId, newEmail, tenantId } = ctx.body as UpdateUserEmailBody

    // SECURITY: Get admin client after auth check (validated env vars)
    const supabaseAdmin = getAdminSupabaseClient()

    // SECURITY: Verify requester has permission to update this user's email
    // Must be either: 1) Platform admin, or 2) Owner of the tenant record
    const { data: platformAdmin } = await supabaseAdmin
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", ctx.user.id)
      .single()

    const isPlatformAdmin = !!platformAdmin

    // If not platform admin, check if they own the tenant
    if (!isPlatformAdmin) {
      if (!tenantId) {
        return forbidden("Only platform admins can update user emails without tenant context")
      }

      // Check if current user owns the tenant record
      const { data: tenant } = await supabaseAdmin
        .from("tenants")
        .select("owner_id")
        .eq("id", tenantId)
        .single()

      if (!tenant || tenant.owner_id !== ctx.user.id) {
        return forbidden("You do not have permission to update this user's email")
      }
    }

    // SEC-017: Use proper RFC 5322 email validation with disposable domain blocking
    const emailValidation = validateEmail(newEmail, { blockDisposable: true })
    if (!emailValidation.isValid) {
      return badRequest(emailValidation.error || "Invalid email format")
    }

    // SECURITY CHECK: Does this user have owner or staff contexts?
    // If so, we should NOT update auth.users.email or user_profiles.email
    // because that would affect their owner/staff login!
    const { data: contexts } = await supabaseAdmin
      .from("user_contexts")
      .select("context_type")
      .eq("user_id", userId)

    const hasOwnerOrStaffContext = contexts?.some(
      (ctx: { context_type: string }) => ctx.context_type === "owner" || ctx.context_type === "staff"
    )

    // Always update tenants email (the record) if tenantId provided
    if (tenantId) {
      const { error: tenantError } = await supabaseAdmin
        .from("tenants")
        .update({ email: newEmail })
        .eq("id", tenantId)

      if (tenantError) {
        apiLogger.error("Error updating tenants email", extractErrorMeta(tenantError))
        return internalError("Failed to update tenant email")
      }
    }

    // If user has owner/staff context, ONLY update tenants.email (done above)
    // Do NOT change their login credentials!
    if (hasOwnerOrStaffContext) {
      // Audit: log tenant email update (login email unchanged)
      const { data: actorWorkspace } = await supabaseAdmin
        .from("workspaces")
        .select("id")
        .eq("owner_id", ctx.user.id)
        .single()

      if (actorWorkspace) {
        await supabaseAdmin.from("audit_events").insert({
          entity_type: "tenant",
          entity_id: tenantId || userId,
          action: "update",
          actor_id: ctx.user.id,
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

      return apiSuccess(
        { loginEmailUpdated: false },
        { message: "Tenant record email updated. Login email unchanged (user has owner/staff access)." }
      )
    }

    // User is ONLY a tenant, safe to update login credentials

    // Capture old email before update (for audit trail)
    const { data: oldProfile } = await supabaseAdmin
      .from("user_profiles")
      .select("email")
      .eq("user_id", userId)
      .single()

    const oldEmail = oldProfile?.email

    // Check if new email is already in use by another user
    const { data: existingUser } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id")
      .eq("email", newEmail)
      .neq("user_id", userId)
      .single()

    if (existingUser) {
      return apiError("CONFLICT", "Email is already in use by another account", { status: 409 })
    }

    // Update auth.users email using admin API
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email: newEmail }
    )

    if (authError) {
      apiLogger.error("Error updating auth.users email", extractErrorMeta(authError))
      return internalError(`Failed to update auth email: ${authError.message}`)
    }

    // Update user_profiles email
    const { error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .update({ email: newEmail })
      .eq("user_id", userId)

    if (profileError) {
      apiLogger.error("Error updating user_profiles email", extractErrorMeta(profileError))
      // Don't fail completely, auth email is already updated
    }

    // Audit: log full email update (login + profile + tenant)
    const { data: actorWs } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("owner_id", ctx.user.id)
      .single()

    if (actorWs) {
      await supabaseAdmin.from("audit_events").insert({
        entity_type: "tenant",
        entity_id: tenantId || userId,
        action: "update",
        actor_id: ctx.user.id,
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
          target_user_id: userId,
        },
        created_at: getNowISO(),
      })
    }

    return apiSuccess(
      { loginEmailUpdated: true },
      { message: "Email updated successfully across all tables" }
    )
  })
}
