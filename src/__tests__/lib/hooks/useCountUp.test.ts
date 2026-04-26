/**
 * Tests for useCountUp from src/lib/hooks/useCountUp.ts
 *
 * Tests two code paths:
 * 1. prefers-reduced-motion: true  → immediately returns final value
 * 2. Normal animation              → uses requestAnimationFrame, counts up
 */

import { renderHook, act } from "@testing-library/react"
import { useCountUp } from "@/lib/hooks/useCountUp"

// ============================================================================
// Helpers
// ============================================================================

function mockMatchMedia(prefersReducedMotion: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
      matches: prefersReducedMotion,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

// ============================================================================
// prefers-reduced-motion: true
// ============================================================================

describe("useCountUp (reduced motion)", () => {
  beforeEach(() => mockMatchMedia(true))
  afterEach(() => mockMatchMedia(false)) // restore default

  it("returns the target value immediately without animation", () => {
    const { result } = renderHook(() => useCountUp(42))
    expect(result.current).toBe(42)
  })

  it("returns 0 when target is 0", () => {
    const { result } = renderHook(() => useCountUp(0))
    expect(result.current).toBe(0)
  })

  it("updates immediately when target changes", () => {
    const { result, rerender } = renderHook(({ end }) => useCountUp(end), {
      initialProps: { end: 10 },
    })
    expect(result.current).toBe(10)

    act(() => { rerender({ end: 50 }) })
    expect(result.current).toBe(50)
  })
})

// ============================================================================
// Normal animation (reduced motion: false)
// ============================================================================

describe("useCountUp (animated, normal motion)", () => {
  let rafCallbacks: Map<number, FrameRequestCallback>
  let rafId: number

  beforeEach(() => {
    mockMatchMedia(false)
    rafCallbacks = new Map()
    rafId = 0

    // Replace rAF with a controllable mock
    jest.spyOn(global, "requestAnimationFrame").mockImplementation((cb) => {
      const id = ++rafId
      rafCallbacks.set(id, cb)
      return id
    })
    jest.spyOn(global, "cancelAnimationFrame").mockImplementation((id) => {
      rafCallbacks.delete(id)
    })
    jest.spyOn(global, "performance", "get").mockReturnValue({
      now: jest.fn().mockReturnValue(0),
    } as unknown as Performance)
  })

  afterEach(() => {
    jest.restoreAllMocks()
    mockMatchMedia(false)
  })

  function runAnimationToCompletion(durationMs = 500) {
    // Run all pending rAF callbacks at t=durationMs (progress=1, fully complete)
    const callbacks = Array.from(rafCallbacks.values())
    rafCallbacks.clear()
    act(() => {
      for (const cb of callbacks) cb(durationMs)
    })
  }

  it("starts at 0 before animation", () => {
    const { result } = renderHook(() => useCountUp(100))
    // Before any rAF fires, count is still 0
    expect(result.current).toBe(0)
  })

  it("reaches the target after animation completes", () => {
    const { result } = renderHook(() => useCountUp(100, { duration: 500 }))
    runAnimationToCompletion(500)
    expect(result.current).toBe(100)
  })

  it("shows an intermediate value mid-animation", () => {
    const { result } = renderHook(() => useCountUp(100, { duration: 500 }))

    // Fire at t=250ms (50% through). Ease-out-cubic at 50% ≈ 0.875, so ~88
    const callbacks = Array.from(rafCallbacks.values())
    rafCallbacks.clear()
    act(() => {
      for (const cb of callbacks) cb(250)
    })
    // Value should be between 0 and 100 (exclusive)
    expect(result.current).toBeGreaterThan(0)
    expect(result.current).toBeLessThan(100)
  })

  it("does not re-animate when target stays the same", () => {
    const { result, rerender } = renderHook(({ end }) => useCountUp(end), {
      initialProps: { end: 50 },
    })
    runAnimationToCompletion(500)
    expect(result.current).toBe(50)

    const callCountBefore = (global.requestAnimationFrame as jest.Mock).mock.calls.length
    act(() => { rerender({ end: 50 }) })
    const callCountAfter = (global.requestAnimationFrame as jest.Mock).mock.calls.length
    // No new rAF scheduled when target unchanged
    expect(callCountAfter).toBe(callCountBefore)
  })
})
