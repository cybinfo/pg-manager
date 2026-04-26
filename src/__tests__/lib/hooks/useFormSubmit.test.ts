/**
 * Tests for useFormSubmit from src/lib/hooks/useFormSubmit.ts
 *
 * Covers: handleSuccess (toast, redirect, onSuccess callback),
 * handleError (toast, onError callback), cleanup on unmount.
 */

import { renderHook, act } from "@testing-library/react"
import { useFormSubmit } from "@/lib/hooks/useFormSubmit"

// ============================================================================
// Mock dependencies
// ============================================================================

jest.mock("@/lib/toast-helpers", () => ({
  showSuccess: jest.fn(),
  showError: jest.fn(),
}))

const mockPush = jest.fn()
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))

const { showSuccess, showError } = require("@/lib/toast-helpers") as {
  showSuccess: jest.Mock
  showError: jest.Mock
}

beforeEach(() => {
  jest.useFakeTimers()
  showSuccess.mockClear()
  showError.mockClear()
  mockPush.mockClear()
})

afterEach(() => {
  jest.runAllTimers()
  jest.useRealTimers()
})

// ============================================================================
// handleSuccess — toast
// ============================================================================

describe("useFormSubmit — handleSuccess", () => {
  it("shows success toast with default message", () => {
    const { result } = renderHook(() => useFormSubmit())
    act(() => { result.current.handleSuccess() })
    expect(showSuccess).toHaveBeenCalledWith("Saved successfully")
  })

  it("shows success toast with configured successMessage", () => {
    const { result } = renderHook(() =>
      useFormSubmit({ successMessage: "Member added!" })
    )
    act(() => { result.current.handleSuccess() })
    expect(showSuccess).toHaveBeenCalledWith("Member added!")
  })

  it("call-site message overrides configured successMessage", () => {
    const { result } = renderHook(() =>
      useFormSubmit({ successMessage: "Default" })
    )
    act(() => { result.current.handleSuccess({ message: "Override" }) })
    expect(showSuccess).toHaveBeenCalledWith("Override")
  })

  // ============================================================================
  // handleSuccess — redirect
  // ============================================================================

  it("does not redirect when no redirectTo is configured", () => {
    const { result } = renderHook(() => useFormSubmit())
    act(() => { result.current.handleSuccess() })
    jest.runAllTimers()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("redirects to configured redirectTo after default delay (1500ms)", () => {
    const { result } = renderHook(() =>
      useFormSubmit({ redirectTo: "/tenants" })
    )
    act(() => { result.current.handleSuccess() })
    expect(mockPush).not.toHaveBeenCalled() // not yet

    act(() => { jest.advanceTimersByTime(1500) })
    expect(mockPush).toHaveBeenCalledWith("/tenants")
  })

  it("uses custom redirectDelay", () => {
    const { result } = renderHook(() =>
      useFormSubmit({ redirectTo: "/staff", redirectDelay: 500 })
    )
    act(() => { result.current.handleSuccess() })
    act(() => { jest.advanceTimersByTime(499) })
    expect(mockPush).not.toHaveBeenCalled()

    act(() => { jest.advanceTimersByTime(1) })
    expect(mockPush).toHaveBeenCalledWith("/staff")
  })

  it("call-site redirectTo overrides configured redirectTo", () => {
    const { result } = renderHook(() =>
      useFormSubmit({ redirectTo: "/default" })
    )
    act(() => { result.current.handleSuccess({ redirectTo: "/override" }) })
    act(() => { jest.advanceTimersByTime(1500) })
    expect(mockPush).toHaveBeenCalledWith("/override")
  })

  // ============================================================================
  // handleSuccess — onSuccess callback
  // ============================================================================

  it("calls onSuccess callback", () => {
    const onSuccess = jest.fn()
    const { result } = renderHook(() => useFormSubmit({ onSuccess }))
    act(() => { result.current.handleSuccess() })
    expect(onSuccess).toHaveBeenCalled()
  })

  it("passes result to onSuccess when provided", () => {
    const onSuccess = jest.fn()
    const { result } = renderHook(() => useFormSubmit({ onSuccess }))
    act(() => { result.current.handleSuccess({ result: { id: "123" } }) })
    expect(onSuccess).toHaveBeenCalledWith({ id: "123" })
  })

  // ============================================================================
  // Cleanup on unmount
  // ============================================================================

  it("does not redirect after unmount", () => {
    const { result, unmount } = renderHook(() =>
      useFormSubmit({ redirectTo: "/tenants", redirectDelay: 1000 })
    )
    act(() => { result.current.handleSuccess() })
    unmount()
    act(() => { jest.advanceTimersByTime(2000) })
    expect(mockPush).not.toHaveBeenCalled()
  })
})

// ============================================================================
// handleError
// ============================================================================

describe("useFormSubmit — handleError", () => {
  it("shows error toast with Error message", () => {
    const { result } = renderHook(() => useFormSubmit())
    act(() => { result.current.handleError(new Error("Something broke")) })
    expect(showError).toHaveBeenCalledWith("Something broke")
  })

  it("shows generic error for non-Error values", () => {
    const { result } = renderHook(() => useFormSubmit())
    act(() => { result.current.handleError("string error") })
    expect(showError).toHaveBeenCalledWith("An error occurred")
  })

  it("calls onError callback with the error", () => {
    const onError = jest.fn()
    const { result } = renderHook(() => useFormSubmit({ onError }))
    const err = new Error("oops")
    act(() => { result.current.handleError(err) })
    expect(onError).toHaveBeenCalledWith(err)
  })
})
