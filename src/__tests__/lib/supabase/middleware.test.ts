/**
 * Tests for src/lib/supabase/middleware.ts
 *
 * Covers: updateSession — protected path redirects, auth path redirects,
 * CSRF cookie handling, and cookie passthrough.
 */

// ============================================================================
// Mocks — must come before all imports
// ============================================================================

// Override the global jest.setup.js next/server mock with a version that
// supports .next(), .redirect(), and a NextRequest with nextUrl + cookies.
jest.mock("next/server", () => {
  function makeResponse(status: number, location?: string) {
    return {
      status,
      headers: {
        get: (key: string) => (key === "location" ? (location ?? null) : null),
        set: jest.fn(),
      },
      cookies: { set: jest.fn(), get: jest.fn(), getAll: jest.fn().mockReturnValue([]) },
    }
  }

  return {
    NextResponse: {
      next: jest.fn(() => makeResponse(200)),
      redirect: jest.fn((url: URL) => makeResponse(307, url.toString())),
    },
    // Minimal NextRequest that matches what updateSession reads
    NextRequest: class MockNextRequest {
      public url: string
      public method: string
      public nextUrl: URL
      public cookies: { getAll: () => { name: string; value: string }[] }
      public headers: { get: (k: string) => string | null }

      constructor(url: URL | string) {
        const parsed = typeof url === "string" ? new URL(url) : url
        this.url = parsed.toString()
        this.method = "GET"
        // Add clone() so the middleware can call nextUrl.clone()
        const nextUrl = new URL(parsed.toString()) as URL & { clone: () => URL & { clone: () => URL } }
        nextUrl.clone = () => {
          const cloned = new URL(nextUrl.toString()) as URL & { clone: () => URL }
          cloned.clone = () => new URL(cloned.toString()) as URL
          return cloned
        }
        this.nextUrl = nextUrl
        this.cookies = { getAll: () => [] }
        this.headers = { get: () => null }
      }
    },
  }
})

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(),
}))

jest.mock("@/lib/csrf", () => ({
  ensureCsrfCookie: jest.fn((_req: unknown, res: unknown) => res),
}))

// ============================================================================
// Imports — after mocks
// ============================================================================

import { NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { ensureCsrfCookie } from "@/lib/csrf"
import { updateSession } from "@/lib/supabase/middleware"

const mockCreateServerClient = createServerClient as jest.MockedFunction<typeof createServerClient>
const mockEnsureCsrfCookie = ensureCsrfCookie as jest.MockedFunction<typeof ensureCsrfCookie>

// ============================================================================
// Helpers
// ============================================================================

function makeRequest(path: string): NextRequest {
  return new NextRequest(new URL(`http://localhost${path}`))
}

function setupSupabaseMock(user: { id: string } | null) {
  mockCreateServerClient.mockImplementation(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
    },
  }) as never)
}

// ============================================================================
// Setup / Teardown
// ============================================================================

beforeEach(() => {
  mockCreateServerClient.mockReset()
  mockEnsureCsrfCookie.mockReset()
  mockEnsureCsrfCookie.mockImplementation((_req, res) => res)

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key"
})

// ============================================================================
// Protected paths — unauthenticated
// ============================================================================

describe("updateSession — unauthenticated access to protected paths", () => {
  it("redirects /dashboard to /login?redirect=/dashboard when no user", async () => {
    setupSupabaseMock(null)
    const req = makeRequest("/dashboard")
    const response = await updateSession(req)
    expect(response.status).toBe(307)
    const location = response.headers.get("location")
    expect(location).toContain("/login")
    expect(location).toContain("redirect=%2Fdashboard")
  })

  it("redirects /tenant to /login?redirect=/tenant when no user", async () => {
    setupSupabaseMock(null)
    const req = makeRequest("/tenant")
    const response = await updateSession(req)
    expect(response.status).toBe(307)
    const location = response.headers.get("location")
    expect(location).toContain("/login")
    expect(location).toContain("redirect=%2Ftenant")
  })

  it("redirects /settings to /login?redirect=/settings when no user", async () => {
    setupSupabaseMock(null)
    const req = makeRequest("/settings")
    const response = await updateSession(req)
    expect(response.status).toBe(307)
    const location = response.headers.get("location")
    expect(location).toContain("/login")
    expect(location).toContain("redirect=%2Fsettings")
  })

  it("redirects /properties to /login?redirect=/properties when no user", async () => {
    setupSupabaseMock(null)
    const req = makeRequest("/properties")
    const response = await updateSession(req)
    expect(response.status).toBe(307)
    const location = response.headers.get("location")
    expect(location).toContain("/login")
    expect(location).toContain("redirect=%2Fproperties")
  })

  it("redirects /admin to /login?redirect=/admin when no user", async () => {
    setupSupabaseMock(null)
    const req = makeRequest("/admin")
    const response = await updateSession(req)
    expect(response.status).toBe(307)
    const location = response.headers.get("location")
    expect(location).toContain("/login")
    expect(location).toContain("redirect=%2Fadmin")
  })
})

