/**
 * useDebounce Hook
 *
 * Centralized debouncing utilities for values and callbacks.
 * Eliminates manual debounce implementations with useRef.
 *
 * @example
 * // Debounce a value
 * const debouncedSearch = useDebounce(searchTerm, 300)
 *
 * // Debounce a callback
 * const debouncedFetch = useDebounceCallback(fetchData, 300)
 */

"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants"

// ============================================================================
// VALUE DEBOUNCING
// ============================================================================

/**
 * Debounce a value - returns the value after it stops changing for `delay` ms
 *
 * @example
 * const [search, setSearch] = useState("")
 * const debouncedSearch = useDebounce(search, 300)
 *
 * useEffect(() => {
 *   fetchResults(debouncedSearch)
 * }, [debouncedSearch])
 */
export function useDebounce<T>(value: T, delay: number = SEARCH_DEBOUNCE_MS): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

// ============================================================================
// CALLBACK DEBOUNCING
// ============================================================================

/**
 * Debounce a callback function
 * Returns a stable function that will only execute after `delay` ms of inactivity
 *
 * @example
 * const debouncedSave = useDebounceCallback(
 *   (data) => saveToServer(data),
 *   500
 * )
 *
 * // In onChange handler:
 * onChange={(e) => {
 *   setFormData(e.target.value)
 *   debouncedSave(e.target.value)
 * }}
 */
export function useDebounceCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay: number = SEARCH_DEBOUNCE_MS
): (...args: Args) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const callbackRef = useRef(callback)

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return useCallback(
    (...args: Args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args)
      }, delay)
    },
    [delay]
  )
}

/**
 * Debounce a callback with ability to flush or cancel
 *
 * @example
 * const { debouncedCallback, flush, cancel } = useDebouncedCallback(
 *   saveData,
 *   500
 * )
 *
 * // Force immediate execution
 * flush()
 *
 * // Cancel pending execution
 * cancel()
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay: number = SEARCH_DEBOUNCE_MS
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const callbackRef = useRef(callback)
  const argsRef = useRef<Args | null>(null)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const debouncedCallback = useCallback(
    (...args: Args) => {
      argsRef.current = args

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args)
        argsRef.current = null
      }, delay)
    },
    [delay]
  )

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (argsRef.current) {
      callbackRef.current(...argsRef.current)
      argsRef.current = null
    }
  }, [])

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    argsRef.current = null
  }, [])

  const isPending = useCallback(() => {
    return timeoutRef.current !== null
  }, [])

  return { debouncedCallback, flush, cancel, isPending }
}

// ============================================================================
// THROTTLING
// ============================================================================

/**
 * Throttle a callback - ensures it only executes once per `delay` ms
 *
 * @example
 * const throttledScroll = useThrottle(handleScroll, 100)
 */
export function useThrottle<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay: number
): (...args: Args) => void {
  const lastExecutedRef = useRef<number>(0)
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  return useCallback(
    (...args: Args) => {
      const now = Date.now()
      if (now - lastExecutedRef.current >= delay) {
        lastExecutedRef.current = now
        callbackRef.current(...args)
      }
    },
    [delay]
  )
}
