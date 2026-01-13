/**
 * Global Loading Fallback (ARCH-003)
 * Displayed during page transitions and initial load.
 */

import { Loader2 } from "lucide-react"

export default function GlobalLoading() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-slate-50"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" aria-hidden="true" />
      <p className="text-slate-600 text-sm">Loading...</p>
      <span className="sr-only">Loading page content</span>
    </div>
  )
}
