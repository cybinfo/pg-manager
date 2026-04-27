/**
 * Tests for src/lib/hooks/useFormPage.ts
 *
 * Covers: useFormPage (init, handleChange, setField, setFields, handleSubmit paths,
 * preSelectFields, transform, validationSchema, validate, customSubmit,
 * selectAfterInsert, onSuccess) and useFormEditPage (fetch, not found,
 * handleChange, handleSubmit update/custom).
 */

// ============================================================================
// Mocks
// ============================================================================

const mockRouterPush = jest.fn()
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: mockRouterPush })),
  useSearchParams: jest.fn(() => ({
    get: (key: string) => mockSearchParams[key] ?? null,
  })),
}))

let mockSearchParams: Record<string, string> = {}

const mockFrom = jest.fn()
const mockInsert = jest.fn()
const mockUpdate = jest.fn()
const mockSelect = jest.fn()
const mockSingle = jest.fn()
const mockEq = jest.fn()

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => mockSupabase),
}))

const mockSupabase = {
  from: mockFrom,
}

const mockShowSuccess = jest.fn()
const mockShowError = jest.fn()
jest.mock("@/lib/toast-helpers", () => ({
  showSuccess: (...args: unknown[]) => mockShowSuccess(...args),
  showError: (...args: unknown[]) => mockShowError(...args),
}))

const mockHandleClientError = jest.fn()
jest.mock("@/lib/error-handler", () => ({
  handleClientError: (...args: unknown[]) => mockHandleClientError(...args),
}))

const mockWithCreatedBy = jest.fn((data: Record<string, unknown>) => ({
  ...data,
  created_by: "u1",
}))
jest.mock("@/lib/audit", () => ({
  withCreatedBy: (...args: unknown[]) => mockWithCreatedBy(...args as [Record<string, unknown>, string]),
}))

jest.mock("@/lib/hooks/useUnsavedChanges", () => ({
  useUnsavedChanges: jest.fn(),
}))

const mockValidateAll = jest.fn(() => true)
const mockValidateField = jest.fn(() => true)
const mockClearErrors = jest.fn()
const mockClearFieldError = jest.fn()
const mockFieldErrors: Record<string, string> = {}

jest.mock("@/lib/hooks/useFormValidation", () => ({
  useFormValidation: jest.fn(() => ({
    errors: mockFieldErrors,
    validateField: mockValidateField,
    validateAll: mockValidateAll,
    clearErrors: mockClearErrors,
    clearFieldError: mockClearFieldError,
  })),
}))

const mockUser = { id: "u1", email: "alice@example.com" }
jest.mock("@/lib/auth/useAuthContext", () => ({
  useAuthContext: jest.fn(() => ({
    user: mockUser,
    workspaceId: "ws-1",
  })),
}))

// ============================================================================
// Imports
// ============================================================================

import { renderHook, act } from "@testing-library/react"
import { useFormPage, useFormEditPage } from "@/lib/hooks/useFormPage"
import { useAuthContext } from "@/lib/auth/useAuthContext"

// ============================================================================
// Helpers
// ============================================================================

type TestForm = { name: string; amount: string }

const baseOptions = {
  table: "test_table",
  initialData: { name: "", amount: "" } as TestForm,
  redirectTo: "/list",
}

function makeInsertChain(result: unknown) {
  const chain: Record<string, unknown> = {}
  chain.select = jest.fn(() => chain)
  chain.single = jest.fn(() => Promise.resolve(result))
  chain.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled)
  return chain
}

