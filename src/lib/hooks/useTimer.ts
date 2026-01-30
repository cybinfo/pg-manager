/**
 * useTimer Hook
 *
 * Centralized setTimeout/setInterval management with automatic cleanup.
 * Eliminates 26+ occurrences of manual timeout management.
 *
 * @example
 * const { set, clear } = useTimer()
 *
 * // Set a timeout
 * set(() => doSomething(), 2000)
 *
 * // Clear manually if needed
 * clear()
 */

"use client"

import { useRef, useCallback, useEffect } from "react"

// ============================================================================
// TIMEOUT HOOK
// ============================================================================

interface UseTimeoutReturn {
  /** Set a timeout that runs callback after delay ms */
  set: (callback: () => void, delay: number) => void
  /** Clear the current timeout */
  clear: () => void
  /** Check if a timeout is currently pending */
  isPending: () => boolean
}

/**
 * Hook for managing a single timeout with automatic cleanup
 *
 * @example
 * const { set, clear } = useTimeout()
 *
 * // Auto-dismiss notification after 3 seconds
 * set(() => setVisible(false), 3000)
 *
 * // Cancel if user interacts
 * onClick={() => clear()}
 */
export function useTimeout(): UseTimeoutReturn {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const callbackRef = useRef<(() => void) | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    callbackRef.current = null
  }, [])

  const set = useCallback(
    (callback: () => void, delay: number) => {
      // Clear any existing timeout
      clear()

      callbackRef.current = callback
      timeoutRef.current = setTimeout(() => {
        callback()
        timeoutRef.current = null
        callbackRef.current = null
      }, delay)
    },
    [clear]
  )

  const isPending = useCallback(() => {
    return timeoutRef.current !== null
  }, [])

  return { set, clear, isPending }
}

// ============================================================================
// INTERVAL HOOK
// ============================================================================

interface UseIntervalReturn {
  /** Start an interval that runs callback every delay ms */
  start: (callback: () => void, delay: number) => void
  /** Stop the current interval */
  stop: () => void
  /** Check if an interval is currently running */
  isRunning: () => boolean
}

/**
 * Hook for managing a single interval with automatic cleanup
 *
 * @example
 * const { start, stop, isRunning } = useInterval()
 *
 * // Poll for updates every 30 seconds
 * start(() => fetchUpdates(), 30000)
 *
 * // Stop polling when tab is hidden
 * useEffect(() => {
 *   const handleVisibility = () => {
 *     if (document.hidden) stop()
 *     else start(fetchUpdates, 30000)
 *   }
 *   document.addEventListener("visibilitychange", handleVisibility)
 *   return () => document.removeEventListener("visibilitychange", handleVisibility)
 * }, [])
 */
export function useInterval(): UseIntervalReturn {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const start = useCallback(
    (callback: () => void, delay: number) => {
      // Stop any existing interval
      stop()

      intervalRef.current = setInterval(callback, delay)
    },
    [stop]
  )

  const isRunning = useCallback(() => {
    return intervalRef.current !== null
  }, [])

  return { start, stop, isRunning }
}

// ============================================================================
// COMBINED TIMER HOOK (for backwards compatibility alias)
// ============================================================================

/**
 * Combined timer hook (alias for useTimeout)
 * @deprecated Use useTimeout or useInterval directly
 */
export const useTimer = useTimeout
