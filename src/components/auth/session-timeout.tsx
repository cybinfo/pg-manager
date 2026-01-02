"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Clock, LogOut } from "lucide-react"

// Default timeout values (in milliseconds)
const DEFAULT_INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes
const DEFAULT_WARNING_TIME = 60 * 1000 // 1 minute warning before logout
const ACTIVITY_DEBOUNCE = 1000 // Debounce activity detection by 1 second

interface SessionTimeoutProps {
  /** Time in milliseconds before session times out (default: 30 minutes) */
  inactivityTimeout?: number
  /** Time in milliseconds to show warning before timeout (default: 1 minute) */
  warningTime?: number
  /** Whether session timeout is enabled (default: true) */
  enabled?: boolean
  /** Callback when session times out */
  onTimeout?: () => void
  children: React.ReactNode
}

/**
 * Session Timeout Component
 *
 * Monitors user activity and automatically logs out after a period of inactivity.
 * Shows a warning dialog before timeout to allow the user to extend their session.
 *
 * Usage:
 * ```tsx
 * <SessionTimeout inactivityTimeout={30 * 60 * 1000}>
 *   <YourApp />
 * </SessionTimeout>
 * ```
 */
export function SessionTimeout({
  inactivityTimeout = DEFAULT_INACTIVITY_TIMEOUT,
  warningTime = DEFAULT_WARNING_TIME,
  enabled = true,
  onTimeout,
  children,
}: SessionTimeoutProps) {
  const router = useRouter()
  const { user, logout, isAuthenticated, isLoading } = useAuth()
  const [showWarning, setShowWarning] = useState(false)
  const [remainingTime, setRemainingTime] = useState(0)

  // Don't run session timeout until auth is fully ready
  const authReady = !isLoading && isAuthenticated

  // Refs for timers
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const warningRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const activityDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningRef.current) clearTimeout(warningRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
    timeoutRef.current = null
    warningRef.current = null
    countdownRef.current = null
  }, [])

  // Handle session timeout
  const handleTimeout = useCallback(async () => {
    clearTimers()
    setShowWarning(false)

    // Call custom callback if provided
    onTimeout?.()

    // Logout and redirect
    await logout()
    toast.error("Session Expired", {
      description: "You have been logged out due to inactivity.",
      duration: 5000,
    })
    router.push("/login")
  }, [clearTimers, logout, router, onTimeout])

  // Start the countdown timer for the warning dialog
  const startCountdown = useCallback(() => {
    setRemainingTime(Math.ceil(warningTime / 1000))
    setShowWarning(true)

    countdownRef.current = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          handleTimeout()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [warningTime, handleTimeout])

  // Reset the inactivity timer
  const resetTimer = useCallback(() => {
    if (!enabled || !authReady) return

    clearTimers()
    setShowWarning(false)
    lastActivityRef.current = Date.now()

    // Set warning timer
    const timeUntilWarning = inactivityTimeout - warningTime
    warningRef.current = setTimeout(() => {
      startCountdown()
    }, timeUntilWarning)

    // Set timeout timer (backup in case warning doesn't show)
    timeoutRef.current = setTimeout(() => {
      handleTimeout()
    }, inactivityTimeout)
  }, [enabled, authReady, inactivityTimeout, warningTime, clearTimers, startCountdown, handleTimeout])

  // Handle user activity (debounced)
  const handleActivity = useCallback(() => {
    if (!enabled || !authReady) return
    if (showWarning) return // Don't reset during warning

    // Debounce activity detection
    if (activityDebounceRef.current) return

    activityDebounceRef.current = setTimeout(() => {
      activityDebounceRef.current = null
    }, ACTIVITY_DEBOUNCE)

    resetTimer()
  }, [enabled, authReady, showWarning, resetTimer])

  // Extend session (user clicked "Stay Logged In")
  const handleExtendSession = useCallback(() => {
    setShowWarning(false)
    resetTimer()
    toast.success("Session Extended", {
      description: "Your session has been extended.",
      duration: 2000,
    })
  }, [resetTimer])

  // Set up activity listeners
  useEffect(() => {
    if (!enabled || !authReady) {
      clearTimers()
      return
    }

    // Activity events to monitor
    const events: (keyof WindowEventMap)[] = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ]

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    // Start initial timer
    resetTimer()

    return () => {
      // Clean up event listeners
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity)
      })
      clearTimers()
      if (activityDebounceRef.current) {
        clearTimeout(activityDebounceRef.current)
      }
    }
  }, [enabled, authReady, handleActivity, resetTimer, clearTimers])

  // Handle visibility change - reset timer when user returns to tab
  useEffect(() => {
    if (!enabled || !authReady) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Check if session should have timed out while tab was hidden
        const timeSinceLastActivity = Date.now() - lastActivityRef.current
        if (timeSinceLastActivity >= inactivityTimeout) {
          handleTimeout()
        } else if (timeSinceLastActivity >= inactivityTimeout - warningTime) {
          // Show warning
          const remaining = inactivityTimeout - timeSinceLastActivity
          setRemainingTime(Math.ceil(remaining / 1000))
          setShowWarning(true)

          // Start countdown from remaining time
          if (countdownRef.current) clearInterval(countdownRef.current)
          countdownRef.current = setInterval(() => {
            setRemainingTime((prev) => {
              if (prev <= 1) {
                handleTimeout()
                return 0
              }
              return prev - 1
            })
          }, 1000)
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [enabled, authReady, inactivityTimeout, warningTime, handleTimeout])

  // Format remaining time for display
  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? "s" : ""}`
    }
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <>
      {children}

      {/* Session Warning Dialog */}
      <AlertDialog open={showWarning && authReady}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <Clock className="h-5 w-5" />
              Session Timeout Warning
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Your session will expire in{" "}
                <span className="font-semibold text-foreground">
                  {formatTime(remainingTime)}
                </span>{" "}
                due to inactivity.
              </p>
              <p>
                Click &quot;Stay Logged In&quot; to continue your session, or you will
                be automatically logged out.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => handleTimeout()}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout Now
            </Button>
            <AlertDialogAction onClick={handleExtendSession}>
              Stay Logged In
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/**
 * Hook to get session timeout state and controls
 */
export function useSessionTimeout() {
  // This could be expanded to provide more control
  // For now, it's a placeholder for future functionality
  return {
    // Could add: resetTimer, getRemainingTime, etc.
  }
}