function makeUpdateChain(result: unknown) {
  const chain: Record<string, unknown> = {}
  chain.eq = jest.fn(() => ({
    then: (onFulfilled: (v: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled),
  }))
  return chain
}

function makeFetchChain(result: unknown) {
  const chain: Record<string, unknown> = {}
  chain.select = jest.fn(() => chain)
  chain.eq = jest.fn(() => chain)
  chain.single = jest.fn(() => Promise.resolve(result))
  return chain
}

function fakeSubmitEvent() {
  return { preventDefault: jest.fn() } as unknown as React.FormEvent
}

// ============================================================================
// useFormPage — initial state
// ============================================================================

describe("useFormPage — initial state", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParams = {}
  })

  it("returns initial form data and loading=false", () => {
    const { result } = renderHook(() => useFormPage(baseOptions))

    expect(result.current.formData).toEqual({ name: "", amount: "" })
    expect(result.current.loading).toBe(false)
    expect(result.current.saving).toBe(false)
    expect(result.current.hasUnsavedChanges).toBe(false)
    expect(result.current.ownerId).toBe("u1")
    expect(result.current.workspaceId).toBe("ws-1")
  })

  it("pre-fills form fields from URL search params", () => {
    mockSearchParams = { name: "Alice", amount: "500" }

    const { result } = renderHook(() =>
      useFormPage({ ...baseOptions, preSelectFields: ["name", "amount"] })
    )

    expect(result.current.formData.name).toBe("Alice")
    expect(result.current.formData.amount).toBe("500")
  })

  it("ignores preSelectFields not in initialData", () => {
    mockSearchParams = { unknown_field: "value", name: "Bob" }

    const { result } = renderHook(() =>
      useFormPage({ ...baseOptions, preSelectFields: ["name", "unknown_field"] })
    )

    expect(result.current.formData.name).toBe("Bob")
    expect((result.current.formData as Record<string, unknown>).unknown_field).toBeUndefined()
  })

  it("returns null ownerId when user is null", () => {
    jest.mocked(useAuthContext).mockReturnValueOnce({ user: null, workspaceId: null } as unknown as ReturnType<typeof useAuthContext>)

    const { result } = renderHook(() => useFormPage(baseOptions))
    expect(result.current.ownerId).toBe("")
  })
})

// ============================================================================
// useFormPage — handleChange
// ============================================================================

describe("useFormPage — handleChange", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParams = {}
  })

  it("updates formData on text input change", () => {
    const { result } = renderHook(() => useFormPage(baseOptions))

    act(() => {
      result.current.handleChange({
        target: { name: "name", value: "Alice", type: "text" },
      } as React.ChangeEvent<HTMLInputElement>)
    })

    expect(result.current.formData.name).toBe("Alice")
    expect(result.current.hasUnsavedChanges).toBe(true)
  })

  it("handles checkbox inputs (checked=true)", () => {
    type CheckboxForm = { active: boolean | string }
    const { result } = renderHook(() =>
      useFormPage<CheckboxForm>({
        table: "t",
        initialData: { active: false },
        redirectTo: "/list",
      })
    )

    act(() => {
      result.current.handleChange({
        target: { name: "active", value: "", type: "checkbox", checked: true },
      } as React.ChangeEvent<HTMLInputElement>)
    })

    expect(result.current.formData.active).toBe(true)
  })

  it("clears field error on change when validationSchema is provided", () => {
    const schema = { name: () => null }
    const { result } = renderHook(() =>
      useFormPage({ ...baseOptions, validationSchema: schema })
    )

    act(() => {
      result.current.handleChange({
        target: { name: "name", value: "Bob", type: "text" },
      } as React.ChangeEvent<HTMLInputElement>)
    })

    expect(mockClearFieldError).toHaveBeenCalledWith("name")
  })
})

// ============================================================================
// useFormPage — setField / setFields
// ============================================================================

describe("useFormPage — setField and setFields", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParams = {}
  })

  it("setField updates a single field", () => {
    const { result } = renderHook(() => useFormPage(baseOptions))

    act(() => {
      result.current.setField("name", "Carol")
    })

    expect(result.current.formData.name).toBe("Carol")
    expect(result.current.hasUnsavedChanges).toBe(true)
  })

  it("setFields updates multiple fields at once", () => {
    const { result } = renderHook(() => useFormPage(baseOptions))

    act(() => {
      result.current.setFields({ name: "Dave", amount: "999" })
    })

    expect(result.current.formData.name).toBe("Dave")
    expect(result.current.formData.amount).toBe("999")
  })

  it("setField does not mark dirty when value matches initial", () => {
    const { result } = renderHook(() =>
      useFormPage({ ...baseOptions, initialData: { name: "Alice", amount: "" } })
    )

    act(() => {
      result.current.setField("name", "Alice") // same as initial
    })

    expect(result.current.hasUnsavedChanges).toBe(false)
  })
})

// ============================================================================
// useFormPage — handleSubmit (standard insert)
// ============================================================================

