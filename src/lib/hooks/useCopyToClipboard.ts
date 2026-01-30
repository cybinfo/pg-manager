/**
 * useCopyToClipboard Hook
 *
 * Centralized clipboard copy with feedback state.
 *
 * @example
 * const { copied, copy } = useCopyToClipboard()
 *
 * <Button onClick={() => copy(text)}>
 *   {copied ? "Copied!" : "Copy"}
 * </Button>
 */

"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { toast } from "sonner"

interface UseCopyToClipboardOptions {
  /** Duration to show "copied" state in ms (default: 2000) */
  resetDelay?: number
  /** Show success toast (default: false) */
  showToast?: boolean
  /** Success toast message */
  successMessage?: string
}

interface UseCopyToClipboardReturn {
  /** Whether text was recently copied */
  copied: boolean
  /** Copy text to clipboard */
  copy: (text: string) => Promise<boolean>
  /** Reset copied state */
  reset: () => void
}

/**
 * Hook for copying text to clipboard with feedback state
 */
export function useCopyToClipboard(
  options: UseCopyToClipboardOptions = {}
): UseCopyToClipboardReturn {
  const {
    resetDelay = 2000,
    showToast = false,
    successMessage = "Copied to clipboard",
  } = options

  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)

        if (showToast) {
          toast.success(successMessage)
        }

        // Reset after delay
        timeoutRef.current = setTimeout(() => {
          setCopied(false)
        }, resetDelay)

        return true
      } catch (err) {
        console.error("Failed to copy:", err)
        toast.error("Failed to copy to clipboard")
        return false
      }
    },
    [resetDelay, showToast, successMessage]
  )

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setCopied(false)
  }, [])

  return { copied, copy, reset }
}
