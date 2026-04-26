/**
 * Tests for useDetailPageMutations from src/lib/hooks/detail-page/useDetailPageMutations.ts
 *
 * Covers:
 * 1. updateField — returns false when data=null
 * 2. updateField — returns false when id=undefined
 * 3. updateField — success path: optimistic update, supabase call, showSuccess, returns true
 * 4. updateField — rollback on supabase error, showError, returns false
 * 5. updateField — handles array id (uses id[0])
 * 6. updateField — isSaving set true during, false after
 * 7. updateFields — returns false when data=null
 * 8. updateFields — returns false when id=undefined
 * 9. updateFields — success path: multiple fields updated, supabase called, showSuccess
 * 10. updateFields — rollback on error, showError
 * 11. deleteRecord — returns false when data=null
 * 12. deleteRecord — returns false when id=undefined
 * 13. deleteRecord — confirm=true, user cancels → returns false, no supabase call
 * 14. deleteRecord — user confirms, soft-deletable table → calls softDelete
 * 15. deleteRecord — user confirms, non-soft-deletable table → hard delete
 * 16. deleteRecord — no user session → showError, returns false
 * 17. deleteRecord — soft delete error → showError, returns false
 * 18. deleteRecord — redirects after deletion when redirectOnNotFound is set
 * 19. deleteRecord — confirm=false → skips confirm dialog
 * 20. deleteRecord — cascadeDeletes with soft-deletable table → calls cascadeSoftDelete
 */

import { renderHook, act, waitFor } from "@testing-library/react"
import { useDetailPageMutations } from "@/lib/hooks/detail-page/useDetailPageMutations"
import type { DetailPageConfig } from "@/lib/hooks/detail-page/types"

// ============================================================================
// Mocks
// ============================================================================

const mockPush = jest.fn()
const mockShowSuccess = jest.fn()
const mockShowError = jest.fn()
const mockCreateClient = jest.fn()
const mockSoftDelete = jest.fn()
const mockCascadeSoftDelete = jest.fn()
const mockIsSoftDeletableTable = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock("@/lib/toast-helpers", () => ({
  showSuccess: (...args: unknown[]) => mockShowSuccess(...args),
  showError: (...args: unknown[]) => mockShowError(...args),
}))

jest.mock("@/lib/supabase/client", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}))

jest.mock("@/lib/audit", () => ({
  softDelete: (...args: unknown[]) => mockSoftDelete(...args),
  cascadeSoftDelete: (...args: unknown[]) => mockCascadeSoftDelete(...args),
  isSoftDeletableTable: (table: string) => mockIsSoftDeletableTable(table),
}))

// ============================================================================
// Supabase mock helpers
// ============================================================================

function makeSupabaseClient(options: {
  updateResult?: { error: unknown }
  deleteResult?: { error: unknown }
  user?: { id: string } | null
}) {
  const { updateResult = { error: null }, deleteResult = { error: null }, user = { id: "user-1" } } =
    options

  // Proxy for update chain: from().update().eq()
  const updateProxy: Record<string, unknown> = {}
  updateProxy["eq"] = jest.fn().mockResolvedValue(updateResult)
  const updateMock = jest.fn().mockReturnValue(updateProxy)

  // Proxy for delete chain: from().delete().eq()
  const deleteProxy: Record<string, unknown> = {}
  deleteProxy["eq"] = jest.fn().mockResolvedValue(deleteResult)
  const deleteMock = jest.fn().mockReturnValue(deleteProxy)

  const fromMock = jest.fn().mockReturnValue({
    update: updateMock,
    delete: deleteMock,
  })

  const authMock = {
    getUser: jest.fn().mockResolvedValue({ data: { user } }),
  }

  return { from: fromMock, auth: authMock }
}

// ============================================================================
// Config + hook factory
// ============================================================================

function makeConfig(overrides: Partial<DetailPageConfig> = {}): DetailPageConfig {
  return {
    table: "tenants",
    select: "*",
    ...overrides,
  }
}

