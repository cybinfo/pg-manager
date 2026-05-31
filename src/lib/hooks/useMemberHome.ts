"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { logger } from "@/lib/logger"
import type { MemberPortalMember } from "./useMemberPortalData"

export interface MemberHomeDashboardExtra {
  recentAttendance: Array<{
    id: string
    attendance_date: string
    check_in_time: string
    check_out_time: string | null
    hours_spent: number | null
  }>
  recentPayments: Array<{
    id: string
    amount: number
    payment_date: string
    payment_type: string
    payment_method: string
  }>
  totalPaid: number
  totalHoursThisMonth: number
  visitsThisMonth: number
}

export interface UseMemberHomeReturn {
  extra: MemberHomeDashboardExtra
  loading: boolean
}

const EMPTY_EXTRA: MemberHomeDashboardExtra = {
  recentAttendance: [],
  recentPayments: [],
  totalPaid: 0,
  totalHoursThisMonth: 0,
  visitsThisMonth: 0,
}

export function useMemberHome(
  member: MemberPortalMember | null,
  memberLoading: boolean
): UseMemberHomeReturn {
  const [loading, setLoading] = useState(true)
  const [extra, setExtra] = useState<MemberHomeDashboardExtra>(EMPTY_EXTRA)

  useEffect(() => {
    if (memberLoading) return
    if (!member) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
      return
    }

    const fetchDashboardData = async () => {
      const supabase = createClient()

      const [
        { data: attendance },
        { data: payments },
        { data: allPayments },
        { data: monthAttendance },
      ] = await Promise.all([
        supabase
          .from("entity_attendance")
          .select("id, attendance_date, check_in_time, check_out_time, hours_spent")
          .eq("member_id", member.id)
          .is("deleted_at", null)
          .order("check_in_time", { ascending: false })
          .limit(5),
        supabase
          .from("entity_payments")
          .select("id, amount, payment_date, payment_type, payment_method")
          .eq("member_id", member.id)
          .is("deleted_at", null)
          .order("payment_date", { ascending: false })
          .limit(3),
        supabase
          .from("entity_payments")
          .select("amount")
          .eq("member_id", member.id)
          .is("deleted_at", null),
        supabase
          .from("entity_attendance")
          .select("hours_spent")
          .eq("member_id", member.id)
          .is("deleted_at", null)
          .gte(
            "attendance_date",
            (() => {
              const d = new Date()
              d.setDate(1)
              d.setHours(0, 0, 0, 0)
              return d.toISOString().split("T")[0]
            })()
          ),
      ])

      const totalPaid =
        allPayments?.reduce(
          (sum: number, p: { amount: number }) => sum + Number(p.amount),
          0
        ) || 0
      const totalHoursThisMonth =
        monthAttendance?.reduce(
          (sum: number, a: { hours_spent: number | null }) =>
            sum + (a.hours_spent || 0),
          0
        ) || 0

      setExtra({
        recentAttendance: attendance || [],
        recentPayments: payments || [],
        totalPaid,
        totalHoursThisMonth,
        visitsThisMonth: monthAttendance?.length || 0,
      })
      setLoading(false)
    }

    fetchDashboardData().catch((err: unknown) => {
      logger.error("useMemberHome: fetch failed", { error: String(err) })
      setLoading(false)
    })
  }, [member, memberLoading])

  return { extra, loading }
}
