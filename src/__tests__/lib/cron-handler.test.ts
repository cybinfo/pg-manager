/**
 * Tests for src/lib/cron-handler.ts
 *
 * Covers: baseCronHandler (success, validation failure, execute error),
 *         logCronAudit (workspace found, workspace not found).
 */

const mockValidateCronRequest = jest.fn()
const mockCronLogger = {
  info: jest.fn(),
  error: jest.fn(),
}
const mockSendCronFailureAlert = jest.fn().mockResolvedValue(undefined)

jest.mock("@/lib/api-middleware", () => ({
  validateCronRequest: (...args: unknown[]) => mockValidateCronRequest(...args),
}))

jest.mock("@/lib/logger", () => ({
  cronLogger: {
    info: (...args: unknown[]) => mockCronLogger.info(...args),
    error: (...args: unknown[]) => mockCronLogger.error(...args),
  },
  extractErrorMeta: jest.fn((err: unknown) => ({ error: String(err) })),
}))

jest.mock("@/lib/email", () => ({
  sendCronFailureAlert: (...args: unknown[]) => mockSendCronFailureAlert(...args),
}))

jest.mock("@/lib/api-response", () => ({
  apiSuccess: jest.fn((data: unknown, opts?: { message?: string }) =>
    new Response(JSON.stringify({ data, message: opts?.message }), { status: 200 })
  ),
  internalError: jest.fn(() =>
    new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 })
  ),
}))

jest.mock("@/lib/date-helpers", () => ({
  getNowISO: jest.fn(() => "2026-01-15T00:00:00.000Z"),
}))

import { baseCronHandler, logCronAudit } from "@/lib/cron-handler"

// ============================================================================
// Helpers
// ============================================================================

function makeRequest() {
  return new Request("https://example.com/api/cron/test", { method: "GET" })
}

function makeSupabase(opts: {
  workspaceId?: string | null
  insertError?: unknown
} = {}) {
  const insertMock = jest.fn().mockResolvedValue({ error: opts.insertError ?? null })
  const singleMock = jest.fn().mockResolvedValue({
    data: opts.workspaceId !== undefined ? { id: opts.workspaceId } : null,
    error: null,
  })
  const fromMock = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: singleMock,
    insert: insertMock,
  })
  return { from: fromMock, _insertMock: insertMock }
}

// ============================================================================
// baseCronHandler
// ============================================================================

describe("baseCronHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSendCronFailureAlert.mockResolvedValue(undefined)
  })

  it("returns validation failure response when validateCronRequest fails", async () => {
    const failResponse = new Response("Unauthorized", { status: 401 })
    mockValidateCronRequest.mockResolvedValue({ success: false, response: failResponse, supabase: null })

    const result = await baseCronHandler(makeRequest(), {
      name: "test-cron",
      execute: jest.fn(),
    })

    expect(result.status).toBe(401)
  })

  it("executes business logic and returns success response", async () => {
    const fakeSupa = {}
    mockValidateCronRequest.mockResolvedValue({ success: true, response: null, supabase: fakeSupa })

    const execute = jest.fn().mockResolvedValue({
      data: { processed: 5 },
      message: "Processed 5 items",
    })

    const result = await baseCronHandler(makeRequest(), {
      name: "auto-billing",
      execute,
    })

    expect(execute).toHaveBeenCalledWith(fakeSupa, expect.any(Date))
    expect(result.status).toBe(200)
    expect(mockCronLogger.info).toHaveBeenCalledWith("auto-billing started", expect.any(Object))
    expect(mockCronLogger.info).toHaveBeenCalledWith("auto-billing complete", expect.any(Object))
  })

  it("returns 500 and sends failure alert when execute throws", async () => {
    const fakeSupa = {}
    mockValidateCronRequest.mockResolvedValue({ success: true, response: null, supabase: fakeSupa })

    const execute = jest.fn().mockRejectedValue(new Error("DB connection failed"))

    const result = await baseCronHandler(makeRequest(), {
      name: "expire-memberships",
      execute,
    })

    expect(result.status).toBe(500)
    expect(mockCronLogger.error).toHaveBeenCalledWith(
      "expire-memberships cron error",
      expect.any(Object)
    )
    expect(mockSendCronFailureAlert).toHaveBeenCalledWith({
      cronName: "expire-memberships",
      error: "DB connection failed",
      timestamp: expect.any(String),
    })
  })

  it("still returns 500 even if sendCronFailureAlert rejects", async () => {
    const fakeSupa = {}
    mockValidateCronRequest.mockResolvedValue({ success: true, response: null, supabase: fakeSupa })
    mockSendCronFailureAlert.mockRejectedValue(new Error("email failed"))

    const execute = jest.fn().mockRejectedValue(new Error("cron error"))

    const result = await baseCronHandler(makeRequest(), {
      name: "test-cron",
      execute,
    })

    expect(result.status).toBe(500)
  })

  it("sends string error message when thrown value is not an Error", async () => {
    const fakeSupa = {}
    mockValidateCronRequest.mockResolvedValue({ success: true, response: null, supabase: fakeSupa })

    const execute = jest.fn().mockRejectedValue("string error")

    await baseCronHandler(makeRequest(), { name: "test", execute })

    expect(mockSendCronFailureAlert).toHaveBeenCalledWith(
      expect.objectContaining({ error: "string error" })
    )
  })
})

// ============================================================================
// logCronAudit
// ============================================================================

describe("logCronAudit", () => {
  it("inserts audit event when workspace is found", async () => {
    const { from: fromFn, _insertMock: insertFn } = makeSupabase({ workspaceId: "ws-1" })
    const supabase = { from: fromFn } as never

    await logCronAudit(supabase, "owner-1", {
      entityType: "library_membership",
      entityId: "mem-1",
      action: "expire",
      metadata: { reason: "expired" },
    })

    expect(fromFn).toHaveBeenCalledWith("workspaces")
    expect(fromFn).toHaveBeenCalledWith("audit_events")
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_type: "library_membership",
        entity_id: "mem-1",
        action: "expire",
        actor_id: "system",
        actor_type: "system",
        workspace_id: "ws-1",
        metadata: { reason: "expired" },
      })
    )
  })

  it("does not insert audit event when workspace is not found", async () => {
    const singleMock = jest.fn().mockResolvedValue({ data: null, error: null })
    const fromMock = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: singleMock,
    })
    const supabase = { from: fromMock } as never

    await logCronAudit(supabase, "unknown-owner", {
      entityType: "tenant",
      entityId: null,
      action: "check",
      metadata: {},
    })

    // Only queried workspaces, did not insert to audit_events
    expect(fromMock).toHaveBeenCalledWith("workspaces")
    expect(fromMock).not.toHaveBeenCalledWith("audit_events")
  })
})
