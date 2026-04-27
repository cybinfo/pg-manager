/**
 * Tests for useEntityMutation from src/lib/hooks/useEntityMutation.ts
 *
 * Covers: create, update, remove, bulkCreate, bulkUpdate, bulkDelete —
 * success paths, error paths, audit skip, notification skip, silent mode,
 * soft-delete vs hard-delete branching.
 */

import { renderHook, act } from "@testing-library/react"

// ============================================================================
// Mocks
// ============================================================================

const mockSingle = jest.fn()
const mockSelect = jest.fn(() => ({ single: mockSingle }))
const mockInsert = jest.fn(() => ({ select: mockSelect }))
const mockUpdate = jest.fn(() => ({ eq: jest.fn(() => ({ select: mockSelect })) }))
const mockDelete = jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ error: null }), in: jest.fn().mockResolvedValue({ error: null }) }))
const mockEq = jest.fn()
const mockFrom = jest.fn()

const mockSupabase = { from: mockFrom }

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => mockSupabase),
}))

jest.mock("@/lib/toast-helpers", () => ({
  showSuccess: jest.fn(),
  showError: jest.fn(),
}))

const mockUser = { id: "user-1" }
const mockContext = { context_type: "owner", workspace_id: "ws-1" }

jest.mock("@/lib/auth", () => ({
  useAuth: jest.fn(() => ({ user: mockUser })),
  useCurrentContext: jest.fn(() => ({ context: mockContext })),
}))

jest.mock("@/lib/services/audit.service", () => ({
  logAuditEvent: jest.fn().mockResolvedValue(undefined),
  createAuditEvent: jest.fn((entityType, id, action, actor, payload) => ({
    entityType, id, action, actor, payload,
  })),
  diffObjects: jest.fn((before, after) => ({ before, after })),
}))

jest.mock("@/lib/services/notification.service", () => ({
  sendNotification: jest.fn().mockResolvedValue(undefined),
}))

const mockSoftDelete = jest.fn()
const mockSoftDeleteBatch = jest.fn()
const mockIsSoftDeletable = jest.fn()

jest.mock("@/lib/audit", () => ({
  softDelete: (...args: unknown[]) => mockSoftDelete(...args),
  softDeleteBatch: (...args: unknown[]) => mockSoftDeleteBatch(...args),
  isSoftDeletableTable: (...args: unknown[]) => mockIsSoftDeletable(...args),
}))

jest.mock("@/lib/entity-names", () => ({
  getEntityName: jest.fn((type: string) => type),
}))

jest.mock("@/lib/date-helpers", () => ({
  getNowISO: jest.fn(() => "2026-04-26T00:00:00Z"),
}))

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { useEntityMutation } from "@/lib/hooks/useEntityMutation"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { logAuditEvent, createAuditEvent } from "@/lib/services/audit.service"
import { sendNotification } from "@/lib/services/notification.service"

const mockShowSuccess = showSuccess as jest.Mock
const mockShowError = showError as jest.Mock
const mockLogAuditEvent = logAuditEvent as jest.Mock
const mockCreateAuditEvent = createAuditEvent as jest.Mock
const mockSendNotification = sendNotification as jest.Mock

const BASE_OPTIONS = { entityType: "tenant" as const, table: "tenants" }

// ============================================================================
// Query chain builder helpers
// ============================================================================

function makeSingleResult(result: { data: unknown; error: unknown }) {
  const single = jest.fn().mockResolvedValue(result)
  const select = jest.fn(() => ({ single }))
  const insert = jest.fn(() => ({ select }))
  const update = jest.fn(() => ({ eq: jest.fn(() => ({ select: jest.fn(() => ({ single })) })) }))
  return { single, select, insert, update }
}

