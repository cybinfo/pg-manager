"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, CheckCircle, Calendar, Timer, AlertCircle } from "lucide-react"
import { PageSkeleton } from "@/components/ui/loading"
import { ExportButton } from "@/components/ui/export-button"
import { formatDate } from "@/lib/format"
import { useMemberPortalData } from "@/lib/hooks/useMemberPortalData"

interface AttendanceRecord {
  id: string
  attendance_date: string
  check_in_time: string
  check_out_time: string | null
  hours_spent: number | null
  notes: string | null
}

export default function MemberAttendancePage() {
  const { member, loading: memberLoading } = useMemberPortalData()
  const [loading, setLoading] = useState(true)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState({
    totalVisits: 0,
    totalHours: 0,
    avgHoursPerVisit: 0,
    thisMonthVisits: 0,
    thisMonthHours: 0,
  })

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (memberLoading) return
    if (!member) {
      setLoading(false)
      return
    }

    const fetchAttendance = async () => {
      const supabase = createClient()

      // Fetch all attendance
      const { data: attendanceData } = await supabase
        .from("library_attendance")
        .select("id, attendance_date, check_in_time, check_out_time, hours_spent, notes")
        .eq("member_id", member.id)
        .is("deleted_at", null)
        .order("check_in_time", { ascending: false })

      // Calculate stats
      const records: AttendanceRecord[] = attendanceData || []
      const totalVisits = records.length
      const totalHours = records.reduce((sum: number, r: AttendanceRecord) => sum + (r.hours_spent || 0), 0)
      const completedRecords = records.filter((r: AttendanceRecord) => r.hours_spent)
      const avgHoursPerVisit = completedRecords.length > 0
        ? totalHours / completedRecords.length
        : 0

      // This month stats
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)
      const thisMonthRecords = records.filter(
        (r: AttendanceRecord) => new Date(r.attendance_date) >= monthStart
      )
      const thisMonthVisits = thisMonthRecords.length
      const thisMonthHours = thisMonthRecords.reduce(
        (sum: number, r: AttendanceRecord) => sum + (r.hours_spent || 0),
        0
      )

      setAttendance(records)
      setStats({
        totalVisits,
        totalHours,
        avgHoursPerVisit,
        thisMonthVisits,
        thisMonthHours,
      })
      setLoading(false)
    }

    fetchAttendance()
  }, [member, memberLoading])
  /* eslint-enable react-hooks/set-state-in-effect */

  if (memberLoading || loading) {
    return <PageSkeleton variant="list" />
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Active Membership</h2>
        <p className="text-muted-foreground">You don&apos;t have an active library membership.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Attendance History</h1>
          <p className="text-muted-foreground">Your check-in and check-out records</p>
        </div>
        <ExportButton
          data={attendance as unknown as Record<string, unknown>[]}
          filename="my-attendance"
          columns={[
            { key: "attendance_date", header: "Date", format: (v) => formatDate(v as string) },
            { key: "check_in_time", header: "Check In", format: (v) => v ? new Date(v as string).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "" },
            { key: "check_out_time", header: "Check Out", format: (v) => v ? new Date(v as string).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "" },
            { key: "hours_spent", header: "Hours", format: (v) => v != null ? `${(v as number).toFixed(1)}h` : "" },
            { key: "notes", header: "Notes", format: (v) => (v as string) || "" },
          ]}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Visits</p>
                <p className="text-xl font-semibold">{stats.totalVisits}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <Timer className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-xl font-semibold">{stats.totalHours.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-info/10 rounded-lg">
                <Clock className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg/Visit</p>
                <p className="text-xl font-semibold">{stats.avgHoursPerVisit.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-xl font-semibold">{stats.thisMonthHours.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            All Visits
          </CardTitle>
          <CardDescription>
            {stats.thisMonthVisits} visits this month
          </CardDescription>
        </CardHeader>
        <CardContent>
          {attendance.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No attendance records yet</p>
              <p className="text-sm">Your check-in history will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {attendance.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-full ${
                        record.check_out_time
                          ? "bg-primary/10"
                          : "bg-success/10"
                      }`}
                    >
                      {record.check_out_time ? (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      ) : (
                        <Clock className="h-5 w-5 text-success animate-pulse" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{formatDate(record.attendance_date)}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(record.check_in_time).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {record.check_out_time && (
                          <>
                            {" - "}
                            {new Date(record.check_out_time).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </>
                        )}
                      </p>
                      {record.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{record.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {record.hours_spent ? (
                      <p className="text-lg font-semibold text-primary">
                        {record.hours_spent.toFixed(1)}h
                      </p>
                    ) : (
                      <span className="text-xs px-2 py-1 bg-success/10 text-success rounded-full">
                        Currently Active
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