// ============================================================================
// Public paths — unauthenticated
// ============================================================================

describe("updateSession — unauthenticated access to public paths", () => {
  it("does NOT redirect /about when no user", async () => {
    setupSupabaseMock(null)
    const req = makeRequest("/about")
    const response = await updateSession(req)
    expect(response.status).not.toBe(307)
    expect(response.headers.get("location")).toBeNull()
  })

  it("does NOT redirect / (root) when no user", async () => {
    setupSupabaseMock(null)
    const req = makeRequest("/")
    const response = await updateSession(req)
    expect(response.status).not.toBe(307)
    expect(response.headers.get("location")).toBeNull()
  })

  it("does NOT redirect /login when no user", async () => {
    setupSupabaseMock(null)
    const req = makeRequest("/login")
    const response = await updateSession(req)
    expect(response.status).not.toBe(307)
    expect(response.headers.get("location")).toBeNull()
  })
})

// ============================================================================
// Protected paths — authenticated
// ============================================================================

describe("updateSession — authenticated access to protected paths", () => {
  it("does NOT redirect /dashboard when user is logged in", async () => {
    setupSupabaseMock({ id: "u1" })
    const req = makeRequest("/dashboard")
    const response = await updateSession(req)
    expect(response.status).not.toBe(307)
    expect(response.headers.get("location")).toBeNull()
  })

  it("does NOT redirect /settings when user is logged in", async () => {
    setupSupabaseMock({ id: "u1" })
    const req = makeRequest("/settings")
    const response = await updateSession(req)
    expect(response.status).not.toBe(307)
    expect(response.headers.get("location")).toBeNull()
  })
})

// ============================================================================
// Auth paths — authenticated user gets redirected away
// ============================================================================

describe("updateSession — authenticated access to auth paths", () => {
  it("redirects /login to /dashboard when user is logged in", async () => {
    setupSupabaseMock({ id: "u1" })
    const req = makeRequest("/login")
    const response = await updateSession(req)
    expect(response.status).toBe(307)
    const location = response.headers.get("location")
    expect(location).toContain("/dashboard")
  })

  it("redirects /register to /dashboard when user is logged in", async () => {
    setupSupabaseMock({ id: "u1" })
    const req = makeRequest("/register")
    const response = await updateSession(req)
    expect(response.status).toBe(307)
    const location = response.headers.get("location")
    expect(location).toContain("/dashboard")
  })
})

// ============================================================================
// CSRF cookie handling
// ============================================================================

describe("updateSession — CSRF cookie", () => {
  it("calls ensureCsrfCookie when user is authenticated on a neutral path", async () => {
    setupSupabaseMock({ id: "u1" })
    const req = makeRequest("/about")
    await updateSession(req)
    expect(mockEnsureCsrfCookie).toHaveBeenCalledTimes(1)
  })

  it("calls ensureCsrfCookie when user is authenticated on a protected path", async () => {
    setupSupabaseMock({ id: "u1" })
    const req = makeRequest("/dashboard")
    await updateSession(req)
    expect(mockEnsureCsrfCookie).toHaveBeenCalledTimes(1)
  })

  it("does NOT call ensureCsrfCookie when user is unauthenticated on a public path", async () => {
    setupSupabaseMock(null)
    const req = makeRequest("/about")
    await updateSession(req)
    expect(mockEnsureCsrfCookie).not.toHaveBeenCalled()
  })

  it("does NOT call ensureCsrfCookie when unauthenticated request is redirected to login", async () => {
    setupSupabaseMock(null)
    const req = makeRequest("/dashboard")
    await updateSession(req)
    expect(mockEnsureCsrfCookie).not.toHaveBeenCalled()
  })
})

// ============================================================================
// Return value
// ============================================================================

describe("updateSession — return value", () => {
  it("returns a response object for unauthenticated public path", async () => {
    setupSupabaseMock(null)
    const req = makeRequest("/about")
    const response = await updateSession(req)
    expect(response).toBeDefined()
    expect(typeof response.headers).toBe("object")
  })

  it("returns the response from ensureCsrfCookie for authenticated user", async () => {
    const fakeResponse = { status: 200, headers: { get: () => null }, cookies: { set: jest.fn() } }
    mockEnsureCsrfCookie.mockReturnValue(fakeResponse as never)
    setupSupabaseMock({ id: "u1" })
    const req = makeRequest("/about")
    const response = await updateSession(req)
    expect(response).toBe(fakeResponse)
  })
})
