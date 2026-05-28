"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { logger } from "@/lib/logger"
import { getNowISO } from "@/lib/date-helpers"
import type { MemberPortalMember } from "./useMemberPortalData"

export interface MemberNotice {
  id: string
  title: string
  content: string
  type: string
  created_at: string
  expires_at: string | null
}

export interface UseMemberNoticesReturn {
  notices: MemberNotice[]
  loading: boolean
}

export function useMemberNotices(
  member: MemberPortalMember | null,
  memberLoading: boolean
): UseMemberNoticesReturn {
  const [loading, setLoading] = useState(true)
  const [notices, setNotices] = useState<MemberNotice[]>([])

  useEffect(() => {
    if (memberLoading) return
    if (!member) {
      setLoading(false)
      return
    }

    const fetchNotices = async () => {
      const supabase = createClient()
      const now = getNowISO()

      const { data } = await supabase
        .from("notices")
        .select("id, title, content, type, created_at, expires_at")
        .eq("is_active", true)
        .eq("library_id", member.library_id)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("created_at", { ascending: false })

      setNotices(data || [])
      setLoading(false)
    }

    fetchNotices().catch((err: unknown) => {
      logger.error("useMemberNotices: fetch failed", { error: String(err) })
      setLoading(false)
    })
  }, [member, memberLoading])

  return { notices, loading }
}
