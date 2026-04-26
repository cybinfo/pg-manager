/**
 * Tests for useDebounce, useDebounceCallback, useDebouncedCallback, and useThrottle hooks
 */

import { renderHook, act } from '@testing-library/react'
import {
  useDebounce,
  useDebounceCallback,
  useDebouncedCallback,
  useThrottle,
} from '@/lib/hooks/useDebounce'

// Mock the constants module to control SEARCH_DEBOUNCE_MS
jest.mock('@/lib/constants', () => ({
  SEARCH_DEBOUNCE_MS: 300,
}))

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300))
    expect(result.current).toBe('hello')
  })

  it('does not update value before delay expires', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 300 } }
    )

    rerender({ value: 'world', delay: 300 })

    // Advance less than the delay
    act(() => {
      jest.advanceTimersByTime(200)
    })

    expect(result.current).toBe('hello')
  })

  it('updates value after delay expires', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 300 } }
    )

    rerender({ value: 'world', delay: 300 })

    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(result.current).toBe('world')
  })

  it('resets the timer when value changes again before delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 300 } }
    )

    // Change to 'b'
    rerender({ value: 'b', delay: 300 })

    act(() => {
      jest.advanceTimersByTime(200)
    })

    // Change to 'c' before 'b' timer fires
    rerender({ value: 'c', delay: 300 })

    act(() => {
      jest.advanceTimersByTime(200)
    })

    // Only 200ms have passed since 'c', so should still be 'a'
    expect(result.current).toBe('a')

    act(() => {
      jest.advanceTimersByTime(100)
    })

    // Now 300ms from 'c', should update
    expect(result.current).toBe('c')
  })

  it('uses default SEARCH_DEBOUNCE_MS when no delay provided', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'initial' } }
    )

    rerender({ value: 'updated' })

    act(() => {
      jest.advanceTimersByTime(299)
    })
    expect(result.current).toBe('initial')

    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(result.current).toBe('updated')
  })

  it('works with number values', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 0 } }
    )

    rerender({ value: 42 })

    act(() => {
      jest.advanceTimersByTime(100)
    })

    expect(result.current).toBe(42)
  })

  it('works with object values', () => {
    const initial = { name: 'test' }
    const updated = { name: 'updated' }

    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: initial } }
    )

    rerender({ value: updated })

    act(() => {
      jest.advanceTimersByTime(100)
    })

    expect(result.current).toEqual({ name: 'updated' })
  })

  it('works with null and undefined values', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 'hello' as string | null } }
    )

    rerender({ value: null })

    act(() => {
      jest.advanceTimersByTime(100)
    })

    expect(result.current).toBeNull()
  })

  it('handles delay change', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 300 } }
    )

    // Change value AND delay
    rerender({ value: 'world', delay: 500 })

    act(() => {
      jest.advanceTimersByTime(300)
    })
    // Should not have updated yet with the new 500ms delay
    expect(result.current).toBe('hello')

    act(() => {
      jest.advanceTimersByTime(200)
    })
    expect(result.current).toBe('world')
  })
})

