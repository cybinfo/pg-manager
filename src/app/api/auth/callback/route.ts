import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  // On Vercel, use x-forwarded-host to get the canonical domain (e.g. managekar.com)
  // instead of the deployment subdomain
  const forwardedHost = request.headers.get("x-forwarded-host")
  const host = forwardedHost
    ? `https://${forwardedHost}`
    : origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${host}/login`)
    }
  }

  return NextResponse.redirect(`${host}/login?error=link_expired`)
}