function makeFrom(overrides?: {
  insertResult?: { data: unknown; error: unknown }
  beforeResult?: { data: unknown; error: unknown }
  updateResult?: { data: unknown; error: unknown }
}) {
  const insertResult = overrides?.insertResult ?? { data: { id: "e1", name: "Test" }, error: null }
  const beforeResult = overrides?.beforeResult ?? { data: { id: "e1", name: "Old" }, error: null }
  const updateResult = overrides?.updateResult ?? { data: { id: "e1", name: "New" }, error: null }

  const singleForInsert = jest.fn().mockResolvedValue(insertResult)
  const singleForBefore = jest.fn().mockResolvedValue(beforeResult)
  const singleForUpdate = jest.fn().mockResolvedValue(updateResult)

  const insertChain = {
    select: jest.fn(() => ({ single: singleForInsert })),
  }
  const beforeChain = {
    select: jest.fn(() => ({ eq: jest.fn(() => ({ single: singleForBefore })) })),
  }
  const updateChain = {
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({ single: singleForUpdate })),
      })),
    })),
    delete: jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ error: null }) })),
  }

  const from = jest.fn((table: string) => {
    return {
      insert: jest.fn(() => insertChain),
      select: jest.fn(() => beforeChain.select()),
      update: updateChain.update,
      delete: updateChain.delete,
    }
  })

  return from
}

// ============================================================================
// Helper: render the hook
// ============================================================================

function renderMutation(opts = BASE_OPTIONS) {
  return renderHook(() => useEntityMutation(opts))
}

// ============================================================================
// CREATE
// ============================================================================

describe("create — success path", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsSoftDeletable.mockReturnValue(true)
    mockSoftDelete.mockResolvedValue({ error: null })
  })

  it("returns success result with data", async () => {
    const record = { id: "t1", name: "Alice" }
    mockFrom.mockReturnValue({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: record, error: null }),
        })),
      })),
    })
    const { result } = renderMutation()
    let res: unknown
    await act(async () => {
      res = await result.current.create({ name: "Alice" })
    })
    expect((res as { success: boolean }).success).toBe(true)
    expect((res as { data: unknown }).data).toBe(record)
  })

  it("shows success toast by default", async () => {
    const record = { id: "t1", name: "Alice" }
    mockFrom.mockReturnValue({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: record, error: null }),
        })),
      })),
    })
    const { result } = renderMutation()
    await act(async () => { await result.current.create({ name: "Alice" }) })
    expect(mockShowSuccess).toHaveBeenCalledTimes(1)
  })

  it("suppresses toast when silent=true", async () => {
    const record = { id: "t1", name: "Alice" }
    mockFrom.mockReturnValue({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: record, error: null }),
        })),
      })),
    })
    const { result } = renderMutation()
    await act(async () => { await result.current.create({ name: "Alice" }, { silent: true }) })
    expect(mockShowSuccess).not.toHaveBeenCalled()
  })

  it("logs audit event by default", async () => {
    const record = { id: "t1", name: "Alice" }
    mockFrom.mockReturnValue({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: record, error: null }),
        })),
      })),
    })
    const { result } = renderMutation()
    await act(async () => { await result.current.create({ name: "Alice" }) })
    expect(mockLogAuditEvent).toHaveBeenCalledTimes(1)
    expect(mockCreateAuditEvent).toHaveBeenCalledWith(
      "tenant", record.id, "create", expect.objectContaining({ actor_id: "user-1" }), expect.anything()
    )
  })

  it("skips audit when skipAudit=true in mutation options", async () => {
    const record = { id: "t1" }
    mockFrom.mockReturnValue({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: record, error: null }),
        })),
      })),
    })
    const { result } = renderMutation()
    await act(async () => { await result.current.create({}, { skipAudit: true }) })
    expect(mockLogAuditEvent).not.toHaveBeenCalled()
  })

  it("sends notifications when provided", async () => {
    const record = { id: "t1" }
    mockFrom.mockReturnValue({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: record, error: null }),
        })),
      })),
    })
    const notification = { type: "email" as const, recipient: "a@b.com", subject: "Hi", body: "Hello" }
    const { result } = renderMutation()
    await act(async () => {
      await result.current.create({}, { notifications: [notification] })
    })
    expect(mockSendNotification).toHaveBeenCalledWith(notification)
  })

  it("calls onSuccess callback with action=create", async () => {
    const record = { id: "t1" }
    const onSuccess = jest.fn()
    mockFrom.mockReturnValue({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: record, error: null }),
        })),
      })),
    })
    const { result } = renderHook(() =>
      useEntityMutation({ ...BASE_OPTIONS, onSuccess })
    )
    await act(async () => { await result.current.create({}) })
    expect(onSuccess).toHaveBeenCalledWith(record, "create")
  })
})