describe('useDebounceCallback', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('does not call callback immediately', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebounceCallback(callback, 300))

    act(() => {
      result.current('arg1')
    })

    expect(callback).not.toHaveBeenCalled()
  })

  it('calls callback after delay', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebounceCallback(callback, 300))

    act(() => {
      result.current('arg1')
    })

    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('arg1')
  })

  it('resets timer on rapid calls', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebounceCallback(callback, 300))

    act(() => {
      result.current('a')
    })

    act(() => {
      jest.advanceTimersByTime(200)
    })

    act(() => {
      result.current('b')
    })

    act(() => {
      jest.advanceTimersByTime(200)
    })

    act(() => {
      result.current('c')
    })

    act(() => {
      jest.advanceTimersByTime(300)
    })

    // Should only be called once with the last argument
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('c')
  })

  it('passes multiple arguments to callback', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebounceCallback(callback, 100))

    act(() => {
      result.current('arg1', 'arg2', 'arg3')
    })

    act(() => {
      jest.advanceTimersByTime(100)
    })

    expect(callback).toHaveBeenCalledWith('arg1', 'arg2', 'arg3')
  })

  it('uses the latest callback reference', () => {
    let callCount = 0
    const callback1 = jest.fn(() => { callCount = 1 })
    const callback2 = jest.fn(() => { callCount = 2 })

    const { result, rerender } = renderHook(
      ({ cb }) => useDebounceCallback(cb, 300),
      { initialProps: { cb: callback1 } }
    )

    act(() => {
      result.current()
    })

    // Update callback before timer fires
    rerender({ cb: callback2 })

    act(() => {
      jest.advanceTimersByTime(300)
    })

    // Should use the latest callback
    expect(callback2).toHaveBeenCalledTimes(1)
    expect(callCount).toBe(2)
  })

  it('cleans up timer on unmount', () => {
    const callback = jest.fn()
    const { result, unmount } = renderHook(() => useDebounceCallback(callback, 300))

    act(() => {
      result.current('test')
    })

    unmount()

    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(callback).not.toHaveBeenCalled()
  })

  it('unmount is safe when no pending timer (false branch of cleanup line 86)', () => {
    const callback = jest.fn()
    const { unmount } = renderHook(() => useDebounceCallback(callback, 300))
    // Unmount without any pending call — timeoutRef.current is null → false branch
    expect(() => { unmount() }).not.toThrow()
    expect(callback).not.toHaveBeenCalled()
  })

  it('uses default delay when none provided', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebounceCallback(callback))

    act(() => {
      result.current()
    })

    act(() => {
      jest.advanceTimersByTime(299)
    })
    expect(callback).not.toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(1)
    })
    expect(callback).toHaveBeenCalledTimes(1)
  })
})

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('uses default delay when no delay argument provided (line 123 default param)', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback))

    act(() => { result.current.debouncedCallback('default-delay') })
    act(() => { jest.advanceTimersByTime(299) })
    expect(callback).not.toHaveBeenCalled()
    act(() => { jest.advanceTimersByTime(1) })
    expect(callback).toHaveBeenCalledWith('default-delay')
  })

  it('debounces the callback', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 300))

    act(() => {
      result.current.debouncedCallback('test')
    })

    expect(callback).not.toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(callback).toHaveBeenCalledWith('test')
  })

  it('clears pending timer when called again before delay (line 146)', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 300))

    // First call — sets timer
    act(() => { result.current.debouncedCallback('first') })
    // Second call before timer fires — clears old timer (line 146), sets new one
    act(() => { result.current.debouncedCallback('second') })

    act(() => { jest.advanceTimersByTime(300) })

    // Only fired once with the last arg
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('second')
  })

  it('flush executes pending callback immediately', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 300))

    act(() => {
      result.current.debouncedCallback('flushed')
    })

    expect(callback).not.toHaveBeenCalled()

    act(() => {
      result.current.flush()
    })

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('flushed')
  })

  it('flush does nothing if no pending callback', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 300))

    act(() => {
      result.current.flush()
    })

    expect(callback).not.toHaveBeenCalled()
  })

  it('cancel prevents pending callback from executing', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 300))

    act(() => {
      result.current.debouncedCallback('cancelled')
    })

    act(() => {
      result.current.cancel()
    })

    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(callback).not.toHaveBeenCalled()
  })

  it('cancel is safe when no pending timer (false branch of cancel line 169)', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 300))
    // cancel() with no pending call — timeoutRef.current is null → false branch
    expect(() => { act(() => { result.current.cancel() }) }).not.toThrow()
    expect(callback).not.toHaveBeenCalled()
  })

  it('cancel clears args so flush after cancel does nothing', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 300))

    act(() => {
      result.current.debouncedCallback('value')
    })

    act(() => {
      result.current.cancel()
    })

    act(() => {
      result.current.flush()
    })

    expect(callback).not.toHaveBeenCalled()
  })

  it('isPending returns true when callback is pending', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 300))

    expect(result.current.isPending()).toBe(false)

    act(() => {
      result.current.debouncedCallback('test')
    })

    expect(result.current.isPending()).toBe(true)
  })

  it('isPending returns false after flush clears the timer', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 300))

    act(() => {
      result.current.debouncedCallback('test')
    })

    expect(result.current.isPending()).toBe(true)

    act(() => {
      result.current.flush()
    })

    expect(result.current.isPending()).toBe(false)
  })

  it('isPending returns false after cancel', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 300))

    act(() => {
      result.current.debouncedCallback('test')
    })

    expect(result.current.isPending()).toBe(true)

    act(() => {
      result.current.cancel()
    })

    expect(result.current.isPending()).toBe(false)
  })

  it('isPending returns false after flush', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 300))

    act(() => {
      result.current.debouncedCallback('test')
    })

    act(() => {
      result.current.flush()
    })

    expect(result.current.isPending()).toBe(false)
  })

  it('flush after timer fires does not double-execute', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 300))

    act(() => {
      result.current.debouncedCallback('test')
    })

    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(callback).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.flush()
    })

    // Should not be called again since args were cleared after execution
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('cleans up on unmount', () => {
    const callback = jest.fn()
    const { result, unmount } = renderHook(() => useDebouncedCallback(callback, 300))

    act(() => {
      result.current.debouncedCallback('test')
    })

    unmount()

    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(callback).not.toHaveBeenCalled()
  })
})

describe('useThrottle', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('executes callback immediately on first call', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useThrottle(callback, 100))

    act(() => {
      result.current('first')
    })

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('first')
  })

  it('throttles subsequent calls within delay', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useThrottle(callback, 100))

    act(() => {
      result.current('first')
    })

    act(() => {
      result.current('second')
    })

    act(() => {
      result.current('third')
    })

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('first')
  })

  it('allows execution after delay period', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useThrottle(callback, 100))

    act(() => {
      result.current('first')
    })

    act(() => {
      jest.advanceTimersByTime(100)
    })

    act(() => {
      result.current('second')
    })

    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback).toHaveBeenLastCalledWith('second')
  })

  it('uses the latest callback reference', () => {
    const callback1 = jest.fn()
    const callback2 = jest.fn()

    const { result, rerender } = renderHook(
      ({ cb }) => useThrottle(cb, 100),
      { initialProps: { cb: callback1 } }
    )

    // First call - uses callback1
    act(() => {
      result.current('first')
    })
    expect(callback1).toHaveBeenCalledTimes(1)

    // Update callback
    rerender({ cb: callback2 })

    // Advance past throttle period
    act(() => {
      jest.advanceTimersByTime(100)
    })

    // Second call - should use callback2
    act(() => {
      result.current('second')
    })
    expect(callback2).toHaveBeenCalledTimes(1)
    expect(callback2).toHaveBeenCalledWith('second')
  })

  it('passes multiple arguments', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useThrottle(callback, 100))

    act(() => {
      result.current('a', 'b', 'c')
    })

    expect(callback).toHaveBeenCalledWith('a', 'b', 'c')
  })
})
