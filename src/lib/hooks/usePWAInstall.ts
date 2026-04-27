"use client"

import { useEffect, useState } from "react"
import { getNowISO } from "@/lib/date-helpers"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

interface WindowWithMSStream extends Window {
  MSStream?: unknown
}

export interface PWAInstallState {
  canInstall: boolean
  isIOS: boolean
  isInstalled: boolean
  isLoading: boolean
  install: () => Promise<void>
  dismiss: () => void
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    // Already installed as standalone app
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true)
      return
    }

    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as WindowWithMSStream).MSStream
    setIsIOS(isIOSDevice)

    // Check if user recently dismissed
    const dismissedAt = localStorage.getItem("pwa-install-dismissed")
    if (dismissedAt) {
      const daysSince = (Date.now() - new Date(dismissedAt).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince < 7) {
        setDismissed(true)
      }
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const install = async () => {
    if (!deferredPrompt) return
    setIsLoading(true)
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }
    setIsLoading(false)
  }

  const dismiss = () => {
    setDismissed(true)
    localStorage.setItem("pwa-install-dismissed", getNowISO())
  }

  return {
    canInstall: !isInstalled && !dismissed && (!!deferredPrompt || isIOS),
    isIOS,
    isInstalled,
    isLoading,
    install,
    dismiss,
  }
}
