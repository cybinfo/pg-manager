"use client"

import { Button } from "@/components/ui/button"
import { Download, X, Smartphone } from "lucide-react"
import { usePWAInstall } from "@/lib/hooks/usePWAInstall"

// Full banner shown floating at the bottom of the screen
export function PWAInstallPrompt() {
  const { canInstall, isIOS, isLoading, install, dismiss } = usePWAInstall()

  if (!canInstall) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-card border rounded-lg shadow-lg p-4 z-50 animate-in slide-in-from-bottom-4">
      <button
        onClick={dismiss}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-lg shrink-0">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Install ManageKar</h3>
          {isIOS ? (
            <p className="text-xs text-muted-foreground">
              Tap{" "}
              <span className="inline-flex items-center px-1 bg-muted rounded">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </span>{" "}
              then &quot;Add to Home Screen&quot; for quick access.
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Install for quick access and a faster experience
              </p>
              <Button size="sm" onClick={install} disabled={isLoading} className="w-full">
                {isLoading ? "Installing…" : "Install App"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Compact button for sidebar footer
export function PWAInstallButton() {
  const { canInstall, isIOS, isLoading, install } = usePWAInstall()

  if (!canInstall || isIOS) return null

  return (
    <button
      onClick={install}
      disabled={isLoading}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all duration-200 disabled:opacity-50"
    >
      <Smartphone className="h-5 w-5" />
      {isLoading ? "Installing…" : "Install App"}
    </button>
  )
}
