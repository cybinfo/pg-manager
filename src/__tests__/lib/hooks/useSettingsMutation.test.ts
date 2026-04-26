/**
 * Tests for useSettingsMutation from src/lib/hooks/useSettingsMutation.ts
 *
 * Covers: initial state, update path (happy + error), insert path (happy + no-user + error),
 * custom messages, and saving flag lifecycle.
 */

import { renderHook, act } from "@testing-library/react"
import { useSettingsMutation } from "@/lib/hooks/useSettingsMutation"

// ============================================================================
// Mocks
// ============================================================================

const mockCreateClient = jest.fn()
const mockShowSuccess = jest.fn()
const mockShowError = jest.fn()
const mockWithCreatedBy = jest.fn()

jest.mock("@/lib/supabase/client", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}))

jest.mock("@/lib/toast-helpers", () => ({
  showSuccess: (...args: unknown[]) => mockShowSuccess(...args),
  showError: (...args: unknown[]) => mockShowError(...args),
}))

jest.mock("@/lib/audit", () => ({
  withCreatedBy: (...args: unknown[]) => mockWithCreatedBy(...args),
}))

// ============================================================================
// Supabase chain builder helpers
// ============================================================================

/**
 * Build a minimal chainable Supabase mock for the UPDATE path:
 *   supabase.from("owner_config").update(fields).eq("id", configId)
 *   → resolves to { error }
 */
function makeUpdateChain(result: { error: unknown }) {
  const chain = {
    eq: jest.fn().mockResolvedValue(result),
    // provide update so we can spy on it
  }
  const update = jest.fn().mockReturnValue(chain)
  return { update, eqMock: chain.eq }
}

/**
 * Build a minimal chainable Supabase mock for the INSERT path:
 *   supabase.from("owner_config").insert(data).select().single()
 *   → resolves to { data, error }
 */
function makeInsertChain(result: { data: unknown; error: unknown }) {
  const single = jest.fn().mockResolvedValue(result)
  const select = jest.fn().mockReturnValue({ single })
  const insert = jest.fn().mockReturnValue({ select })
  return { insert, selectMock: select, singleMock: single }
}

/**
 * Assemble a full supabase client mock for the UPDATE path.
 */
function makeUpdateSupabase(
  updateResult: { error: unknown },
  getUserResult = { data: { user: { id: "user-1" } } }
) {
  const { update, eqMock } = makeUpdateChain(updateResult)
  const from = jest.fn().mockReturnValue({ update })
  return {
    client: { from, auth: { getUser: jest.fn().mockResolvedValue(getUserResult) } },
    from,
    update,
    eqMock,
  }
}

/**
 * Assemble a full supabase client mock for the INSERT path.
 */
function makeInsertSupabase(
  insertResult: { data: unknown; error: unknown },
  getUserResult: { data: { user: { id: string } | null } }
) {
  const { insert, selectMock, singleMock } = makeInsertChain(insertResult)
  const from = jest.fn().mockReturnValue({ insert })
  return {
    client: { from, auth: { getUser: jest.fn().mockResolvedValue(getUserResult) } },
    from,
    insert,
    selectMock,
    singleMock,
  }
}

// ============================================================================
// Setup
// ============================================================================

beforeEach(() => {
  mockCreateClient.mockReset()
  mockShowSuccess.mockReset()
  mockShowError.mockReset()
  // withCreatedBy is transparent — returns its first argument unchanged
  mockWithCreatedBy.mockImplementation((data: unknown) => data)
})

// ============================================================================
// Initial state
// ============================================================================

describe("useSettingsMutation — initial state", () => {
  it("saving is false before any save is called", () => {
    const { result } = renderHook(() =>
      useSettingsMutation({ configId: "cfg-1" })
    )
    expect(result.current.saving).toBe(false)
  })
})

// ============================================================================
// Update path (configId provided)
// ============================================================================

