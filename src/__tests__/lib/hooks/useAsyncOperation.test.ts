/**
 * Tests for useAsyncOperation, useLoadingOperation, useMutation
 * from src/lib/hooks/useAsyncOperation.ts
 */

import { renderHook, act } from "@testing-library/react"
import {
  useAsyncOperation,
  useLoadingOperation,
  useMutation,
} from "@/lib/hooks/useAsyncOperation"

// Suppress toast side effects — toast calls showSuccess/showError which calls sonner
jest.mock("@/lib/toast-helpers", () => ({
  showSuccess: jest.fn(),
  showError: jest.fn(),
}))

// ============================================================================
// useAsyncOperation
// ============================================================================

describe("useAsyncOperation", () => {
  it("starts with loading=false, error=null, result=null", () => {
    const { result } = renderHook(() =>
      useAsyncOperation(async () => "value")
    )
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.result).toBeNull()
  })

  it("sets loading=true during execution then false after", async () => {
    let resolveOp!: (v: string) => void
    const op = () => new Promise<string>((res) => { resolveOp = res })
    const { result } = renderHook(() => useAsyncOperation(op))

    let execPromise!: Promise<string | null>
    act(() => { execPromise = result.current.execute() })

    expect(result.current.loading).toBe(true)

    await act(async () => {
      resolveOp("done")
      await execPromise
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.result).toBe("done")
  })

  it("stores the successful result", async () => {
    const { result } = renderHook(() =>
      useAsyncOperation(async () => 42)
    )
    await act(async () => { await result.current.execute() })
    expect(result.current.result).toBe(42)
  })

  it("sets error message on failure", async () => {
    const { result } = renderHook(() =>
      useAsyncOperation(async () => { throw new Error("boom") }, {
        showErrorToast: false,
      })
    )
    await act(async () => { await result.current.execute() })
    expect(result.current.error).toBe("boom")
    expect(result.current.result).toBeNull()
  })

  it("returns null and sets error when operation throws", async () => {
    const { result } = renderHook(() =>
      useAsyncOperation(async () => { throw new Error("fail") }, {
        showErrorToast: false,
      })
    )
    let returnValue: string | null = "initial" as unknown as null
    await act(async () => {
      returnValue = await result.current.execute()
    })
    expect(returnValue).toBeNull()
  })

  it("calls onSuccess callback with the result", async () => {
    const onSuccess = jest.fn()
    const { result } = renderHook(() =>
      useAsyncOperation(async () => "res", { onSuccess })
    )
    await act(async () => { await result.current.execute() })
    expect(onSuccess).toHaveBeenCalledWith("res")
  })

  it("calls onError callback with the error", async () => {
    const onError = jest.fn()
    const err = new Error("oops")
    const { result } = renderHook(() =>
      useAsyncOperation(async () => { throw err }, {
        showErrorToast: false,
        onError,
      })
    )
    await act(async () => { await result.current.execute() })
    expect(onError).toHaveBeenCalledWith(err)
  })

  it("uses static successMessage string", async () => {
    const { showSuccess } = require("@/lib/toast-helpers") as { showSuccess: jest.Mock }
    showSuccess.mockClear()

    const { result } = renderHook(() =>
      useAsyncOperation(async () => "ok", { successMessage: "Done!" })
    )
    await act(async () => { await result.current.execute() })
    expect(showSuccess).toHaveBeenCalledWith("Done!")
  })

  it("uses dynamic successMessage function", async () => {
    const { showSuccess } = require("@/lib/toast-helpers") as { showSuccess: jest.Mock }
    showSuccess.mockClear()

    const { result } = renderHook(() =>
      useAsyncOperation(async () => "result-value", {
        successMessage: (res) => `Result: ${res}`,
      })
    )
    await act(async () => { await result.current.execute() })
    expect(showSuccess).toHaveBeenCalledWith("Result: result-value")
  })

  it("uses static errorMessage string", async () => {
    const { showError } = require("@/lib/toast-helpers") as { showError: jest.Mock }
    showError.mockClear()

    const { result } = renderHook(() =>
      useAsyncOperation(async () => { throw new Error("raw") }, {
        errorMessage: "Custom error",
        showErrorToast: true,
      })
    )
    await act(async () => { await result.current.execute() })
    expect(showError).toHaveBeenCalledWith("Custom error")
    expect(result.current.error).toBe("Custom error")
  })

  it("reset() clears loading, error, and result", async () => {
    const { result } = renderHook(() =>
      useAsyncOperation(async () => { throw new Error("e") }, {
        showErrorToast: false,
      })
    )
    await act(async () => { await result.current.execute() })
    expect(result.current.error).toBe("e")

    act(() => { result.current.reset() })
    expect(result.current.error).toBeNull()
    expect(result.current.result).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it("clearError() only clears error, leaves result intact", async () => {
    const { result } = renderHook(() =>
      useAsyncOperation(async () => { throw new Error("err") }, {
        showErrorToast: false,
      })
    )
    await act(async () => { await result.current.execute() })
    expect(result.current.error).toBe("err")

    act(() => { result.current.clearError() })
    expect(result.current.error).toBeNull()
  })

  it("resetErrorOnExecute=false keeps previous error during new execution", async () => {
    let shouldThrow = true
    const { result } = renderHook(() =>
      useAsyncOperation(
        async () => {
          if (shouldThrow) throw new Error("first")
          return "ok"
        },
        { showErrorToast: false, resetErrorOnExecute: false }
      )
    )
    await act(async () => { await result.current.execute() })
    expect(result.current.error).toBe("first")

    shouldThrow = false
    // During execution, error should NOT reset
    act(() => { result.current.execute() })
    expect(result.current.error).toBe("first")
  })
})

// ============================================================================
// useLoadingOperation
// ============================================================================

describe("useLoadingOperation", () => {
  it("starts with loading=false", () => {
    const { result } = renderHook(() => useLoadingOperation())
    expect(result.current.loading).toBe(false)
  })

  it("sets loading=true during run and false after", async () => {
    const { result } = renderHook(() => useLoadingOperation())
    let resolve!: (v: string) => void
    const p = new Promise<string>((r) => { resolve = r })

    act(() => { result.current.run(() => p) })
    expect(result.current.loading).toBe(true)

    await act(async () => {
      resolve("done")
      await p
    })
    expect(result.current.loading).toBe(false)
  })

  it("returns the operation result", async () => {
    const { result } = renderHook(() => useLoadingOperation())
    let returnValue: string | null = null
    await act(async () => {
      returnValue = await result.current.run(async () => "result")
    })
    expect(returnValue).toBe("result")
  })

  it("returns null and logs error on failure", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {})
    const { result } = renderHook(() => useLoadingOperation())
    let returnValue: string | null = "initial" as unknown as null
    await act(async () => {
      returnValue = await result.current.run(async () => { throw new Error("fail") })
    })
    expect(returnValue).toBeNull()
    expect(result.current.loading).toBe(false)
    consoleSpy.mockRestore()
  })
})

// ============================================================================
// useMutation
// ============================================================================

describe("useMutation", () => {
  it("exposes mutate, loading, error, result, reset", () => {
    const { result } = renderHook(() => useMutation<string>())
    expect(typeof result.current.mutate).toBe("function")
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.result).toBeNull()
    expect(typeof result.current.reset).toBe("function")
  })

  it("mutate executes the provided operation", async () => {
    const { result } = renderHook(() => useMutation<number>())
    await act(async () => {
      await result.current.mutate(async () => 99)
    })
    expect(result.current.result).toBe(99)
  })

  it("mutate sets error when operation throws", async () => {
    const { result } = renderHook(() =>
      useMutation<string>({ showErrorToast: false })
    )
    await act(async () => {
      await result.current.mutate(async () => { throw new Error("mutate fail") })
    })
    expect(result.current.error).toBe("mutate fail")
  })
})
