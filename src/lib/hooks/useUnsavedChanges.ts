/**
 * useUnsavedChanges Hook
 *
 * Warns users when they try to navigate away from a page with unsaved changes.
 * Listens for the browser `beforeunload` event and prevents navigation
 * when `hasChanges` is true.
 *
 * @example
 * ```typescript
 * const [isDirty, setIsDirty] = useState(false)
 * useUnsavedChanges(isDirty)
 *
 * // When user modifies a form field:
 * setIsDirty(true)
 *
 * // After successful save:
 * setIsDirty(false)
 * ```
 */

"use client"

import { useEffect, useCallback } from "react"

export function useUnsavedChanges(hasChanges: boolean) {
  const handleBeforeUnload = useCallback(
    (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault()
      }
    },
    [hasChanges]
  )

  useEffect(() => {
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [handleBeforeUnload])
}