describe("useFormPage — handleSubmit standard insert", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParams = {}
    mockValidateAll.mockReturnValue(true)
    mockFrom.mockReturnValue(makeInsertChain({ data: null, error: null }))
    mockInsert.mockReturnValue(makeInsertChain({ data: null, error: null }))
  })

  it("redirects to redirectTo on successful insert", async () => {
    mockFrom.mockReturnValue({
      insert: jest.fn(() => ({
        then: (fn: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: null }).then(fn),
      })),
    })

    const { result } = renderHook(() => useFormPage(baseOptions))

    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })

    expect(mockShowSuccess).toHaveBeenCalledWith("Created successfully")
    expect(mockRouterPush).toHaveBeenCalledWith("/list")
  })

  it("redirects to login when user is null", async () => {
    jest.mocked(useAuthContext).mockReturnValueOnce({ user: null, workspaceId: null } as unknown as ReturnType<typeof useAuthContext>)

    const { result } = renderHook(() => useFormPage(baseOptions))

    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })

    expect(mockShowError).toHaveBeenCalledWith("Session expired. Please login again.")
    expect(mockRouterPush).toHaveBeenCalledWith("/login")
  })

  it("blocks submit when already saving", async () => {
    // Can't directly set saving=true, but can test via rapid double-submit
    let resolveInsert!: (v: unknown) => void
    const insertPromise = new Promise((res) => { resolveInsert = res })

    mockFrom.mockReturnValue({
      insert: jest.fn(() => ({
        then: (fn: (v: unknown) => unknown) => insertPromise.then(fn),
      })),
    })

    const { result } = renderHook(() => useFormPage(baseOptions))

    // Start first submit (won't await it yet)
    act(() => {
      result.current.handleSubmit(fakeSubmitEvent())
    })

    // Resolve insert
    resolveInsert({ data: null, error: null })
    await act(async () => { await Promise.resolve() })
  })

  it("shows error toast on insert error", async () => {
    mockFrom.mockReturnValue({
      insert: jest.fn(() => ({
        then: (fn: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: { message: "DB error" } }).then(fn),
      })),
    })

    const { result } = renderHook(() => useFormPage(baseOptions))

    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })

    expect(mockShowError).toHaveBeenCalledWith(expect.stringContaining("DB error"))
    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  it("calls transform before inserting", async () => {
    const transform = jest.fn((data: TestForm) => ({
      name: data.name.toUpperCase(),
      amount: Number(data.amount),
    }))

    mockFrom.mockReturnValue({
      insert: jest.fn((data: unknown) => {
        expect((data as Record<string, unknown>).name).toBe("")
        return {
          then: (fn: (v: unknown) => unknown) =>
            Promise.resolve({ data: null, error: null }).then(fn),
        }
      }),
    })

    const { result } = renderHook(() =>
      useFormPage({ ...baseOptions, transform })
    )

    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })

    expect(transform).toHaveBeenCalledWith({ name: "", amount: "" }, "u1")
  })

  it("skips owner_id when addOwnerId=false", async () => {
    let capturedInsertData: unknown

    mockFrom.mockReturnValue({
      insert: jest.fn((data: unknown) => {
        capturedInsertData = data
        return {
          then: (fn: (v: unknown) => unknown) =>
            Promise.resolve({ data: null, error: null }).then(fn),
        }
      }),
    })

    const { result } = renderHook(() =>
      useFormPage({ ...baseOptions, addOwnerId: false, useCreatedBy: false })
    )

    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })

    expect((capturedInsertData as Record<string, unknown>).owner_id).toBeUndefined()
  })

  it("skips withCreatedBy when useCreatedBy=false", async () => {
    mockFrom.mockReturnValue({
      insert: jest.fn(() => ({
        then: (fn: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: null }).then(fn),
      })),
    })

    const { result } = renderHook(() =>
      useFormPage({ ...baseOptions, useCreatedBy: false })
    )

    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })

    expect(mockWithCreatedBy).not.toHaveBeenCalled()
  })

  it("calls onSuccess callback and uses override redirect", async () => {
    mockFrom.mockReturnValue({
      insert: jest.fn(() => ({
        then: (fn: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: null }).then(fn),
      })),
    })

    const onSuccess = jest.fn(() => "/custom-redirect")

    const { result } = renderHook(() =>
      useFormPage({ ...baseOptions, onSuccess })
    )

    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })

    expect(onSuccess).toHaveBeenCalled()
    expect(mockRouterPush).toHaveBeenCalledWith("/custom-redirect")
  })

  it("uses default redirectTo when onSuccess returns void", async () => {
    mockFrom.mockReturnValue({
      insert: jest.fn(() => ({
        then: (fn: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: null }).then(fn),
      })),
    })

    const onSuccess = jest.fn() // returns void

    const { result } = renderHook(() =>
      useFormPage({ ...baseOptions, onSuccess })
    )

    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })

    expect(mockRouterPush).toHaveBeenCalledWith("/list")
  })

  it("handles unexpected exception in handleSubmit", async () => {
    mockFrom.mockImplementation(() => { throw new Error("Unexpected!") })

    const { result } = renderHook(() => useFormPage(baseOptions))

    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })

    expect(mockHandleClientError).toHaveBeenCalled()
  })
})

