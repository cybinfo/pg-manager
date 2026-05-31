"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { logger } from "@/lib/logger"
import type { MemberPortalMember } from "./useMemberPortalData"
import type { User } from "@supabase/supabase-js"

export interface MemberComplaint {
  id: string
  category: string
  title: string
  description: string | null
  status: string
  priority: string
  resolution_notes: string | null
  created_at: string
  resolved_at: string | null
}

export interface UseMemberComplaintsReturn {
  complaints: MemberComplaint[]
  loading: boolean
  setComplaints: React.Dispatch<React.SetStateAction<MemberComplaint[]>>
}

export function useMemberComplaints(
  member: MemberPortalMember | null,
  user: User | null,
  memberLoading: boolean
): UseMemberComplaintsReturn {
  const [loading, setLoading] = useState(true)
  const [complaints, setComplaints] = useState<MemberComplaint[]>([])

  useEffect(() => {
    if (memberLoading) return
    if (!member || !user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
      return
    }

    const fetchComplaints = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("complaints")
        .select(
          "id, category, title, description, status, priority, resolution_notes, created_at, resolved_at"
        )
        .eq("entity_id", member.entity_id)
        .eq("created_by", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })

      setComplaints(data || [])
      setLoading(false)
    }

    fetchComplaints().catch((err: unknown) => {
      logger.error("useMemberComplaints: fetch failed", { error: String(err) })
      setLoading(false)
    })
  }, [member, user, memberLoading])

  return { complaints, loading, setComplaints }
}
