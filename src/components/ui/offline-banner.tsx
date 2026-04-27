"use client"

import { useEffect, useState } from "react"
import { WifiOff, X } from "lucide-react"

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      setDismissed(false)
    }
    const handleOffline = () => {
      setIsOnline(false)
      setDismissed(false)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  if (isOnline || dismissed) return null

  return (
    <div className="sticky top-16 z-[var(--z-sticky)] flex items-center gap-3 bg-warning/10 border-b border-warning/20 px-4 py-2 text-sm">
      <WifiOff className="h-4 w-4 text-warning flex-shrink-0" />
      <span className="flex-1 text-warning font-medium">
        You&apos;re offline — viewing cached data
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss offline banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
