"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { logger } from "@/lib/logger"
import type { MemberPortalMember } from "./useMemberPortalData"

export interface AttendanceRecord {
  id: string
  attendance_date: string
  check_in_time: string
  check_out_time: string | null
  hours_spent: number | null
  notes: string | null
}

export interface AttendanceStats {
  totalVisits: number
  totalHours: number
  avgHoursPerVisit: number
  thisMonthVisits: number
  thisMonthHours: number
}

export interface UseMemberAttendanceReturn {
  attendance: AttendanceRecord[]
  stats: AttendanceStats
  loading: boolean
}

const EMPTY_STATS: AttendanceStats = {
  totalVisits: 0,
  totalHours: 0,
  avgHoursPerVisit: 0,
  thisMonthVisits: 0,
  thisMonthHours: 0,
}

export function useMemberAttendance(
  member: MemberPortalMember | null,
  memberLoading: boolean
): UseMemberAttendanceReturn {
  const [loading, setLoading] = useState(true)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState<AttendanceStats>(EMPTY_STATS)

  useEffect(() => {
    if (memberLoading) return
    if (!member) {
      setLoading(false)
      return
    }

    const fetchAttendance = async () => {
      const supabase = createClient()

      const { data: attendanceData } = await supabase
        .from("library_attendance")
        .select("id, attendance_date, check_in_time, check_out_time, hours_spent, notes")
        .eq("member_id", member.id)
        .is("deleted_at", null)
        .order("check_in_time", { ascending: false })

      const records: AttendanceRecord[] = attendanceData || []
      const totalVisits = records.length
      const totalHours = records.reduce(
        (sum: number, r: AttendanceRecord) => sum + (r.hours_spent || 0),
        0
      )
      const completedRecords = records.filter((r: AttendanceRecord) => r.hours_spent)
      const avgHoursPerVisit =
        completedRecords.length > 0 ? totalHours / completedRecords.length : 0

      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)
      const thisMonthRecords = records.filter(
        (r: AttendanceRecord) => new Date(r.attendance_date) >= monthStart
      )
      const thisMonthHours = thisMonthRecords.reduce(
        (sum: number, r: AttendanceRecord) => sum + (r.hours_spent || 0),
        0
      )

      setAttendance(records)
      setStats({
        totalVisits,
        totalHours,
        avgHoursPerVisit,
        thisMonthVisits: thisMonthRecords.length,
        thisMonthHours,
      })
      setLoading(false)
    }

    fetchAttendance().catch((err: unknown) => {
      logger.error("useMemberAttendance: fetch failed", { error: String(err) })
      setLoading(false)
    })
  }, [member, memberLoading])

  return { attendance, stats, loading }
}
