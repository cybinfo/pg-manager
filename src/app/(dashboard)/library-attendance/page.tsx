/**
 * Library Attendance Page
 *
 * Dashboard for check-in/check-out with quick actions and attendance list.
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Clock, Users, Armchair, LogIn, LogOut, RefreshCw, QrCode } from "lucide-react"
import { Column, StatusDot } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { LIBRARY_ATTENDANCE_LIST_CONFIG, MetricConfig, GroupByOption } from "@/lib/hooks/useListPage"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { formatDate } from "@/lib/format"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { showSuccess, showError, showWarning } from "@/lib/toast-helpers"
import { withCreatedBy } from "@/lib/audit"

// ============================================
// Types
// ============================================

interface AttendanceItem {
  id: string
  attendance_date: string
  check_in_time: string
  check_out_time: string | null
  hours_spent: number | null
  notes: string | null
  member?: {
    id: string
    name: string
    member_code: string | null
    person?: { id: string; name?: string; photo_url?: string } | null
  } | null
  seat?: { id: string; seat_number: string } | null
  // Computed
  is_checked_in?: boolean
  display_name?: string
}

// ============================================
// Currently Checked In Panel
// ============================================

interface CheckedInMember {
  id: string
  check_in_time: string
  seat_id: string | null
  member: {
    id: string
    name: string
    member_code: string | null
    hours_balance: number
    person?: { name?: string; photo_url?: string } | null
  }
}

function CurrentlyCheckedIn({ refreshKey, onCheckOut }: { refreshKey: number; onCheckOut: () => void }) {
  const [checkedIn, setCheckedIn] = useState<CheckedInMember[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCheckedIn = useCallback(async () => {
    const supabase = createClient()
    const today = new Date().toISOString().split("T")[0]

    const { data } = await supabase
      .from("library_attendance")
      .select(`
        id,
        check_in_time,
        seat_id,
        member:library_members!library_attendance_member_id_fkey(id, name, member_code, hours_balance, person:people(name, photo_url))
      `)
      .eq("attendance_date", today)
      .is("check_out_time", null)
      .is("deleted_at", null)
      .order("check_in_time", { ascending: false })

    setCheckedIn((data as unknown as CheckedInMember[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCheckedIn()
  }, [fetchCheckedIn, refreshKey])

  const handleQuickCheckOut = async (attendanceId: string, memberName: string, seatId: string | null) => {
    const supabase = createClient()
    const checkOutTime = new Date().toISOString()

    const { error } = await supabase
      .from("library_attendance")
      .update({ check_out_time: checkOutTime })
      .eq("id", attendanceId)

    if (error) {
      showError(`Check-out failed: ${error.message}`)
      return
    }

    // Release seat if one was assigned
    if (seatId) {
      await supabase
        .from("library_seats")
        .update({
          status: "available",
          current_member_id: null,
          updated_at: checkOutTime,
        })
        .eq("id", seatId)
    }

    showSuccess(`${memberName} checked out!`)
    onCheckOut()
  }

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Currently Checked In
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  if (checkedIn.length === 0) {
    return (
      <Card className="mb-6 border-dashed">
        <CardContent className="py-8 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-muted-foreground">No members currently checked in</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="p-1.5 bg-green-100 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            Currently Checked In
            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
              {checkedIn.length}
            </span>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchCheckedIn}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {checkedIn.map((record) => {
            const displayName = record.member?.person?.name || record.member?.name || "Unknown"
            const photoUrl = record.member?.person?.photo_url
            const checkInTime = new Date(record.check_in_time)
            const hoursAgo = ((Date.now() - checkInTime.getTime()) / (1000 * 60 * 60)).toFixed(1)

            return (
              <div
                key={record.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
              >
                <Avatar name={displayName} src={photoUrl} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground">
                    {checkInTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    {" • "}
                    <span className="text-green-600">{hoursAgo}h</span>
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2"
                  onClick={() => handleQuickCheckOut(record.id, displayName, record.seat_id)}
                >
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// Quick Check-In Component
// ============================================

function QuickCheckIn({ onCheckIn }: { onCheckIn: () => void }) {
  const [memberCode, setMemberCode] = useState("")
  const [loading, setLoading] = useState(false)

  const handleCheckIn = async () => {
    if (!memberCode.trim()) {
      showError("Please enter member code or phone")
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      // Find member by code or phone
      const { data: member, error: memberError } = await supabase
        .from("library_members")
        .select("id, name, member_code, status, hours_balance")
        .or(`member_code.eq.${memberCode},phone.eq.${memberCode}`)
        .is("deleted_at", null)
        .single()

      if (memberError || !member) {
        showError("Member not found")
        setLoading(false)
        return
      }

      if (member.status !== "active") {
        showError(`Member status is ${member.status}. Cannot check in.`)
        setLoading(false)
        return
      }

      if (member.hours_balance <= 0) {
        showError("No hours remaining. Please renew subscription.")
        setLoading(false)
        return
      }

      // Check if already checked in
      const { data: existing } = await supabase
        .from("library_attendance")
        .select("id")
        .eq("member_id", member.id)
        .eq("attendance_date", new Date().toISOString().split("T")[0])
        .is("check_out_time", null)
        .is("deleted_at", null)
        .single()

      if (existing) {
        showError("Member is already checked in")
        setLoading(false)
        return
      }

      // Get member's full data for workspace_id and owner_id
      const { data: fullMember } = await supabase
        .from("library_members")
        .select("owner_id, workspace_id")
        .eq("id", member.id)
        .single()

      if (!fullMember) {
        showError("Could not retrieve member data")
        setLoading(false)
        return
      }

      // Create attendance record
      const { data: { user } } = await supabase.auth.getUser()

      const attendanceData = withCreatedBy(
        {
          owner_id: fullMember.owner_id,
          workspace_id: fullMember.workspace_id,
          member_id: member.id,
          attendance_date: new Date().toISOString().split("T")[0],
          check_in_time: new Date().toISOString(),
        },
        user?.id || ""
      )

      const { error: attendanceError } = await supabase
        .from("library_attendance")
        .insert(attendanceData)

      if (attendanceError) {
        showError(`Check-in failed: ${attendanceError.message}`)
        setLoading(false)
        return
      }

      showSuccess(`${member.name} checked in successfully!`)
      setMemberCode("")
      onCheckIn()
    } catch (error) {
      console.error("Check-in error:", error)
      showError("Check-in failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <LogIn className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <CardTitle className="text-lg">Quick Check-In</CardTitle>
            <CardDescription>
              Enter member code or phone number
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 flex-wrap">
          <Input
            placeholder="Member code or phone..."
            value={memberCode}
            onChange={(e) => setMemberCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCheckIn()}
            disabled={loading}
            className="max-w-xs"
          />
          <Button onClick={handleCheckIn} disabled={loading}>
            {loading ? "Checking in..." : "Check In"}
          </Button>
          <Link href="/library-attendance/scan">
            <Button variant="outline">
              <QrCode className="mr-2 h-4 w-4" />
              QR Scanner
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<AttendanceItem>[] = [
  {
    key: "member",
    header: "Member",
    width: "primary",
    sortable: false,
    canHide: false,
    render: (att) => {
      const displayName = att.member?.person?.name || att.member?.name || "Unknown"
      const photoUrl = att.member?.person?.photo_url
      return (
        <div className="flex items-center gap-3">
          <Avatar name={displayName} src={photoUrl} size="sm" />
          <div>
            <div className="font-medium">{displayName}</div>
            <div className="text-xs text-muted-foreground">
              {att.member?.member_code || "—"}
            </div>
          </div>
        </div>
      )
    },
  },
  {
    key: "check_in_time",
    header: "Check In",
    width: "secondary",
    sortable: true,
    sortType: "date",
    canHide: true,
    defaultVisible: true,
    render: (att) => (
      <div>
        <div className="font-medium">
          {new Date(att.check_in_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatDate(att.attendance_date)}
        </div>
      </div>
    ),
  },
  {
    key: "check_out_time",
    header: "Check Out",
    width: "secondary",
    sortable: true,
    sortType: "date",
    canHide: true,
    defaultVisible: true,
    render: (att) => att.check_out_time ? (
      <div className="font-medium">
        {new Date(att.check_out_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
      </div>
    ) : (
      <StatusDot status="success" label="Active" />
    ),
  },
  {
    key: "hours_spent",
    header: "Duration",
    width: "badge",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: true,
    render: (att) => att.hours_spent ? (
      <span className="font-medium">{att.hours_spent.toFixed(1)}h</span>
    ) : (
      <span className="text-muted-foreground">—</span>
    ),
  },
  {
    key: "seat",
    header: "Seat",
    width: "badge",
    canHide: true,
    defaultVisible: false,
    render: (att) => att.seat?.seat_number || "—",
  },
  {
    key: "actions",
    header: "",
    width: "actions",
    render: (att) => !att.check_out_time && (
      <CheckOutButton attendanceId={att.id} memberName={att.member?.name || "Member"} />
    ),
  },
]

// ============================================
// Check Out Button Component
// ============================================

function CheckOutButton({ attendanceId, memberName }: { attendanceId: string; memberName: string }) {
  const [loading, setLoading] = useState(false)

  const handleCheckOut = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading(true)

    const supabase = createClient()
    const checkOutTime = new Date().toISOString()

    try {
      // First, get the attendance record to check if a seat was assigned
      const { data: attendance } = await supabase
        .from("library_attendance")
        .select("seat_id")
        .eq("id", attendanceId)
        .single()

      const { error } = await supabase
        .from("library_attendance")
        .update({ check_out_time: checkOutTime })
        .eq("id", attendanceId)

      if (error) {
        showError(`Check-out failed: ${error.message}`)
        return
      }

      // Release seat if one was assigned
      if (attendance?.seat_id) {
        await supabase
          .from("library_seats")
          .update({
            status: "available",
            current_member_id: null,
            updated_at: checkOutTime,
          })
          .eq("id", attendance.seat_id)
      }

      showSuccess(`${memberName} checked out successfully!`)
      // Trigger page refresh
      window.location.reload()
    } catch (error) {
      console.error("Check-out error:", error)
      showError("Check-out failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleCheckOut}
      disabled={loading}
    >
      <LogOut className="h-4 w-4 mr-1" />
      {loading ? "..." : "Check Out"}
    </Button>
  )
}

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  {
    id: "attendance_date",
    label: "Date",
    type: "date",
    placeholder: "Select date",
  },
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "attendance_date", label: "Date" },
  { value: "is_checked_in", label: "Status" },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<AttendanceItem>[] = [
  {
    id: "total",
    label: "Total Records",
    icon: Clock,
    compute: (_items, total) => total,
  },
  {
    id: "checked_in",
    label: "Currently In",
    icon: Users,
    compute: (items) => items.filter((a) => !a.check_out_time).length,
  },
  {
    id: "today",
    label: "Today",
    icon: Calendar,
    compute: (items) => {
      const today = new Date().toISOString().split("T")[0]
      return items.filter((a) => a.attendance_date === today).length
    },
  },
  {
    id: "hours_today",
    label: "Hours Today",
    icon: Clock,
    compute: (items) => {
      const today = new Date().toISOString().split("T")[0]
      return items
        .filter((a) => a.attendance_date === today && a.hours_spent)
        .reduce((sum, a) => sum + (a.hours_spent || 0), 0)
        .toFixed(1)
    },
  },
]

import { Calendar } from "lucide-react"

// ============================================
// Page Component
// ============================================

export default function LibraryAttendancePage() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleRefresh = () => setRefreshKey((k) => k + 1)

  return (
    <div>
      {/* Quick Check-In */}
      <QuickCheckIn onCheckIn={handleRefresh} />

      {/* Currently Checked In Panel */}
      <CurrentlyCheckedIn refreshKey={refreshKey} onCheckOut={handleRefresh} />

      {/* Attendance Records List */}
      <ListPageTemplate
        key={refreshKey}
        tableKey="library-attendance"
        title="Attendance"
        description="Check-in and check-out records"
        icon={Clock}
        permission="library_attendance.view"
        config={LIBRARY_ATTENDANCE_LIST_CONFIG}
        filters={filters}
        groupByOptions={groupByOptions}
        metrics={metrics}
        columns={columns}
        searchPlaceholder="Search by member name or code..."
        enableColumnManager={true}
        detailHref={(att) => `/library-attendance/${att.id}`}
        emptyTitle="No attendance records"
        emptyDescription="Check in members to start tracking attendance"
      />
    </div>
  )
}
