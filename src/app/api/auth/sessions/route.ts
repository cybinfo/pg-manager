import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { apiSuccess, unauthorized } from "@/lib/api-response"
import { logger } from "@/lib/logger"

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
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 })
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
    .update({ signed_out_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("signed_out_at", null)

  if (fingerprint) {
    // exclude current session from revocation
    query = query.neq("fingerprint", fingerprint)
  }

  const { error } = await query

  if (error) {
    logger.error("Error revoking sessions", { detail: error.message })
    return NextResponse.json({ error: "Failed to revoke sessions" }, { status: 500 })
  }

  // Tell Supabase to invalidate tokens for other sessions
  await supabase.auth.signOut({ scope: "others" })

  return apiSuccess({ revoked: true })
}
