/**
 * Tests for useTimeout and useInterval from src/lib/hooks/useTimer.ts
 *
 * Uses Jest fake timers to control setTimeout/setInterval.
 */

import { renderHook, act } from "@testing-library/react"
import { useTimeout, useInterval } from "@/lib/hooks/useTimer"

// ============================================================================
// useTimeout
// ============================================================================

describe("useTimeout", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe("initial state", () => {
    it("starts with no pending timeout", () => {
      const { result } = renderHook(() => useTimeout())
      expect(result.current.isPending()).toBe(false)
    })
  })

  describe("set", () => {
    it("executes callback after the specified delay", () => {
      const callback = jest.fn()
      const { result } = renderHook(() => useTimeout())

      act(() => {
        result.current.set(callback, 1000)
      })

      expect(callback).not.toHaveBeenCalled()

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it("isPending returns true after set", () => {
      const { result } = renderHook(() => useTimeout())

      act(() => {
        result.current.set(() => {}, 1000)
      })

      expect(result.current.isPending()).toBe(true)
    })

    it("isPending returns false after callback fires", () => {
      const { result } = renderHook(() => useTimeout())

      act(() => {
        result.current.set(() => {}, 500)
      })

      act(() => {
        jest.advanceTimersByTime(500)
      })

      expect(result.current.isPending()).toBe(false)
    })

    it("replaces existing timeout when set is called again", () => {
      const first = jest.fn()
      const second = jest.fn()
      const { result } = renderHook(() => useTimeout())

      act(() => {
        result.current.set(first, 1000)
        result.current.set(second, 1000)
      })

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      expect(first).not.toHaveBeenCalled()
      expect(second).toHaveBeenCalledTimes(1)
    })
  })

  describe("clear", () => {
    it("cancels a pending timeout", () => {
      const callback = jest.fn()
      const { result } = renderHook(() => useTimeout())

      act(() => {
        result.current.set(callback, 1000)
        result.current.clear()
      })

      act(() => {
        jest.advanceTimersByTime(1000)
      })

      expect(callback).not.toHaveBeenCalled()
    })

    it("isPending returns false after clear", () => {
      const { result } = renderHook(() => useTimeout())

      act(() => {
        result.current.set(() => {}, 1000)
        result.current.clear()
      })

      expect(result.current.isPending()).toBe(false)
    })

    it("does nothing when there is no pending timeout", () => {
      const { result } = renderHook(() => useTimeout())
      expect(() => {
        act(() => {
          result.current.clear()
        })
      }).not.toThrow()
    })
  })

  describe("cleanup on unmount", () => {
    it("clears timeout when component unmounts", () => {
      const callback = jest.fn()
      const { result, unmount } = renderHook(() => useTimeout())

      act(() => {
        result.current.set(callback, 5000)
      })

      unmount()

      act(() => {
        jest.advanceTimersByTime(5000)
      })

      expect(callback).not.toHaveBeenCalled()
    })
  })
})

// ============================================================================
// useInterval
// ============================================================================

describe("useInterval", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  describe("initial state", () => {
    it("starts with no running interval", () => {
      const { result } = renderHook(() => useInterval())
      expect(result.current.isRunning()).toBe(false)
    })
  })

  describe("start", () => {
    it("calls callback repeatedly at the specified interval", () => {
      const callback = jest.fn()
      const { result } = renderHook(() => useInterval())

      act(() => {
        result.current.start(callback, 1000)
      })

      act(() => {
        jest.advanceTimersByTime(3000)
      })

      expect(callback).toHaveBeenCalledTimes(3)
    })

    it("isRunning returns true after start", () => {
      const { result } = renderHook(() => useInterval())

      act(() => {
        result.current.start(() => {}, 1000)
      })

      expect(result.current.isRunning()).toBe(true)
    })

    it("replaces existing interval when start is called again", () => {
      const first = jest.fn()
      const second = jest.fn()
      const { result } = renderHook(() => useInterval())

      act(() => {
        result.current.start(first, 1000)
        result.current.start(second, 1000)
      })

      act(() => {
        jest.advanceTimersByTime(2000)
      })

      expect(first).not.toHaveBeenCalled()
      expect(second).toHaveBeenCalledTimes(2)
    })
  })

  describe("stop", () => {
    it("stops a running interval", () => {
      const callback = jest.fn()
      const { result } = renderHook(() => useInterval())

      act(() => {
        result.current.start(callback, 1000)
      })

      act(() => {
        jest.advanceTimersByTime(2000)
      })

      act(() => {
        result.current.stop()
      })

      act(() => {
        jest.advanceTimersByTime(3000)
      })

      expect(callback).toHaveBeenCalledTimes(2)
    })

    it("isRunning returns false after stop", () => {
      const { result } = renderHook(() => useInterval())

      act(() => {
        result.current.start(() => {}, 1000)
        result.current.stop()
      })

      expect(result.current.isRunning()).toBe(false)
    })

    it("does nothing when there is no running interval", () => {
      const { result } = renderHook(() => useInterval())
      expect(() => {
        act(() => {
          result.current.stop()
        })
      }).not.toThrow()
    })
  })

  describe("cleanup on unmount", () => {
    it("stops interval when component unmounts", () => {
      const callback = jest.fn()
      const { result, unmount } = renderHook(() => useInterval())

      act(() => {
        result.current.start(callback, 1000)
      })

      unmount()

      act(() => {
        jest.advanceTimersByTime(5000)
      })

      expect(callback).not.toHaveBeenCalled()
    })
  })
})