describe("create — error path", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns failure result when insert returns error", async () => {
    mockFrom.mockReturnValue({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
        })),
      })),
    })
    const { result } = renderMutation()
    let res: unknown
    await act(async () => { res = await result.current.create({}) })
    expect((res as { success: boolean }).success).toBe(false)
    expect(mockShowError).toHaveBeenCalledTimes(1)
  })

  it("calls onError callback on failure", async () => {
    mockFrom.mockReturnValue({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: null, error: { message: "fail" } }),
        })),
      })),
    })
    const onError = jest.fn()
    const { result } = renderHook(() =>
      useEntityMutation({ ...BASE_OPTIONS, onError })
    )
    await act(async () => { await result.current.create({}) })
    expect(onError).toHaveBeenCalledWith(expect.anything(), "create")
  })
})

// ============================================================================
// UPDATE
// ============================================================================

describe("update — success path", () => {
  beforeEach(() => { jest.clearAllMocks() })

  function setupUpdate(beforeData = { id: "t1", name: "Old" }, afterData = { id: "t1", name: "New" }) {
    const singleBefore = jest.fn().mockResolvedValue({ data: beforeData, error: null })
    const singleAfter = jest.fn().mockResolvedValue({ data: afterData, error: null })
    const eqBefore = jest.fn(() => ({ single: singleBefore }))
    const eqUpdate = jest.fn(() => ({ select: jest.fn(() => ({ single: singleAfter })) }))
    mockFrom.mockReturnValue({
      select: jest.fn(() => ({ eq: eqBefore })),
      update: jest.fn(() => ({ eq: eqUpdate })),
    })
  }

  it("returns success with updated data", async () => {
    setupUpdate()
    const { result } = renderMutation()
    let res: unknown
    await act(async () => { res = await result.current.update("t1", { name: "New" }) })
    expect((res as { success: boolean }).success).toBe(true)
    expect((res as { data: { name: string } }).data?.name).toBe("New")
  })

  it("shows success toast", async () => {
    setupUpdate()
    const { result } = renderMutation()
    await act(async () => { await result.current.update("t1", {}) })
    expect(mockShowSuccess).toHaveBeenCalledTimes(1)
  })

  it("logs audit event with diff", async () => {
    setupUpdate()
    const { result } = renderMutation()
    await act(async () => { await result.current.update("t1", { name: "New" }) })
    expect(mockLogAuditEvent).toHaveBeenCalledTimes(1)
    expect(mockCreateAuditEvent).toHaveBeenCalledWith(
      "tenant", "t1", "update", expect.anything(), expect.anything()
    )
  })

  it("skips audit when skipAudit=true", async () => {
    setupUpdate()
    const { result } = renderMutation()
    await act(async () => { await result.current.update("t1", {}, { skipAudit: true }) })
    expect(mockLogAuditEvent).not.toHaveBeenCalled()
  })

  it("uses custom success message when provided", async () => {
    setupUpdate()
    const { result } = renderHook(() =>
      useEntityMutation({ ...BASE_OPTIONS, successMessages: { update: "Saved!" } })
    )
    await act(async () => { await result.current.update("t1", {}) })
    expect(mockShowSuccess).toHaveBeenCalledWith("Saved!")
  })

  it("sends notifications when provided on update", async () => {
    setupUpdate()
    const notification = { type: "email" as const, recipient: "a@b.com", subject: "Updated", body: "Record was updated" }
    const { result } = renderMutation()
    await act(async () => {
      await result.current.update("t1", { name: "New" }, { notifications: [notification] })
    })
    expect(mockSendNotification).toHaveBeenCalledWith(notification)
  })
})

describe("update — error path", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns failure when update errors", async () => {
    const singleBefore = jest.fn().mockResolvedValue({ data: { id: "t1" }, error: null })
    const eqBefore = jest.fn(() => ({ single: singleBefore }))
    const singleAfter = jest.fn().mockResolvedValue({ data: null, error: { message: "denied" } })
    const eqUpdate = jest.fn(() => ({ select: jest.fn(() => ({ single: singleAfter })) }))
    mockFrom.mockReturnValue({
      select: jest.fn(() => ({ eq: eqBefore })),
      update: jest.fn(() => ({ eq: eqUpdate })),
    })
    const { result } = renderMutation()
    let res: unknown
    await act(async () => { res = await result.current.update("t1", {}) })
    expect((res as { success: boolean }).success).toBe(false)
    expect(mockShowError).toHaveBeenCalledTimes(1)
  })
})