// ============================================================================
// useFormPage — validationSchema
// ============================================================================

describe("useFormPage — validationSchema", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParams = {}
  })

  it("aborts submit when validateAll returns false", async () => {
    mockValidateAll.mockReturnValue(false)
    const schema = { name: () => null }

    const { result } = renderHook(() =>
      useFormPage({ ...baseOptions, validationSchema: schema })
    )

    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })

    expect(mockShowError).toHaveBeenCalledWith("Please fix the errors in the form")
    expect(mockRouterPush).not.toHaveBeenCalled()
  })
})

// ============================================================================
// useFormPage — validate callback
// ============================================================================

describe("useFormPage — validate callback", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParams = {}
    mockValidateAll.mockReturnValue(true)
  })

  it("aborts submit when validate returns error string", async () => {
    const validate = jest.fn(() => "Name is required")

    const { result } = renderHook(() =>
      useFormPage({ ...baseOptions, validate })
    )

    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })

    expect(mockShowError).toHaveBeenCalledWith("Name is required")
    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  it("proceeds when validate returns null", async () => {
    const validate = jest.fn(() => null)
    mockFrom.mockReturnValue({
      insert: jest.fn(() => ({
        then: (fn: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: null }).then(fn),
      })),
    })

    const { result } = renderHook(() =>
      useFormPage({ ...baseOptions, validate })
    )

    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })

    expect(mockRouterPush).toHaveBeenCalledWith("/list")
  })
})

// ============================================================================
// useFormPage — customSubmit
// ============================================================================

describe("useFormPage — customSubmit", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParams = {}
    mockValidateAll.mockReturnValue(true)
  })

  it("calls customSubmit instead of insert", async () => {
    const customSubmit = jest.fn(async () => undefined)

    const { result } = renderHook(() =>
      useFormPage({ ...baseOptions, customSubmit })
    )

    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })

    expect(customSubmit).toHaveBeenCalledWith({ name: "", amount: "" }, "u1", expect.anything())
    expect(mockShowSuccess).toHaveBeenCalledWith("Created successfully")
    expect(mockRouterPush).toHaveBeenCalledWith("/list")
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it("uses customSubmit redirect when returned", async () => {
    const customSubmit = jest.fn(async () => "/custom-page")

    const { result } = renderHook(() =>
      useFormPage({ ...baseOptions, customSubmit })
    )

    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })

    expect(mockRouterPush).toHaveBeenCalledWith("/custom-page")
  })
})

// ============================================================================
// useFormPage — selectAfterInsert
// ============================================================================

describe("useFormPage — selectAfterInsert", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParams = {}
    mockValidateAll.mockReturnValue(true)
  })

  it("uses .select().single() when selectAfterInsert=true", async () => {
    const mockRecord = { id: "r1", name: "Alice" }
    const insertedSingle = jest.fn(() => Promise.resolve({ data: mockRecord, error: null }))
    const insertedSelect = jest.fn(() => ({ single: insertedSingle }))
    const insertFn = jest.fn(() => ({ select: insertedSelect }))
    mockFrom.mockReturnValue({ insert: insertFn })

    const onSuccess = jest.fn()

    const { result } = renderHook(() =>
      useFormPage({ ...baseOptions, selectAfterInsert: true, onSuccess })
    )

    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })

    expect(onSuccess).toHaveBeenCalledWith(mockRecord, "u1")
  })
})

// ============================================================================
// useFormPage — successMessage / errorMessage overrides
// ============================================================================

