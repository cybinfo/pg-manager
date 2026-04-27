import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { apiSuccess, unauthorized, notFound, internalError, apiError, ErrorCodes } from "@/lib/api-response"

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  // Verify the calling user is authenticated
  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return unauthorized()

  const supabase = adminClient()
  if (!supabase) return internalError("Server configuration error")

  // Look up invitation by token
  const { data: invitation, error } = await supabase
    .from("invitations")
    .select("id, status, context_type, entity_id, workspace_id, role_id, expires_at")
    .eq("token", token)
    .single()

  if (error || !invitation) return notFound("Invitation")
  if (invitation.status !== "pending") {
    return apiError(ErrorCodes.BAD_REQUEST, "Invitation has already been accepted or expired")
  }
  if (new Date(invitation.expires_at) < new Date()) {
    return apiError(ErrorCodes.VALIDATION_ERROR, "Invitation has expired")
  }

  // Check if user already has a context for this workspace
  const { data: existing } = await supabase
    .from("user_contexts")
    .select("id")
    .eq("user_id", user.id)
    .eq("workspace_id", invitation.workspace_id)
    .single()

  if (!existing) {
    // Create user context linking user to workspace
    const { error: contextError } = await supabase
      .from("user_contexts")
      .insert({
        user_id: user.id,
        workspace_id: invitation.workspace_id,
        context_type: invitation.context_type,
        role_id: invitation.role_id || null,
        entity_id: invitation.entity_id || null,
        is_active: true,
        is_default: true,
      })

    if (contextError) {
      return internalError("Failed to create user context")
    }
  }

  // If invitation linked to a tenant, update tenant.user_id
  if (invitation.entity_id && invitation.context_type === "tenant") {
    await supabase
      .from("tenants")
      .update({ user_id: user.id })
      .eq("id", invitation.entity_id)
      .is("user_id", null)
  }

  // Mark invitation as accepted
  await supabase
    .from("invitations")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      accepted_by: user.id,
    })
    .eq("id", invitation.id)

  return apiSuccess({ accepted: true, context_type: invitation.context_type })
}
