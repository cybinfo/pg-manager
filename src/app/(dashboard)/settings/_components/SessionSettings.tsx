"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Monitor, Smartphone, Tablet, Shield, AlertTriangle } from "lucide-react"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { getOrCreateFingerprint } from "@/lib/auth/device"
import { formatDate } from "@/lib/format"
import { logger } from "@/lib/logger"
import { EmptyState } from "@/components/ui"

interface UserSession {
  id: string
  fingerprint: string
  device_type: "desktop" | "mobile" | "tablet"
  browser: string | null
  os: string | null
  ip_address: string | null
  last_seen_at: string
  created_at: string
  is_current: boolean
}

const DeviceIcon = ({ type }: { type: string }) => {
  if (type === "mobile") return <Smartphone className="h-5 w-5" />
  if (type === "tablet") return <Tablet className="h-5 w-5" />
  return <Monitor className="h-5 w-5" />
}

export function SessionSettings() {
  const [sessions, setSessions] = useState<UserSession[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState(false)
  const fingerprint = typeof window !== "undefined" ? getOrCreateFingerprint() : ""

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`/api/auth/sessions?fp=${fingerprint}`)
      if (!res.ok) throw new Error("Failed to fetch")
      const json = await res.json()
      setSessions(json.data || [])
    } catch (err) {
      logger.error("Failed to load sessions", { error: String(err) })
      showError("Failed to load active sessions")
    } finally {
      setLoading(false)
    }
  }, [fingerprint])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSessions()
  }, [fetchSessions])

  const revokeOthers = async () => {
    setRevoking(true)
    try {
      const res = await fetch("/api/auth/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint }),
      })
      if (!res.ok) throw new Error("Failed to revoke")
      showSuccess("All other devices have been signed out")
      fetchSessions()
    } catch (err) {
      logger.error("Failed to revoke sessions", { error: String(err) })
      showError("Failed to sign out other devices")
    } finally {
      setRevoking(false)
    }
  }

  const otherSessions = sessions.filter((s) => !s.is_current)

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>
                Devices currently signed in to your account
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <EmptyState icon={Monitor} title="No active sessions" description="No other active sessions found" />
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border ${
                    session.is_current
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-muted/20"
                  }`}
                >
                  <div className={session.is_current ? "text-primary" : "text-muted-foreground"}>
                    <DeviceIcon type={session.device_type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {[session.browser, session.os].filter(Boolean).join(" on ") || "Unknown device"}
                      </p>
                      {session.is_current && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                          This device
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Last active {formatDate(session.last_seen_at)}
                      {session.ip_address && ` · ${session.ip_address}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      First signed in {formatDate(session.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && otherSessions.length > 0 && (
            <div className="pt-2 border-t">
              <div className="flex items-start gap-3 p-3 bg-warning/5 border border-warning/20 rounded-lg mb-4">
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  If you don&apos;t recognize a session, sign out all other devices immediately and change your password.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={revokeOthers}
                disabled={revoking}
                className="w-full sm:w-auto"
              >
                {revoking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign out {otherSessions.length === 1 ? "1 other device" : `${otherSessions.length} other devices`}
              </Button>
            </div>
          )}

          {!loading && otherSessions.length === 0 && sessions.length > 0 && (
            <p className="text-xs text-muted-foreground pt-2 border-t text-center">
              You&apos;re only signed in on this device.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
