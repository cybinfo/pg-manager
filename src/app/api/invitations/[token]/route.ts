import { createClient } from "@supabase/supabase-js"
import { apiSuccess, notFound, internalError } from "@/lib/api-response"

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = adminClient()
  if (!supabase) return internalError("Server configuration error")

  const { data: invitation, error } = await supabase
    .from("invitations")
    .select(`
      id, status, context_type, entity_id, name, email, phone, expires_at,
      workspace:workspaces(id, name, logo_url)
    `)
    .eq("token", token)
    .single()

  if (error || !invitation) return notFound("Invitation")

  if (invitation.status !== "pending") {
    return apiSuccess({ expired: true, status: invitation.status })
  }

  if (new Date(invitation.expires_at) < new Date()) {
    await supabase
      .from("invitations")
      .update({ status: "expired" })
      .eq("id", invitation.id)
    return apiSuccess({ expired: true, status: "expired" })
  }

  // Fetch entity details if linked to a tenant
  let entityInfo = null
  if (invitation.entity_id && invitation.context_type === "tenant") {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name, property:properties(name), room:rooms(room_number)")
      .eq("id", invitation.entity_id)
      .single()

    if (tenant) {
      entityInfo = {
        name: tenant.name,
        property: Array.isArray(tenant.property) ? tenant.property[0]?.name : (tenant.property as { name?: string } | null)?.name,
        room: Array.isArray(tenant.room) ? tenant.room[0]?.room_number : (tenant.room as { room_number?: string } | null)?.room_number,
      }
    }
  }

  return apiSuccess({
    expired: false,
    invitation: {
      id: invitation.id,
      name: invitation.name,
      email: invitation.email,
      context_type: invitation.context_type,
      workspace: invitation.workspace,
      entity: entityInfo,
    },
  })
}
