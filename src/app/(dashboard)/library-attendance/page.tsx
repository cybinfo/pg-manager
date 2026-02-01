/**
 * Library Attendance Page
 *
 * Dashboard for check-in/check-out with quick actions and attendance list.
 */

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Clock, Users, Armchair, LogIn, LogOut } from "lucide-react"
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
import { toast } from "sonner"
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
// Quick Check-In Component
// ============================================

function QuickCheckIn({ onCheckIn }: { onCheckIn: () => void }) {
  const [memberCode, setMemberCode] = useState("")
  const [loading, setLoading] = useState(false)

  const handleCheckIn = async () => {
    if (!memberCode.trim()) {
      toast.error("Please enter member code or phone")
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
        toast.error("Member not found")
        setLoading(false)
        return
      }

      if (member.status !== "active") {
        toast.error(`Member status is ${member.status}. Cannot check in.`)
        setLoading(false)
        return
      }

      if (member.hours_balance <= 0) {
        toast.error("No hours remaining. Please renew subscription.")
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
        toast.error("Member is already checked in")
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
        toast.error("Could not retrieve member data")
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
        toast.error(`Check-in failed: ${attendanceError.message}`)
        setLoading(false)
        return
      }

      toast.success(`${member.name} checked in successfully!`)
      setMemberCode("")
      onCheckIn()
    } catch (error) {
      console.error("Check-in error:", error)
      toast.error("Check-in failed. Please try again.")
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
        <div className="flex gap-3">
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

    try {
      const { error } = await supabase
        .from("library_attendance")
        .update({ check_out_time: new Date().toISOString() })
        .eq("id", attendanceId)

      if (error) {
        toast.error(`Check-out failed: ${error.message}`)
        return
      }

      toast.success(`${memberName} checked out successfully!`)
      // Trigger page refresh
      window.location.reload()
    } catch (error) {
      console.error("Check-out error:", error)
      toast.error("Check-out failed. Please try again.")
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

  return (
    <div>
      <QuickCheckIn onCheckIn={() => setRefreshKey((k) => k + 1)} />

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