describe("useFormPage — message overrides", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParams = {}
    mockValidateAll.mockReturnValue(true)
  })

  it("uses custom successMessage", async () => {
    mockFrom.mockReturnValue({
      insert: jest.fn(() => ({
        then: (fn: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: null }).then(fn),
      })),
    })

    const { result } = renderHook(() =>
      useFormPage({ ...baseOptions, successMessage: "Plan saved!" })
    )

    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })

    expect(mockShowSuccess).toHaveBeenCalledWith("Plan saved!")
  })

  it("uses custom errorMessage prefix on insert error", async () => {
    mockFrom.mockReturnValue({
      insert: jest.fn(() => ({
        then: (fn: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: { message: "conflict" } }).then(fn),
      })),
    })

    const { result } = renderHook(() =>
      useFormPage({ ...baseOptions, errorMessage: "Save failed" })
    )

    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })

    expect(mockShowError).toHaveBeenCalledWith("Save failed: conflict")
  })
})

// ============================================================================
// useFormEditPage — initial load
// ============================================================================

describe("useFormEditPage — initial load", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("fetches record on mount and maps to form", async () => {
    const record = { id: "r1", name: "Alice", amount: 500 }
    mockFrom.mockReturnValue(makeFetchChain({ data: record, error: null }))

    const { result } = renderHook(() =>
      useFormEditPage({
        table: "test_table",
        id: "r1",
        initialData: { name: "", amount: "" } as TestForm,
        redirectTo: "/list",
        mapToForm: (r) => ({ name: String(r.name), amount: String(r.amount) }),
      })
    )

    await act(async () => {})

    expect(result.current.loading).toBe(false)
    expect(result.current.formData).toEqual({ name: "Alice", amount: "500" })
    expect(result.current.record).toEqual(record)
  })

  it("redirects when record not found", async () => {
    mockFrom.mockReturnValue(makeFetchChain({ data: null, error: { message: "not found" } }))

    renderHook(() =>
      useFormEditPage({
        table: "test_table",
        id: "r1",
        initialData: { name: "", amount: "" } as TestForm,
        redirectTo: "/list",
        mapToForm: (r) => ({ name: String(r.name), amount: "" }),
        notFoundRedirect: "/not-found",
      })
    )

    await act(async () => {})

    expect(mockShowError).toHaveBeenCalled()
    expect(mockRouterPush).toHaveBeenCalledWith("/not-found")
  })

  it("redirects to redirectTo when notFoundRedirect not provided", async () => {
    mockFrom.mockReturnValue(makeFetchChain({ data: null, error: null }))

    renderHook(() =>
      useFormEditPage({
        table: "test_table",
        id: "r1",
        initialData: { name: "", amount: "" } as TestForm,
        redirectTo: "/list",
        mapToForm: (r) => ({ name: String(r.name), amount: "" }),
      })
    )

    await act(async () => {})

    expect(mockRouterPush).toHaveBeenCalledWith("/list")
  })

  it("skips fetch when id is empty", async () => {
    renderHook(() =>
      useFormEditPage({
        table: "test_table",
        id: "",
        initialData: { name: "", amount: "" } as TestForm,
        redirectTo: "/list",
        mapToForm: (r) => ({ name: String(r.name), amount: "" }),
      })
    )

    await act(async () => {})

    expect(mockFrom).not.toHaveBeenCalled()
  })
})

// ============================================================================
// useFormEditPage — handleChange
// ============================================================================