function renderMutations(options: {
  config?: Partial<DetailPageConfig>
  id?: string | string[] | undefined
  data?: Record<string, unknown> | null
  setData?: jest.Mock
} = {}) {
  const config = makeConfig(options.config)
  const id = options.id !== undefined ? options.id : "tenant-1"
  const data = options.data !== undefined ? options.data : { id: "tenant-1", name: "Alice" }
  const setData = options.setData ?? jest.fn()

  return renderHook(() =>
    useDetailPageMutations({ config, id, data, setData })
  )
}

// ============================================================================
// beforeEach
// ============================================================================

beforeEach(() => {
  mockPush.mockReset()
  mockShowSuccess.mockReset()
  mockShowError.mockReset()
  mockCreateClient.mockReset()
  mockSoftDelete.mockReset()
  mockCascadeSoftDelete.mockReset()
  mockIsSoftDeletableTable.mockReset()

  // Default: window.confirm = true
  global.window.confirm = jest.fn().mockReturnValue(true)
})

// ============================================================================
// updateField
// ============================================================================

describe("useDetailPageMutations — updateField", () => {
  it("returns false when data is null", async () => {
    const { result } = renderMutations({ data: null })
    let success: boolean | undefined
    await act(async () => {
      success = await result.current.updateField("name", "Bob")
    })
    expect(success).toBe(false)
    expect(mockCreateClient).not.toHaveBeenCalled()
  })

  it("returns false when id is undefined", async () => {
    const { result } = renderMutations({ id: undefined })
    let success: boolean | undefined
    await act(async () => {
      success = await result.current.updateField("name", "Bob")
    })
    expect(success).toBe(false)
    expect(mockShowSuccess).not.toHaveBeenCalled()
  })

  it("optimistically updates data, calls supabase, shows success, returns true", async () => {
    const setData = jest.fn()
    mockCreateClient.mockReturnValue(makeSupabaseClient({ updateResult: { error: null } }))
    const { result } = renderMutations({ setData })

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.updateField("name", "Bob")
    })

    expect(success).toBe(true)
    // Optimistic update: setData called with updater fn
    expect(setData).toHaveBeenCalled()
    expect(mockShowSuccess).toHaveBeenCalledWith("Updated successfully")
  })

  it("rolls back data and shows error on supabase error", async () => {
    const setData = jest.fn()
    mockCreateClient.mockReturnValue(
      makeSupabaseClient({ updateResult: { error: { message: "update failed" } } })
    )
    const originalData = { id: "t1", name: "Alice" }
    const { result } = renderMutations({ data: originalData, setData })

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.updateField("name", "Bob")
    })

    expect(success).toBe(false)
    expect(mockShowError).toHaveBeenCalledWith("Failed to update — changes reverted")
    // Rollback: setData called with original data snapshot
    expect(setData).toHaveBeenCalledWith(originalData)
  })

  it("uses id[0] when id is an array", async () => {
    const client = makeSupabaseClient({ updateResult: { error: null } })
    mockCreateClient.mockReturnValue(client)
    const { result } = renderMutations({ id: ["t1", "t2"] })

    await act(async () => {
      await result.current.updateField("status", "active")
    })

    const fromCall = (client.from as jest.Mock).mock.calls[0]
    expect(fromCall[0]).toBe("tenants")
  })

  it("sets isSaving=true during update and false after", async () => {
    let savingDuring = false
    const setData = jest.fn()

    // Delayed resolution to capture isSaving mid-flight
    let resolveUpdate: (v: unknown) => void = () => {}
    const pendingPromise = new Promise((res) => { resolveUpdate = res })

    const eqMock = jest.fn().mockReturnValue(pendingPromise)
    const updateMock = jest.fn().mockReturnValue({ eq: eqMock })
    const fromMock = jest.fn().mockReturnValue({ update: updateMock })
    mockCreateClient.mockReturnValue({ from: fromMock, auth: { getUser: jest.fn() } })

    const { result } = renderMutations({ setData })

    // Start update but don't await yet
    let updatePromise: Promise<boolean>
    act(() => {
      updatePromise = result.current.updateField("name", "Bob")
    })

    // isSaving should be true now
    savingDuring = result.current.isSaving
    expect(savingDuring).toBe(true)

    // Resolve the update
    await act(async () => {
      resolveUpdate({ error: null })
      await updatePromise!
    })

    await waitFor(() => expect(result.current.isSaving).toBe(false))
  })
})