// ============================================================================
// REMOVE (soft delete)
// ============================================================================

describe("remove — soft delete path", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsSoftDeletable.mockReturnValue(true)
    mockSoftDelete.mockResolvedValue({ error: null })
  })

  function setupRemove(beforeData = { id: "t1" }) {
    const singleBefore = jest.fn().mockResolvedValue({ data: beforeData, error: null })
    const eqBefore = jest.fn(() => ({ single: singleBefore }))
    mockFrom.mockReturnValue({ select: jest.fn(() => ({ eq: eqBefore })) })
  }

  it("returns success when soft delete succeeds", async () => {
    setupRemove()
    const { result } = renderMutation()
    let res: unknown
    await act(async () => { res = await result.current.remove("t1") })
    expect((res as { success: boolean }).success).toBe(true)
    expect(mockSoftDelete).toHaveBeenCalledWith("tenants", "t1", "user-1")
  })

  it("shows success toast", async () => {
    setupRemove()
    const { result } = renderMutation()
    await act(async () => { await result.current.remove("t1") })
    expect(mockShowSuccess).toHaveBeenCalledTimes(1)
  })

  it("logs audit event on delete", async () => {
    setupRemove()
    const { result } = renderMutation()
    await act(async () => { await result.current.remove("t1") })
    expect(mockLogAuditEvent).toHaveBeenCalledTimes(1)
    expect(mockCreateAuditEvent).toHaveBeenCalledWith(
      "tenant", "t1", "delete", expect.anything(), expect.anything()
    )
  })

  it("calls onSuccess callback", async () => {
    setupRemove()
    const onSuccess = jest.fn()
    const { result } = renderHook(() =>
      useEntityMutation({ ...BASE_OPTIONS, onSuccess })
    )
    await act(async () => { await result.current.remove("t1") })
    expect(onSuccess).toHaveBeenCalledWith(undefined, "delete")
  })

  it("returns failure when soft delete errors", async () => {
    setupRemove()
    mockSoftDelete.mockResolvedValue({ error: new Error("Cannot delete") })
    const { result } = renderMutation()
    let res: unknown
    await act(async () => { res = await result.current.remove("t1") })
    expect((res as { success: boolean }).success).toBe(false)
    expect(mockShowError).toHaveBeenCalledTimes(1)
  })
})

describe("remove — hard delete path", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsSoftDeletable.mockReturnValue(false)
  })

  it("uses hard delete when table is not soft-deletable", async () => {
    const mockDeleteEq = jest.fn().mockResolvedValue({ error: null })
    const mockDeleteFn = jest.fn(() => ({ eq: mockDeleteEq }))
    const singleBefore = jest.fn().mockResolvedValue({ data: { id: "t1" }, error: null })
    const eqBefore = jest.fn(() => ({ single: singleBefore }))
    mockFrom.mockReturnValue({
      select: jest.fn(() => ({ eq: eqBefore })),
      delete: mockDeleteFn,
    })
    const { result } = renderMutation()
    let res: unknown
    await act(async () => { res = await result.current.remove("t1") })
    expect((res as { success: boolean }).success).toBe(true)
    expect(mockDeleteFn).toHaveBeenCalled()
    expect(mockSoftDelete).not.toHaveBeenCalled()
  })

  it("returns failure when hard delete throws an error", async () => {
    const mockDeleteEq = jest.fn().mockResolvedValue({ error: { message: "permission denied" } })
    const mockDeleteFn = jest.fn(() => ({ eq: mockDeleteEq }))
    const singleBefore = jest.fn().mockResolvedValue({ data: { id: "t1" }, error: null })
    const eqBefore = jest.fn(() => ({ single: singleBefore }))
    mockFrom.mockReturnValue({
      select: jest.fn(() => ({ eq: eqBefore })),
      delete: mockDeleteFn,
    })
    const { result } = renderMutation()
    let res: unknown
    await act(async () => { res = await result.current.remove("t1") })
    expect((res as { success: boolean }).success).toBe(false)
    expect(mockShowError).toHaveBeenCalledTimes(1)
  })
})

// ============================================================================
// BULK CREATE
// ============================================================================