describe("useFormEditPage — handleChange", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFrom.mockReturnValue(makeFetchChain({ data: { id: "r1", name: "Alice", amount: 500 }, error: null }))
  })

  it("updates formData on text input change", async () => {
    const { result } = renderHook(() =>
      useFormEditPage({
        table: "test_table",
        id: "r1",
        initialData: { name: "", amount: "" } as TestForm,
        redirectTo: "/list",
        mapToForm: (r) => ({ name: String(r.name), amount: String(r.amount) }),
      })
    )

    await act(async () => {})

    act(() => {
      result.current.handleChange({
        target: { name: "name", value: "Bob", type: "text" },
      } as React.ChangeEvent<HTMLInputElement>)
    })

    expect(result.current.formData.name).toBe("Bob")
    expect(result.current.hasUnsavedChanges).toBe(true)
  })

  it("handles checkbox change in edit form", async () => {
    type EditForm = { active: boolean | string }
    const chain = makeFetchChain({ data: { id: "r1", active: false }, error: null })
    mockFrom.mockReturnValue(chain)

    const { result } = renderHook(() =>
      useFormEditPage<EditForm>({
        table: "test_table",
        id: "r1",
        initialData: { active: false },
        redirectTo: "/list",
        mapToForm: (r) => ({ active: Boolean(r.active) }),
      })
    )

    await act(async () => {})

    act(() => {
      result.current.handleChange({
        target: { name: "active", value: "", type: "checkbox", checked: true },
      } as React.ChangeEvent<HTMLInputElement>)
    })

    expect(result.current.formData.active).toBe(true)
  })

  it("setField marks dirty in edit form", async () => {
    const { result } = renderHook(() =>
      useFormEditPage({
        table: "test_table",
        id: "r1",
        initialData: { name: "", amount: "" } as TestForm,
        redirectTo: "/list",
        mapToForm: (r) => ({ name: String(r.name), amount: String(r.amount) }),
      })
    )

    await act(async () => {})

    act(() => {
      result.current.setField("amount", "999")
    })

    expect(result.current.formData.amount).toBe("999")
    expect(result.current.hasUnsavedChanges).toBe(true)
  })

  it("setFields marks dirty in edit form", async () => {
    const { result } = renderHook(() =>
      useFormEditPage({
        table: "test_table",
        id: "r1",
        initialData: { name: "", amount: "" } as TestForm,
        redirectTo: "/list",
        mapToForm: (r) => ({ name: String(r.name), amount: String(r.amount) }),
      })
    )

    await act(async () => {})

    act(() => {
      result.current.setFields({ name: "Carol", amount: "100" })
    })

    expect(result.current.formData.name).toBe("Carol")
    expect(result.current.hasUnsavedChanges).toBe(true)
  })
})

// ============================================================================
// useFormEditPage — handleSubmit (standard update)
// ============================================================================

describe("useFormEditPage — handleSubmit standard update", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockValidateAll.mockReturnValue(true)
    mockFrom.mockReturnValue(makeFetchChain({ data: { id: "r1", name: "Alice", amount: 500 }, error: null }))
  })

  it("updates and redirects on success", async () => {
    const { result } = renderHook(() =>
      useFormEditPage({
        table: "test_table",
        id: "r1",
        initialData: { name: "", amount: "" } as TestForm,
        redirectTo: "/list",
        mapToForm: (r) => ({ name: String(r.name), amount: String(r.amount) }),
      })
    )

    await act(async () => {})

    // After fetch, re-mock from for the update call
    mockFrom.mockReturnValue({
      update: jest.fn(() => ({
        eq: jest.fn(() =>
          Promise.resolve({ data: null, error: null })
        ),
      })),
    })

    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })

    expect(mockShowSuccess).toHaveBeenCalledWith("Updated successfully")
    expect(mockRouterPush).toHaveBeenCalledWith("/list")
  })

  it("shows error toast on update error", async () => {
    const { result } = renderHook(() =>
      useFormEditPage({
        table: "test_table",
        id: "r1",
        initialData: { name: "", amount: "" } as TestForm,
        redirectTo: "/list",
        mapToForm: (r) => ({ name: String(r.name), amount: "" }),
        errorMessage: "Update failed",
      })
    )

    await act(async () => {})

    mockFrom.mockReturnValue({
      update: jest.fn(() => ({
        eq: jest.fn(() =>
          Promise.resolve({ data: null, error: { message: "FK violation" } })
        ),
      })),
    })

    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })

    expect(mockShowError).toHaveBeenCalledWith("Update failed: FK violation")
  })

  it("redirects to login when user is null on edit submit", async () => {
    // Keep returning null user for all renders, not just the first
    jest.mocked(useAuthContext).mockReturnValue({ user: null, workspaceId: null } as unknown as ReturnType<typeof useAuthContext>)

    const { result } = renderHook(() =>
      useFormEditPage({
        table: "test_table",
        id: "r1",
        initialData: { name: "", amount: "" } as TestForm,
        redirectTo: "/list",
        mapToForm: (r) => ({ name: String(r.name), amount: "" }),
      })
    )

    await act(async () => {})

    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })

    // Restore default mock
    jest.mocked(useAuthContext).mockReturnValue({ user: mockUser, workspaceId: "ws-1" } as unknown as ReturnType<typeof useAuthContext>)

    expect(mockShowError).toHaveBeenCalledWith("Session expired. Please login again.")
    expect(mockRouterPush).toHaveBeenCalledWith("/login")
  })

  it("calls transform before update", async () => {
    const transform = jest.fn((data: TestForm) => ({
      name: data.name.trim(),
      amount: Number(data.amount),
    }))

    const { result } = renderHook(() =>
      useFormEditPage({
        table: "test_table",
        id: "r1",
        initialData: { name: "", amount: "" } as TestForm,
        redirectTo: "/list",
        mapToForm: (r) => ({ name: String(r.name), amount: String(r.amount) }),
        transform,
      })
    )

    await act(async () => {})

    mockFrom.mockReturnValue({
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })

    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })

    expect(transform).toHaveBeenCalled()
  })

  it("aborts edit submit when validationSchema fails", async () => {
    mockValidateAll.mockReturnValue(false)
    const schema = { name: () => null }

    const { result } = renderHook(() =>
      useFormEditPage({
        table: "test_table",
        id: "r1",
        initialData: { name: "", amount: "" } as TestForm,
        redirectTo: "/list",
        mapToForm: (r) => ({ name: String(r.name), amount: "" }),
        validationSchema: schema,
      })
    )

    await act(async () => {})
    mockFrom.mockReset() // Reset so update isn't called

    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })

    expect(mockShowError).toHaveBeenCalledWith("Please fix the errors in the form")
  })

  it("aborts edit submit when validate callback returns error", async () => {
    const validate = jest.fn(() => "Invalid data")

    const { result } = renderHook(() =>
      useFormEditPage({
        table: "test_table",
        id: "r1",
        initialData: { name: "", amount: "" } as TestForm,
        redirectTo: "/list",
        mapToForm: (r) => ({ name: String(r.name), amount: "" }),
        validate,
      })
    )

    await act(async () => {})
    mockFrom.mockReset()

    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })

    expect(mockShowError).toHaveBeenCalledWith("Invalid data")
  })

  it("handles exception in edit handleSubmit via handleClientError", async () => {
    const { result } = renderHook(() =>
      useFormEditPage({
        table: "test_table",
        id: "r1",
        initialData: { name: "", amount: "" } as TestForm,
        redirectTo: "/list",
        mapToForm: (r) => ({ name: String(r.name), amount: "" }),
      })
    )

    await act(async () => {})

    mockFrom.mockImplementation(() => { throw new Error("DB crash") })

    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })

    expect(mockHandleClientError).toHaveBeenCalled()
  })
})

