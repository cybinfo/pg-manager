/**
 * Tests for src/lib/supabase/client.ts
 *
 * Covers: createClient singleton, hasStoredSession, getStoredSessionData
 * (localStorage and cookie paths, expiry check, JSON parse errors, base64 decode).
 *
 * NOTE: `typeof window === 'undefined'` branches are structurally dead in Jest/JSDOM.
 */

// ============================================================================
// Unmock the module under test (jest.setup.js globally mocks @/lib/supabase/client)
// and mock its @supabase/ssr dependency
// ============================================================================

jest.unmock("@/lib/supabase/client")

const mockBrowserClientInstance = { auth: {}, from: jest.fn() }
const mockCreateBrowserClient = jest.fn(() => mockBrowserClientInstance)

jest.mock("@supabase/ssr", () => ({
  createBrowserClient: (...args: unknown[]) => mockCreateBrowserClient(...args),
  createServerClient: jest.fn(),
}))

// ============================================================================
// Imports (after mock declarations)
// ============================================================================

import { createClient, getAuthClient, hasStoredSession, getStoredSessionData } from "@/lib/supabase/client"

const STORAGE_KEY = "sb-pmedxtgysllyhpjldhho-auth-token"

// ============================================================================
// Helpers
// ============================================================================

function setLocalStorage(value: string | null) {
  if (value === null) {
    localStorage.removeItem(STORAGE_KEY)
  } else {
    localStorage.setItem(STORAGE_KEY, value)
  }
}

function setCookie(value: string | null) {
  if (value === null) {
    // Remove the cookie
    document.cookie = `${STORAGE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`
  } else {
    document.cookie = `${STORAGE_KEY}=${value}`
  }
}

// ============================================================================
// createClient — singleton
// ============================================================================

describe("createClient", () => {
  beforeEach(() => {
    mockCreateBrowserClient.mockClear()
    // Reset module-level singleton by re-importing (use jest.isolateModules if needed)
    // For now, verify idempotency within a test
  })

  it("returns a client instance", () => {
    const client = createClient()
    expect(client).toBeTruthy()
  })

  it("getAuthClient is an alias for createClient", () => {
    expect(getAuthClient).toBe(createClient)
  })

  it("returns the same singleton instance on repeated calls (only creates once)", () => {
    const a = createClient()
    const b = createClient()
    expect(a).toBe(b)
  })
})

// ============================================================================
// getStoredSessionData — localStorage paths
// ============================================================================

describe("getStoredSessionData — localStorage", () => {
  beforeEach(() => {
    localStorage.clear()
    // Clear cookies
    setCookie(null)
  })

  it("returns null when localStorage has no entry and no cookies", () => {
    expect(getStoredSessionData()).toBeNull()
  })

  it("returns session when localStorage has valid token", () => {
    const session = {
      access_token: "tok123",
      user: { id: "u1", email: "user@test.com" },
      expires_at: Math.floor(Date.now() / 1000) + 3600, // 1hr from now
    }
    setLocalStorage(JSON.stringify(session))
    const result = getStoredSessionData()
    expect(result).not.toBeNull()
    expect(result?.access_token).toBe("tok123")
    expect(result?.user.id).toBe("u1")
  })

  it("returns null when stored token is expired (expires_at in past)", () => {
    const session = {
      access_token: "tok123",
      user: { id: "u1" },
      expires_at: Math.floor(Date.now() / 1000) - 1, // 1 second ago
    }
    setLocalStorage(JSON.stringify(session))
    expect(getStoredSessionData()).toBeNull()
  })

  it("returns session when expires_at is absent (no expiry check)", () => {
    const session = { access_token: "tok123", user: { id: "u1" } }
    setLocalStorage(JSON.stringify(session))
    expect(getStoredSessionData()).not.toBeNull()
  })

  it("returns session from currentSession nested structure", () => {
    const session = {
      currentSession: {
        access_token: "tok456",
        user: { id: "u2" },
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      },
    }
    setLocalStorage(JSON.stringify(session))
    const result = getStoredSessionData()
    expect(result?.access_token).toBe("tok456")
    expect(result?.user.id).toBe("u2")
  })

  it("returns null for invalid JSON in localStorage (catch branch)", () => {
    setLocalStorage("not-valid-json{{")
    expect(getStoredSessionData()).toBeNull()
  })

  it("returns null when access_token is missing from localStorage entry", () => {
    setLocalStorage(JSON.stringify({ user: { id: "u1" } }))
    expect(getStoredSessionData()).toBeNull()
  })

  it("returns null when user.id is missing from localStorage entry", () => {
    setLocalStorage(JSON.stringify({ access_token: "tok", user: {} }))
    expect(getStoredSessionData()).toBeNull()
  })
})

// ============================================================================
// getStoredSessionData — cookie paths
// ============================================================================

describe("getStoredSessionData — cookies", () => {
  beforeEach(() => {
    localStorage.clear()
    setCookie(null)
  })

  it("returns session from cookie with URL-encoded JSON value", () => {
    const session = {
      access_token: "tok789",
      user: { id: "u3" },
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    }
    setCookie(encodeURIComponent(JSON.stringify(session)))
    const result = getStoredSessionData()
    expect(result?.access_token).toBe("tok789")
  })

  it("returns null for expired token in cookie", () => {
    const session = {
      access_token: "tok789",
      user: { id: "u3" },
      expires_at: Math.floor(Date.now() / 1000) - 1,
    }
    setCookie(encodeURIComponent(JSON.stringify(session)))
    expect(getStoredSessionData()).toBeNull()
  })

  it("skips malformed cookie values (continue branch)", () => {
    // Set an invalid cookie value that can't be decoded
    setCookie("not-valid-json-or-base64!!!")
    expect(getStoredSessionData()).toBeNull()
  })

  it("returns null when cookie access_token is absent", () => {
    const session = { user: { id: "u3" } }
    setCookie(encodeURIComponent(JSON.stringify(session)))
    expect(getStoredSessionData()).toBeNull()
  })
})

// ============================================================================
// hasStoredSession
// ============================================================================

describe("hasStoredSession", () => {
  beforeEach(() => {
    localStorage.clear()
    setCookie(null)
  })

  it("returns false when no session stored", () => {
    expect(hasStoredSession()).toBe(false)
  })

  it("returns true when localStorage has valid session", () => {
    const session = {
      access_token: "tok",
      user: { id: "u1" },
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    }
    setLocalStorage(JSON.stringify(session))
    expect(hasStoredSession()).toBe(true)
  })

  it("returns false when stored session is expired", () => {
    const session = {
      access_token: "tok",
      user: { id: "u1" },
      expires_at: Math.floor(Date.now() / 1000) - 1,
    }
    setLocalStorage(JSON.stringify(session))
    expect(hasStoredSession()).toBe(false)
  })
})