describe("bulkCreate — success path", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns success with array of created records", async () => {
    const records = [{ id: "t1" }, { id: "t2" }]
    const selectFn = jest.fn().mockResolvedValue({ data: records, error: null })
    mockFrom.mockReturnValue({
      insert: jest.fn(() => ({ select: selectFn })),
    })
    const { result } = renderMutation()
    let res: unknown
    await act(async () => { res = await result.current.bulkCreate([{ name: "A" }, { name: "B" }]) })
    expect((res as { success: boolean }).success).toBe(true)
    expect((res as { data: unknown[] }).data).toHaveLength(2)
  })

  it("shows success toast with count", async () => {
    const records = [{ id: "t1" }, { id: "t2" }]
    const selectFn = jest.fn().mockResolvedValue({ data: records, error: null })
    mockFrom.mockReturnValue({ insert: jest.fn(() => ({ select: selectFn })) })
    const { result } = renderMutation()
    await act(async () => { await result.current.bulkCreate([{}, {}]) })
    expect(mockShowSuccess).toHaveBeenCalledWith("2 tenants created successfully")
  })

  it("logs audit event for bulk create", async () => {
    const records = [{ id: "t1" }]
    mockFrom.mockReturnValue({ insert: jest.fn(() => ({ select: jest.fn().mockResolvedValue({ data: records, error: null }) })) })
    const { result } = renderMutation()
    await act(async () => { await result.current.bulkCreate([{}]) })
    expect(mockLogAuditEvent).toHaveBeenCalledTimes(1)
  })

  it("returns failure when bulk insert errors", async () => {
    mockFrom.mockReturnValue({ insert: jest.fn(() => ({ select: jest.fn().mockResolvedValue({ data: null, error: { message: "fail" } }) })) })
    const { result } = renderMutation()
    let res: unknown
    await act(async () => { res = await result.current.bulkCreate([{}]) })
    expect((res as { success: boolean }).success).toBe(false)
    expect(mockShowError).toHaveBeenCalledTimes(1)
  })
})

// ============================================================================
// BULK UPDATE
// ============================================================================

describe("bulkUpdate — success path", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns success with all updated records", async () => {
    const records = [{ id: "t1", name: "A" }, { id: "t2", name: "B" }]
    let callIdx = 0
    const singleFn = jest.fn(() => Promise.resolve({ data: records[callIdx++], error: null }))
    const selectFn = jest.fn(() => ({ single: singleFn }))
    const eqFn = jest.fn(() => ({ select: selectFn }))
    const updateFn = jest.fn(() => ({ eq: eqFn }))
    mockFrom.mockReturnValue({ update: updateFn })
    const { result } = renderMutation()
    let res: unknown
    await act(async () => {
      res = await result.current.bulkUpdate([
        { id: "t1", data: { name: "A" } },
        { id: "t2", data: { name: "B" } },
      ])
    })
    expect((res as { success: boolean }).success).toBe(true)
    expect((res as { data: unknown[] }).data).toHaveLength(2)
  })

  it("shows success toast with count", async () => {
    const singleFn = jest.fn().mockResolvedValue({ data: { id: "t1" }, error: null })
    const updateFn = jest.fn(() => ({ eq: jest.fn(() => ({ select: jest.fn(() => ({ single: singleFn })) })) }))
    mockFrom.mockReturnValue({ update: updateFn })
    const { result } = renderMutation()
    await act(async () => {
      await result.current.bulkUpdate([{ id: "t1", data: {} }])
    })
    expect(mockShowSuccess).toHaveBeenCalledWith("1 tenants updated successfully")
  })

  it("returns failure when one update errors", async () => {
    const singleFn = jest.fn().mockResolvedValue({ data: null, error: { message: "denied" } })
    const updateFn = jest.fn(() => ({ eq: jest.fn(() => ({ select: jest.fn(() => ({ single: singleFn })) })) }))
    mockFrom.mockReturnValue({ update: updateFn })
    const { result } = renderMutation()
    let res: unknown
    await act(async () => {
      res = await result.current.bulkUpdate([{ id: "t1", data: {} }])
    })
    expect((res as { success: boolean }).success).toBe(false)
    expect(mockShowError).toHaveBeenCalledTimes(1)
  })
})

// ============================================================================
// BULK DELETE
// ============================================================================