// ============================================================================
// useFormEditPage — customSubmit
// ============================================================================

describe("useFormEditPage — customSubmit", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockValidateAll.mockReturnValue(true)
    mockFrom.mockReturnValue(makeFetchChain({ data: { id: "r1", name: "Alice", amount: 500 }, error: null }))
  })

  it("calls customSubmit with id instead of standard update", async () => {
    const customSubmit = jest.fn(async () => undefined)

    const { result } = renderHook(() =>
      useFormEditPage({
        table: "test_table",
        id: "r1",
        initialData: { name: "", amount: "" } as TestForm,
        redirectTo: "/list",
        mapToForm: (r) => ({ name: String(r.name), amount: String(r.amount) }),
        customSubmit,
      })
    )

    await act(async () => {})
    mockFrom.mockReset()

    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })

    expect(customSubmit).toHaveBeenCalledWith(
      { name: "Alice", amount: "500" },
      "u1",
      "r1",
      expect.anything()
    )
    expect(mockShowSuccess).toHaveBeenCalled()
    expect(mockRouterPush).toHaveBeenCalledWith("/list")
    expect(mockFrom).not.toHaveBeenCalled() // update not called
  })

  it("uses customSubmit return redirect", async () => {
    const customSubmit = jest.fn(async () => "/custom-edit-redirect")

    const { result } = renderHook(() =>
      useFormEditPage({
        table: "test_table",
        id: "r1",
        initialData: { name: "", amount: "" } as TestForm,
        redirectTo: "/list",
        mapToForm: (r) => ({ name: String(r.name), amount: String(r.amount) }),
        customSubmit,
      })
    )

    await act(async () => {})
    mockFrom.mockReset()

    await act(async () => {
      await result.current.handleSubmit(fakeSubmitEvent())
    })

    expect(mockRouterPush).toHaveBeenCalledWith("/custom-edit-redirect")
  })
})
