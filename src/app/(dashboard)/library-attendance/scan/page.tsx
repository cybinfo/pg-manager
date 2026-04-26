/**
 * QR Code Scanner Page for Library Check-in
 *
 * Allows staff to scan member QR codes for quick check-in.
 */

"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Html5Qrcode } from "html5-qrcode"
import { createClient } from "@/lib/supabase/client"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Camera, CheckCircle, XCircle, Loader2, Users, Clock, AlertCircle } from "lucide-react"
import { showSuccess, showError, showWarning } from "@/lib/toast-helpers"
import { withCreatedBy } from "@/lib/audit"
import { getNowISO } from "@/lib/date-helpers"
import { transformJoin } from "@/lib/supabase/transforms"
import { Avatar } from "@/components/ui/avatar"

interface QRPayload {
  type: string
  member_id: string
  member_code: string | null
  library_id: string
}

interface CheckInResult {
  success: boolean
  memberName: string
  memberCode: string | null
  hoursBalance: number
  message: string
  timestamp: Date
}

export default function QRScannerPage() {
  const router = useRouter()
  const { user, workspaceId } = useAuthContext()
  const [scanning, setScanning] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [recentCheckIns, setRecentCheckIns] = useState<CheckInResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const lastScannedRef = useRef<string | null>(null)

  const processCheckIn = useCallback(async (payload: QRPayload) => {
    if (!user || !workspaceId) {
      showError("Session expired. Please login again.")
      return
    }

    // Prevent duplicate scans within 3 seconds
    const scanKey = `${payload.member_id}-${Math.floor(Date.now() / 3000)}`
    if (lastScannedRef.current === scanKey) {
      return
    }
    lastScannedRef.current = scanKey

    setProcessing(true)
    setError(null)

    try {
      const supabase = createClient()

      // Get member details with person data for live name
      const { data: member, error: memberError } = await supabase
        .from("library_members")
        .select("id, name, member_code, status, hours_balance, library_id, current_subscription_id, person:people(id, name)")
        .eq("id", payload.member_id)
        .single()

      if (memberError || !member) {
        const result: CheckInResult = {
          success: false,
          memberName: "Unknown",
          memberCode: payload.member_code,
          hoursBalance: 0,
          message: "Member not found",
          timestamp: new Date(),
        }
        setRecentCheckIns((prev) => [result, ...prev.slice(0, 9)])
        showError("Member not found")
        return
      }

      // Use person.name (live data) with fallback to denormalized copy
      const person = transformJoin(member.person as Record<string, unknown> | Record<string, unknown>[] | null)
      const displayName: string = (person?.name as string) || member.name

      // Check if member is active
      if (member.status !== "active") {
        const result: CheckInResult = {
          success: false,
          memberName: displayName,
          memberCode: member.member_code,
          hoursBalance: member.hours_balance,
          message: `Member is ${member.status}`,
          timestamp: new Date(),
        }
        setRecentCheckIns((prev) => [result, ...prev.slice(0, 9)])
        showError(`Member ${displayName} is ${member.status}`)
        return
      }

      // Check hours balance
      if (member.hours_balance <= 0) {
        const result: CheckInResult = {
          success: false,
          memberName: displayName,
          memberCode: member.member_code,
          hoursBalance: member.hours_balance,
          message: "No hours remaining",
          timestamp: new Date(),
        }
        setRecentCheckIns((prev) => [result, ...prev.slice(0, 9)])
        showError(`${displayName} has no hours remaining`)
        return
      }

      // Check if already checked in
      const { data: activeCheckIn } = await supabase
        .from("library_attendance")
        .select("id")
        .eq("member_id", member.id)
        .is("check_out_time", null)
        .is("deleted_at", null)
        .single()

      if (activeCheckIn) {
        const result: CheckInResult = {
          success: false,
          memberName: displayName,
          memberCode: member.member_code,
          hoursBalance: member.hours_balance,
          message: "Already checked in",
          timestamp: new Date(),
        }
        setRecentCheckIns((prev) => [result, ...prev.slice(0, 9)])
        showWarning(`${displayName} is already checked in`)
        return
      }

      // Get workspace owner
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("owner_user_id")
        .eq("id", workspaceId)
        .single()

      if (!workspace) {
        showError("Workspace not found")
        return
      }

      // Create check-in
      const checkInTime = getNowISO()
      const attendanceDate = checkInTime.split("T")[0]

      const attendanceData = withCreatedBy(
        {
          owner_id: workspace.owner_user_id,
          workspace_id: workspaceId,
          member_id: member.id,
          membership_id: member.current_subscription_id,
          attendance_date: attendanceDate,
          check_in_time: checkInTime,
          notes: "QR scan check-in",
        },
        user.id
      )

      const { error: insertError } = await supabase
        .from("library_attendance")
        .insert(attendanceData)

      if (insertError) {
        throw new Error(insertError.message)
      }

      const result: CheckInResult = {
        success: true,
        memberName: displayName,
        memberCode: member.member_code,
        hoursBalance: member.hours_balance,
        message: "Checked in successfully",
        timestamp: new Date(),
      }
      setRecentCheckIns((prev) => [result, ...prev.slice(0, 9)])
      showSuccess(`${displayName} checked in! (${member.hours_balance.toFixed(1)}h remaining)`)

      // Play success sound (optional)
      try {
        const audio = new Audio("/sounds/success.mp3")
        audio.volume = 0.5
        audio.play().catch(() => {})
      } catch {
        // Ignore audio errors
      }
    } catch (err) {
      console.error("Check-in error:", err)
      const result: CheckInResult = {
        success: false,
        memberName: "Error",
        memberCode: payload.member_code,
        hoursBalance: 0,
        message: err instanceof Error ? err.message : "Check-in failed",
        timestamp: new Date(),
      }
      setRecentCheckIns((prev) => [result, ...prev.slice(0, 9)])
      showError("Check-in failed")
    } finally {
      setProcessing(false)
    }
  }, [user, workspaceId])

  const startScanning = useCallback(async () => {
    try {
      const scanner = new Html5Qrcode("qr-reader")
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          try {
            const payload = JSON.parse(decodedText) as QRPayload
            if (payload.type === "library_checkin" && payload.member_id) {
              processCheckIn(payload)
            } else {
              showError("Invalid QR code format")
            }
          } catch {
            showError("Invalid QR code")
          }
        },
        () => {
          // Ignore scan errors (no QR found in frame)
        }
      )

      setScanning(true)
      setError(null)
    } catch (err) {
      console.error("Scanner error:", err)
      setError("Could not access camera. Please grant camera permissions.")
      setScanning(false)
    }
  }, [processCheckIn])

  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current = null
      } catch {
        // Ignore stop errors
      }
    }
    setScanning(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/library-attendance">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">QR Check-in Scanner</h1>
          <p className="text-muted-foreground">
            Scan member QR codes for quick check-in
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Scanner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Scanner
            </CardTitle>
            <CardDescription>
              Point camera at member QR code
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Scanner viewport */}
            <div
              id="qr-reader"
              className={`w-full aspect-square bg-muted rounded-lg overflow-hidden ${
                !scanning ? "flex items-center justify-center" : ""
              }`}
            >
              {!scanning && (
                <div className="text-center p-8">
                  <Camera className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Camera preview will appear here
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            {processing && (
              <div className="flex items-center justify-center gap-2 py-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm">Processing check-in...</span>
              </div>
            )}

            <div className="flex gap-2">
              {!scanning ? (
                <Button onClick={startScanning} className="flex-1">
                  <Camera className="h-4 w-4 mr-2" />
                  Start Scanner
                </Button>
              ) : (
                <Button onClick={stopScanning} variant="destructive" className="flex-1">
                  Stop Scanner
                </Button>
              )}
              <Link href="/library-attendance/new">
                <Button variant="outline">
                  Manual Check-in
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Check-ins */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recent Scans
            </CardTitle>
            <CardDescription>
              {recentCheckIns.length} check-in{recentCheckIns.length !== 1 ? "s" : ""} this session
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentCheckIns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No check-ins yet</p>
                <p className="text-sm">Scan a QR code to check in a member</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {recentCheckIns.map((checkIn, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      checkIn.success
                        ? "bg-success/10 border-success/20"
                        : "bg-destructive/10 border-destructive/20"
                    }`}
                  >
                    <div className={`p-1.5 rounded-full ${
                      checkIn.success ? "bg-success/20" : "bg-destructive/20"
                    }`}>
                      {checkIn.success ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{checkIn.memberName}</p>
                      <p className={`text-xs ${
                        checkIn.success ? "text-success" : "text-destructive"
                      }`}>
                        {checkIn.message}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {checkIn.timestamp.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Click &quot;Start Scanner&quot; to activate the camera</li>
            <li>Point the camera at a member&apos;s QR code</li>
            <li>The system will automatically detect and process the check-in</li>
            <li>A confirmation will appear showing the member&apos;s name and hours balance</li>
            <li>Members can find their QR code on their member detail page</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