describe("useSettingsMutation — update path", () => {
  it("calls update().eq() on owner_config with the provided fields and configId", async () => {
    const { client, from, update, eqMock } = makeUpdateSupabase({ error: null })
    mockCreateClient.mockReturnValue(client)

    const { result } = renderHook(() =>
      useSettingsMutation({ configId: "cfg-42" })
    )

    await act(async () => {
      await result.current.save({ setting_a: "value" })
    })

    expect(from).toHaveBeenCalledWith("owner_config")
    expect(update).toHaveBeenCalledWith({ setting_a: "value" })
    expect(eqMock).toHaveBeenCalledWith("id", "cfg-42")
  })

  it("returns true and shows default success toast on a successful update", async () => {
    const { client } = makeUpdateSupabase({ error: null })
    mockCreateClient.mockReturnValue(client)

    const { result } = renderHook(() =>
      useSettingsMutation({ configId: "cfg-1" })
    )

    let ok: boolean | undefined
    await act(async () => {
      ok = await result.current.save({ currency: "INR" })
    })

    expect(ok).toBe(true)
    expect(mockShowSuccess).toHaveBeenCalledWith("Settings saved")
    expect(mockShowError).not.toHaveBeenCalled()
  })

  it("does NOT call auth.getUser on the update path", async () => {
    const { client } = makeUpdateSupabase({ error: null })
    mockCreateClient.mockReturnValue(client)

    const { result } = renderHook(() =>
      useSettingsMutation({ configId: "cfg-1" })
    )

    await act(async () => {
      await result.current.save({ currency: "INR" })
    })

    expect(client.auth.getUser).not.toHaveBeenCalled()
  })

  it("returns false and shows default error toast when update throws a Supabase error", async () => {
    const { client } = makeUpdateSupabase({ error: { message: "update failed" } })
    mockCreateClient.mockReturnValue(client)

    const { result } = renderHook(() =>
      useSettingsMutation({ configId: "cfg-1" })
    )

    let ok: boolean | undefined
    await act(async () => {
      ok = await result.current.save({ currency: "INR" })
    })

    expect(ok).toBe(false)
    expect(mockShowError).toHaveBeenCalledWith("Failed to save settings")
    expect(mockShowSuccess).not.toHaveBeenCalled()
  })
})

// ============================================================================
// Insert path (no configId)
// ============================================================================

describe("useSettingsMutation — insert path", () => {
  const newConfig = { id: "cfg-new", owner_id: "user-1", currency: "INR" }
  const getUserOk = { data: { user: { id: "user-1" } } }

  it("calls auth.getUser, then insert().select().single() on owner_config", async () => {
    const { client, from, insert } = makeInsertSupabase(
      { data: newConfig, error: null },
      getUserOk
    )
    mockCreateClient.mockReturnValue(client)

    const { result } = renderHook(() =>
      useSettingsMutation({ configId: null })
    )

    await act(async () => {
      await result.current.save({ currency: "INR" })
    })

    expect(client.auth.getUser).toHaveBeenCalled()
    expect(from).toHaveBeenCalledWith("owner_config")
    expect(insert).toHaveBeenCalled()
  })

  it("passes fields merged with owner_id into withCreatedBy, then insert", async () => {
    const { client, insert } = makeInsertSupabase(
      { data: newConfig, error: null },
      getUserOk
    )
    mockCreateClient.mockReturnValue(client)

    const { result } = renderHook(() =>
      useSettingsMutation({ configId: null })
    )

    await act(async () => {
      await result.current.save({ currency: "INR" })
    })

    // withCreatedBy received merged object with owner_id and the field
    expect(mockWithCreatedBy).toHaveBeenCalledWith(
      expect.objectContaining({ owner_id: "user-1", currency: "INR" }),
      "user-1"
    )
    // insert received the (transparent) return value from withCreatedBy
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ owner_id: "user-1", currency: "INR" })
    )
  })

  it("calls setConfig with the newly inserted row", async () => {
    const { client } = makeInsertSupabase(
      { data: newConfig, error: null },
      getUserOk
    )
    mockCreateClient.mockReturnValue(client)

    const setConfig = jest.fn()
    const { result } = renderHook(() =>
      useSettingsMutation({ configId: null, setConfig })
    )

    await act(async () => {
      await result.current.save({ currency: "INR" })
    })

    expect(setConfig).toHaveBeenCalledWith(newConfig)
  })

  it("returns true and shows default success toast on a successful insert", async () => {
    const { client } = makeInsertSupabase(
      { data: newConfig, error: null },
      getUserOk
    )
    mockCreateClient.mockReturnValue(client)

    const { result } = renderHook(() =>
      useSettingsMutation({ configId: null })
    )

    let ok: boolean | undefined
    await act(async () => {
      ok = await result.current.save({ currency: "INR" })
    })

    expect(ok).toBe(true)
    expect(mockShowSuccess).toHaveBeenCalledWith("Settings saved")
  })

  it("returns false and shows error toast when getUser returns no user", async () => {
    const { client } = makeInsertSupabase(
      { data: null, error: null },
      { data: { user: null } }
    )
    mockCreateClient.mockReturnValue(client)

    const setConfig = jest.fn()
    const { result } = renderHook(() =>
      useSettingsMutation({ configId: null, setConfig })
    )

    let ok: boolean | undefined
    await act(async () => {
      ok = await result.current.save({ currency: "INR" })
    })

    expect(ok).toBe(false)
    expect(mockShowError).toHaveBeenCalledWith("Failed to save settings")
    expect(setConfig).not.toHaveBeenCalled()
  })

  it("returns false and shows error toast when insert returns a Supabase error", async () => {
    const { client } = makeInsertSupabase(
      { data: null, error: { message: "insert conflict" } },
      getUserOk
    )
    mockCreateClient.mockReturnValue(client)

    const setConfig = jest.fn()
    const { result } = renderHook(() =>
      useSettingsMutation({ configId: null, setConfig })
    )

    let ok: boolean | undefined
    await act(async () => {
      ok = await result.current.save({ currency: "INR" })
    })

    expect(ok).toBe(false)
    expect(mockShowError).toHaveBeenCalledWith("Failed to save settings")
    expect(setConfig).not.toHaveBeenCalled()
  })

  it("does not call setConfig when insert errors", async () => {
    const { client } = makeInsertSupabase(
      { data: null, error: { message: "db error" } },
      getUserOk
    )
    mockCreateClient.mockReturnValue(client)

    const setConfig = jest.fn()
    const { result } = renderHook(() =>
      useSettingsMutation({ configId: null, setConfig })
    )

    await act(async () => {
      await result.current.save({ currency: "INR" })
    })

    expect(setConfig).not.toHaveBeenCalled()
  })
})

