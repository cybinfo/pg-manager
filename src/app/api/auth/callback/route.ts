import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Redirect to login — the mount effect there detects the session
      // and handles context selection automatically
      return NextResponse.redirect(`${origin}/login`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=link_expired`)
}