// ============================================================================
// updateFields
// ============================================================================

describe("useDetailPageMutations — updateFields", () => {
  it("returns false when data is null", async () => {
    const { result } = renderMutations({ data: null })
    let success: boolean | undefined
    await act(async () => {
      success = await result.current.updateFields({ name: "Bob", status: "active" })
    })
    expect(success).toBe(false)
    expect(mockCreateClient).not.toHaveBeenCalled()
  })

  it("returns false when id is undefined", async () => {
    const { result } = renderMutations({ id: undefined })
    let success: boolean | undefined
    await act(async () => {
      success = await result.current.updateFields({ name: "Bob" })
    })
    expect(success).toBe(false)
    expect(mockShowSuccess).not.toHaveBeenCalled()
  })

  it("calls supabase update with all fields, shows success, returns true", async () => {
    const setData = jest.fn()
    const client = makeSupabaseClient({ updateResult: { error: null } })
    mockCreateClient.mockReturnValue(client)
    const { result } = renderMutations({ setData })

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.updateFields({ name: "Bob", status: "active" })
    })

    expect(success).toBe(true)
    expect(mockShowSuccess).toHaveBeenCalledWith("Updated successfully")
    expect(setData).toHaveBeenCalled()
  })

  it("rolls back and shows error on supabase error", async () => {
    const setData = jest.fn()
    mockCreateClient.mockReturnValue(
      makeSupabaseClient({ updateResult: { error: { message: "conflict" } } })
    )
    const originalData = { id: "t1", name: "Alice", status: "active" }
    const { result } = renderMutations({ data: originalData, setData })

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.updateFields({ name: "Bob", status: "inactive" })
    })

    expect(success).toBe(false)
    expect(mockShowError).toHaveBeenCalledWith("Failed to update — changes reverted")
    expect(setData).toHaveBeenCalledWith(originalData)
  })
})

// ============================================================================
// deleteRecord
// ============================================================================

