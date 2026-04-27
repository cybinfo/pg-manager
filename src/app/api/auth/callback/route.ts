import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  // next param allows post-auth redirect (e.g. /invite/[token] for invitation acceptance)
  const next = searchParams.get("next")

  // On Vercel, use x-forwarded-host to get the canonical domain (e.g. managekar.com)
  const forwardedHost = request.headers.get("x-forwarded-host")
  const host = forwardedHost ? `https://${forwardedHost}` : origin

  if (code) {
    // Build the redirect response first so we can attach session cookies to it.
    // Using cookieStore.set() from next/headers does NOT carry over to a
    // NextResponse.redirect() — cookies must be set on the response directly.
    const redirectTarget = next && next.startsWith("/") ? `${host}${next}` : `${host}/login`
    const supabaseResponse = NextResponse.redirect(redirectTarget)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return supabaseResponse
    }
  }

  return NextResponse.redirect(`${host}/login?error=link_expired`)
}
