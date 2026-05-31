import { NextRequest } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { apiSuccess, unauthorized, internalError } from "@/lib/api-response"
import { logger } from "@/lib/logger"
import { getNowISO } from "@/lib/date-helpers"

export async function GET(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return unauthorized()

  const fingerprint = request.nextUrl.searchParams.get("fp") || ""

  const { data: sessions, error } = await supabase
    .from("user_sessions")
    .select("id, fingerprint, device_type, browser, os, ip_address, last_seen_at, created_at")
    .eq("user_id", user.id)
    .is("signed_out_at", null)
    .order("last_seen_at", { ascending: false })

  if (error) {
    logger.error("Error fetching sessions", { detail: error.message })
    return internalError("Failed to fetch sessions")
  }

  const enriched = (sessions || []).map((s) => ({
    ...s,
    is_current: s.fingerprint === fingerprint,
  }))

  return apiSuccess(enriched)
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return unauthorized()

  const body = await request.json().catch(() => ({}))
  const fingerprint = body.fingerprint as string | undefined

  // Mark all other sessions as signed out in our table
  let query = supabase
    .from("user_sessions")
    .update({ signed_out_at: getNowISO() })
    .eq("user_id", user.id)
    .is("signed_out_at", null)

  if (fingerprint) {
    // exclude current session from revocation
    query = query.neq("fingerprint", fingerprint)
  }

  const { error } = await query

  if (error) {
    logger.error("Error revoking sessions", { detail: error.message })
    return internalError("Failed to revoke sessions")
  }

  // Tell Supabase to invalidate tokens for other sessions
  await supabase.auth.signOut({ scope: "others" })

  return apiSuccess({ revoked: true })
}