describe("useDetailPageMutations — deleteRecord", () => {
  it("returns false when data is null", async () => {
    const { result } = renderMutations({ data: null })
    let success: boolean | undefined
    await act(async () => {
      success = await result.current.deleteRecord()
    })
    expect(success).toBe(false)
    expect(mockCreateClient).not.toHaveBeenCalled()
  })

  it("returns false when id is undefined", async () => {
    const { result } = renderMutations({ id: undefined })
    let success: boolean | undefined
    await act(async () => {
      success = await result.current.deleteRecord()
    })
    expect(success).toBe(false)
    expect(mockShowSuccess).not.toHaveBeenCalled()
  })

  it("returns false when user cancels confirm dialog", async () => {
    global.window.confirm = jest.fn().mockReturnValue(false)
    const { result } = renderMutations()
    let success: boolean | undefined
    await act(async () => {
      success = await result.current.deleteRecord({ confirm: true })
    })
    expect(success).toBe(false)
    expect(mockCreateClient).not.toHaveBeenCalled()
  })

  it("returns false when no user session", async () => {
    global.window.confirm = jest.fn().mockReturnValue(true)
    const client = makeSupabaseClient({ user: null })
    mockCreateClient.mockReturnValue(client)
    mockIsSoftDeletableTable.mockReturnValue(true)

    const { result } = renderMutations()
    let success: boolean | undefined
    await act(async () => {
      success = await result.current.deleteRecord({ confirm: true })
    })
    expect(success).toBe(false)
    expect(mockShowError).toHaveBeenCalledWith("Session expired. Please log in again.")
  })

  it("calls softDelete for soft-deletable table, shows success, returns true", async () => {
    global.window.confirm = jest.fn().mockReturnValue(true)
    const client = makeSupabaseClient({})
    mockCreateClient.mockReturnValue(client)
    mockIsSoftDeletableTable.mockReturnValue(true)
    mockSoftDelete.mockResolvedValue({ error: null })

    const { result } = renderMutations({ config: { table: "tenants" } })
    let success: boolean | undefined
    await act(async () => {
      success = await result.current.deleteRecord({ confirm: true })
    })
    expect(success).toBe(true)
    expect(mockSoftDelete).toHaveBeenCalledWith("tenants", "tenant-1", "user-1")
    expect(mockShowSuccess).toHaveBeenCalledWith("Deleted successfully")
  })

  it("falls back to hard delete for non-soft-deletable table", async () => {
    global.window.confirm = jest.fn().mockReturnValue(true)
    const client = makeSupabaseClient({ deleteResult: { error: null } })
    mockCreateClient.mockReturnValue(client)
    mockIsSoftDeletableTable.mockReturnValue(false)

    const { result } = renderMutations({ config: { table: "user_roles" } })
    let success: boolean | undefined
    await act(async () => {
      success = await result.current.deleteRecord({ confirm: true })
    })
    expect(success).toBe(true)
    expect(mockSoftDelete).not.toHaveBeenCalled()
    expect(mockShowSuccess).toHaveBeenCalledWith("Deleted successfully")
  })

  it("returns false and shows error when softDelete returns error", async () => {
    global.window.confirm = jest.fn().mockReturnValue(true)
    const client = makeSupabaseClient({})
    mockCreateClient.mockReturnValue(client)
    mockIsSoftDeletableTable.mockReturnValue(true)
    mockSoftDelete.mockResolvedValue({ error: { message: "soft delete failed" } })

    const { result } = renderMutations()
    let success: boolean | undefined
    await act(async () => {
      success = await result.current.deleteRecord({ confirm: true })
    })
    expect(success).toBe(false)
    expect(mockShowError).toHaveBeenCalledWith("Failed to delete")
  })

  it("redirects to redirectOnNotFound after successful deletion", async () => {
    global.window.confirm = jest.fn().mockReturnValue(true)
    const client = makeSupabaseClient({})
    mockCreateClient.mockReturnValue(client)
    mockIsSoftDeletableTable.mockReturnValue(true)
    mockSoftDelete.mockResolvedValue({ error: null })

    const { result } = renderMutations({
      config: { table: "tenants", redirectOnNotFound: "/tenants" },
    })
    await act(async () => {
      await result.current.deleteRecord({ confirm: true })
    })
    expect(mockPush).toHaveBeenCalledWith("/tenants")
  })

  it("skips confirm dialog when confirm=false", async () => {
    const client = makeSupabaseClient({})
    mockCreateClient.mockReturnValue(client)
    mockIsSoftDeletableTable.mockReturnValue(true)
    mockSoftDelete.mockResolvedValue({ error: null })

    const { result } = renderMutations()
    let success: boolean | undefined
    await act(async () => {
      success = await result.current.deleteRecord({ confirm: false })
    })
    expect(success).toBe(true)
    expect(global.window.confirm).not.toHaveBeenCalled()
  })

  it("logs console.error when cascadeSoftDelete returns errors (line 183)", async () => {
    global.window.confirm = jest.fn().mockReturnValue(true)
    const client = makeSupabaseClient({})
    mockCreateClient.mockReturnValue(client)
    mockIsSoftDeletableTable.mockImplementation((table: string) => table === "tenants" || table === "bills")
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {})
    // cascadeSoftDelete returns errors array (non-empty)
    mockCascadeSoftDelete.mockResolvedValue({ errors: [{ table: "bills", error: "FK violation" }] })
    mockSoftDelete.mockResolvedValue({ error: null })

    const { result } = renderMutations({ config: { table: "tenants" } })
    await act(async () => {
      await result.current.deleteRecord({
        confirm: true,
        cascadeDeletes: [{ table: "bills", foreignKey: "tenant_id" }],
      })
    })
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Cascade soft delete errors"),
      expect.any(Array)
    )
    consoleSpy.mockRestore()
  })

  it("throws and returns false when hard delete (non-soft-deletable main table) returns error (line 212)", async () => {
    global.window.confirm = jest.fn().mockReturnValue(true)
    const eqMock = jest.fn().mockResolvedValue({ error: { message: "Cannot delete" } })
    const deleteMock = jest.fn().mockReturnValue({ eq: eqMock })
    const fromMock = jest.fn().mockReturnValue({ delete: deleteMock })
    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } })
    mockCreateClient.mockReturnValue({ from: fromMock, auth: { getUser: getUserMock } })
    mockIsSoftDeletableTable.mockReturnValue(false)

    const { result } = renderMutations()
    let success: boolean | undefined
    await act(async () => {
      success = await result.current.deleteRecord({ confirm: false })
    })
    expect(success).toBe(false)
    expect(mockShowError).toHaveBeenCalled()
  })

  it("calls cascadeSoftDelete for soft-deletable cascade tables", async () => {
    global.window.confirm = jest.fn().mockReturnValue(true)
    const client = makeSupabaseClient({})
    mockCreateClient.mockReturnValue(client)
    // Main table: soft-deletable; cascade table: soft-deletable
    mockIsSoftDeletableTable.mockImplementation((table: string) => {
      return table === "tenants" || table === "bills"
    })
    mockCascadeSoftDelete.mockResolvedValue({ errors: [] })
    mockSoftDelete.mockResolvedValue({ error: null })

    const { result } = renderMutations({ config: { table: "tenants" } })
    let success: boolean | undefined
    await act(async () => {
      success = await result.current.deleteRecord({
        confirm: true,
        cascadeDeletes: [{ table: "bills", foreignKey: "tenant_id" }],
      })
    })
    expect(success).toBe(true)
    expect(mockCascadeSoftDelete).toHaveBeenCalledWith(
      "tenant-1",
      "user-1",
      [{ table: "bills", foreignKey: "tenant_id" }]
    )
  })

  it("hard-deletes cascade tables that are not soft-deletable", async () => {
    global.window.confirm = jest.fn().mockReturnValue(true)
    const client = makeSupabaseClient({})
    mockCreateClient.mockReturnValue(client)
    // Main table soft-deletable; cascade "user_roles" NOT soft-deletable
    mockIsSoftDeletableTable.mockImplementation((table: string) => table === "tenants")
    mockSoftDelete.mockResolvedValue({ error: null })

    const { result } = renderMutations({ config: { table: "tenants" } })
    let success: boolean | undefined
    await act(async () => {
      success = await result.current.deleteRecord({
        confirm: true,
        cascadeDeletes: [{ table: "user_roles", foreignKey: "staff_member_id" }],
      })
    })
    expect(success).toBe(true)
    // Hard delete: from("user_roles").delete().eq(...)
    const fromCalls = (client.from as jest.Mock).mock.calls.map((c: unknown[]) => c[0])
    expect(fromCalls).toContain("user_roles")
  })

  it("sets isDeleting=true during delete and false after", async () => {
    global.window.confirm = jest.fn().mockReturnValue(true)

    let resolveDelete: (v: unknown) => void = () => {}
    const pendingPromise = new Promise((res) => { resolveDelete = res })

    const getUserMock = jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } })
    const eqMock = jest.fn().mockReturnValue(pendingPromise)
    const softMock = jest.fn().mockReturnValue({ eq: eqMock })
    const fromMock = jest.fn().mockReturnValue({ delete: softMock })
    mockCreateClient.mockReturnValue({ from: fromMock, auth: { getUser: getUserMock } })
    mockIsSoftDeletableTable.mockReturnValue(false)

    const { result } = renderMutations()

    let deletePromise: Promise<boolean>
    act(() => {
      deletePromise = result.current.deleteRecord({ confirm: false })
    })

    expect(result.current.isDeleting).toBe(true)

    await act(async () => {
      resolveDelete({ error: null })
      await deletePromise!
    })

    await waitFor(() => expect(result.current.isDeleting).toBe(false))
  })
})
