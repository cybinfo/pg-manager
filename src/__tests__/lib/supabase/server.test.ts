/**
 * Tests for src/lib/supabase/server.ts
 *
 * Covers: createClient — calls createServerClient with env vars,
 * getAll/setAll cookie handlers, and silent catch on setAll in Server Component context.
 *
 * NOTE: The `typeof window === 'undefined'` context is handled by mocking
 * `next/headers` and `@supabase/ssr` — no JSDOM collision possible.
 */

// ============================================================================
// Mocks
// ============================================================================

const mockGetAll = jest.fn().mockReturnValue([{ name: "sb-auth", value: "token123" }])
const mockSet = jest.fn()
const mockCookieStore = { getAll: mockGetAll, set: mockSet }

jest.mock("next/headers", () => ({
  cookies: jest.fn(() => Promise.resolve(mockCookieStore)),
}))

const mockCreateServerClient = jest.fn()
jest.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
  createBrowserClient: jest.fn(),
}))

// ============================================================================
// Import (after mocks)
// ============================================================================

import { createClient } from "@/lib/supabase/server"

const ORIGINAL_ENV = process.env

// ============================================================================
// Tests
// ============================================================================

describe("createClient (server)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...ORIGINAL_ENV,
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-123",
    }
    mockCreateServerClient.mockReturnValue({ auth: {}, from: jest.fn() })
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  it("calls createServerClient with env vars", async () => {
    await createClient()
    expect(mockCreateServerClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "anon-key-123",
      expect.objectContaining({ cookies: expect.any(Object) })
    )
  })

  it("returns the client instance from createServerClient", async () => {
    const fakeClient = { auth: { getUser: jest.fn() }, from: jest.fn() }
    mockCreateServerClient.mockReturnValue(fakeClient)
    const client = await createClient()
    expect(client).toBe(fakeClient)
  })

  it("getAll() delegates to cookieStore.getAll()", async () => {
    await createClient()
    const [, , { cookies: cookieHandlers }] = mockCreateServerClient.mock.calls[0]
    const result = cookieHandlers.getAll()
    expect(mockGetAll).toHaveBeenCalledTimes(1)
    expect(result).toEqual([{ name: "sb-auth", value: "token123" }])
  })

  it("setAll() calls cookieStore.set for each cookie", async () => {
    await createClient()
    const [, , { cookies: cookieHandlers }] = mockCreateServerClient.mock.calls[0]
    cookieHandlers.setAll([
      { name: "a", value: "1", options: { httpOnly: true } },
      { name: "b", value: "2", options: {} },
    ])
    expect(mockSet).toHaveBeenCalledTimes(2)
    expect(mockSet).toHaveBeenNthCalledWith(1, "a", "1", { httpOnly: true })
    expect(mockSet).toHaveBeenNthCalledWith(2, "b", "2", {})
  })

  it("setAll() silently catches exceptions (Server Component context)", async () => {
    mockSet.mockImplementation(() => { throw new Error("Cannot set on Server Component") })
    await createClient()
    const [, , { cookies: cookieHandlers }] = mockCreateServerClient.mock.calls[0]
    // Should not throw
    expect(() => cookieHandlers.setAll([{ name: "a", value: "1", options: {} }])).not.toThrow()
  })
})
