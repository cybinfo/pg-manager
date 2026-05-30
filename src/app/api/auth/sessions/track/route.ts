import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { unauthorized } from "@/lib/api-response"
import { logger } from "@/lib/logger"

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return unauthorized()

  const body = await request.json().catch(() => ({}))
  const { fingerprint, device_type, browser, os } = body as {
    fingerprint: string
    device_type: string
    browser: string
    os: string
  }

  if (!fingerprint) {
    return NextResponse.json({ error: "fingerprint required" }, { status: 400 })
  }

  // Get IP from headers
  const ip_address =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null

  const now = new Date().toISOString()

  const { error } = await supabase
    .from("user_sessions")
    .upsert(
      {
        user_id: user.id,
        fingerprint,
        device_type: device_type || "desktop",
        browser: browser || null,
        os: os || null,
        ip_address,
        last_seen_at: now,
        signed_out_at: null, // clear if was signed out (re-login)
      },
      { onConflict: "user_id,fingerprint" }
    )

  if (error) {
    logger.error("Error tracking session", { detail: error.message })
    return NextResponse.json({ error: "Failed to track session" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
