/**
 * useAsyncOperation Hook
 *
 * Centralized async operation handling with loading, error states, and toast notifications.
 * Eliminates 40+ duplicate loading/error state patterns.
 *
 * @example
 * const { loading, error, execute } = useAsyncOperation(
 *   async (data) => {
 *     await saveData(data)
 *   },
 *   { successMessage: "Saved!", errorMessage: "Failed to save" }
 * )
 *
 * // In submit handler:
 * await execute(formData)
 */

"use client"

import { logger } from "@/lib/logger"
import { useState, useCallback, useRef } from "react"
import { showSuccess, showError } from "@/lib/toast-helpers"

// ============================================================================
// TYPES
// ============================================================================

interface UseAsyncOperationOptions {
  /** Success toast message (if provided, shows toast on success) */
  successMessage?: string | ((result: unknown) => string)
  /** Error toast message (if provided, shows toast on error) */
  errorMessage?: string | ((error: Error) => string)
  /** Show error toast automatically (default: true) */
  showErrorToast?: boolean
  /** Callback on success */
  onSuccess?: (result: unknown) => void
  /** Callback on error */
  onError?: (error: Error) => void
  /** Reset error state on new execution (default: true) */
  resetErrorOnExecute?: boolean
}

interface UseAsyncOperationReturn<T, Args extends unknown[]> {
  /** Whether operation is in progress */
  loading: boolean
  /** Error message if operation failed */
  error: string | null
  /** Last successful result */
  result: T | null
  /** Execute the async operation */
  execute: (...args: Args) => Promise<T | null>
  /** Reset state to initial values */
  reset: () => void
  /** Clear only the error state */
  clearError: () => void
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for managing async operations with loading, error, and success states
 */
export function useAsyncOperation<T, Args extends unknown[] = []>(
  operation: (...args: Args) => Promise<T>,
  options: UseAsyncOperationOptions = {}
): UseAsyncOperationReturn<T, Args> {
  const {
    successMessage,
    errorMessage,
    showErrorToast = true,
    onSuccess,
    onError,
    resetErrorOnExecute = true,
  } = options

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<T | null>(null)

  // Track if component is still mounted
  const isMountedRef = useRef(true)

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      setLoading(true)
      if (resetErrorOnExecute) {
        setError(null)
      }

      try {
        const res = await operation(...args)

        if (isMountedRef.current) {
          setResult(res)
          setLoading(false)

          // Show success toast
          if (successMessage) {
            const message =
              typeof successMessage === "function"
                ? successMessage(res)
                : successMessage
            showSuccess(message)
          }

          // Call success callback
          onSuccess?.(res)
        }

        return res
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err))

        if (isMountedRef.current) {
          const message =
            typeof errorMessage === "function"
              ? errorMessage(errorObj)
              : errorMessage || errorObj.message || "An error occurred"

          setError(message)
          setLoading(false)

          // Show error toast
          if (showErrorToast) {
            showError(message)
          }

          // Call error callback
          onError?.(errorObj)
        }

        return null
      }
    },
    [operation, successMessage, errorMessage, showErrorToast, onSuccess, onError, resetErrorOnExecute]
  )

  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
    setResult(null)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    loading,
    error,
    result,
    execute,
    reset,
    clearError,
  }
}

// ============================================================================
// SIMPLIFIED VARIANTS
// ============================================================================

/**
 * Simplified hook for operations that just need loading state
 *
 * @example
 * const { loading, run } = useLoadingOperation()
 *
 * const handleSubmit = () => run(async () => {
 *   await saveData(data)
 *   toast.success("Saved!")
 * })
 */
export function useLoadingOperation() {
  const [loading, setLoading] = useState(false)

  const run = useCallback(async <T>(operation: () => Promise<T>): Promise<T | null> => {
    setLoading(true)
    try {
      const result = await operation()
      return result
    } catch (err) {
      logger.error("Operation failed:", { error: String(err) })
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, run }
}

/**
 * Hook for mutation operations (create/update/delete)
 * Provides consistent loading, success, and error handling
 *
 * @example
 * const { mutate, loading, error } = useMutation<Tenant>({
 *   onSuccess: (data) => router.push(`/tenants/${data.id}`),
 *   successMessage: "Tenant created",
 *   errorMessage: "Failed to create tenant",
 * })
 *
 * await mutate(async () => {
 *   const { data } = await supabase.from("tenants").insert(formData).select().single()
 *   return data
 * })
 */
export function useMutation<T>(
  options: UseAsyncOperationOptions = {}
) {
  const { loading, error, execute, reset, result } = useAsyncOperation<T, [() => Promise<T>]>(
    async (operation) => operation(),
    options
  )

  const mutate = useCallback(
    async (operation: () => Promise<T>): Promise<T | null> => {
      return execute(operation)
    },
    [execute]
  )

  return { mutate, loading, error, reset, result }
}
