"use client"

import { useEffect } from "react"
import { parseUserAgent, getOrCreateFingerprint } from "@/lib/auth/device"
import { logger } from "@/lib/logger"

const THROTTLE_KEY = "session_track_at"
const THROTTLE_MS = 60 * 60 * 1000 // 1 hour

export function useSessionTrack() {
  useEffect(() => {
    const track = async () => {
      try {
        const lastTracked = localStorage.getItem(THROTTLE_KEY)
        if (lastTracked && Date.now() - Number(lastTracked) < THROTTLE_MS) return

        const fingerprint = getOrCreateFingerprint()
        if (!fingerprint) return

        const { device_type, browser, os } = parseUserAgent(navigator.userAgent)

        const res = await fetch("/api/auth/sessions/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fingerprint, device_type, browser, os }),
        })

        if (res.ok) {
          localStorage.setItem(THROTTLE_KEY, String(Date.now()))
        }
      } catch (err) {
        logger.warn("Session tracking failed", { error: String(err) })
      }
    }

    track()
  }, [])
}