// ============================================================================
// Custom success / error messages
// ============================================================================

describe("useSettingsMutation — custom messages", () => {
  it("shows custom successMessage when provided", async () => {
    const { client } = makeUpdateSupabase({ error: null })
    mockCreateClient.mockReturnValue(client)

    const { result } = renderHook(() =>
      useSettingsMutation({ configId: "cfg-1" })
    )

    await act(async () => {
      await result.current.save({ currency: "INR" }, { successMessage: "PG settings saved!" })
    })

    expect(mockShowSuccess).toHaveBeenCalledWith("PG settings saved!")
  })

  it("shows custom errorMessage when provided and update fails", async () => {
    const { client } = makeUpdateSupabase({ error: { message: "some db error" } })
    mockCreateClient.mockReturnValue(client)

    const { result } = renderHook(() =>
      useSettingsMutation({ configId: "cfg-1" })
    )

    await act(async () => {
      await result.current.save({ currency: "INR" }, { errorMessage: "Could not save PG settings" })
    })

    expect(mockShowError).toHaveBeenCalledWith("Could not save PG settings")
  })

  it("falls back to default messages when no custom messages are passed", async () => {
    const { client } = makeUpdateSupabase({ error: { message: "db error" } })
    mockCreateClient.mockReturnValue(client)

    const { result } = renderHook(() =>
      useSettingsMutation({ configId: "cfg-1" })
    )

    await act(async () => {
      await result.current.save({ currency: "INR" })
    })

    expect(mockShowError).toHaveBeenCalledWith("Failed to save settings")
  })
})

// ============================================================================
// saving flag lifecycle
// ============================================================================

describe("useSettingsMutation — saving flag", () => {
  it("saving is false after a successful update completes", async () => {
    const { client } = makeUpdateSupabase({ error: null })
    mockCreateClient.mockReturnValue(client)

    const { result } = renderHook(() =>
      useSettingsMutation({ configId: "cfg-1" })
    )

    await act(async () => {
      await result.current.save({ currency: "INR" })
    })

    expect(result.current.saving).toBe(false)
  })

  it("saving is false after a failed update completes (finally block)", async () => {
    const { client } = makeUpdateSupabase({ error: { message: "oops" } })
    mockCreateClient.mockReturnValue(client)

    const { result } = renderHook(() =>
      useSettingsMutation({ configId: "cfg-1" })
    )

    await act(async () => {
      await result.current.save({ currency: "INR" })
    })

    expect(result.current.saving).toBe(false)
  })

  it("saving is false after a successful insert completes", async () => {
    const newConfig = { id: "cfg-new", owner_id: "user-1", currency: "USD" }
    const { client } = makeInsertSupabase(
      { data: newConfig, error: null },
      { data: { user: { id: "user-1" } } }
    )
    mockCreateClient.mockReturnValue(client)

    const { result } = renderHook(() =>
      useSettingsMutation({ configId: null })
    )

    await act(async () => {
      await result.current.save({ currency: "USD" })
    })

    expect(result.current.saving).toBe(false)
  })

  it("saving is false after a failed insert (getUser returns null user)", async () => {
    const { client } = makeInsertSupabase(
      { data: null, error: null },
      { data: { user: null } }
    )
    mockCreateClient.mockReturnValue(client)

    const { result } = renderHook(() =>
      useSettingsMutation({ configId: null })
    )

    await act(async () => {
      await result.current.save({ currency: "USD" })
    })

    expect(result.current.saving).toBe(false)
  })
})