describe("bulkDelete — soft delete path", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsSoftDeletable.mockReturnValue(true)
    mockSoftDeleteBatch.mockResolvedValue({ error: null })
  })

  it("calls softDeleteBatch and returns success", async () => {
    mockFrom.mockReturnValue({})
    const { result } = renderMutation()
    let res: unknown
    await act(async () => { res = await result.current.bulkDelete(["t1", "t2"]) })
    expect((res as { success: boolean }).success).toBe(true)
    expect(mockSoftDeleteBatch).toHaveBeenCalledWith("tenants", ["t1", "t2"], "user-1")
  })

  it("shows success toast with count", async () => {
    mockFrom.mockReturnValue({})
    const { result } = renderMutation()
    await act(async () => { await result.current.bulkDelete(["t1", "t2", "t3"]) })
    expect(mockShowSuccess).toHaveBeenCalledWith("3 tenants deleted successfully")
  })

  it("logs audit event", async () => {
    mockFrom.mockReturnValue({})
    const { result } = renderMutation()
    await act(async () => { await result.current.bulkDelete(["t1"]) })
    expect(mockLogAuditEvent).toHaveBeenCalledTimes(1)
  })

  it("returns failure when softDeleteBatch errors", async () => {
    mockSoftDeleteBatch.mockResolvedValue({ error: new Error("Batch fail") })
    mockFrom.mockReturnValue({})
    const { result } = renderMutation()
    let res: unknown
    await act(async () => { res = await result.current.bulkDelete(["t1"]) })
    expect((res as { success: boolean }).success).toBe(false)
    expect(mockShowError).toHaveBeenCalledTimes(1)
  })
})

describe("bulkDelete — hard delete path", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsSoftDeletable.mockReturnValue(false)
  })

  it("uses hard delete .in() when table is not soft-deletable", async () => {
    const inFn = jest.fn().mockResolvedValue({ error: null })
    const deleteFn = jest.fn(() => ({ in: inFn }))
    mockFrom.mockReturnValue({ delete: deleteFn })
    const { result } = renderMutation()
    let res: unknown
    await act(async () => { res = await result.current.bulkDelete(["t1", "t2"]) })
    expect((res as { success: boolean }).success).toBe(true)
    expect(inFn).toHaveBeenCalledWith("id", ["t1", "t2"])
    expect(mockSoftDeleteBatch).not.toHaveBeenCalled()
  })

  it("returns failure when hard bulk delete throws an error", async () => {
    const inFn = jest.fn().mockResolvedValue({ error: { message: "bulk delete denied" } })
    const deleteFn = jest.fn(() => ({ in: inFn }))
    mockFrom.mockReturnValue({ delete: deleteFn })
    const { result } = renderMutation()
    let res: unknown
    await act(async () => { res = await result.current.bulkDelete(["t1", "t2"]) })
    expect((res as { success: boolean }).success).toBe(false)
    expect(mockShowError).toHaveBeenCalledTimes(1)
  })
})

// ============================================================================
// Loading state
// ============================================================================

describe("loading state", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("starts as false", () => {
    const { result } = renderMutation()
    expect(result.current.loading).toBe(false)
  })

  it("error starts as null", () => {
    const { result } = renderMutation()
    expect(result.current.error).toBeNull()
  })
})

// ============================================================================
// Global skip flags on hook options
// ============================================================================

describe("globalSkipAudit flag", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("skips audit for all operations when skipAudit=true on hook options", async () => {
    const record = { id: "t1" }
    mockFrom.mockReturnValue({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: record, error: null }),
        })),
      })),
    })
    const { result } = renderHook(() =>
      useEntityMutation({ ...BASE_OPTIONS, skipAudit: true })
    )
    await act(async () => { await result.current.create({}) })
    expect(mockLogAuditEvent).not.toHaveBeenCalled()
  })
})

describe("globalSkipNotifications flag", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("skips notifications even when notifications array provided in mutation options", async () => {
    const record = { id: "t1" }
    mockFrom.mockReturnValue({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: record, error: null }),
        })),
      })),
    })
    const notification = { type: "email" as const, recipient: "a@b.com", subject: "Hi", body: "Hi" }
    const { result } = renderHook(() =>
      useEntityMutation({ ...BASE_OPTIONS, skipNotifications: true })
    )
    await act(async () => {
      await result.current.create({}, { notifications: [notification] })
    })
    expect(mockSendNotification).not.toHaveBeenCalled()
  })
})
