import { createBrowserClient } from "@supabase/ssr"

// Singleton instance for Supabase client
let clientInstance: ReturnType<typeof createBrowserClient> | null = null

/**
 * Get the browser Supabase client (singleton)
 * Uses @supabase/ssr with cookie-based session storage
 */
export function createClient() {
  if (!clientInstance) {
    clientInstance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return clientInstance
}

// Alias for backwards compatibility
export const getAuthClient = createClient

/**
 * Quick check if there might be a session in storage
 * This is a fast check that doesn't make any API calls
 */
export function hasStoredSession(): boolean {
  if (typeof window === 'undefined') return false
  const session = getStoredSessionData()
  return session !== null
}

/**
 * Get stored session data directly from storage without API call
 * Returns the session if found and not expired, null otherwise
 */
export function getStoredSessionData(): { access_token: string; user: { id: string; email?: string } } | null {
  if (typeof window === 'undefined') return null

  // Check localStorage first (where SSR client might store)
  const storageKey = `sb-pmedxtgysllyhpjldhho-auth-token`
  const storedSession = localStorage.getItem(storageKey)

  if (storedSession) {
    try {
      const parsed = JSON.parse(storedSession)
      const accessToken = parsed?.access_token || parsed?.currentSession?.access_token
      const user = parsed?.user || parsed?.currentSession?.user

      if (accessToken && user?.id) {
        // Check if token is expired (JWT exp claim)
        const expiry = parsed?.expires_at || parsed?.currentSession?.expires_at
        if (expiry && Date.now() / 1000 > expiry) {
          return null // Expired
        }
        return { access_token: accessToken, user }
      }
    } catch {
      // Invalid JSON
    }
  }

  // Check cookies (Supabase SSR stores auth in cookies)
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const trimmed = cookie.trim()
    // SSR client uses base64 encoded JSON in cookies
    if (trimmed.startsWith('sb-pmedxtgysllyhpjldhho-auth-token=')) {
      try {
        const value = trimmed.split('=')[1]
        if (value) {
          // Try to decode - might be base64 or JSON
          let parsed
          try {
            parsed = JSON.parse(decodeURIComponent(value))
          } catch {
            // Try base64 decode
            try {
              parsed = JSON.parse(atob(value))
            } catch {
              continue
            }
          }

          const accessToken = parsed?.access_token
          const user = parsed?.user

          if (accessToken && user?.id) {
            const expiry = parsed?.expires_at
            if (expiry && Date.now() / 1000 > expiry) {
              return null
            }
            return { access_token: accessToken, user }
          }
        }
      } catch {
        // Continue to next cookie
      }
    }
  }

  return null
}
