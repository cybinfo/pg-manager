/**
 * useFormSubmit Hook
 *
 * Standardizes the pattern of showing a toast + delayed redirect after CRUD operations.
 * Provides consistent success/error handling across all form pages.
 *
 * The default redirect delay (1500ms) gives users enough time to see the success toast
 * before navigating away. This is shorter than the toast duration (3000ms) so the
 * toast remains visible briefly on the destination page, confirming the action.
 *
 * @example (Basic usage with redirect)
 * ```typescript
 * const { handleSuccess, handleError } = useFormSubmit({
 *   successMessage: "Staff member added!",
 *   redirectTo: "/staff",
 * })
 *
 * // In your submit handler:
 * try {
 *   await saveData()
 *   handleSuccess()
 * } catch (error) {
 *   handleError(error)
 * }
 * ```
 *
 * @example (Dynamic redirect)
 * ```typescript
 * const { handleSuccess, handleError } = useFormSubmit({
 *   successMessage: "Tenant created!",
 * })
 *
 * // Redirect determined at runtime:
 * handleSuccess({ redirectTo: `/tenants/${newId}` })
 * ```
 *
 * @example (Custom delay for auth pages)
 * ```typescript
 * const { handleSuccess, handleError } = useFormSubmit({
 *   successMessage: "Account created!",
 *   redirectTo: "/setup",
 *   redirectDelay: 2000,
 * })
 * ```
 *
 * @example (No redirect, just toast + callback)
 * ```typescript
 * const { handleSuccess, handleError } = useFormSubmit({
 *   successMessage: "Settings saved!",
 *   onSuccess: () => refetchData(),
 * })
 * ```
 */

"use client"

import { useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { showSuccess, showError } from "@/lib/toast-helpers"

// ============================================================================
// TYPES
// ============================================================================

export interface FormSubmitOptions {
  /** Success message to show in toast */
  successMessage?: string
  /** URL to redirect to after success */
  redirectTo?: string
  /** Delay before redirect in ms (default: 1500) */
  redirectDelay?: number
  /** Callback after successful submission */
  onSuccess?: (result?: unknown) => void
  /** Callback after failed submission */
  onError?: (error: unknown) => void
}

export interface HandleSuccessOptions {
  /** Override the success message for this call */
  message?: string
  /** Override the redirect URL for this call */
  redirectTo?: string
  /** Result data to pass to the onSuccess callback */
  result?: unknown
}

export interface UseFormSubmitReturn {
  /** Call after a successful operation to show toast and trigger redirect */
  handleSuccess: (options?: HandleSuccessOptions) => void
  /** Call after a failed operation to show error toast */
  handleError: (error: unknown) => void
}

// ============================================================================
// HOOK
// ============================================================================

export function useFormSubmit(options: FormSubmitOptions = {}): UseFormSubmitReturn {
  const router = useRouter()
  const {
    successMessage = "Saved successfully",
    redirectTo,
    redirectDelay = 1500,
    onSuccess,
    onError,
  } = options

  // Track mounted state to avoid setting state after unmount
  const isMountedRef = useRef(true)
  // Track active timeouts for cleanup
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleSuccess = useCallback(
    (callOptions?: HandleSuccessOptions) => {
      const message = callOptions?.message || successMessage
      const target = callOptions?.redirectTo || redirectTo

      showSuccess(message)
      onSuccess?.(callOptions?.result)

      if (target) {
        timeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            router.push(target)
          }
        }, redirectDelay)
      }
    },
    [successMessage, redirectTo, redirectDelay, onSuccess, router]
  )

  const handleError = useCallback(
    (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "An error occurred"
      showError(message)
      onError?.(error)
    },
    [onError]
  )

  return { handleSuccess, handleError }
}
