"use client"

import { useState, useEffect } from "react"
import { logger } from "@/lib/logger"
import { createClient } from "@/lib/supabase/client"
import { getNowISO } from "@/lib/date-helpers"
import { useTenantPortalData } from "./useTenantPortalData"

export interface TenantNotice {
  id: string
  title: string
  content: string
  type: string
  created_at: string
  expires_at: string | null
  property: { name: string } | null
}

interface RawNotice {
  id: string
  title: string
  content: string
  type: string
  created_at: string
  expires_at: string | null
  target_audience: string
  target_rooms: string[] | null
  property: { name: string }[] | null
}

export interface UseTenantNoticesReturn {
  notices: TenantNotice[]
  loading: boolean
}

export function useTenantNotices(): UseTenantNoticesReturn {
  const { tenant, loading: tenantLoading } = useTenantPortalData()
  const [notices, setNotices] = useState<TenantNotice[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (tenantLoading) return
    if (!tenant) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDataLoading(false)
      return
    }

    let cancelled = false

    const fetchNotices = async () => {
      try {
        const supabase = createClient()
        const now = getNowISO()

        const { data: noticesData } = await supabase
          .from("notices")
          .select(`
            id,
            title,
            content,
            type,
            created_at,
            expires_at,
            target_audience,
            target_rooms,
            property:properties(name)
          `)
          .eq("is_active", true)
          .or(`entity_id.is.null,entity_id.eq.${tenant.entity_id}`)
          .or(`expires_at.is.null,expires_at.gt.${now}`)
          .order("created_at", { ascending: false })

        if (cancelled) return

        const filtered = ((noticesData as RawNotice[]) || []).filter((notice) => {
          if (notice.target_audience === "all") return true
          if (notice.target_audience === "tenants_only") return true
          if (notice.target_audience === "specific_rooms") {
            return notice.target_rooms?.includes(tenant.room_id as string)
          }
          return true
        })

        const transformed: TenantNotice[] = filtered.map((notice) => ({
          id: notice.id,
          title: notice.title,
          content: notice.content,
          type: notice.type,
          created_at: notice.created_at,
          expires_at: notice.expires_at,
          property: notice.property && notice.property.length > 0 ? notice.property[0] : null,
        }))

        setNotices(transformed)
      } catch (err) {
        logger.error("useTenantNotices: failed to fetch notices", { error: String(err) })
      } finally {
        if (!cancelled) setDataLoading(false)
      }
    }

    fetchNotices()

    return () => {
      cancelled = true
    }
  }, [tenant, tenantLoading])

  return {
    notices,
    loading: tenantLoading || dataLoading,
  }
}
